import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";

// ✅ 캐릭터 import
import Ipa from "@assets/images/character/ipa-face.svg";
import IpaTori from "@assets/images/character/ipa-tori-1.svg";

export default function TransportFinish() {
  const { placeName, distanceM, co2Kg, durationM, mode } =
    useLocalSearchParams();
  const router = useRouter();

  // 🚗 자동차로 갔을 경우 배출되는 CO₂ (kg)
  const carCo2 = distanceM ? (parseFloat(distanceM) * 0.0002).toFixed(2) : 0;

  // 교통수단별 절감 비율
  let factor = 1.0;
  if (mode === "TRANSIT") factor = 0.5;

  // 절감된 CO₂ (프론트에서 재계산, 서버와 일치)
  const savedCo2 = (carCo2 * factor).toFixed(2);

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="이동 결과" />

      {/* ✅ 본문 */}
      <View className="flex-1 px-pageX">
        {/* 안내 텍스트 */}
        <View className="flex-row items-center mb-5 mt-5">
          <Ipa width={40} height={40} style={{ marginRight: 6 }} />
          <Text className="text-2xl font-sf-b text-green-700">
            도착했습니다!
          </Text>
        </View>

        {/* 결과 카드 */}
        {/* 총 거리 */}
        <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-5">
          <Text className="font-sf-md text-lg">총 이동 거리</Text>
          <View className="items-end">
            <Text className="text-3xl font-sf-b text-[#318643] mt-1">
              {distanceM} m
            </Text>
          </View>
        </View>

        {/* 총 시간 */}
        <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-5">
          <Text className="font-sf-md text-lg">총 이동 시간</Text>
          <View className="items-end">
            <Text className="text-3xl font-sf-b text-[#318643] mt-1">
              {durationM || 0} 분
            </Text>
          </View>
        </View>

        {/* CO₂ 절감량 */}
        <View className="bg-white rounded-2xl shadow-md px-6 py-5">
          <Text className="font-sf-md text-lg">절감된 CO₂</Text>
          <View className="items-end">
            <Text className="text-3xl font-sf-b text-[#318643] mt-1">
              {savedCo2} kg
            </Text>
          </View>
          <Text className="text-sm mt-1 text-gray-600">
            🚗 자동차로 이동했다면 약 {carCo2} kg CO₂가 배출돼요.
          </Text>
          {mode === "TRANSIT" && (
            <Text className="text-xs mt-1 text-gray-500">
              ※ 대중교통은 절감량의 50%만 인정됩니다.
            </Text>
          )}
        </View>

        {/* 캐릭터 */}
        <View className="items-center mb-20">
          <IpaTori width={260} height={250} />
        </View>
      </View>

      {/* ✅ 하단 버튼 */}
      <View className="px-pageX mb-10">
        <MainButton label="홈으로" onPress={() => router.push("/")} />
      </View>
    </View>
  );
}
