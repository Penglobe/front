// pages/transport/TransportMap.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startTransport } from "@services/transportService";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "@components/LoadingScreen";

import {
  TASK_NAME,
  STORAGE,
  dlog,
  calculateDistance,
  readJSON,
  writeJSON,
  readNumber,
  writeNumber,
  shouldIgnoreMove,
  checkSpeed,
  ACCURACY_MAX_M,
  ARRIVAL_RADIUS_M,
  checkArrivalAndStop,
  stopTransportSafely,
} from "../../../tasks/transportShared";

// ✅ 초기 위치 빠르게 잡기
async function seedPositionFast() {
  // 1. 마지막 위치 있으면 바로 반환
  const last = await Location.getLastKnownPositionAsync();
  if (last?.coords) {
    const { latitude, longitude, accuracy } = last.coords;
    return { latitude, longitude, timestamp: Date.now(), accuracy };
  }

  // 2. 빠른 응답 우선 (낮은 정확도)
  try {
    const quick = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      timeout: 2000,
      maximumAge: 15000,
    });
    const { latitude, longitude, accuracy } = quick.coords;
    return { latitude, longitude, timestamp: Date.now(), accuracy };
  } catch {
    return null;
  }
}

export default function TransportMap() {
  const {
    endLat,
    endLng,
    placeName,
    mode: rawMode,
    fresh,
  } = useLocalSearchParams();
  const router = useRouter();

  const mode = ["WALK", "BIKE", "TRANSIT"].includes(rawMode) ? rawMode : "WALK";
  const isFreshStart = fresh === "1";

  const [transportId, setTransportId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [currentCoord, setCurrentCoord] = useState(null);
  const [startCoord, setStartCoord] = useState(null);

  const fgWatchRef = useRef(null);
  const finishedRef = useRef(false);

  const goFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    dlog("UI", { nav: "finish" });
    router.replace("/pages/transport/transportFinish");
  }, [router]);

  const goFail = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const reason =
      (await AsyncStorage.getItem(STORAGE.STOP_REASON)) ||
      "이동 중 문제가 발생했어요.";
    dlog("UI", { nav: "fail", reason });
    router.replace({
      pathname: "/pages/transport/transportFail",
      params: { reason },
    });
  }, [router]);

  const stopBgSafely = useCallback(async () => {
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
      if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
      dlog("BG", { action: "stop_updates" });
    } catch {}
  }, []);

  const detachFgWatch = useCallback(async () => {
    try {
      fgWatchRef.current?.remove?.();
      dlog("FG", { action: "stop_watch" });
    } catch {}
    fgWatchRef.current = null;
  }, []);

  const startForegroundWatch = useCallback(async () => {
    dlog("FG", { action: "start_watch" });
    fgWatchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      async (loc) => {
        const stopped = await AsyncStorage.getItem(STORAGE.STOPPED);
        if (stopped === "1") {
          dlog("FG", { info: "already_stopped" });
          await detachFgWatch();
          await stopBgSafely();
          const kind = await AsyncStorage.getItem(STORAGE.STOP_KIND);
          return kind === "fail" ? goFail() : goFinish();
        }

        const { latitude, longitude, accuracy } = loc.coords;
        const now = Date.now();
        if (accuracy > ACCURACY_MAX_M) {
          dlog("FG", { drop: "low_accuracy", accuracy });
          return;
        }

        const prev = await readJSON(STORAGE.LAST);
        if (!prev) {
          const init = { latitude, longitude, timestamp: now };
          setStartCoord(init);
          setCurrentCoord(init);
          await writeJSON(STORAGE.LAST, init);
          dlog("FG", { seed: "set_last_coord" });
          return;
        }

        const d = calculateDistance(
          prev.latitude,
          prev.longitude,
          latitude,
          longitude
        );
        const dt = (now - (prev.timestamp || now)) / 1000;

        const ignore = shouldIgnoreMove(d, dt);
        if (ignore.ignore) {
          dlog("FG", {
            ignore: ignore.reason,
            d: Math.round(d),
            dt: Math.round(dt * 10) / 10,
          });
          return;
        }

        const total = (await readNumber(STORAGE.DIST)) + d;
        await writeNumber(STORAGE.DIST, total);
        setDistance(total);
        setCurrentCoord({ latitude, longitude, timestamp: now });
        await writeJSON(STORAGE.LAST, { latitude, longitude, timestamp: now });

        dlog("FG", {
          addDist: Math.round(d),
          total: Math.round(total),
          lat: latitude,
          lng: longitude,
        });

        // 속도 체크
        if (dt > 0) {
          const modeCur = (await AsyncStorage.getItem(STORAGE.MODE)) || "WALK";
          const speed = checkSpeed(d / dt, modeCur);
          if (speed.over) {
            await AsyncStorage.multiSet([
              [STORAGE.STOPPED, "1"],
              [STORAGE.STOP_KIND, "fail"],
              [STORAGE.STOP_REASON, "이동 속도가 너무 빠릅니다."],
              [STORAGE.ACTIVE, "0"],
            ]);
            dlog("FG", {
              speedViolation: true,
              mode: modeCur,
              speed: Math.round(speed.speed * 100) / 100,
              limit: speed.limit,
            });
            await detachFgWatch();
            await stopBgSafely();
            return goFail();
          }
        }

        // ✅ 도착 판정 (포그라운드에서도 수행)
        const ar = await checkArrivalAndStop({
          latitude,
          longitude,
          totalDistance: total,
          source: "FG",
        });

        if (ar.arrived) {
          if (ar.stopped) {
            dlog("FG", { arrival: true, stopped: true });
            await detachFgWatch();
            await stopBgSafely();
            return goFinish();
          } else {
            dlog("FG", {
              arrival: true,
              stopped: false,
              info: "will_retry_bg",
            });
          }
        }
      }
    );
  }, [goFail, goFinish, detachFgWatch, stopBgSafely]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      dlog("UI", { init: true, isFreshStart, mode });

      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();

      if (isFreshStart) {
        await AsyncStorage.multiRemove([
          STORAGE.ID,
          STORAGE.DIST,
          STORAGE.LAST,
          STORAGE.START,
          STORAGE.ACTIVE,
          STORAGE.DEST,
          STORAGE.STOPPED,
          STORAGE.STOP_KIND,
          STORAGE.STOP_REASON,
          STORAGE.FINISH_RESULT,
          STORAGE.STOPPING,
        ]);
        setDistance(0);
        dlog("UI", { reset: "fresh_start" });
      }

      // ✅ 빠른 시드 위치 확보
      const seed = await seedPositionFast();
      if (seed && mounted) {
        setCurrentCoord(seed);
        setStartCoord(seed);
        await writeJSON(STORAGE.LAST, seed);
        dlog("UI", {
          seedCoord: {
            lat: seed.latitude,
            lng: seed.longitude,
            acc: seed.accuracy,
          },
        });
      }

      // 서버에 이동 시작
      const res = await startTransport(mode);
      const id = res?.transportId ?? res?.id;
      if (!id) {
        Alert.alert("오류", "transportId가 없습니다.");
        dlog("UI", { error: "no_transport_id" });
        return;
      }

      await AsyncStorage.multiSet([
        [STORAGE.ID, String(id)],
        [STORAGE.MODE, mode],
        [STORAGE.PLACE, String(placeName ?? "")],
        [STORAGE.START, String(Date.now())],
        [STORAGE.ACTIVE, "1"],
        [
          STORAGE.DEST,
          JSON.stringify({ endLat: Number(endLat), endLng: Number(endLng) }),
        ],
      ]);
      setTransportId(id);
      dlog("UI", { started: true, id, mode });

      // ✅ 초기 위치가 도착 반경 안일 경우 즉시 종료 처리
      if (seed && endLat && endLng) {
        const dist = calculateDistance(
          seed.latitude,
          seed.longitude,
          Number(endLat),
          Number(endLng)
        );
        dlog("UI", {
          initialDistToDest: Math.round(dist),
          radius: ARRIVAL_RADIUS_M,
        });

        if (dist <= ARRIVAL_RADIUS_M) {
          const stop = await stopTransportSafely(id, 0, { source: "INIT" });
          if (stop.ok) {
            await AsyncStorage.multiSet([
              [STORAGE.STOPPED, "1"],
              [STORAGE.STOP_KIND, "finish"],
              [STORAGE.ACTIVE, "0"],
            ]);
            return goFinish();
          } else {
            dlog("UI", { initialStopFail: stop.error });
          }
        }
      }

      // ✅ watchPositionAsync 즉시 시작 → 초기 위치도 빨리 확보 가능
      await startForegroundWatch();

      try {
        await Location.startLocationUpdatesAsync(TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          activityType: Location.ActivityType.Fitness,
          foregroundService: {
            notificationTitle: "환경 걸음",
            notificationBody: "이동 기록 중...",
          },
        });
        dlog("BG", { action: "start_updates" });
      } catch (e) {
        dlog("BG", { startFail: String(e) });
      }
    })();

    return () => {
      mounted = false;
      detachFgWatch();
    };
  }, []);

  // ✅ Fallback: STOPPED_KEY 폴링
  useEffect(() => {
    const interval = setInterval(async () => {
      const stopped = await AsyncStorage.getItem(STORAGE.STOPPED);
      if (stopped === "1" && !finishedRef.current) {
        dlog("UI", { polling: "detected_stopped" });
        const kind = await AsyncStorage.getItem(STORAGE.STOP_KIND);
        return kind === "fail" ? goFail() : goFinish();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [goFail, goFinish]);

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar
        title="이동 중"
        className="px-pageX absolute top-0 left-0 right-0 z-20"
      />

      {currentCoord ? (
        <KakaoMapView
          startLat={startCoord?.latitude}
          startLng={startCoord?.longitude}
          endLat={endLat ? Number(endLat) : undefined}
          endLng={endLng ? Number(endLng) : undefined}
          currentLat={currentCoord.latitude}
          currentLng={currentCoord.longitude}
          height="100%"
          width="100%"
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-100">
          <LoadingScreen message="현재 위치를 찾는 중..." />
        </View>
      )}

      {/* ✅ 이동거리 카드 */}
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
          onPress={async () => {
            if (finishedRef.current) return;
            const total = await readNumber(STORAGE.DIST);
            const id = await AsyncStorage.getItem(STORAGE.ID);
            if (!id) return;

            const res = await stopTransportSafely(id, total, {
              source: "MANUAL",
            });
            if (!res.ok) {
              dlog("UI", { manualStopFail: res.error });
              // 실패여도 화면 전환은 하되, BG에서 재시도/후속 처리
            }

            await detachFgWatch();
            await stopBgSafely();
            await AsyncStorage.multiSet([
              [STORAGE.STOPPED, "1"],
              [STORAGE.STOP_KIND, "finish"],
              [STORAGE.ACTIVE, "0"],
            ]);
            goFinish();
          }}
          disabled={!transportId}
          className={`mb-md ${transportId ? "bg-red-500" : "bg-gray-400"}`}
        />
      </View>
    </View>
  );
}
