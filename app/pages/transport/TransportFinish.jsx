import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function TransportFinish() {
  const { destination } = useLocalSearchParams();
  const dest = destination ? JSON.parse(destination) : null;

  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-xl font-bold">이동 종료</Text>
      {dest && (
        <>
          <Text>도착지: {dest.name}</Text>
          <Text>
            위치: {dest.lat}, {dest.lng}
          </Text>
        </>
      )}
      <Text className="mt-4 text-gray-600">
        🚴 이동 거리, 포인트, CO₂ 절감량은 서버 계산 결과로 표시 예정
      </Text>
    </View>
  );
}
