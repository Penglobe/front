// pages/transport/BookmarkDetail.jsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteBookmark, updateBookmark } from "@services/transportService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "@components/CustomAlert";

export default function BookmarkDetail() {
  const { bookmarkId, bookmarkLabel, address, currentLat, currentLng } =
    useLocalSearchParams();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(bookmarkLabel);

  // ✅ Alert 상태
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: "",
    onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    onCancel: undefined,
  });

  // ✅ Alert 오픈 헬퍼 함수
  const openAlert = (config) =>
    setAlertConfig({
      visible: true,
      title: config.title || "",
      message: config.message || "",
      confirmText: config.confirmText || "확인",
      cancelText: config.cancelText, // 없으면 취소 버튼 안보임
      onConfirm: () => {
        // confirm 동작 실행
        if (config.onConfirm) config.onConfirm();
        // 닫기
        setAlertConfig((prev) => ({ ...prev, visible: false }));
      },
      onCancel: config.onCancel
        ? () => {
            config.onCancel();
            setAlertConfig((prev) => ({ ...prev, visible: false }));
          }
        : undefined,
    });

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
      openAlert({
        title: "수정 완료",
        message: "북마크 이름이 변경되었습니다.",
      });
    } catch (err) {
      console.error("북마크 수정 실패:", err);
      openAlert({
        title: "수정 실패",
        message: "잠시 후 다시 시도해주세요.",
      });
    }
  };

  // ✅ 북마크 삭제
  const handleDelete = async () => {
    openAlert({
      title: "북마크 삭제",
      message: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await deleteBookmark(bookmarkId);
          openAlert({
            title: "삭제 완료",
            onConfirm: () => router.back(),
          });
        } catch (err) {
          console.error("북마크 삭제 실패:", err);
          openAlert({
            title: "삭제 실패",
            message: "잠시 후 다시 시도해주세요.",
          });
        }
      },
      onCancel: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    });
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
              className="ml-2 p-1 shrink-0"
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

          {/* ✅ 삭제 버튼 */}
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

      {/* ✅ 커스텀 Alert */}
      <CustomAlert {...alertConfig} />
    </View>
  );
}
