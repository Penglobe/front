import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Alert, AppState } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTransport, stopTransport } from "@services/transportService";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";
import { TASK_NAME } from "../../tasks/transportTrackingTask";

/* -------------------- 위치 옵션(FG/BG) -------------------- */
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
const BG_LOCATION_OPTIONS = {
  ...LOCATION_OPTIONS,
  distanceInterval: 0,
  timeInterval: 5000,
  deferredUpdatesInterval: 5000,
  deferredUpdatesDistance: 0,
};

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

const SPEED_LIMITS = { WALK: 2.2, BIKE: 8.5 };
const GPS_ACCURACY_THRESHOLD_FG_BASE = 20; // WALK
const ARRIVAL_ACCURACY = 60;
const ARRIVAL_RADIUS = 30;
const ARRIVAL_STAY_MS = 3000;

const COORD_BUFFER_SIZE = 5;
const MIN_DISTANCE_UPDATE = 1.0;
const MAX_INSTANT_SPEED_WALK_BIKE = 15;
const STALE_SAMPLE_MS_FG = 7000;

const MAX_STEP_WALK_BASE = 35;
const MAX_STEP_BIKE_BASE = 80;
const STEP_SPEED_CAP = { WALK: 4.5, BIKE: 12, TRANSIT: 60 };

