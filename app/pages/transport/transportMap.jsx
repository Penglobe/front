import React, { useEffect, useRef, useState } from "react";
import { View, Text, Alert, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { startTransport, stopTransport } from "@services/transportService";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

const TASK_NAME = "TRANSPORT_TRACKING_TASK";
const SPEED_LIMITS = { WALK: 5, BIKE: 12 }; // m/s
const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  timeInterval: 3000,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "환경 걸음",
    notificationBody: "펭글로브가 이동을 기록하고 있습니다.",
  },
};

// 거리 계산 함수
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

// 이동 평균 좌표 계산
function getSmoothedCoord(buffer) {
  if (buffer.length === 0) return null;
  const avgLat = buffer.reduce((sum, p) => sum + p.latitude, 0) / buffer.length;
  const avgLng =
    buffer.reduce((sum, p) => sum + p.longitude, 0) / buffer.length;
  return { latitude: avgLat, longitude: avgLng, timestamp: Date.now() };
}

// 두 벡터 방향 차이 계산
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

// TaskManager 정의
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
  const {
    startLat,
    startLng,
    endLat,
    endLng,
    placeName,
    mode: rawMode,
  } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT";
  const router = useRouter();

  const [transportId, setTransportId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [currentLat, setCurrentLat] = useState(null);
  const [currentLng, setCurrentLng] = useState(null);

  const distanceRef = useRef(0);
  const prevCoord = useRef(null);
  const coordBuffer = useRef([]);
  const ended = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  // 속도 검증
  const checkSpeed = (speed) => {
    if (mode === "WALK" && speed > SPEED_LIMITS.WALK)
      return "도보 이동 속도가 너무 빠릅니다.";
    if (mode === "BIKE" && speed > SPEED_LIMITS.BIKE)
      return "자전거 이동 속도가 너무 빠릅니다.";
    return null;
  };

  // 이동 시작
  useEffect(() => {
    (async () => {
      try {
        const activity = await startTransport(mode);
        if (!activity?.transportId) {
          Alert.alert("이동 시작 실패", "transportId를 가져올 수 없습니다.");
          return;
        }

        setTransportId(activity.transportId);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "위치 권한 필요",
            "서비스 이용을 위해 권한을 허용해주세요.",
            [{ text: "확인", onPress: () => router.back() }]
          );
          return;
        }
        if (Platform.OS === "ios") {
          await Location.requestBackgroundPermissionsAsync();
        }

        const hasStarted =
          await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(TASK_NAME, LOCATION_OPTIONS);
        }
      } catch (err) {
        console.error("이동 시작 실패:", err);
      }
    })();

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

  // 위치 추적
  useEffect(() => {
    let subscription;
    (async () => {
      subscription = await Location.watchPositionAsync(
        LOCATION_OPTIONS,
        async (loc) => {
          if (ended.current) return;

          const { latitude, longitude, accuracy } = loc.coords;
          const now = Date.now();

          if (accuracy > 20) return;

          coordBuffer.current.push({ latitude, longitude, timestamp: now });
          if (coordBuffer.current.length > 5) coordBuffer.current.shift();

          const smoothed = getSmoothedCoord(coordBuffer.current);
          if (!smoothed) return;

          if (!prevCoord.current) {
            prevCoord.current = smoothed;
            setCurrentLat(smoothed.latitude);
            setCurrentLng(smoothed.longitude);
            return;
          }

          const d = calculateDistance(
            prevCoord.current.latitude,
            prevCoord.current.longitude,
            smoothed.latitude,
            smoothed.longitude
          );
          const dt = (now - prevCoord.current.timestamp) / 1000;
          const speed = d / dt;

          if (d < 2 || d > 40) return;
          if (mode === "WALK" && speed > 3) return;
          if (mode === "BIKE" && speed > 8) return;

          if (coordBuffer.current.length >= 3) {
            const len = coordBuffer.current.length;
            const diff = bearingDiff(
              coordBuffer.current[len - 3],
              coordBuffer.current[len - 2],
              smoothed
            );
            if (diff > 90) return;
          }

          setDistance((prev) => prev + d);
          prevCoord.current = smoothed;
          setCurrentLat(smoothed.latitude);
          setCurrentLng(smoothed.longitude);

          if (!ended.current && endLat && endLng) {
            const distToEnd = calculateDistance(
              smoothed.latitude,
              smoothed.longitude,
              parseFloat(endLat),
              parseFloat(endLng)
            );
            if (distToEnd <= 20) {
              ended.current = true;
              await handleStop(true);
            }
          }
        }
      );
    })();
    return () => subscription && subscription.remove();
  }, []);

  // 이동 종료
  const handleStop = async () => {
    try {
      const usedDistance = distanceRef.current;
      const elapsedSec = (Date.now() - startTime.current) / 1000;
      const avgSpeed = usedDistance / elapsedSec;

      const warning = checkSpeed(avgSpeed);
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

      const result = await stopTransport(transportId, Math.round(usedDistance));
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
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar
        title="이동 중"
        className="px-pageX absolute top-0 left-0 right-0 z-20"
      />

      {/* 지도 전체화면 */}
      {currentLat && currentLng ? (
        <KakaoMapView
          startLat={startLat}
          startLng={startLng}
          endLat={endLat}
          endLng={endLng}
          currentLat={currentLat}
          currentLng={currentLng}
          height="100%" // 전체 높이
          width="100%" // 전체 너비
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-100">
          <Text>지도를 불러오는 중...</Text>
        </View>
      )}

      {/* 밑에 카드 & 버튼 오버레이 */}
      <View className="absolute bottom-0 left-0 right-0 px-pageX pb-10">
        <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-4">
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

        <MainButton
          label="이동 종료"
          onPress={handleStop}
          className="bg-red-500 mb-3"
        />

        {/* 🚀 테스트용 버튼 */}
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
