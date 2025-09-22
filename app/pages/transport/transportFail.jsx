// pages/transport/transportFail.jsx
import React, { useEffect, useCallback, useRef } from "react";
import { View, Text, BackHandler } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import ToriObstacle from "@assets/images/character/tori-obstacle.svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const TASK_NAME = "TRANSPORT_TRACKING_TASK";
const KEYS_TO_CLEAR = [
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
];

export default function TransportFail() {
  const { reason } = useLocalSearchParams();
  const router = useRouter();
  const navigatingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const started =
          await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
        if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
      } catch {}

      try {
        const stopped = await AsyncStorage.getItem("@transport/stopped");
        if (stopped === "1") {
          await AsyncStorage.multiRemove(KEYS_TO_CLEAR);
          console.log("🧹 Fail 화면 → 기록 정리 완료");
        }
      } catch (e) {
        console.log("⚠️ Fail 정리 실패", String(e));
      }
    })();
  }, []);

  const goHome = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    console.log("🏠 홈으로 이동 시도");
    router.replace("/(tabs)/home"); // ✅ expo-router 네비게이션
  }, [router]);

  // ✅ 하드웨어 백 버튼 → 홈 이동
  useFocusEffect(
    useCallback(() => {
      const hwBack = BackHandler.addEventListener("hardwareBackPress", () => {
        if (navigatingRef.current) return true;
        goHome();
        return true;
      });
      return () => hwBack.remove();
    }, [goHome])
  );

  return (
    <View className="flex-1">
      <BgGradient />
      <View className="flex-1 py-3xl px-pageX">
        <View className="items-center mt-40">
          <ToriObstacle width={300} height={230} />
        </View>

        <Text className="text-red text-h1 px-llg font-bold py-2xl">
          이동 기록이 중단되었어요!
        </Text>

        <View className="rounded-2xl px-llg py-md w-full">
          <Text className="text-gray-800 text-h3 mb-sm">
            {reason || "이동 중 문제가 발생했어요."}
          </Text>
          <Text className="text-gray-600 text-label leading-6">
            다른 이동 수단을 선택해보는 건 어떠세요?{"\n"}
            천천히 걸어가거나, 대중교통 모드도 선택할 수 있어요.
          </Text>
        </View>

        <View className="w-full py-6xl">
          <MainButton
            label="홈으로 돌아가기"
            onPress={goHome}
            className="bg-gray-400"
          />
        </View>
      </View>
    </View>
  );
}
