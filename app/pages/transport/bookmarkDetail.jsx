// pages/transport/BookmarkDetail.jsx
import React, { useState } from "react";
import { View, Text, TextInput, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteBookmark, updateBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";

export default function BookmarkDetail() {
  const { bookmarkId, bookmarkLabel, address, currentLat, currentLng } =
    useLocalSearchParams();
  const router = useRouter();

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
        <View className="bg-white rounded-2xl shadow-sm px-lg py-lg">
          {/* ✅ 이름 (인라인 수정 가능) */}
          <View className="flex-row items-center py-sm">
            {isEditing ? (
              <TextInput
                value={labelInput}
                onChangeText={setLabelInput}
                className="ml-2 font-sf-b text-h2 flex-1 border-b border-gray-400"
                autoFocus
                multiline={false}
                numberOfLines={1}
              />
            ) : (
              <Text
                className="ml-2 font-sf-b text-h2 flex-1"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {labelInput}
              </Text>
            )}

            <Pressable
              onPress={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              className="ml-2 p-1 shrink-0" // 👈 아이콘은 절대 줄어들지 않게
            >
              <Ionicons
                name={isEditing ? "checkmark" : "create-outline"}
                size={25}
                color="#318643"
              />
            </Pressable>
          </View>

          {/* ✅ 지도 */}
          <View className="rounded-xl overflow-hidden py-sm">
            <KakaoMapView
              currentLat={currentLat}
              currentLng={currentLng}
              height={300}
            />
          </View>

          {/* ✅ 주소 */}
          <View className="py-md px-xs flex-row items-center">
            <Ionicons name="location-outline" size={25} color="#318643" />
            <Text className="font-sf-md px-xs text-body flex-1 flex-wrap">
              {address}
            </Text>
          </View>
          {/* ✅ 삭제 버튼 (Pressable + 아이콘) */}
          <Pressable
            onPress={handleDelete}
            className="py-sm px-md flex-row items-end justify-end"
          >
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            <Text className="ml-2 font-sf-b text-red-500 text-button">
              삭제
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
