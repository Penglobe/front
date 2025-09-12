import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { startTransport, stopTransport } from "@services/transportService";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

// --- 상수 및 설정 ---
const TASK_NAME = "TRANSPORT_TRACKING_TASK";
const SPEED_LIMITS = { WALK: 5, BIKE: 12 }; // m/s

const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
  timeInterval: 3000,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "환경 걸음",
    notificationBody: "펭글로브가 이동을 기록하고 있습니다.",
  },
};

const GPS_ACCURACY_THRESHOLD = 20; // m
const COORD_BUFFER_SIZE = 5;
const MIN_DISTANCE_UPDATE = 2; // m
const MAX_DISTANCE_UPDATE = 40; // m
const BEARING_DIFF_THRESHOLD = 90; // deg
const ARRIVAL_RADIUS = 30; // m

// --- Helper Functions ---
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
  const avgLat = buffer.reduce((sum, p) => sum + p.latitude, 0) / buffer.length;
  const avgLng =
    buffer.reduce((sum, p) => sum + p.longitude, 0) / buffer.length;
  return { latitude: avgLat, longitude: avgLng, timestamp: Date.now() };
}

function bearingDiff(coord1, coord2, coord3) {
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

  const b1 = bearing(coord1, coord2);
  const b2 = bearing(coord2, coord3);
  return Math.abs(b1 - b2);
}

// --- TaskManager ---
if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, ({ data: { locations }, error }) => {
    if (error) {
      console.error("TaskManager error:", error);
      return;
    }
    if (locations?.length > 0) {
      console.log("📍 Background location update:", locations[0].coords);
    }
  });
}

