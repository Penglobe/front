// 전역 BG 태스크 정의 파일 (React/Router import 절대 X)
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { stopTransport } from "@services/transportService"; // 서버 호출만 사용

export const TASK_NAME = "TRANSPORT_TRACKING_TASK";

/* -------------------- 키/상수 -------------------- */
const DIST_KEY = "@transport/totalDistanceM";
const LAST_KEY = "@transport/lastCoord";
const ACTIVE_KEY = "@transport/isActive";
const ID_KEY = "@transport/id";
const DEST_KEY = "@transport/dest";
const MODE_KEY = "@transport/mode";
const PLACE_KEY = "@transport/placeName";
const IN_RADIUS_SINCE_KEY = "@transport/inRadiusSince";
const STOPPED_KEY = "@transport/stopped";
const FINISH_RESULT_KEY = "@transport/finishResult";
const STOP_KIND_KEY = "@transport/stopKind";
const STOP_REASON_KEY = "@transport/stopReason";
const START_KEY = "@transport/startAtMs";
const FINISHING_KEY = "@transport/finishing";

const MIN_DISTANCE_UPDATE = 1.0; // m
const MAX_INSTANT_SPEED_WALK_BIKE = 15; // m/s
const STALE_SAMPLE_MS_BG = 60000;

const MAX_STEP_WALK_BASE = 35; // m
const MAX_STEP_BIKE_BASE = 80; // m
const STEP_SPEED_CAP = { WALK: 4.5, BIKE: 12, TRANSIT: 60 }; // m/s

const MIN_IDLE_DIST_WALK = 6;
const MIN_IDLE_DIST_BIKE = 10;
const MIN_IDLE_DIST_TRANSIT = 12;

const GPS_ACCURACY_THRESHOLD_BG_BASE = 60; // WALK 기본
const WRITE_LAST_ON_BAD_ACC_BG = true;

// 도착 판정(완화)
const ARRIVAL_RADIUS = 30; // m
const ARRIVAL_STAY_MS = 3000; // 3초

/* -------------------- 로거 -------------------- */
const SESSION_ID = Math.floor(Date.now() / 1000).toString(36);
const log = (tag, msg, extra = {}) => {
  const base = `[TM#${SESSION_ID}] [${tag}] ${msg}`;
  try {
    if (extra && Object.keys(extra).length) console.log(base, extra);
    else console.log(base);
  } catch {
    console.log(base);
  }
};
const drop = (reason, extra = {}) => log("DROP", reason, extra);

/* -------------------- 메모리 가드 -------------------- */
// AsyncStorage만으로는 극짧은 레이스가 날 수 있어 메모리 가드도 병행
let FINISHING_MEM = false;

/* -------------------- 유틸 -------------------- */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function readTotalDistance() {
  const raw = await AsyncStorage.getItem(DIST_KEY);
  return raw ? Number(raw) : 0;
}
async function writeTotalDistance(v) {
  await AsyncStorage.setItem(DIST_KEY, String(Math.max(0, Math.round(v))));
}
async function readLastCoord() {
  const raw = await AsyncStorage.getItem(LAST_KEY);
  return raw ? JSON.parse(raw) : null;
}
async function writeLastCoord(c) {
  await AsyncStorage.setItem(LAST_KEY, JSON.stringify(c));
}
async function markActive(flag) {
  await AsyncStorage.setItem(ACTIVE_KEY, flag ? "1" : "0");
}
function accThreshBGByMode(mode) {
  if (mode === "TRANSIT") return 120;
  if (mode === "BIKE") return 80;
  return GPS_ACCURACY_THRESHOLD_BG_BASE; // WALK
}
function getStepCap(mode, dtSec) {
  const baseCap =
    mode === "WALK"
      ? MAX_STEP_WALK_BASE
      : mode === "BIKE"
        ? MAX_STEP_BIKE_BASE
        : Infinity;
  const dynCap = (STEP_SPEED_CAP[mode] || 60) * dtSec + 5;
  return Math.max(baseCap, dynCap);
}
function getSpikeCap(mode) {
  return mode === "TRANSIT" ? Infinity : MAX_INSTANT_SPEED_WALK_BIKE;
}
function dynamicMinStep(prevAcc, currAcc, mode, speedForMotion = 0) {
  const a = Number.isFinite(prevAcc) ? prevAcc : 0;
  const b = Number.isFinite(currAcc) ? currAcc : 0;
  const maxAcc = Math.max(a, b);
  const accBased = 0.8 * maxAcc;
  const idleBase =
    mode === "WALK"
      ? MIN_IDLE_DIST_WALK
      : mode === "BIKE"
        ? MIN_IDLE_DIST_BIKE
        : MIN_IDLE_DIST_TRANSIT;
  const moving =
    mode === "WALK"
      ? speedForMotion > 0.6
      : mode === "BIKE"
        ? speedForMotion > 1.5
        : true; // TRANSIT은 이동중 가정
  const baseWhenMoving = Math.max(
    MIN_DISTANCE_UPDATE,
    Math.min(idleBase, accBased)
  );
  const baseWhenIdle = Math.max(idleBase, accBased);
  return moving ? baseWhenMoving : baseWhenIdle;
}

