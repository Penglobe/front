import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
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

// ✅ pendingStop 재시도
async function retryPendingStop() {
  const pendingRaw = await AsyncStorage.getItem("@transport/pendingStop");
  if (!pendingRaw) return;
  const pending = JSON.parse(pendingRaw);
  dlog("STOP", { retry: true, pending });

  const res = await stopTransportSafely(
    pending.transportId,
    pending.totalDistance,
    { source: "RETRY" }
  );

  if (res.ok) {
    await AsyncStorage.removeItem("@transport/pendingStop");
    dlog("STOP", { retry: "success" });
  } else {
    dlog("STOP", { retry: "fail", error: res.error });
  }
}

// ✅ 초기 위치 잡기
async function seedPositionFast() {
  const last = await Location.getLastKnownPositionAsync();
  if (last?.coords) {
    const { latitude, longitude, accuracy } = last.coords;
    return { latitude, longitude, timestamp: Date.now(), accuracy };
  }
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
  const navigation = useNavigation();

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

  // ✅ cleanup (기록만 중단)
  const cleanup = useCallback(async () => {
    try {
      fgWatchRef.current?.remove?.();
      fgWatchRef.current = null;
      await stopBgSafely();
      await AsyncStorage.multiSet([
        [STORAGE.ACTIVE, "0"],
        [STORAGE.STOPPED, "1"],
        [STORAGE.STOP_KIND, "abort"], // 서버 호출 없이 중단
      ]);
      dlog("UI", { forcedCleanup: true });
    } catch (e) {
      dlog("UI", { forcedCleanupError: String(e) });
    }
  }, [stopBgSafely]);

  // ✅ 뒤로가기 시 cleanup
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", () => {
      cleanup();
    });
    return unsub;
  }, [navigation, cleanup]);

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
            await detachFgWatch();
            await stopBgSafely();
            return goFail();
          }
        }

        const ar = await checkArrivalAndStop({
          latitude,
          longitude,
          totalDistance: total,
          source: "FG",
        });

        if (ar.arrived) {
          if (ar.stopped) {
            await detachFgWatch();
            await stopBgSafely();
            return goFinish();
          } else {
            dlog("FG", { arrival: true, stopped: false });
          }
        }
      }
    );
  }, [goFail, goFinish, detachFgWatch, stopBgSafely]);

  useEffect(() => {
    (async () => {
      dlog("UI", { init: true, isFreshStart, mode });
      await retryPendingStop();

      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();

      if (isFreshStart) {
        await AsyncStorage.multiRemove(Object.values(STORAGE));
        setDistance(0);
      }

      const seed = await seedPositionFast();
      if (seed) {
        setCurrentCoord(seed);
        setStartCoord(seed);
        await writeJSON(STORAGE.LAST, seed);
      }

      const res = await startTransport(mode);
      const id = res?.transportId ?? res?.id;
      if (!id) {
        Alert.alert("오류", "transportId가 없습니다.");
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
      } catch (e) {
        dlog("BG", { startFail: String(e) });
      }

      const unsubNet = NetInfo.addEventListener((state) => {
        if (state.isConnected) retryPendingStop();
      });

      return () => {
        unsubNet();
        cleanup(); // 화면 떠날 때 기록만 중단
      };
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const stopped = await AsyncStorage.getItem(STORAGE.STOPPED);
      if (stopped === "1" && !finishedRef.current) {
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
