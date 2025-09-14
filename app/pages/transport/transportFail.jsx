// pages/transport/transportFail.jsx
import React, { useEffect } from "react";              
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import ToriObstacle from "@assets/images/character/tori-obstacle.svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";             

const TASK_NAME = "TRANSPORT_TRACKING_TASK";           // ✅ TransportMap과 동일 키

export default function TransportFail() {
  const { reason } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // ✅ 혹시 남아 있을 수 있는 BG 위치업데이트/FG 워치 방어적 정지
        const started = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        if (started) {
          try { await Location.stopLocationUpdatesAsync(TASK_NAME); } catch {}
        }
      } catch {}

      // ✅ 키 전부 정리 (거리/좌표/스트라이크/상태 등)
      try {
        await AsyncStorage.multiRemove([
          "@transport/totalDistanceM",
          "@transport/lastCoord",
          "@transport/speedWindow",
          "@transport/inRadiusSince",
          "@transport/jumpStrikes",
          "@transport/stopped",
          "@transport/stopKind",
          "@transport/stopReason",
          "@transport/finishResult",
          "@transport/isActive",
          "@transport/id",
          "@transport/dest",
        ]);
      } catch {}
    })();
  }, []);

  return (
    <View className="flex-1">
      <BgGradient />

      {/* 중앙 컨텐츠 */}
      <View className="flex-1 py-3xl items-center px-pageX">
        {/* 아이콘 */}
        <View className="items-center mt-40">
          <ToriObstacle width={300} height={180} />
        </View>

        {/* 제목 */}
        <Text className="text-red-600 text-h1 font-bold py-2xl">
          이동 기록이 중단되었어요!
        </Text>

        {/* 설명 */}
        <View className="rounded-2xl px-llg py-xl w-full">
          <Text className="text-gray-800 text-h3 mb-sm">
            {reason || "이동 중 문제가 발생했어요."}
          </Text>
          <Text className="text-gray-600 text-label leading-6">
            다른 이동 수단을 선택해보는 건 어떠세요?{"\n"}
            천천히 걸어가거나, 대중교통 모드도 선택할 수 있어요.
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View className="w-full mt-20 py-6xl">
          <MainButton
            label="홈으로 돌아가기"
            onPress={() => router.replace("/home")}
            className="bg-gray-400"
          />
        </View>
      </View>
    </View>
  );
}
