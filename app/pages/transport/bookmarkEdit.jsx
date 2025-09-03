import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { updateBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import KakaoMapView from "@components/KakaoMapView";
import colors from "@constants/Colors.cjs";

// ✅ SVG 캐릭터 import
import Tori from "@assets/images/character/tori.svg";
import Ipa from "@assets/images/character/ipa-face.svg";

export default function BookmarkEdit() {
  const { bookmarkId, lat, lng, placeName, address } = useLocalSearchParams();
  const router = useRouter();

  const [label, setLabel] = useState(placeName || "");

  const handleSave = async () => {
    try {
      await updateBookmark(bookmarkId, {
        bookmarkLabel: label,
        address,
        lat,
        lng,
      });

      Alert.alert("북마크 수정 완료", "", [
        {
          text: "확인",
          onPress: () => router.back(), // ✅ 수정 후 관리 페이지로 돌아감
        },
      ]);
    } catch (err) {
      console.error("북마크 수정 실패:", err);
      Alert.alert("북마크 수정 실패");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="북마크 수정" />

      <View className="px-pageX mt-6">
        {/* ✅ 캐릭터 + 안내 텍스트 */}
        <View className="flex-row items-center px-pageX mb-5">
          <Ipa width={40} height={40} style={{ marginRight: 8 }} />
          <Text className="text-gray-700 font-sf-b text-2xl">
            북마크 이름을 수정해 주세요
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
          <MainButton label="수정하기" onPress={handleSave} />
        </View>
      </View>
    </View>
  );
}