export default function TransportMap() {
  const { endLat, endLng, placeName, mode: rawMode } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT";
  const router = useRouter();

  const [transportId, setTransportId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [currentCoord, setCurrentCoord] = useState(null);
  const [startCoord, setStartCoord] = useState(null);

  const distanceRef = useRef(0);
  const prevCoord = useRef(null);
  const coordBuffer = useRef([]);
  const isTrackingEnded = useRef(false);
  const startTime = useRef(Date.now());
  const nearEndCounter = useRef(0);

  // --- 1. 이동 시작 ---
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        const activity = await startTransport(mode);
        if (!activity?.transportId) {
          Alert.alert("이동 시작 실패", "transportId를 가져올 수 없습니다.");
          router.back();
          return;
        }
        setTransportId(activity.transportId);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "위치 권한 필요",
            "서비스 이용을 위해 권한을 허용해주세요.",
            [{ text: "확인", onPress: () => router.back() }]
          );
          return;
        }

        if (Platform.OS === "android") {
          const backgroundStatus =
            await Location.requestBackgroundPermissionsAsync();
          if (backgroundStatus.status !== "granted") {
            Alert.alert(
              "백그라운드 위치 권한 필요",
              "앱이 꺼져도 이동을 기록하려면 권한을 허용해주세요."
            );
          }
        }
      } catch (err) {
        console.error("이동 시작 실패:", err);
        Alert.alert("오류", "이동 시작 중 문제가 발생했습니다.");
        router.back();
      }
    };

    initializeTracking();

    return () => {
      (async () => {
        const hasStarted =
          await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(TASK_NAME);
        }
      })();
    };
  }, []);

  // --- 2. 위치 추적 ---
  useEffect(() => {
    if (!transportId) return;

    const watchPromise = Location.watchPositionAsync(
      LOCATION_OPTIONS,
      (loc) => {
        if (isTrackingEnded.current) return;

        const { latitude, longitude, accuracy } = loc.coords;
        const now = Date.now();

        if (accuracy > GPS_ACCURACY_THRESHOLD) return;

        coordBuffer.current.push({ latitude, longitude, timestamp: now });
        if (coordBuffer.current.length > COORD_BUFFER_SIZE)
          coordBuffer.current.shift();

        const smoothed = getSmoothedCoord(coordBuffer.current);
        if (!smoothed) return;

        setCurrentCoord(smoothed);

        if (!prevCoord.current) {
          setStartCoord(smoothed);
          prevCoord.current = smoothed;
          return;
        }

        const d = calculateDistance(
          prevCoord.current.latitude,
          prevCoord.current.longitude,
          smoothed.latitude,
          smoothed.longitude
        );

        const dt = (now - prevCoord.current.timestamp) / 1000;
        if (dt === 0) return;

        if (d < MIN_DISTANCE_UPDATE || d > MAX_DISTANCE_UPDATE) return;

        if (coordBuffer.current.length >= 3) {
          const len = coordBuffer.current.length;
          const diff = bearingDiff(
            coordBuffer.current[len - 3],
            coordBuffer.current[len - 2],
            smoothed
          );
          if (diff > BEARING_DIFF_THRESHOLD) return;
        }

        distanceRef.current += d;
        setDistance(distanceRef.current);
        prevCoord.current = smoothed;

        // 도착 판정 (2번 연속 진입)
        if (endLat && endLng) {
          const distToEnd = calculateDistance(
            smoothed.latitude,
            smoothed.longitude,
            parseFloat(endLat),
            parseFloat(endLng)
          );
          if (distToEnd <= ARRIVAL_RADIUS) {
            nearEndCounter.current++;
            if (nearEndCounter.current >= 2) {
              handleStop(true);
            }
          } else {
            nearEndCounter.current = 0;
          }
        }
      }
    );

    return () => {
      watchPromise.then((sub) => sub.remove());
    };
  }, [transportId, endLat, endLng]);

  // --- 3. 이동 종료 ---
  const handleStop = useCallback(
    async (isAuto = false) => {
      if (isTrackingEnded.current) return;
      isTrackingEnded.current = true;

      try {
        const usedDistance = distanceRef.current;
        const elapsedSec = (Date.now() - startTime.current) / 1000;
        const avgSpeed = elapsedSec > 0 ? usedDistance / elapsedSec : 0;

        const warning =
          mode === "WALK" && avgSpeed > SPEED_LIMITS.WALK
            ? "도보 이동 속도가 너무 빠릅니다."
            : mode === "BIKE" && avgSpeed > SPEED_LIMITS.BIKE
              ? "자전거 이동 속도가 너무 빠릅니다."
              : null;

        if (warning) {
          router.replace({
            pathname: "/pages/transport/transportFail",
            params: { placeName, reason: warning },
          });
          return;
        }

        if (!transportId) {
          Alert.alert("이동 종료 실패", "transportId가 없습니다.");
          return;
        }

        const result = await stopTransport(
          transportId,
          Math.round(usedDistance)
        );

        router.replace({
          pathname: "/pages/transport/transportFinish",
          params: {
            placeName,
            endLat,
            endLng,
            distanceM: String(result.distanceM),
            co2Kg: String(result.co2Kg),
            durationM: String(result.durationM),
            points: String(result.points || 0),
          },
        });
      } catch (err) {
        console.error("stopTransport 실패:", err);
        Alert.alert("오류", "이동 종료 중 문제가 발생했습니다.");
      }
    },
    [transportId, mode, placeName, endLat, endLng, router]
  );

  const currentLat = currentCoord?.latitude;
  const currentLng = currentCoord?.longitude;
  const startLat = startCoord?.latitude;
  const startLng = startCoord?.longitude;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar
        title="이동 중"
        className="px-pageX absolute top-0 left-0 right-0 z-20"
      />

      {/* 지도 */}
      {currentLat && currentLng ? (
        <KakaoMapView
          startLat={startLat || currentLat}
          startLng={startLng || currentLng}
          endLat={endLat}
          endLng={endLng}
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

      {/* 도착지 & 이동거리 카드 */}
      <View className="absolute left-0 right-0 px-xl py-md top-[120px]">
        <View className="bg-white rounded-2xl shadow-sm px-xl py-lg">
          <View className="flex-row items-center mb-3">
            <Ionicons name="location-outline" size={22} color="#318643" />
            <Text className="font-sf-b text-lg text-gray-800">
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

      {/* 하단 버튼 */}
      <View className="absolute bottom-0 left-0 right-0 px-xl py-3xl">
        <MainButton
          label="이동 종료"
          onPress={() => handleStop(false)}
          className="bg-red-500 mb-md"
        />
        <MainButton
          label="거리 +100m (테스트)"
          onPress={() => {
            setDistance((prev) => prev + 100);
            distanceRef.current += 100;
          }}
          className="bg-blue-500 active:bg-blue-700"
        />
      </View>
    </View>
  );
}
