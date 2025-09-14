import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Alert, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTransport, stopTransport } from "@services/transportService";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

/* -------------------- 상수/키 -------------------- */
const TASK_NAME = "TRANSPORT_TRACKING_TASK";

/** AsyncStorage keys */
const DIST_KEY = "@transport/totalDistanceM";
const LAST_KEY = "@transport/lastCoord"; // { latitude, longitude, timestamp, accuracy? }
const ACTIVE_KEY = "@transport/isActive"; // "1"/"0"
const ID_KEY = "@transport/id"; // transportId
const DEST_KEY = "@transport/dest"; // { endLat, endLng }
const MODE_KEY = "@transport/mode"; // "WALK" | "BIKE" | "TRANSIT"
const PLACE_KEY = "@transport/placeName"; // 문자열
const IN_RADIUS_SINCE_KEY = "@transport/inRadiusSince";
const STOPPED_KEY = "@transport/stopped"; // "1"이면 BG에서 이미 종료됨
const FINISH_RESULT_KEY = "@transport/finishResult"; // stopTransport 응답 저장
const STOP_KIND_KEY = "@transport/stopKind"; // "finish" | "fail"
const STOP_REASON_KEY = "@transport/stopReason"; // 실패 사유 텍스트
const START_KEY = "@transport/startAtMs"; // 시작 시각 저장/복원

/** 속도 한계 (m/s): 걷기/자전거 평균속도 상한 — TRANSIT 제외 */
const SPEED_LIMITS = { WALK: 2.2, BIKE: 8.5 }; // TRANSIT에는 적용하지 않음

/** 위치 옵션 (기본 FG/BG) */
const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
  timeInterval: 3000,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.Fitness,
  foregroundService: {
    notificationTitle: "환경 걸음",
    notificationBody: "펭글로브가 이동을 기록하고 있습니다.",
  },
};

// 🔹 FG 고속 모드 옵션 (이동 중)
const LOCATION_OPTIONS_FG_FAST = {
  ...LOCATION_OPTIONS,
  timeInterval: 1000,
  distanceInterval: 0,
};

// ---- 임계치 ----
const GPS_ACCURACY_THRESHOLD_FG_BASE = 20; // m (WALK 기본)
const GPS_ACCURACY_THRESHOLD_BG_BASE = 60; // m (WALK/BG 기본)

// ✅ 도착 기준: 반경 R 안에서 **3초** 체류하면 종료
const ARRIVAL_ACCURACY = 60;      // m: 도착 판정용 정확도 (FG/일반 BG)
const ARRIVAL_ACCURACY_BG = 80;   // m: BG 완화 정확도 (정확도 컷 구간)
const ARRIVAL_RADIUS = 30;        // m: 도착 반경
const ARRIVAL_STAY_MS = 3000;     // ms: 체류 시간 (3초)

const COORD_BUFFER_SIZE = 5;
const MIN_DISTANCE_UPDATE = 1.0; // m (보행 누락 완화)
const MAX_INSTANT_SPEED_WALK_BIKE = 15; // m/s (이상치 컷: WALK/BIKE)
const BEARING_DIFF_THRESHOLD = 90; // deg
const SPEED_WINDOW_SEC = 15; // s (중앙값용 윈도우)
const STALE_SAMPLE_MS_FG = 7000; // 오래된 샘플 컷(FG)
const STALE_SAMPLE_MS_BG = 60000; // 오래된 샘플 컷(BG)

// 스텝 캡(점프컷) + 동적 캡(시간 기반)
const MAX_STEP_WALK_BASE = 35; // m
const MAX_STEP_BIKE_BASE = 80; // m
const STEP_SPEED_CAP = { WALK: 4.5, BIKE: 12, TRANSIT: 60 }; // m/s

// 정지 드리프트 억제 — 모드별 바닥값
const MIN_IDLE_DIST_WALK = 6;   // m
const MIN_IDLE_DIST_BIKE = 10;  // m
const MIN_IDLE_DIST_TRANSIT = 12; // m

// BG에서 정확도 나쁠 때도 마지막 좌표는 업데이트해서 "대점프" 방지
const WRITE_LAST_ON_BAD_ACC_BG = true;

// 🔹 BG 도착 부스트
const BOOSTED_KEY = "@transport/boosted";
const BOOSTED_OPTIONS = {
  ...LOCATION_OPTIONS,
  timeInterval: 1000,
  distanceInterval: 0,
};

// 🔹 FG 스톨 감지
const FG_STALL_MS = 3000;         // 이 시간 동안 콜백이 없으면 스톨
const FG_POKE_INTERVAL_MS = 2500; // 스톨 체크 주기

