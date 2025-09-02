import React, { useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import useTransport from "@hooks/useTransport";
import MainButton from "@components/MainButton";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView"; // ✅ 공통 지도

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

export default function TransportMap() {
  const { startLat, startLng, endLat, endLng, placeName } =
    useLocalSearchParams();
  const router = useRouter();

  const userId = 1; // TODO: 로그인 사용자 ID
  const { stopTransport } = useTransport(userId);

  const [distance, setDistance] = useState(0);
  const watchId = useRef(null);
  const prevCoord = useRef(null);

  // 🔥 위치 추적 시작
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
          distanceInterval: 5, // 최소 5m 이동 시 업데이트
        },
        (loc) => {
          if (prevCoord.current) {
            const d = calculateDistance(
              prevCoord.current.latitude,
              prevCoord.current.longitude,
              loc.coords.latitude,
              loc.coords.longitude
            );
            setDistance((prev) => prev + d);
          }
          prevCoord.current = loc.coords;
        }
      );
    })();

    return () => {
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, []);

  const handleStop = async () => {
    try {
      await stopTransport(null, Math.round(distance));
      Alert.alert("이동 종료", `총 이동 거리: ${Math.round(distance)}m`);
      router.push("/"); // 홈으로 이동
    } catch (err) {
      console.error(err);
      Alert.alert("이동 종료 실패", "서버와 통신할 수 없습니다.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="이동 중" className="px-pageX" />

      {/* ✅ 공통 지도 */}
      <View className="h-[300px] m-[17px] rounded-xl overflow-hidden">
        <KakaoMapView
          startLat={startLat}
          startLng={startLng}
          endLat={endLat}
          endLng={endLng}
          height={300}
        />
      </View>

      {/* ✅ 이동 정보 */}
      <View className="px-pageX mt-4">
        <Text className="text-lg font-bold text-[#318643]">
          도착지: {placeName}
        </Text>
        <Text className="mt-2">이동 거리: {Math.round(distance)} m</Text>
      </View>

      {/* ✅ 종료 버튼 */}
      <View className="px-pageX mt-6">
        <MainButton
          label="이동 종료"
          onPress={handleStop}
          className="bg-red-500"
        />
      </View>
    </View>
  );
}
