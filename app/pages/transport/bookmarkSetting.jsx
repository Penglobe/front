import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import KakaoMapView from "@components/KakaoMapView";
import colors from "@constants/Colors.cjs";

// ✅ SVG 캐릭터 import
import Tori from "@assets/images/character/tori.svg";
import Ipa from "@assets/images/character/ipa-face.svg";
export default function BookmarkSetting() {
  const {
    lat,
    lng,
    placeName,
    address,
    startLat,
    startLng,
    mode: rawMode,
  } = useLocalSearchParams();
  const mode = rawMode || "TRANSIT"; // ✅ 기본값 보장
  const router = useRouter();

  const userId = 1;
  const [label, setLabel] = useState(placeName || "");

  const handleSave = async () => {
    try {
      await createBookmark(userId, {
        bookmarkLabel: label,
        address,
        lat,
        lng,
      });

      Alert.alert("북마크 등록 완료", "", [
        {
          text: "확인",
          onPress: () =>
            router.push({
              pathname: "/pages/transport/transportBookmark",
              params: {
                startLat,
                startLng,
                mode: mode || "TRANSIT",
              },
            }),
        },
      ]);
    } catch (err) {
      console.error("북마크 등록 실패:", err);
      Alert.alert("북마크 등록 실패");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="북마크 설정" />

      <View className="px-pageX mt-6">
        {/* ✅ 캐릭터 + 안내 텍스트 */}
        <View className="flex-row items-center px-pageX mb-5">
          <Ipa width={40} height={40} style={{ marginRight: 8 }} />
          <Text className="text-gray-700 font-sf-b text-2xl">
            북마크 이름을 설정해 주세요
          </Text>
        </View>

        <View className="bg-white rounded-2xl shadow-md px-5 py-6">
          {/* Input + 수정 아이콘 */}
          <View className="flex-row items-center bg-white rounded-xl px-3 py-3 border border-gray-200">
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="예: 회사, 집, 학교"
              className="flex-1 font-sf-md text-xl"
              placeholderTextColor="#9ca3af"
            />
            <Ionicons
              name="create-outline"
              size={22}
              color="#9ca3af"
              style={{ marginLeft: 8 }}
            />
          </View>

          {/* 지도 */}
          <View className="rounded-xl overflow-hidden mt-5">
            <KakaoMapView endLat={lat} endLng={lng} height={220} />
          </View>

          {/* 주소 */}
          <View className="flex-row items-center bg-gray-50 mt-5">
            <Ionicons
              name="location-outline"
              size={22}
              color={colors.Colors.green}
              style={{ marginRight: 6 }}
            />
            <Text className="font-sf-md text-base">{address}</Text>
          </View>
        </View>

        {/* ✅ 캐릭터 영역 */}
        <View className="items-end m-1 pr-pageX">
          <Tori width={110} height={200} />
        </View>

        {/* 버튼 */}
        <View className="px-pageX mt-auto mb-10">
          <MainButton label="등록하기" onPress={handleSave} />
        </View>
      </View>
    </View>
  );
}