/* -------------------- 로거 -------------------- */
const SESSION_ID = Math.floor(Date.now() / 1000).toString(36);
function log(tag, msg, extra = {}) {
  const base = `[TM#${SESSION_ID}] [${tag}] ${msg}`;
  try {
    if (extra && Object.keys(extra).length) console.log(base, extra);
    else console.log(base);
  } catch {
    console.log(base);
  }
}
// 드롭 카운팅 제거 → 단순 로그만
function drop(reason, extra = {}) {
  log("DROP", reason, extra);
}

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
function getSmoothedCoord(buffer) {
  if (buffer.length === 0) return null;
  const avgLat = buffer.reduce((s, p) => s + p.latitude, 0) / buffer.length;
  const avgLng = buffer.reduce((s, p) => s + p.longitude, 0) / buffer.length;
  const accs = buffer.map((p) => p.accuracy).filter((a) => Number.isFinite(a));
  const avgAcc = accs.length ? accs.reduce((s, a) => s + a, 0) / accs.length : undefined;
  return { latitude: avgLat, longitude: avgLng, timestamp: Date.now(), accuracy: avgAcc };
}
function angleDiff(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }
function bearingDiff(c1, c2, c3) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  function bearing(a, b) {
    const dLon = toRad(b.longitude - a.longitude);
    const y = Math.sin(dLon) * Math.cos(toRad(b.latitude));
    const x =
      Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
      Math.sin(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
  const b1 = bearing(c1, c2), b2 = bearing(c2, c3);
  return angleDiff(b1, b2);
}
function median(values) {
  if (!values.length) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}
// 정확도 기반 동적 최소 스텝
function dynamicMinStep(prevAcc, currAcc, mode, speedForMotion = 0) {
  const a = Number.isFinite(prevAcc) ? prevAcc : 0;
  const b = Number.isFinite(currAcc) ? currAcc : 0;
  const maxAcc = Math.max(a, b);
  const accBased = 0.8 * maxAcc; // 완화
  const idleBase =
    mode === "WALK" ? MIN_IDLE_DIST_WALK :
    mode === "BIKE" ? MIN_IDLE_DIST_BIKE :
    MIN_IDLE_DIST_TRANSIT;
  const moving =
    mode === "WALK" ? speedForMotion > 0.6 :
    mode === "BIKE" ? speedForMotion > 1.5 :
    true; // TRANSIT은 이동중
  const baseWhenMoving = Math.max(MIN_DISTANCE_UPDATE, Math.min(idleBase, accBased));
  const baseWhenIdle = Math.max(idleBase, accBased);
  return moving ? baseWhenMoving : baseWhenIdle;
}

/* ----- Mode별 정확도 임계치 ----- */
function accThreshFGByMode(mode) {
  if (mode === "TRANSIT") return 80;
  if (mode === "BIKE") return 35;
  return GPS_ACCURACY_THRESHOLD_FG_BASE; // WALK
}
function accThreshBGByMode(mode) {
  if (mode === "TRANSIT") return 120;
  if (mode === "BIKE") return 80;
  return GPS_ACCURACY_THRESHOLD_BG_BASE; // WALK
}

/* ----- AsyncStorage helpers ----- */
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

async function hardResetSession(reason = "fresh-start") {
  try { await Location.stopLocationUpdatesAsync(TASK_NAME); } catch {}
  await markActive(false);
  await AsyncStorage.multiRemove([
    ID_KEY,
    DIST_KEY,
    LAST_KEY,
    DEST_KEY,
    IN_RADIUS_SINCE_KEY,
    STOPPED_KEY,
    STOP_KIND_KEY,
    STOP_REASON_KEY,
    FINISH_RESULT_KEY,
    START_KEY,
    // 추가 정리
    BOOSTED_KEY,
    MODE_KEY,
    PLACE_KEY,
    ACTIVE_KEY,
  ]);
}

/* ---------- 공통 계산/부스트/도착 판정 헬퍼 ---------- */
// 스텝 캡 계산(공통)
function getStepCap(mode, dtSec) {
  const baseCap =
    mode === "WALK" ? MAX_STEP_WALK_BASE :
    mode === "BIKE" ? MAX_STEP_BIKE_BASE :
    Infinity;
  const dynCap = (STEP_SPEED_CAP[mode] || 60) * dtSec + 5;
  return Math.max(baseCap, dynCap);
}
// 이상치 속도 컷
function getSpikeCap(mode) {
  return mode === "TRANSIT" ? Infinity : MAX_INSTANT_SPEED_WALK_BIKE;
}

// BG 업데이트 옵션 스위치(동작 동일, 가독성 향상)
async function setBgUpdateOptions(boost) {
  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, boost ? BOOSTED_OPTIONS : LOCATION_OPTIONS);
    if (boost) {
      await AsyncStorage.setItem(BOOSTED_KEY, "1");
      log("BG", "boost updates enabled");
    } else {
      await AsyncStorage.removeItem(BOOSTED_KEY);
      log("BG", "boost updates cleared");
    }
  } catch {}
}
// 부스트 토글 (기존 인터페이스 유지)
async function enableBoostIfNeeded() {
  const boosted = await AsyncStorage.getItem(BOOSTED_KEY);
  if (boosted !== "1") {
    await setBgUpdateOptions(true);
  }
}
async function disableBoostIfActive() {
  const boosted = await AsyncStorage.getItem(BOOSTED_KEY);
  if (boosted === "1") {
    await setBgUpdateOptions(false);
  }
}