const MIN_IDLE_DIST_WALK = 6;
const MIN_IDLE_DIST_BIKE = 10;
const MIN_IDLE_DIST_TRANSIT = 12;

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
  const avgAcc = accs.length
    ? accs.reduce((s, a) => s + a, 0) / accs.length
    : undefined;
  return {
    latitude: avgLat,
    longitude: avgLng,
    timestamp: Date.now(),
    accuracy: avgAcc,
  };
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
        : true;
  const baseWhenMoving = Math.max(
    MIN_DISTANCE_UPDATE,
    Math.min(idleBase, accBased)
  );
  const baseWhenIdle = Math.max(idleBase, accBased);
  return moving ? baseWhenMoving : baseWhenIdle;
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
function accThreshFGByMode(mode) {
  if (mode === "TRANSIT") return 80;
  if (mode === "BIKE") return 35;
  return GPS_ACCURACY_THRESHOLD_FG_BASE; // WALK
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

/* -------------------- 전역 락 -------------------- */
let __TM_INIT_LOCK = false;

export default function TransportMap() {
  const {
    endLat,
    endLng,
    placeName,
    mode: rawMode,
    fresh: freshParam,
  } = useLocalSearchParams();
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
  const locationSubRef = useRef(null);
  const onLocationRef = useRef((_) => {});

  const currentLat = currentCoord?.latitude;
  const currentLng = currentCoord?.longitude;
  const startLat = startCoord?.latitude;
  const startLng = startCoord?.longitude;

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
      try {
        locationSubRef.current.remove();
        log("FG", "watchPositionAsync(stop)");
      } catch (e) {
        log("FG", "watch remove error", { e: String(e) });
      }
      locationSubRef.current = null;
    }
  }, []);

  const startForegroundWatch = useCallback(async () => {
    if (locationSubRef.current) return;
    locationSubRef.current = await Location.watchPositionAsync(
      LOCATION_OPTIONS,
      (loc) => onLocationRef.current(loc)
    );
    log("FG", "watchPositionAsync(start)");
  }, []);

  const startBackgroundUpdatesOnce = useCallback(async () => {
    try {
      const before = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
      log("BG", "hasStarted(before) = " + before);
      if (!before) {
        await Location.startLocationUpdatesAsync(
          TASK_NAME,
          BG_LOCATION_OPTIONS
        );
      }
      const after = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
      log("BG", "hasStarted(after) = " + after);
      const fgPerm = await Location.getForegroundPermissionsAsync();
      const bgPerm = await Location.getBackgroundPermissionsAsync();
      log("BG", "perm", { fg: fgPerm?.status, bg: bgPerm?.status });
    } catch (e) {
      log("BG", "start updates ERROR", { e: String(e) });
    }
  }, []);

  const stopBackgroundUpdates = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (started) {
      try {
        await Location.stopLocationUpdatesAsync(TASK_NAME);
      } catch {}
      log("BG", "stop updates");
    }
  }, []);

  const stopAllLocation = useCallback(async () => {
    await stopForegroundWatch();
    await stopBackgroundUpdates();
  }, [stopForegroundWatch, stopBackgroundUpdates]);

  const handleStoppedFromBGAndNavigate = useCallback(async () => {
    const stopped = await AsyncStorage.getItem(STOPPED_KEY);
    if (stopped !== "1") return false;

    const kind = await AsyncStorage.getItem(STOP_KIND_KEY);
    const place = (await AsyncStorage.getItem(PLACE_KEY)) || placeName;

    if (kind === "finish") {
      const raw = await AsyncStorage.getItem(FINISH_RESULT_KEY);
      const res = raw ? JSON.parse(raw) : {};
      await AsyncStorage.multiRemove([
        STOPPED_KEY,
        FINISH_RESULT_KEY,
        STOP_KIND_KEY,
        STOP_REASON_KEY,
        ID_KEY,
        ACTIVE_KEY,
        FINISHING_KEY,
      ]);
      isTrackingEnded.current = true;
      log("APP", "navigate finish(BG)", res);
      router.replace({
        pathname: "/pages/transport/transportFinish",
        params: {
          placeName: place,
          endLat,
          endLng,
          distanceM: String(
            res?.distanceM ?? Math.round(await readTotalDistance())
          ),
          co2Kg: String(res?.co2Kg ?? 0),
          durationM: String(res?.durationM ?? 0),
          points: String(res?.points ?? 0),
        },
      });
      return true;
    } else if (kind === "fail") {
      const reason =
        (await AsyncStorage.getItem(STOP_REASON_KEY)) ||
        "이동이 종료되었습니다.";
      await AsyncStorage.multiRemove([
        STOPPED_KEY,
        STOP_KIND_KEY,
        STOP_REASON_KEY,
        FINISH_RESULT_KEY,
        ID_KEY,
        ACTIVE_KEY,
        FINISHING_KEY,
      ]);
      isTrackingEnded.current = true;
      log("APP", "navigate fail(BG)", { reason });
      router.replace({
        pathname: "/pages/transport/transportFail",
        params: { placeName: place, reason },
      });
      return true;
    }
    return false;
  }, [router, placeName, endLat, endLng]);

  const handleStop = useCallback(
    async (isAuto = false, forceFailReason) => {
      if (isTrackingEnded.current) return;
      let usedDistance = 0;
      try {
        await stopAllLocation();
        usedDistance = await readTotalDistance();
        distanceRef.current = usedDistance;
        setDistance(usedDistance);

        const startedAt = Number(
          (await AsyncStorage.getItem(START_KEY)) || startTime.current
        );
        const elapsedSec = (Date.now() - startedAt) / 1000;
        const avgSpeed = elapsedSec > 0 ? usedDistance / elapsedSec : 0;

        if (forceFailReason && (mode === "WALK" || mode === "BIKE")) {
          isTrackingEnded.current = true;
          await markActive(false);
          await AsyncStorage.multiRemove([
            ID_KEY,
            DEST_KEY,
            IN_RADIUS_SINCE_KEY,
            STOPPED_KEY,
            START_KEY,
            FINISHING_KEY,
          ]);
          router.replace({
            pathname: "/pages/transport/transportFail",
            params: { placeName, reason: forceFailReason },
          });
          return;
        }

        const limit =
          mode === "WALK"
            ? SPEED_LIMITS.WALK
            : mode === "BIKE"
              ? SPEED_LIMITS.BIKE
              : Infinity;
        if ((mode === "WALK" || mode === "BIKE") && avgSpeed > limit) {
          isTrackingEnded.current = true;
          await markActive(false);
          await AsyncStorage.multiRemove([
            ID_KEY,
            DEST_KEY,
            IN_RADIUS_SINCE_KEY,
            STOPPED_KEY,
            START_KEY,
            FINISHING_KEY,
          ]);
          router.replace({
            pathname: "/pages/transport/transportFail",
            params: { placeName, reason: "이동 속도가 너무 빠릅니다." },
          });
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
        await AsyncStorage.multiRemove([
          ID_KEY,
          DEST_KEY,
          IN_RADIUS_SINCE_KEY,
          STOPPED_KEY,
          START_KEY,
          FINISHING_KEY,
        ]);
        router.replace({
          pathname: "/pages/transport/transportFinish",
          params: {
            placeName,
            endLat,
            endLng,
            distanceM: String(result?.distanceM ?? Math.round(usedDistance)),
            co2Kg: String(result?.co2Kg ?? 0),
            durationM: String(
              result?.durationM ?? Math.round((Date.now() - startedAt) / 60000)
            ),
            points: String(result?.points ?? 0),
          },
        });
      } catch {
        try {
          isTrackingEnded.current = true;
          await markActive(false);
          await AsyncStorage.multiRemove([
            ID_KEY,
            DEST_KEY,
            IN_RADIUS_SINCE_KEY,
            STOPPED_KEY,
            START_KEY,
            FINISHING_KEY,
          ]);
          const startedAt = Number(
            (await AsyncStorage.getItem(START_KEY)) || startTime.current
          );
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
    },
    [transportId, mode, placeName, endLat, endLng, router, stopAllLocation]
  );

  const onLocation = useCallback(
    async (loc) => {
      if (isTrackingEnded.current) return;
      const { latitude, longitude, accuracy } = loc.coords;
      const now = Date.now();
      const ts = loc.timestamp ?? now;

      setCurrentCoord({ latitude, longitude, timestamp: ts });

      // FG 도착 판정 (정밀 기준)
      if (endLat && endLng && typeof accuracy === "number") {
        const distRaw = calculateDistance(
          latitude,
          longitude,
          Number(endLat),
          Number(endLng)
        );
        const accOk = accuracy <= ARRIVAL_ACCURACY;
        if (accOk && distRaw <= ARRIVAL_RADIUS) {
          if (!inRadiusSince.current) {
            const persisted = Number(
              (await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0"
            );
            inRadiusSince.current = persisted || now;
            if (!persisted)
              await AsyncStorage.setItem(IN_RADIUS_SINCE_KEY, String(now));
            log("FG", "enter arrival radius", {
              distRaw,
              accuracy,
              since: inRadiusSince.current,
            });
          }
          if (now - inRadiusSince.current >= ARRIVAL_STAY_MS) {
            if (!transportIdRef.current) {
              pendingStopRef.current = "auto";
              return;
            }
            handleStop(true);
            return;
          }
        } else {
          if (inRadiusSince.current) log("FG", "leave arrival radius");
          inRadiusSince.current = null;
          await AsyncStorage.removeItem(IN_RADIUS_SINCE_KEY);
        }
      }

      if (now - ts > STALE_SAMPLE_MS_FG) {
        drop("FG_stale", { ageMs: now - ts });
        return;
      }
      const accThreshFG = accThreshFGByMode(mode);
      if (!(typeof accuracy === "number") || accuracy > accThreshFG) {
        drop("accuracyFG", { accuracy, accThreshFG });
        return;
      }

      coordBuffer.current.push({
        latitude,
        longitude,
        timestamp: ts,
        accuracy,
      });
      if (coordBuffer.current.length > COORD_BUFFER_SIZE)
        coordBuffer.current.shift();
      const smoothed = getSmoothedCoord(coordBuffer.current);
      if (!smoothed) return;

      if (!prevCoord.current) {
        setStartCoord(smoothed);
        prevCoord.current = smoothed;
        await writeLastCoord(smoothed);
        log("FG", "seed prevCoord", smoothed);
        return;
      }

      const d = calculateDistance(
        prevCoord.current.latitude,
        prevCoord.current.longitude,
        smoothed.latitude,
        smoothed.longitude
      );
      const rawDt = (ts - (prevCoord.current.timestamp || ts)) / 1000;
      const dt = Math.max(0.5, rawDt);
      if (dt <= 0) {
        prevCoord.current = smoothed;
        return;
      }

      const instV = d / dt;
      const stepCap = getStepCap(mode, dt);
      const spikeCap = getSpikeCap(mode);

      if (instV > spikeCap) {
        drop("vSpike", { instV, d, dt });
        prevCoord.current = smoothed;
        return;
      }

      const minStep = dynamicMinStep(
        prevCoord.current?.accuracy,
        smoothed?.accuracy,
        mode,
        instV
      );
      if (d < minStep) {
        drop("smallStep", { d, minStep });
        prevCoord.current = smoothed;
        await writeLastCoord(smoothed);
        return;
      }

      if (d > stepCap) {
        drop("jumpStep", { d, cap: stepCap, dt });
        if (mode === "WALK" || mode === "BIKE") {
          return handleStop(false, "이동 속도가 너무 빠릅니다.");
        }
      }

      prevCoord.current = smoothed;
      await applyDistance(d, smoothed);
      log("FG", "accumulate", {
        d: Math.round(d),
        total: Math.round(distanceRef.current),
      });
    },
    [endLat, endLng, mode, applyDistance, handleStop]
  );

  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) await handleStoppedFromBGAndNavigate();
      })();
      return () => {
        cancelled = true;
      };
    }, [handleStoppedFromBGAndNavigate])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      log("APP", `state=${state}`);
      if (isTrackingEnded.current) return;

      const handled = await handleStoppedFromBGAndNavigate();
      if (handled) return;

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

        const persistedSince = Number(
          (await AsyncStorage.getItem(IN_RADIUS_SINCE_KEY)) || "0"
        );
        if (persistedSince) inRadiusSince.current = persistedSince;
        const sAt = Number(
          (await AsyncStorage.getItem(START_KEY)) || Date.now()
        );
        startTime.current = isFinite(sAt) ? sAt : Date.now();
        log("APP", "active-sync", {
          saved,
          startAt: startTime.current,
          inRadiusSince: inRadiusSince.current,
        });

        const t0 = Date.now();
        const poll = setInterval(async () => {
          const done = await handleStoppedFromBGAndNavigate();
          if (done || Date.now() - t0 > 8000) clearInterval(poll);
        }, 500);
      } else if (state === "background" || state === "inactive") {
        await stopForegroundWatch();
        await startBackgroundUpdatesOnce();
        log("APP", "to BG/inactive");
      }
    });
    return () => sub.remove();
  }, [
    router,
    placeName,
    endLat,
    endLng,
    startForegroundWatch,
    stopForegroundWatch,
    startBackgroundUpdatesOnce,
    stopBackgroundUpdates,
    handleStoppedFromBGAndNavigate,
  ]);

  useEffect(() => {
    let unmounted = false;
    const initialize = async () => {
      try {
        if (__TM_INIT_LOCK) {
          log("BOOT", "skip initialize: locked");
          return;
        }
        __TM_INIT_LOCK = true;

        log("BOOT", "initialize start", {
          mode,
          placeName,
          endLat,
          endLng,
          fresh: isFreshStart,
        });

        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== "granted") {
          Alert.alert(
            "위치 권한 필요",
            "서비스 이용을 위해 권한을 허용해주세요.",
            [{ text: "확인", onPress: () => router.back() }]
          );
          return;
        }
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== "granted") {
          Alert.alert(
            "백그라운드 위치 권한",
            "앱이 꺼져도 이동을 기록하려면 권한을 허용해주세요."
          );
        }

        const stoppedAtBG = await AsyncStorage.getItem(STOPPED_KEY);
        if (stoppedAtBG === "1") {
          const ok = await handleStoppedFromBGAndNavigate();
          if (ok) return;
        }

        if (isFreshStart) {
          try {
            await Location.stopLocationUpdatesAsync(TASK_NAME);
          } catch {}
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
            MODE_KEY,
            PLACE_KEY,
            ACTIVE_KEY,
            FINISHING_KEY,
          ]);
        }

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
            const seedPos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.BestForNavigation,
            });
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

          const sAt = Number(
            (await AsyncStorage.getItem(START_KEY)) || Date.now()
          );
          startTime.current = isFinite(sAt) ? sAt : Date.now();

          await startForegroundWatch();
          log("BOOT", "resumed session", {
            id: existingId,
            saved,
            startAt: startTime.current,
          });
          return;
        }

        const seedPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const { latitude, longitude } = seedPos.coords;
        const seeded = { latitude, longitude, timestamp: Date.now() };
        if (!unmounted) {
          setCurrentCoord(seeded);
          setStartCoord(seeded);
        }
        prevCoord.current = seeded;

        await AsyncStorage.multiRemove([
          STOPPED_KEY,
          FINISH_RESULT_KEY,
          IN_RADIUS_SINCE_KEY,
          STOP_KIND_KEY,
          STOP_REASON_KEY,
          FINISHING_KEY,
        ]);
        await writeTotalDistance(0);
        await writeLastCoord(seeded);
        await markActive(true);
        await AsyncStorage.setItem(MODE_KEY, mode);
        await AsyncStorage.setItem(PLACE_KEY, String(placeName ?? ""));
        const now = Date.now();
        await AsyncStorage.setItem(START_KEY, String(now));
        startTime.current = now;

        if (endLat && endLng) {
          await AsyncStorage.setItem(
            DEST_KEY,
            JSON.stringify({ endLat: Number(endLat), endLng: Number(endLng) })
          );
        } else {
          await AsyncStorage.removeItem(DEST_KEY);
        }

        const d0 =
          endLat && endLng
            ? calculateDistance(
                latitude,
                longitude,
                Number(endLat),
                Number(endLng)
              )
            : Infinity;
        if (d0 <= ARRIVAL_RADIUS) {
          pendingStopRef.current = "auto";
          log("BOOT", "seed-in-arrival", { d0 });
        }

        await startForegroundWatch();

        const idCheck = await AsyncStorage.getItem(ID_KEY);
        if (idCheck) {
          log("BOOT", "skip startTransport: id already set");
          return;
        }
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

        await startBackgroundUpdatesOnce();

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
      // 언마운트 시 포그라운드 워치 정리
      unmounted = true;
      (async () => {
        await stopForegroundWatch();
        log("BOOT", "unmount cleanup");
      })();
    };
  }, [
    mode,
    placeName,
    endLat,
    endLng,
    router,
    startForegroundWatch,
    stopForegroundWatch,
    startBackgroundUpdatesOnce,
    stopBackgroundUpdates,
    handleStop,
    handleStoppedFromBGAndNavigate,
    isFreshStart,
  ]);

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar
        title="이동 중"
        className="px-pageX absolute top-0 left-0 right-0 z-20"
      />
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
            <Text className="font-sf-b text-lg text-gray-800" numberOfLines={1}>
              도착지: {placeName}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="walk-outline" size={20} color="#555" />
            <Text className="font-sf-md text-base text-gray-600">
              이동 거리:{" "}
              <Text className="font-sf-b text-[#318643]">
                {Math.round(distance)} m
              </Text>
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