/* -------------------- BG 도착 판정 -------------------- */
async function checkArrivalAndMaybeFinishBG({
  latitude,
  longitude,
  accuracy,
  origTs,
  mode,
  isActive,
  id,
}) {
  // 이미 끝났거나(메모리/스토리지) 끝내는 중이면 바로 중단
  if (FINISHING_MEM) return false;
  if ((await AsyncStorage.getItem(STOPPED_KEY)) === "1") return false;
  if ((await AsyncStorage.getItem(FINISHING_KEY)) === "1") return false;

  if (!isActive || !id) return false;
  const destRaw = await AsyncStorage.getItem(DEST_KEY);
  if (!destRaw) return false;
  const { endLat, endLng } = JSON.parse(destRaw);
  const toEnd = calculateDistance(
    latitude,
    longitude,
    Number(endLat),
    Number(endLng)
  );

  const acc = Number.isFinite(accuracy) ? accuracy : 999;
  const bgAccGate = mode === "WALK" ? 120 : mode === "BIKE" ? 120 : 150;
  const within = toEnd - acc <= ARRIVAL_RADIUS; // 오차 반영

  if (!(acc <= bgAccGate && within)) {
    const had = await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY);
    if (had) log("BG", "leave arrival radius");
    await AsyncStorage.removeItem(IN_RADIUS_SINCE_KEY);
    return false;
  }

  let since = Number((await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0");
  if (!since) {
    since = Date.now(); // BG도 실시간 경과 기준
    await AsyncStorage.setItem(IN_RADIUS_SINCE_KEY, String(since));
    log("BG", "enter arrival radius", { toEnd, accuracy: acc });
  }

  if (Date.now() - since >= ARRIVAL_STAY_MS) {
    // ✅ 메모리 + 스토리지 동시 가드
    FINISHING_MEM = true;
    await AsyncStorage.setItem(FINISHING_KEY, "1");

    // 마지막 안전 누적(보정)
    const last2 = await readLastCoord();
    if (last2) {
      const d2 = calculateDistance(
        last2.latitude,
        last2.longitude,
        latitude,
        longitude
      );
      const dt2 = Math.max(
        1,
        (Date.now() - (last2.timestamp || Date.now())) / 1000
      );
      const v2 = d2 / dt2;
      if (d2 >= MIN_DISTANCE_UPDATE && Number.isFinite(v2)) {
        const prevTotal2 = await readTotalDistance();
        const stepCap = getStepCap(mode, dt2);
        const nextTotal2 = prevTotal2 + Math.min(d2, stepCap);
        await writeTotalDistance(nextTotal2);
        await writeLastCoord({
          latitude,
          longitude,
          timestamp: Date.now(),
          accuracy,
        });
        log("BG", "final accumulate before finish", {
          d2: Math.round(d2),
          dt2,
          v2,
          nextTotal2: Math.round(nextTotal2),
        });
      } else {
        drop("finalAcc", { d2: Math.round(d2), dt2, v2 });
      }
    }

    const used = await readTotalDistance();
    try {
      const result = await stopTransport(id, Math.round(used));
      await AsyncStorage.setItem(
        FINISH_RESULT_KEY,
        JSON.stringify(result || {})
      );
      log("BG", "auto-finish", { used });
    } catch {
      const startedAt = Number(
        (await AsyncStorage.getItem(START_KEY)) || Date.now()
      );
      await AsyncStorage.setItem(
        FINISH_RESULT_KEY,
        JSON.stringify({
          distanceM: Math.round(used),
          co2Kg: 0,
          durationM: Math.round((Date.now() - startedAt) / 60000),
          points: 0,
        })
      );
      log("BG", "auto-finish (fallback)", { used });
    }
    await AsyncStorage.setItem(STOP_KIND_KEY, "finish");
    await AsyncStorage.setItem(STOPPED_KEY, "1");
    try {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    } catch {}
    await markActive(false);
    return true;
  }
  return false;
}

/* -------------------- 태스크 정의 -------------------- */
if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(
    TASK_NAME,
    async ({ data: { locations } = {}, error }) => {
      try {
        if (error) {
          log("BG", "TaskManager error", { error: String(error) });
          return;
        }
        if (!locations || locations.length === 0) return;

        const mode = (await AsyncStorage.getItem(MODE_KEY)) || "WALK";
        const id = await AsyncStorage.getItem(ID_KEY);
        const isActive = (await AsyncStorage.getItem(ACTIVE_KEY)) === "1";

        for (const loc of locations) {
          // ✅ 종료 가드 (메모리 + 스토리지)
          if (
            FINISHING_MEM ||
            (await AsyncStorage.getItem(FINISHING_KEY)) === "1" ||
            (await AsyncStorage.getItem(STOPPED_KEY)) === "1"
          ) {
            drop("finishing-guard");
            return;
          }

          const { latitude, longitude, accuracy } = loc.coords || {};
          const origTs = loc.timestamp || Date.now();
          const age = Date.now() - origTs;
          const isStale = age > STALE_SAMPLE_MS_BG;

          // last seed
          let last = await readLastCoord();
          if (!last) {
            const seed = { latitude, longitude, timestamp: origTs, accuracy };
            await writeLastCoord(seed);
            log("BG", "seed lastCoord", seed);
            last = seed;
          }

          // ✅ 도착 판정 선행
          const finishedEarly = await checkArrivalAndMaybeFinishBG({
            latitude,
            longitude,
            accuracy,
            origTs,
            mode,
            isActive,
            id,
          });
          if (finishedEarly) return;

          // 정확도 컷(누적은 컷 적용)
          const accThreshBG = accThreshBGByMode(mode);
          if (typeof accuracy === "number" && accuracy > accThreshBG) {
            drop("accuracyBG", { accuracy, accThreshBG });
            if (WRITE_LAST_ON_BAD_ACC_BG) {
              await writeLastCoord({
                latitude,
                longitude,
                timestamp: origTs,
                accuracy,
              });
            }
            continue;
          }

          // ✅ 체류 중에는 누적 중단(좌표만 업데이트)
          const inSince = Number(
            (await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0"
          );
          if (inSince) {
            await writeLastCoord({
              latitude,
              longitude,
              timestamp: origTs,
              accuracy,
            });
            drop("arriveWindow-noAccum", { reason: "inRadiusStay" });
            continue;
          }

          // 누적
          last = await readLastCoord();
          const realDt = Math.max(
            1,
            (origTs - (last.timestamp || origTs)) / 1000
          );
          const d = calculateDistance(
            last.latitude,
            last.longitude,
            latitude,
            longitude
          );
          const vReal = d / realDt;
          const minStep = dynamicMinStep(last?.accuracy, accuracy, mode, vReal);

          const stepCap = getStepCap(mode, realDt);
          const spikeCapBG = getSpikeCap(mode);

          if (d >= minStep) {
            if (vReal > spikeCapBG) {
              drop("vSpike", { vReal, d, realDt });
              await writeLastCoord({
                latitude,
                longitude,
                timestamp: origTs,
                accuracy,
              });
            } else if (d > stepCap) {
              // WALK/BIKE 점프 과다 → 실패 종료
              drop("jumpStep", { d, cap: stepCap, realDt });
              if (isActive && (mode === "WALK" || mode === "BIKE") && id) {
                await AsyncStorage.setItem(STOP_KIND_KEY, "fail");
                await AsyncStorage.setItem(
                  STOP_REASON_KEY,
                  "좌표 점프가 감지되었습니다. 모드를 다시 선택해 주세요."
                );
                await AsyncStorage.setItem(STOPPED_KEY, "1");
                try {
                  await Location.stopLocationUpdatesAsync(TASK_NAME);
                } catch {}
                await markActive(false);
                log("BG", "auto-fail(jumpStep)", { d, stepCap });
                return;
              } else {
                await writeLastCoord({
                  latitude,
                  longitude,
                  timestamp: origTs,
                  accuracy,
                });
              }
            } else {
              if (isActive) {
                const prevTotal = await readTotalDistance();
                const nextTotal = prevTotal + d;
                await writeTotalDistance(nextTotal);
                log("BG", "accumulate", {
                  d: Math.round(d),
                  nextTotal: Math.round(nextTotal),
                  realDt,
                });
              } else {
                log("BG", "inactive - skip accumulate", { d: Math.round(d) });
              }
              await writeLastCoord({
                latitude,
                longitude,
                timestamp: origTs,
                accuracy,
              });
            }
          } else {
            drop("smallStep", { d, minStep });
            await writeLastCoord({
              latitude,
              longitude,
              timestamp: origTs,
              accuracy,
            });
          }

          if (isStale) {
            drop("BG_stale", { ageMs: age, handled: "with realDt" });
          }
        }
      } catch (e) {
        log("BG", "handler failure", { error: String(e) });
      }
    }
  );
}
