// pages/bookmark/bookmarkSetting.jsx
import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";

export default function BookmarkSetting() {
  const { lat, lng, placeName, address, startLat, startLng } =
    useLocalSearchParams();
  const router = useRouter();

  const userId = 1; // TODO: 로그인 사용자 ID
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
              pathname: "/pages/transport/transportMap",
              params: {
                startLat,
                startLng,
                endLat: lat,
                endLng: lng,
                placeName: label,
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
      <HeaderBar title="북마크 설정" className="px-pageX" />

      <View className="px-pageX mt-6">
        <Text className="text-gray-700 mb-2">북마크 이름</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="북마크 이름을 입력하세요"
          className="bg-white rounded-lg px-4 py-2"
        />

        <Text className="mt-4 text-gray-500">{address}</Text>
      </View>

      <View className="px-pageX mt-8">
        <MainButton label="등록하기" onPress={handleSave} />
      </View>
    </View>
  );
}
