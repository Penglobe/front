// pages/transport/transportMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import useTransport from "@hooks/useTransport";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

// 거리 계산 함수 (Haversine formula)
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

export default function TransportMap() {
  const {
    startLat,
    startLng,
    endLat,
    endLng,
    placeName,
    mode: rawMode,
  } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT"; // ✅ 기본값 보장
  const router = useRouter();

  const userId = 1; // TODO: 로그인 사용자 ID
  const { startTransport, stopTransport } = useTransport(userId);

  const [distance, setDistance] = useState(0);
  const watchId = useRef(null);
  const prevCoord = useRef(null);
  const ended = useRef(false); // ✅ 중복 종료 방지

  // 🚀 TransportMap 진입 시 자동 시작
  useEffect(() => {
    (async () => {
      try {
        await startTransport(mode);
      } catch (err) {
        console.error("이동 시작 실패:", err);
        Alert.alert("이동 시작 실패", "이동 수단 정보가 없습니다.");
      }
    })();
  }, []);

  // 🔥 위치 추적 + 거리 측정 + 도착 감지
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("위치 권한이 필요합니다.");
        return;
      }

      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
        },
        async (loc) => {
          const { latitude, longitude } = loc.coords;

          // ✅ 이동 거리 누적
          if (prevCoord.current) {
            const d = calculateDistance(
              prevCoord.current.latitude,
              prevCoord.current.longitude,
              latitude,
              longitude
            );
            setDistance((prev) => prev + d);
          }
          prevCoord.current = { latitude, longitude };

          // ✅ 도착지 근처 도착 감지 (50m 반경)
          if (!ended.current && endLat && endLng) {
            const distToEnd = calculateDistance(
              latitude,
              longitude,
              parseFloat(endLat),
              parseFloat(endLng)
            );
            if (distToEnd <= 50) {
              ended.current = true;
              await handleStop(true); // 자동 종료
            }
          }
        }
      );
    })();

    return () => {
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, []);

  // ✅ 이동 종료 (수동/자동 공통)
  const handleStop = async (auto = false) => {
    try {
      const result = await stopTransport(null, Math.round(distance));

      router.push({
        pathname: "/pages/transport/transportFinish",
        params: {
          placeName,
          endLat,
          endLng,
          distanceM: String(result.distanceM),
          co2Kg: String(result.co2Kg),
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

      {/* ✅ 지도 */}
      <View className="h-[280px] m-[17px] rounded-2xl overflow-hidden shadow-lg bg-white">
        <KakaoMapView
          startLat={startLat}
          startLng={startLng}
          endLat={endLat}
          endLng={endLng}
          height={280}
        />
      </View>

      {/* ✅ 이동 정보 카드 */}
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

      {/* ✅ 종료 버튼 */}
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
