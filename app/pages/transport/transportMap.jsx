import React, { useEffect, useRef, useState } from "react";
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

const TASK_NAME = "TRANSPORT_TRACKING_TASK";
const SPEED_LIMITS = { WALK: 5, BIKE: 12 }; // m/s
const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  timeInterval: 3000,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "이동 추적 중",
    notificationBody: "환경 걸음이 이동을 기록하고 있습니다.",
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

// TaskManager 정의
TaskManager.defineTask(TASK_NAME, ({ data: { locations }, error }) => {
  if (error) {
    console.error("TaskManager error:", error);
    return;
  }
  if (locations?.length > 0) {
    console.log("Background location update:", locations[0].coords);
  }
});

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

  const userId = 1; // TODO: 로그인 사용자 ID

  const [transportId, setTransportId] = useState(null);
  const [distance, setDistance] = useState(0);
  const [currentLat, setCurrentLat] = useState(null); // ✅ 현재 위치 상태
  const [currentLng, setCurrentLng] = useState(null);

  const distanceRef = useRef(0);
  const prevCoord = useRef(null);
  const ended = useRef(false);
  const startTime = useRef(Date.now());

  // distance 최신값 ref에 저장
  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  // 속도 검증
  const checkSpeed = (speed, avg = false) => {
    if (mode === "WALK" && speed > SPEED_LIMITS.WALK)
      return "도보 이동 속도가 너무 빠릅니다.";
    if (mode === "BIKE" && speed > SPEED_LIMITS.BIKE)
      return "자전거 이동 속도가 너무 빠릅니다.";
    return null;
  };

  // 🚀 이동 시작
  useEffect(() => {
    (async () => {
      try {
        const activity = await startTransport(userId, mode);
        setTransportId(activity.transportId);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("위치 권한이 필요합니다.");
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
        Alert.alert("이동 시작 실패", "이동 수단 정보가 없습니다.");
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

  // ✅ 위치 추적
  useEffect(() => {
    let subscription;
    (async () => {
      subscription = await Location.watchPositionAsync(
        LOCATION_OPTIONS,
        async (loc) => {
          if (ended.current) return;

          const { latitude, longitude } = loc.coords;
          const now = Date.now();

          // ✅ 현재 위치 갱신
          setCurrentLat(latitude);
          setCurrentLng(longitude);

          if (prevCoord.current) {
            const d = calculateDistance(
              prevCoord.current.latitude,
              prevCoord.current.longitude,
              latitude,
              longitude
            );
            const dt = (now - prevCoord.current.timestamp) / 1000;
            const speed = d / dt;

            const warning = checkSpeed(speed);
            if (warning) {
              ended.current = true;
              router.push({
                pathname: "/pages/transport/transportFail",
                params: { placeName, reason: warning },
              });
              return;
            }
            setDistance((prev) => prev + d);
          }

          prevCoord.current = { latitude, longitude, timestamp: now };

          // 도착지 감지
          if (!ended.current && endLat && endLng) {
            const distToEnd = calculateDistance(
              latitude,
              longitude,
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

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  // ✅ 이동 종료
  const handleStop = async (auto = false) => {
    try {
      const usedDistance = distanceRef.current;
      const elapsedSec = (Date.now() - startTime.current) / 1000;
      const avgSpeed = usedDistance / elapsedSec;

      const warning = checkSpeed(avgSpeed, true);
      if (warning) {
        router.push({
          pathname: "/pages/transport/transportFail",
          params: { placeName, reason: warning },
        });
        return;
      }

      if (!transportId) {
        console.error("transportId 없음, stopTransport 불가");
        Alert.alert("이동 종료 실패", "이동 ID가 없습니다.");
        return;
      }

      const result = await stopTransport(transportId, Math.round(usedDistance));

      router.push({
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
      Alert.alert("이동 종료 실패", "서버와 통신할 수 없습니다.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="이동 중" className="px-pageX" />

      {/* 지도 */}
      <View className="h-[280px] m-[17px] rounded-2xl overflow-hidden shadow-lg bg-white">
        <KakaoMapView
          startLat={startLat}
          startLng={startLng}
          endLat={endLat}
          endLng={endLng}
          currentLat={currentLat}
          currentLng={currentLng}
          height={280}
        />
      </View>

      {/* 이동 정보 */}
      <View className="px-pageX mt-5">
        <View className="bg-white rounded-2xl shadow-md px-6 py-5">
          <View className="flex-row items-center mb-3">
            <Ionicons
              name="location-outline"
              size={22}
              color="#318643"
              style={{ marginRight: 6 }}
            />
            <Text className="font-sf-b text-lg text-gray-800">
              도착지: {placeName}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name="walk-outline"
              size={20}
              color="#555"
              style={{ marginRight: 6 }}
            />
            <Text className="font-sf-md text-base text-gray-600">
              이동 거리:{" "}
              <Text className="font-sf-b text-[#318643]">
                {Math.round(distance)} m
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* 테스트용 버튼 */}
      <View className="px-pageX mt-4">
        <MainButton
          label="(테스트) 100m 추가"
          onPress={() => {
            setDistance((prev) => {
              const newDistance = prev + 100;
              console.log("가짜 이동 거리 +100m, 현재:", newDistance, "m");
              return newDistance;
            });
          }}
          className="bg-blue-500 active:bg-blue-700"
        />
      </View>

      {/* 종료 버튼 */}
      <View className="px-pageX mt-auto mb-10">
        <MainButton
          label="이동 종료"
          onPress={() => handleStop(false)}
          className="bg-red-500 active:bg-red-700"
        />
      </View>
    </View>
  );
}