// BG용 도착 판정 & 종료 처리 (정확도 컷 구간 완화 포함)
async function checkArrivalAndMaybeFinishBG({
  latitude, longitude, accuracy, origTs,
  mode, isActive, id, permitRelaxed
}) {
  if (!isActive || !id) return false;
  const destRaw = await AsyncStorage.getItem(DEST_KEY);
  if (!destRaw) return false;
  const { endLat, endLng } = JSON.parse(destRaw);
  const toEnd = calculateDistance(latitude, longitude, Number(endLat), Number(endLng));

  const accOk = typeof accuracy === "number" &&
    accuracy <= (permitRelaxed ? ARRIVAL_ACCURACY_BG : ARRIVAL_ACCURACY);

  if (permitRelaxed) {
    const last = await readLastCoord();
    const lastNear = last
      ? calculateDistance(last.latitude, last.longitude, Number(endLat), Number(endLng)) <= ARRIVAL_RADIUS + 10
      : false;
    if (!(accOk && toEnd <= ARRIVAL_RADIUS && lastNear)) return false;
  } else {
    if (!(accOk && toEnd <= ARRIVAL_RADIUS)) {
      const had = await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY);
      if (had) log("BG", "leave arrival radius");
      await AsyncStorage.removeItem(IN_RADIUS_SINCE_KEY);
      await disableBoostIfActive();
      return false;
    }
  }

  // 반경 진입 처리
  let since = Number((await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0");
  if (!since) {
    since = origTs;
    await AsyncStorage.setItem(IN_RADIUS_SINCE_KEY, String(since));
    log("BG", "enter arrival radius", { toEnd, accuracy, permitRelaxed });
    await enableBoostIfNeeded();
  }

  // 체류 시간 충족 시 종료
  if (origTs - since >= ARRIVAL_STAY_MS) {
    // 마지막 안전 누적
    const last2 = await readLastCoord();
    if (last2) {
      const d2 = calculateDistance(last2.latitude, last2.longitude, latitude, longitude);
      const dt2 = Math.max(1, (origTs - (last2.timestamp || origTs)) / 1000);
      const v2 = d2 / dt2;
      if (d2 >= MIN_DISTANCE_UPDATE && Number.isFinite(v2)) {
        const prevTotal2 = await readTotalDistance();
        const stepCap = getStepCap(mode, dt2);
        const nextTotal2 = prevTotal2 + Math.min(d2, stepCap);
        await writeTotalDistance(nextTotal2);
        await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
        log("BG", "final accumulate before finish", { d2: Math.round(d2), dt2, v2, nextTotal2: Math.round(nextTotal2) });
      } else {
        drop("finalAcc", { d2: Math.round(d2), dt2, v2 });
      }
    }

    const used = await readTotalDistance();
    try {
      const result = await stopTransport(id, Math.round(used));
      await AsyncStorage.setItem(FINISH_RESULT_KEY, JSON.stringify(result || {}));
      log("BG", "auto-finish", { used });
    } catch {
      const startedAt = Number((await AsyncStorage.getItem(START_KEY)) || Date.now());
      await AsyncStorage.setItem(FINISH_RESULT_KEY, JSON.stringify({
        distanceM: Math.round(used),
        co2Kg: 0,
        durationM: Math.round((Date.now() - startedAt) / 60000),
        points: 0,
      }));
      log("BG", "auto-finish (fallback)", { used });
    }
    await AsyncStorage.setItem(STOP_KIND_KEY, "finish");
    await AsyncStorage.setItem(STOPPED_KEY, "1");
    try { await Location.stopLocationUpdatesAsync(TASK_NAME); } catch {}
    await markActive(false);
    await disableBoostIfActive();
    return true;
  }
  return false;
}

/* -------------------- BG 태스크 -------------------- */
if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data: { locations }, error }) => {
    try {
      if (error) { log("BG", "TaskManager error", { error: String(error) }); return; }
      if (!locations || locations.length === 0) return;

      if ((await AsyncStorage.getItem(STOPPED_KEY)) === "1") { drop("BG_stale", { reason: "stopped-flag" }); return; }

      const loc = locations[0];
      const { latitude, longitude, accuracy } = loc.coords || {};
      const origTs = loc.timestamp || Date.now();
      const age = Date.now() - origTs;
      const isStale = age > STALE_SAMPLE_MS_BG;

      const mode = (await AsyncStorage.getItem(MODE_KEY)) || "WALK";
      const id = await AsyncStorage.getItem(ID_KEY);
      const isActive = (await AsyncStorage.getItem(ACTIVE_KEY)) === "1";

      // BG 정확도 컷(모드별) — 컷에 걸려도 완화 도착 판정 먼저 시도
      const accThreshBG = accThreshBGByMode(mode);
      if (typeof accuracy === "number" && accuracy > accThreshBG) {
        const finished = await checkArrivalAndMaybeFinishBG({
          latitude, longitude, accuracy, origTs, mode, isActive, id, permitRelaxed: true
        });
        if (finished) return;

        drop("accuracyBG", { accuracy, accThreshBG });
        if (WRITE_LAST_ON_BAD_ACC_BG) {
          await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
        }
        return;
      }

      // 누적(항상 먼저!)
      let last = await readLastCoord();
      if (!last) {
        const seed = { latitude, longitude, timestamp: origTs, accuracy };
        await writeLastCoord(seed);
        log("BG", "seed lastCoord", seed);
        last = seed;
      }

      const realDt = Math.max(1, (origTs - (last.timestamp || origTs)) / 1000);
      const d = calculateDistance(last.latitude, last.longitude, latitude, longitude);
      const vReal = d / realDt;
      const minStep = dynamicMinStep(last?.accuracy, accuracy, mode, vReal);

      const stepCap = getStepCap(mode, realDt);
      const spikeCapBG = getSpikeCap(mode);

      if (d >= minStep) {
        if (vReal > spikeCapBG) {
          drop("vSpike", { vReal, d, realDt });
          await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
        } else if (d > stepCap) {
          drop("jumpStep", { d, cap: stepCap, realDt });
          if (isActive && (mode === "WALK" || mode === "BIKE") && id) {
            await AsyncStorage.setItem(STOP_KIND_KEY, "fail");
            await AsyncStorage.setItem(STOP_REASON_KEY, "좌표 점프가 감지되었습니다. 모드를 다시 선택해 주세요.");
            await AsyncStorage.setItem(STOPPED_KEY, "1");
            try { await Location.stopLocationUpdatesAsync(TASK_NAME); } catch {}
            await markActive(false);
            log("BG", "auto-fail(jumpStep)", { d, stepCap });
            return;
          } else {
            await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
          }
        } else {
          if (isActive) {
            const prevTotal = await readTotalDistance();
            const nextTotal = prevTotal + d;
            await writeTotalDistance(nextTotal);
            log("BG", "accumulate", { d: Math.round(d), nextTotal: Math.round(nextTotal), realDt });
          } else {
            log("BG", "inactive - skip accumulate", { d: Math.round(d) });
          }
          await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
        }
      } else {
        drop("smallStep", { d, minStep });
        await writeLastCoord({ latitude, longitude, timestamp: origTs, accuracy });
      }

      // 일반 도착 판정 
      const finished = await checkArrivalAndMaybeFinishBG({
        latitude, longitude, accuracy, origTs, mode, isActive, id, permitRelaxed: false
      });
      if (finished) return;

      if (isStale) { drop("BG_stale", { ageMs: age, handled: "with realDt" }); }
    } catch (e) {
      log("BG", "handler failure", { error: String(e) });
    }
  });
}

