// pages/transport/BookmarkDetail.jsx
import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteBookmark, updateBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

export default function BookmarkDetail() {
  const { bookmarkId, bookmarkLabel, address, currentLat, currentLng } =
    useLocalSearchParams();
  const router = useRouter();

  // ✅ 수정 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(bookmarkLabel);

  // ✅ 북마크 저장
  const handleSave = async () => {
    try {
      await updateBookmark(bookmarkId, {
        bookmarkLabel: labelInput,
        address,
        lat: currentLat,
        lng: currentLng,
      });
      setIsEditing(false);
      Alert.alert("수정 완료", "북마크 이름이 변경되었습니다.");
    } catch (err) {
      console.error("북마크 수정 실패:", err);
      Alert.alert("수정 실패", "잠시 후 다시 시도해주세요.");
    }
  };

  // ✅ 북마크 삭제
  const handleDelete = async () => {
    try {
      Alert.alert("북마크 삭제", "정말 삭제하시겠습니까?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteBookmark(bookmarkId);
            Alert.alert("삭제 완료", "", [
              { text: "확인", onPress: () => router.back() },
            ]);
          },
        },
      ]);
    } catch (err) {
      console.error("북마크 삭제 실패:", err);
      Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="북마크 상세" />

      <View className="px-pageX mt-6">
        {/* ✅ 지도 */}
        <View className="rounded-xl overflow-hidden mb-6">
          <KakaoMapView
            currentLat={currentLat}
            currentLng={currentLng}
            height={250}
          />
        </View>

        {/* ✅ 이름 (인라인 수정 가능) */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="bookmark-outline" size={22} color="#318643" />

          {isEditing ? (
            <TextInput
              value={labelInput}
              onChangeText={setLabelInput}
              className="ml-2 font-sf-b text-lg border-b border-gray-400 flex-1"
              autoFocus
            />
          ) : (
            <Text className="ml-2 font-sf-b text-lg">{labelInput}</Text>
          )}

          <Ionicons
            name={isEditing ? "checkmark" : "create-outline"}
            size={22}
            color="#318643"
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            style={{ marginLeft: 8 }}
          />
        </View>

        {/* ✅ 주소 */}
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={22} color="#318643" />
          <Text className="ml-2 font-sf-md text-base text-gray-700">
            {address}
          </Text>
        </View>
      </View>

      {/* ✅ 버튼 */}
      <View className="px-pageX mt-10">
        <MainButton
          label="삭제"
          onPress={handleDelete}
          className="bg-red-500"
        />
      </View>
    </View>
  );
}
