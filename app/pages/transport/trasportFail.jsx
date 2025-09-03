// pages/transport/transportFail.jsx
import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";

export default function TransportFail() {
  const { placeName, reason } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-6">
      <BgGradient />
      <HeaderBar title="이동 실패" />

      <Text className="text-red-600 text-2xl font-bold mb-4">
        이동 기록 실패
      </Text>
      <Text className="text-gray-800 text-lg mb-2">{reason}</Text>
      <Text className="text-gray-500 mb-6">도착지: {placeName}</Text>

      <MainButton
        label="다시 시도하기"
        onPress={() => router.replace("/pages/transport/transportStart")}
      />
    </View>
  );
}
