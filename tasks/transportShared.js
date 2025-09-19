// tasks/transportShared.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { stopTransport } from "@services/transportService";

/** ====== 공통 상수/키 ====== */
export const TASK_NAME = "TRANSPORT_TRACKING_TASK";

export const STORAGE = {
  DIST: "@transport/totalDistanceM",
  LAST: "@transport/lastCoord",
  ID: "@transport/id",
  MODE: "@transport/mode",
  PLACE: "@transport/placeName",
  START: "@transport/startAtMs",
  ACTIVE: "@transport/isActive",
  DEST: "@transport/dest",
  STOPPED: "@transport/stopped",
  STOP_KIND: "@transport/stopKind",
  STOP_REASON: "@transport/stopReason",
  FINISH_RESULT: "@transport/finishResult",
  STOPPING: "@transport/stopping",
};

export const SPEED_LIMITS = { WALK: 12, BIKE: 20, TRANSIT: Infinity };
export const ARRIVAL_RADIUS_M = 40; // 도착 판정 반경
export const ACCURACY_MAX_M = 35; // 정확도 상한(근처에선 조금 더 허용)
export const IGNORE_MIN_MOVE_M = 5; // 미세 이동 무시
export const JUMP_THRESH_M = 120; // 갑툭튀 무시 임계값
export const JUMP_TIME_S = 5;

/** ====== 로깅 ====== */
export function dlog(tag, data) {
  try {
    const payload = typeof data === "string" ? { msg: data } : data || {};
    console.log(`[${tag}]`, JSON.stringify(payload));
  } catch {
    console.log(`[${tag}]`, data);
  }
}

/** ====== 거리 계산(Haversine) ====== */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** ====== 저장소 유틸 ====== */
export const readJSON = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const writeJSON = (key, v) =>
  AsyncStorage.setItem(key, JSON.stringify(v));
export const readNumber = async (key, def = 0) =>
  Number((await AsyncStorage.getItem(key)) || def);
export const writeNumber = (key, v) =>
  AsyncStorage.setItem(key, String(Math.round(v)));

/** 이동 무시 판단(드리프트/점프) */
export function shouldIgnoreMove(d, dt) {
  if (d < IGNORE_MIN_MOVE_M) return { ignore: true, reason: "micro" };
  if (d > JUMP_THRESH_M && dt < JUMP_TIME_S)
    return { ignore: true, reason: "jump" };
  return { ignore: false };
}

/** 속도 체크 */
export function checkSpeed(instSpeed, mode) {
  const limit = SPEED_LIMITS[mode] ?? SPEED_LIMITS.WALK;
  if (limit !== Infinity && instSpeed > limit) {
    return { over: true, limit, speed: instSpeed };
  }
  return { over: false, limit, speed: instSpeed };
}

/** stopTransport 안전 호출(락 & 재시도) */
export async function stopTransportSafely(
  transportId,
  totalDistance,
  { source = "UNK", retries = 3 } = {}
) {
  const { STOPPING, FINISH_RESULT, STOPPED, STOP_KIND, ACTIVE } = STORAGE;

  // 중복 호출 방지
  const stopping = await AsyncStorage.getItem(STOPPING);
  if (stopping === "1") {
    dlog("STOP", { source, info: "already_stopping" });
    return { ok: false, state: "in_progress" };
  }
  await AsyncStorage.setItem(STOPPING, "1");

  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      dlog("STOP", { source, attempt, transportId, totalDistance });
      const result = await stopTransport(
        transportId,
        Math.round(totalDistance)
      );
      await AsyncStorage.setItem(FINISH_RESULT, JSON.stringify(result || {}));
      await AsyncStorage.multiSet([
        [STOP_KIND, "finish"],
        [STOPPED, "1"],
        [ACTIVE, "0"],
      ]);
      dlog("STOP", { source, status: "success" });
      return { ok: true, state: "done", result };
    } catch (e) {
      lastErr = String(e);
      dlog("STOP", { source, status: "fail", attempt, error: lastErr });
      await new Promise((r) => setTimeout(r, 800 * attempt)); // 점증 백오프
    }
  }

  // 실패 시 롤백(다음 시도 가능하게)
  await AsyncStorage.removeItem(STOPPING);
  return { ok: false, state: "failed", error: lastErr };
}

/** 도착 판정 + 자동 종료 트리거 */
export async function checkArrivalAndStop({
  latitude,
  longitude,
  totalDistance,
  source = "UNK",
}) {
  const { DEST, ID, STOPPED, STOP_KIND } = STORAGE;

  const rawDest = await AsyncStorage.getItem(DEST);
  if (!rawDest) {
    dlog("ARRIVAL", { source, info: "no_dest" });
    return { arrived: false };
  }
  const { endLat, endLng } = JSON.parse(rawDest);
  const dist = calculateDistance(latitude, longitude, endLat, endLng);

  dlog("ARRIVAL", {
    source,
    distToDest: Math.round(dist),
    radius: ARRIVAL_RADIUS_M,
  });

  if (dist > ARRIVAL_RADIUS_M) return { arrived: false };

  const id = await AsyncStorage.getItem(ID);
  if (!id) {
    dlog("ARRIVAL", { source, info: "no_transport_id" });
    return { arrived: false };
  }

  const res = await stopTransportSafely(id, totalDistance, { source });
  if (res.ok) {
    await AsyncStorage.multiSet([
      [STOPPED, "1"],
      [STOP_KIND, "finish"],
    ]);
    return { arrived: true, stopped: true };
  }

  return { arrived: true, stopped: false, error: res.error };
}