/* -------------------- 중복 초기화 방지 락 -------------------- */
let __TM_INIT_LOCK = false;

/* -------------------- 화면 컴포넌트 -------------------- */
export default function TransportMap() {
  const { endLat, endLng, placeName, mode: rawMode, fresh: freshParam } = useLocalSearchParams();
  const router = useRouter();

  const allowedModes = new Set(["WALK", "BIKE", "TRANSIT"]);
  const mode = allowedModes.has(String(rawMode)) ? String(rawMode) : "WALK";
  const isFreshStart = String(freshParam || "0") === "1";

  const [transportId, setTransportId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [currentCoord, setCurrentCoord] = useState(null);
  const [startCoord, setStartCoord] = useState(null);

  const transportIdRef = useRef(null);
  const pendingStopRef = useRef(null);
  const distanceRef = useRef(0);
  const prevCoord = useRef(null);
  const coordBuffer = useRef([]);
  const isTrackingEnded = useRef(false);
  const startTime = useRef(Date.now());
  const inRadiusSince = useRef(null);
  const speedWindow = useRef([]);
  const locationSubRef = useRef(null);
  const lastFGEventTs = useRef(Date.now());
  const fgPokeTimer = useRef(null);
  const fgFastRef = useRef(false);
  const onLocationRef = useRef((_) => {});

  const currentLat = currentCoord?.latitude;
  const currentLng = currentCoord?.longitude;
  const startLat = startCoord?.latitude;
  const startLng = startCoord?.longitude;

  const pushSpeedSample = (now, v) => {
    speedWindow.current.push({ t: now, v });
    const cutoff = now - SPEED_WINDOW_SEC * 1000;
    speedWindow.current = speedWindow.current.filter((s) => s.t >= cutoff);
  };

  const applyDistance = useCallback(async (d, newLast) => {
    distanceRef.current += d;
    setDistance(distanceRef.current);
    try {
      await writeTotalDistance(distanceRef.current);
      if (newLast) await writeLastCoord(newLast);
    } catch (e) {
      log("FG", "persist distance fail", { e: String(e) });
    }
  }, []);

  const stopForegroundWatch = useCallback(async () => {
    if (locationSubRef.current) {
      try { locationSubRef.current.remove(); log("FG", "watchPositionAsync(stop)"); }
      catch (e) { log("FG", "watch remove error", { e: String(e) }); }
      locationSubRef.current = null;
    }
  }, []);

  // 워치 재바인딩(콜백은 ref로 최신 유지)
  const rebindWatch = useCallback(async (opts) => {
    await stopForegroundWatch();
    locationSubRef.current = await Location.watchPositionAsync(opts, (loc) => onLocationRef.current(loc));
    log("FG", "watchPositionAsync(rebind)", { timeInterval: opts.timeInterval, distanceInterval: opts.distanceInterval });
  }, [stopForegroundWatch]);

  // FAST <-> NORMAL 전환
  const switchFgMode = useCallback(async (fast) => {
    if (fgFastRef.current === fast) return;
    fgFastRef.current = fast;
    await rebindWatch(fast ? LOCATION_OPTIONS_FG_FAST : LOCATION_OPTIONS);
  }, [rebindWatch]);

  const startForegroundWatch = useCallback(async () => {
    if (locationSubRef.current) return;
    fgFastRef.current = false;
    await rebindWatch(LOCATION_OPTIONS);
    log("FG", "watchPositionAsync(start)");
  }, [rebindWatch]);

  const startBackgroundUpdates = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (!started) {
      await Location.startLocationUpdatesAsync(TASK_NAME, LOCATION_OPTIONS);
      log("BG", "start updates");
    }
  }, []);

  const stopBackgroundUpdates = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (started) {
      try { await Location.stopLocationUpdatesAsync(TASK_NAME); } catch {}
      log("BG", "stop updates");
    }
  }, []);

  const stopAllLocation = useCallback(async () => {
    await stopForegroundWatch();
    await stopBackgroundUpdates();
  }, [stopForegroundWatch, stopBackgroundUpdates]);

  const handleStop = useCallback(async (isAuto = false, forceFailReason) => {
    if (isTrackingEnded.current) return;
    let usedDistance = 0;
    try {
      await stopAllLocation();
      usedDistance = await readTotalDistance();
      distanceRef.current = usedDistance;
      setDistance(usedDistance);

      const startedAt = Number((await AsyncStorage.getItem(START_KEY)) || startTime.current);
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const avgSpeed = elapsedSec > 0 ? usedDistance / elapsedSec : 0;

      // 실패 강제 사유(WALK/BIKE만)
      if (forceFailReason && (mode === "WALK" || mode === "BIKE")) {
        isTrackingEnded.current = true;
        await markActive(false);
        await AsyncStorage.multiRemove([ID_KEY, DEST_KEY, IN_RADIUS_SINCE_KEY, STOPPED_KEY, START_KEY]);
        router.replace({ pathname: "/pages/transport/transportFail", params: { placeName, reason: forceFailReason } });
        return;
      }

      // 평균 속도 제한: WALK/BIKE만
      const limit = (mode === "WALK") ? SPEED_LIMITS.WALK : (mode === "BIKE") ? SPEED_LIMITS.BIKE : Infinity;
      if ((mode === "WALK" || mode === "BIKE") && avgSpeed > limit) {
        isTrackingEnded.current = true;
        await markActive(false);
        await AsyncStorage.multiRemove([ID_KEY, DEST_KEY, IN_RADIUS_SINCE_KEY, STOPPED_KEY, START_KEY]);
        router.replace({ pathname: "/pages/transport/transportFail", params: { placeName, reason: "이동 속도가 너무 빠릅니다." } });
        return;
      }

      const id = transportIdRef.current ?? transportId;
      if (!id) {
        pendingStopRef.current = isAuto ? "auto" : "manual";
        Alert.alert("잠시만요", "이동 시작 초기화 중입니다. 곧 종료됩니다.");
        return;
      }

      const result = await stopTransport(id, Math.round(usedDistance));
      isTrackingEnded.current = true;
      await markActive(false);
      await AsyncStorage.multiRemove([ID_KEY, DEST_KEY, IN_RADIUS_SINCE_KEY, STOPPED_KEY, START_KEY]);
      router.replace({
        pathname: "/pages/transport/transportFinish",
        params: {
          placeName,
          endLat,
          endLng,
          distanceM: String(result?.distanceM ?? Math.round(usedDistance)),
          co2Kg: String(result?.co2Kg ?? 0),
          durationM: String(result?.durationM ?? Math.round((Date.now() - startedAt) / 60000)),
          points: String(result?.points ?? 0),
        },
      });
    } catch {
      try {
        isTrackingEnded.current = true;
        await markActive(false);
        await AsyncStorage.multiRemove([ID_KEY, DEST_KEY, IN_RADIUS_SINCE_KEY, STOPPED_KEY, START_KEY]);
        const startedAt = Number((await AsyncStorage.getItem(START_KEY)) || startTime.current);
        router.replace({
          pathname: "/pages/transport/transportFinish",
          params: {
            placeName,
            endLat,
            endLng,
            distanceM: String(Math.round(usedDistance)),
            co2Kg: "0",
            durationM: String(Math.round((Date.now() - startedAt) / 60000)),
            points: "0",
          },
        });
      } catch {
        Alert.alert("오류", "이동 종료 중 문제가 발생했습니다.");
      }
    }
  }, [transportId, mode, placeName, endLat, endLng, router, stopAllLocation]);

  const onLocation = useCallback(async (loc) => {
    if (isTrackingEnded.current) return;
    const { latitude, longitude, accuracy } = loc.coords;
    const now = Date.now();
    const ts = loc.timestamp ?? now;
    lastFGEventTs.current = now; // 🔹 FG 콜백 수신

    // 화면 표시 (표시 전용 — 로직 영향 없음)
    setCurrentCoord({ latitude, longitude, timestamp: ts });

    // ✅ 도착 판정
    if (endLat && endLng && typeof accuracy === "number") {
      const distRaw = calculateDistance(latitude, longitude, Number(endLat), Number(endLng));
      const accOk = accuracy <= ARRIVAL_ACCURACY;
      if (accOk && distRaw <= ARRIVAL_RADIUS) {
        if (!inRadiusSince.current) {
          const persisted = Number((await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0");
          inRadiusSince.current = persisted || now;
          if (!persisted) await AsyncStorage.setItem(IN_RADIUS_SINCE_KEY, String(now));
          log("FG", "enter arrival radius", { distRaw, accuracy, since: inRadiusSince.current });
        }
        if (now - inRadiusSince.current >= ARRIVAL_STAY_MS) {
          if (!transportIdRef.current) { pendingStopRef.current = "auto"; return; }
          handleStop(true);
          return;
        }
      } else {
        if (inRadiusSince.current) log("FG", "leave arrival radius");
        inRadiusSince.current = null;
        await AsyncStorage.removeItem(IN_RADIUS_SINCE_KEY);
      }
    }

    // 누적용 — FG 정확도 컷(모드별)
    if (now - ts > STALE_SAMPLE_MS_FG) { drop("FG_stale", { ageMs: now - ts }); return; }
    const accThreshFG = accThreshFGByMode(mode);
    if (!(typeof accuracy === "number") || accuracy > accThreshFG) {
      drop("accuracyFG", { accuracy, accThreshFG });
      return;
    }

    coordBuffer.current.push({ latitude, longitude, timestamp: ts, accuracy });
    if (coordBuffer.current.length > COORD_BUFFER_SIZE) coordBuffer.current.shift();
    const smoothed = getSmoothedCoord(coordBuffer.current);
    if (!smoothed) return;

    if (!prevCoord.current) {
      setStartCoord(smoothed);
      prevCoord.current = smoothed;
      await writeLastCoord(smoothed);
      log("FG", "seed prevCoord", smoothed);
      return;
    }

    const d = calculateDistance(prevCoord.current.latitude, prevCoord.current.longitude, smoothed.latitude, smoothed.longitude);
    const rawDt = (ts - (prevCoord.current.timestamp || ts)) / 1000;
    const dt = Math.max(0.5, rawDt);
    if (dt <= 0) { prevCoord.current = smoothed; return; }

    const instV = d / dt;
    const stepCap = getStepCap(mode, dt);
    const spikeCap = getSpikeCap(mode);

    if (instV > spikeCap) { drop("vSpike", { instV, d, dt }); prevCoord.current = smoothed; return; }

    // 중앙값 속도 (최근 15초)
    const speedMed = median(speedWindow.current.map((s) => s.v));

    // 정지 드리프트 억제: 정확도 기반 + 움직임 인지 최소 스텝
    const minStep = dynamicMinStep(prevCoord.current?.accuracy, smoothed?.accuracy, mode, speedMed);
    if (d < minStep) { drop("smallStep", { d, minStep }); prevCoord.current = smoothed; await writeLastCoord(smoothed); return; }

    // 점프 감지: WALK/BIKE만 실패
    if (d > stepCap) {
      drop("jumpStep", { d, cap: stepCap, dt });
      if (mode === "WALK" || mode === "BIKE") {
        return handleStop(false, "이동 속도가 너무 빠릅니다.");
      }
    }

    // 방향 급변 컷: WALK/BIKE만
    if (coordBuffer.current.length >= 3 && (mode === "WALK" || mode === "BIKE")) {
      const len = coordBuffer.current.length;
      const diff = bearingDiff(coordBuffer.current[len - 3], coordBuffer.current[len - 2], smoothed);
      if (diff > BEARING_DIFF_THRESHOLD) { drop("bearing", { diff }); prevCoord.current = smoothed; return; }
    }

    prevCoord.current = smoothed;
    await applyDistance(d, smoothed);
    log("FG", "accumulate", { d: Math.round(d), total: Math.round(distanceRef.current) });

    // 속도 샘플 업데이트
    pushSpeedSample(now, d / Math.max(1, rawDt));

    // 중앙값 속도 제한: WALK/BIKE만
    const limit = (mode === "WALK") ? SPEED_LIMITS.WALK : (mode === "BIKE") ? SPEED_LIMITS.BIKE : Infinity;
    if ((mode === "WALK" || mode === "BIKE") && median(speedWindow.current.map((s) => s.v)) > limit) {
      handleStop(false, "이동 속도가 너무 빠릅니다.");
      return;
    }

    // 🔹 이동 중이면 FAST, 거의 정지면 NORMAL
    const movingFast =
      (mode === "WALK" && speedMed > 0.9) ||
      (mode === "BIKE" && speedMed > 2.5);
    if (movingFast) switchFgMode(true);
    else if (speedMed < 0.3) switchFgMode(false);
  }, [endLat, endLng, mode, applyDistance, handleStop, switchFgMode]);

  // onLocation 최신화 (watch 콜백은 ref를 호출)
  useEffect(() => { onLocationRef.current = onLocation; }, [onLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      log("APP", `state=${state}`);
      if (isTrackingEnded.current) return;

      // BG 종료 플래그 우선 처리
      const stopped = await AsyncStorage.getItem(STOPPED_KEY);
      if (stopped === "1") {
        const kind = await AsyncStorage.getItem(STOP_KIND_KEY);
        const place = (await AsyncStorage.getItem(PLACE_KEY)) || placeName;
        if (kind === "finish") {
          const raw = await AsyncStorage.getItem(FINISH_RESULT_KEY);
          const res = raw ? JSON.parse(raw) : {};
          await AsyncStorage.multiRemove([STOPPED_KEY, FINISH_RESULT_KEY, STOP_KIND_KEY, STOP_REASON_KEY, ID_KEY, ACTIVE_KEY]);
          isTrackingEnded.current = true;
          log("APP", "navigate finish(BG)", res);
          router.replace({
            pathname: "/pages/transport/transportFinish",
            params: {
              placeName: place,
              endLat,
              endLng,
              distanceM: String(res?.distanceM ?? Math.round(await readTotalDistance())),
              co2Kg: String(res?.co2Kg ?? 0),
              durationM: String(res?.durationM ?? 0),
              points: String(res?.points ?? 0),
            },
          });
          return;
        } else if (kind === "fail") {
          const reason = (await AsyncStorage.getItem(STOP_REASON_KEY)) || "이동이 종료되었습니다.";
          await AsyncStorage.multiRemove([STOPPED_KEY, STOP_KIND_KEY, STOP_REASON_KEY, FINISH_RESULT_KEY, ID_KEY, ACTIVE_KEY]);
          isTrackingEnded.current = true;
          log("APP", "navigate fail(BG)", { reason });
          router.replace({ pathname: "/pages/transport/transportFail", params: { placeName: place, reason } });
          return;
        }
      }

      if (state === "active") {
        await stopBackgroundUpdates();
        await startForegroundWatch();

        const saved = await readTotalDistance();
        distanceRef.current = saved;
        setDistance(saved);

        const last = await readLastCoord();
        if (last) {
          prevCoord.current = last;
          coordBuffer.current = [last];
          setCurrentCoord(last);
        }
        // 속도창은 메모리에서만 관리
        speedWindow.current = [];

        // 도착 타이머 복원
        const persistedSince = Number((await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0");
        if (persistedSince) inRadiusSince.current = persistedSince;
        const sAt = Number((await AsyncStorage.getItem(START_KEY)) || Date.now());
        startTime.current = isFinite(sAt) ? sAt : Date.now();
        log("APP", "active-sync", { saved, startAt: startTime.current, inRadiusSince: inRadiusSince.current });
      } else if (state === "background" || state === "inactive") {
        await stopForegroundWatch();
        await startBackgroundUpdates();
        log("APP", "to BG/inactive");
      }
    });
    return () => sub.remove();
  }, [router, placeName, endLat, endLng, startForegroundWatch, stopForegroundWatch, startBackgroundUpdates, stopBackgroundUpdates]);

  // 🔹 FG 스톨 감지/복구
  useEffect(() => {
    fgPokeTimer.current = setInterval(async () => {
      if (!locationSubRef.current) return;
      const stale = Date.now() - lastFGEventTs.current > FG_STALL_MS;
      if (!stale) return;
      log("FG", "stall detected → poke getCurrentPositionAsync()");
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        onLocationRef.current({ coords: pos.coords, timestamp: pos.timestamp || Date.now() });
      } catch (e) {
        log("FG", "stall poke failed → rebind watch", { e: String(e) });
        await rebindWatch(fgFastRef.current ? LOCATION_OPTIONS_FG_FAST : LOCATION_OPTIONS);
      }
    }, FG_POKE_INTERVAL_MS);
    return () => { if (fgPokeTimer.current) clearInterval(fgPokeTimer.current); };
  }, [rebindWatch]);

  useEffect(() => {
    let unmounted = false;
    const initialize = async () => {
      try {
        if (__TM_INIT_LOCK) { log("BOOT", "skip initialize: locked"); return; }
        __TM_INIT_LOCK = true;

        log("BOOT", "initialize start", { mode, placeName, endLat, endLng, fresh: isFreshStart });

        // 권한
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== "granted") {
          Alert.alert("위치 권한 필요", "서비스 이용을 위해 권한을 허용해주세요.", [{ text: "확인", onPress: () => router.back() }]);
          return;
        }
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== "granted") {
          Alert.alert("백그라운드 위치 권한", "앱이 꺼져도 이동을 기록하려면 권한을 허용해주세요.");
        }

        // 🔴 BG에서 이미 종료된 세션 우선 처리(콜드 스타트 레이스 방지)
        const stoppedAtBG = await AsyncStorage.getItem(STOPPED_KEY);
        if (stoppedAtBG === "1") {
          const kind = await AsyncStorage.getItem(STOP_KIND_KEY);
          const place = (await AsyncStorage.getItem(PLACE_KEY)) || placeName;

          if (kind === "finish") {
            const raw = await AsyncStorage.getItem(FINISH_RESULT_KEY);
            const res = raw ? JSON.parse(raw) : {};
            await AsyncStorage.multiRemove([STOPPED_KEY, FINISH_RESULT_KEY, STOP_KIND_KEY, STOP_REASON_KEY, ID_KEY, ACTIVE_KEY]);
            isTrackingEnded.current = true;
            router.replace({
              pathname: "/pages/transport/transportFinish",
              params: {
                placeName: place,
                endLat,
                endLng,
                distanceM: String(res?.distanceM ?? Math.round(await readTotalDistance())),
                co2Kg: String(res?.co2Kg ?? 0),
                durationM: String(res?.durationM ?? 0),
                points: String(res?.points ?? 0),
              },
            });
            return; // 초기화 흐름 종료
          }

          if (kind === "fail") {
            const reason = (await AsyncStorage.getItem(STOP_REASON_KEY)) || "이동이 종료되었습니다.";
            await AsyncStorage.multiRemove([STOPPED_KEY, STOP_KIND_KEY, STOP_REASON_KEY, FINISH_RESULT_KEY, ID_KEY, ACTIVE_KEY]);
            isTrackingEnded.current = true;
            router.replace({ pathname: "/pages/transport/transportFail", params: { placeName: place, reason } });
            return; // 초기화 흐름 종료
          }
        }

        // 새 출발 강제
        if (isFreshStart) {
          await hardResetSession("fresh-param");
        }

        // 진행 중 세션 재개 우선
        const existingId = await AsyncStorage.getItem(ID_KEY);
        const stoppedFlag = (await AsyncStorage.getItem(STOPPED_KEY)) === "1";
        if (existingId && !stoppedFlag) {
          await markActive(true);
          if (unmounted) return;
          setTransportId(existingId);
          transportIdRef.current = existingId;

          const saved = await readTotalDistance();
          distanceRef.current = saved;
          if (!unmounted) setDistance(saved);

          const lastSaved = await readLastCoord();
          if (lastSaved) {
            prevCoord.current = lastSaved;
            coordBuffer.current = [lastSaved];
            if (!unmounted) {
              setCurrentCoord(lastSaved);
              setStartCoord(lastSaved);
            }
          } else {
            const seedPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
            const { latitude, longitude } = seedPos.coords;
            const seeded = { latitude, longitude, timestamp: Date.now() };
            prevCoord.current = seeded;
            coordBuffer.current = [seeded];
            if (!unmounted) {
              setCurrentCoord(seeded);
              setStartCoord(seeded);
            }
            await writeLastCoord(seeded);
          }

          const sAt = Number((await AsyncStorage.getItem(START_KEY)) || Date.now());
          startTime.current = isFinite(sAt) ? sAt : Date.now();

          await startForegroundWatch();
          log("BOOT", "resumed session", { id: existingId, saved, startAt: startTime.current });
          return;
        }

        // 새 세션: 초기 좌표 seed
        const seedPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        const { latitude, longitude } = seedPos.coords;
        const seeded = { latitude, longitude, timestamp: Date.now() };
        if (!unmounted) {
          setCurrentCoord(seeded);
          setStartCoord(seeded);
        }
        prevCoord.current = seeded;

        // 새 세션 초기화
        await AsyncStorage.multiRemove([STOPPED_KEY, FINISH_RESULT_KEY, IN_RADIUS_SINCE_KEY, STOP_KIND_KEY, STOP_REASON_KEY]);
        await writeTotalDistance(0);
        await writeLastCoord(seeded);
        await markActive(true);
        await AsyncStorage.setItem(MODE_KEY, mode);
        await AsyncStorage.setItem(PLACE_KEY, String(placeName ?? ""));
        const now = Date.now();
        await AsyncStorage.setItem(START_KEY, String(now));
        startTime.current = now;

        // 목적지 저장
        if (endLat && endLng) {
          await AsyncStorage.setItem(DEST_KEY, JSON.stringify({ endLat: Number(endLat), endLng: Number(endLng) }));
        } else {
          await AsyncStorage.removeItem(DEST_KEY);
        }

        // seed가 도착 반경이면 예약 종료
        if (endLat && endLng) {
          const d0 = calculateDistance(latitude, longitude, Number(endLat), Number(endLng));
          if (d0 <= ARRIVAL_RADIUS) { pendingStopRef.current = "auto"; log("BOOT", "seed-in-arrival", { d0 }); }
        }

        await startForegroundWatch();

        // 서버 세션 시작 (ID 미존재 시)
        const idCheck = await AsyncStorage.getItem(ID_KEY);
        if (idCheck) { log("BOOT", "skip startTransport: id already set"); return; }
        const activity = await startTransport(mode);
        const newId = activity?.transportId ?? activity?.id;
        if (!newId) {
          Alert.alert("이동 시작 실패", "transportId를 가져올 수 없습니다.");
          router.back();
          return;
        }
        if (unmounted) return;
        setTransportId(newId);
        transportIdRef.current = newId;
        await AsyncStorage.setItem(ID_KEY, String(newId));
        log("BOOT", "transport started", { id: newId });

        if (pendingStopRef.current) {
          const isAuto = pendingStopRef.current === "auto";
          pendingStopRef.current = null;
          log("BOOT", "pending stop run", { isAuto });
          handleStop(isAuto);
        }

        const saved = await readTotalDistance();
        distanceRef.current = saved;
        if (!unmounted) setDistance(saved);
      } catch (e) {
        log("BOOT", "initialize error", { e: String(e) });
        Alert.alert("오류", "이동 시작 중 문제가 발생했습니다.");
        router.back();
      } finally {
        __TM_INIT_LOCK = false;
      }
    };
    initialize();
    return () => {
      // 언마운트 가드 후 포그라운드 워치 해제
      unmounted = true;
      (async () => {
        await stopForegroundWatch();
        log("BOOT", "unmount cleanup");
      })();
    };
  }, [mode, placeName, endLat, endLng, router, startForegroundWatch, stopForegroundWatch, startBackgroundUpdates, stopBackgroundUpdates, handleStop, isFreshStart]);

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="이동 중" className="px-pageX absolute top-0 left-0 right-0 z-20" />
      {currentLat && currentLng ? (
        <KakaoMapView
          startLat={startLat || currentLat}
          startLng={startLng || currentLng}
          endLat={endLat ? Number(endLat) : undefined}
          endLng={endLng ? Number(endLng) : undefined}
          currentLat={currentLat}
          currentLng={currentLng}
          height="100%"
          width="100%"
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-100">
          <Text>현재 위치를 찾는 중...</Text>
        </View>
      )}

      <View className="absolute left-0 right-0 px-xl py-md top-[120px]">
        <View className="bg-white rounded-2xl shadow-sm px-xl py-lg">
          <View className="flex-row items-center mb-3">
            <Ionicons name="location-outline" size={22} color="#318643" />
            <Text className="font-sf-b text-lg text-gray-800" numberOfLines={1}>도착지: {placeName}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="walk-outline" size={20} color="#555" />
            <Text className="font-sf-md text-base text-gray-600">
              이동 거리: <Text className="font-sf-b text-[#318643]">{Math.round(distance)} m</Text>
            </Text>
          </View>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 px-xl py-3xl">
        <MainButton
          label={transportId ? "이동 종료" : "시작 준비 중..."}
          onPress={() => handleStop(false)}
          disabled={!transportId}
          className={`mb-md ${transportId ? "bg-red-500" : "bg-gray-400"}`}
        />
        {/* 유지: 테스트 버튼 */}
        <MainButton
          label="거리 +100m (테스트)"
          onPress={async () => {
            const cur = currentCoord || prevCoord.current;
            prevCoord.current = cur;
            distanceRef.current += 100;
            setDistance(distanceRef.current);
            await writeTotalDistance(distanceRef.current);
            log("DEV", "+100m clicked", { total: distanceRef.current });
          }}
          className="bg-blue-500 active:bg-blue-700"
        />
      </View>
    </View>
  );
}
