// app/pages/transport/transportFinish.jsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";

// ✅ 캐릭터 import
import Ipa from "@assets/images/character/ipa-face.svg";
import IpaTori from "@assets/images/character/ipa-tori-1.svg";

// ✅ 얼음 아이콘 import
import Ice from "@assets/icons/ice.svg";

export default function TransportFinish() {
  const { placeName, distanceM, co2Kg, durationM, mode, points } =
    useLocalSearchParams();
  const router = useRouter();

  // ✅ 모달 상태
  const [showInfo, setShowInfo] = useState(false);

  // 🚗 자동차로 갔을 경우 배출되는 CO₂ (kg) → 안내문용
  const carCo2 = distanceM ? (parseFloat(distanceM) * 0.0002).toFixed(2) : 0;

  return (
    <View className="flex-1">
      <BgGradient />

      {/* ✅ 커스텀 헤더 (뒤로가기 → transportBookmark으로 replace) */}
      <HeaderBar title="이동 결과" showBack={false} />

      {/* 왼쪽 커스텀 Back 버튼 오버레이 */}
      <Pressable
        onPress={() => router.replace("/pages/transport/transportBookmark")}
        style={{
          position: "absolute",
          top: 55, // 기기 SafeArea 감안해서 조절
          left: 16,
          padding: 8,
        }}
      >
        <Images.Back width={24} height={24} />
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ 본문 */}
        <View className="flex-1 px-pageX">
          {/* 안내 텍스트 */}
          <View className="flex-row items-center mb-5 mt-5">
            {points > 0 ? (
              <View className="px-pageX flex-row items-center">
                <Text className="text-2xl font-sf-b text-green-700">
                  {points}
                </Text>
                <Ice width={40} height={40} />
                <Text className="text-2xl font-sf-b text-green-700">
                  {" "}
                  을 얻었습니다!
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ipa width={40} height={40} style={{ marginRight: 6 }} />
                <Text className="text-2xl font-sf-b text-green-700">
                  도착했습니다!
                </Text>
              </View>
            )}
          </View>

          {/* 결과 카드들 */}
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
            <View className="flex-row items-center justify-between">
              <Text className="font-sf-md text-lg">탄소 절감량</Text>
              {/* 안내 아이콘 */}
              <TouchableOpacity onPress={() => setShowInfo(true)}>
                <Text className="text-gray-400 text-2xl">ⓘ</Text>
              </TouchableOpacity>
            </View>
            <View className="items-end">
              <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                {co2Kg} kg CO₂
              </Text>
            </View>
            <Text className="text-sm mt-3 text-gray-600">
              🚗 자동차로 이동했다면 약 {carCo2} kg CO₂가 배출돼요.
            </Text>
            {mode === "TRANSIT" && (
              <Text className="text-xs mt-1 text-gray-500">
                ※ 대중교통은 절감량의 50%만 인정됩니다.
              </Text>
            )}
          </View>

          {/* 캐릭터 */}
          <View className="items-center">
            <IpaTori width={260} height={220} />
          </View>
        </View>

        {/* ✅ 하단 버튼 */}
        <View className="px-pageX mb-10">
          <MainButton label="홈으로" onPress={() => router.push("/home")} />
        </View>

        {/* ✅ 모달 (팝업) */}
        <Modal visible={showInfo} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-xl p-5 w-4/5">
              <Text className="text-base font-sf-b mb-2">계산 기준</Text>
              <Text className="text-sm text-gray-600 leading-5">
                • 자동차는 1km당 약 0.2kg CO₂ 배출 {"\n"}• 도보·자전거는 100%
                절감 {"\n"}• 대중교통은 50%만 인정 {"\n"}• 절감 1kg당 100포인트
                지급
              </Text>
              <TouchableOpacity
                className="mt-4 self-end"
                onPress={() => setShowInfo(false)}
              >
                <Text className="text-[#318643] font-sf-md">닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
