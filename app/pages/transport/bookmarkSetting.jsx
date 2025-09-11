import React, { useState } from "react";
import { View, Text, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import KakaoMapView from "@components/KakaoMapView";
import colors from "@constants/Colors.cjs";
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

  const mode = rawMode || "TRANSIT";
  const router = useRouter();

  // ✅ 수정 관련 상태
  const [isEditing, setIsEditing] = useState(true); // 처음엔 바로 입력 가능
  const [labelInput, setLabelInput] = useState(placeName || "");

  // ✅ 북마크 저장
  const handleSave = async () => {
    if (!labelInput.trim()) {
      Alert.alert("북마크 이름을 입력해주세요.");
      return;
    }

    try {
      await createBookmark({
        bookmarkLabel: labelInput,
        address,
        lat,
        lng,
      });

      Alert.alert("북마크 등록 완료", "", [
        {
          text: "확인",
          onPress: () =>
            router.replace({
              pathname: "/pages/transport/transportBookmark",
              params: { startLat, startLng, mode },
            }),
        },
      ]);
    } catch (err) {
      console.error("북마크 등록 실패:", err);
      Alert.alert("북마크 등록 실패", "잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="북마크 설정" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-pageX">
          {/* 캐릭터 + 안내 텍스트 */}
          <View className="flex-row items-center py-llg">
            <Ipa width={40} height={40} style={{ marginRight: 8 }} />
            <Text className="text-gray-700 font-sf-b text-h3">
              북마크 이름을 설정해 주세요
            </Text>
          </View>

          <View className="bg-white rounded-2xl shadow-sm px-lg ">
            {/* 이름 (인라인 수정 가능) */}
            <View className="flex-row items-center border-b border-gray-200 py-sm ">
              {isEditing ? (
                <TextInput
                  value={labelInput}
                  onChangeText={setLabelInput}
                  placeholder="예: 회사, 집, 학교"
                  className="flex-1 font-sf-md px-md py-md text-button"
                  autoFocus
                />
              ) : (
                <Text className="flex-1 font-sf-md px-md text-button">
                  {labelInput}
                </Text>
              )}
            </View>

            {/* 지도 */}
            <View className="rounded-xl overflow-hidden py-md">
              <KakaoMapView
                currentLat={lat}
                currentLng={lng}
                key={`${lat}-${lng}`}
                height={260}
              />
            </View>

            {/* 주소 */}
            <View className="flex-row items-center bg-gray-50 py-lg px-sm rounded-lg">
              <Ionicons
                name="location-outline"
                size={25}
                color={colors.Colors.green}
                style={{ marginRight: 10 }}
              />
              <Text className="font-sf-md text-body flex-1 flex-wrap py-sm">
                {address}
              </Text>
            </View>
          </View>

          {/* 버튼 */}
          <View className="py-[100px]">
            <MainButton label="등록하기" onPress={handleSave} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
