import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import colors from "@constants/Colors.cjs";

export default function PlaceCard({
  item,
  isBookmark = false,
  isSelected,
  onSelect = () => {},
  readOnly = false,
  onAdd = () => {}, // ✅ 북마크 추가용 (검색 결과)
  onDetail = () => {}, // ✅ 상세보기용 (북마크)
}) {
  const backgroundColor = isBookmark
    ? isSelected
      ? colors.Colors.white
      : "#E0F2F1"
    : isSelected
      ? colors.Colors.white
      : "transparent";

  const shadowStyle = isBookmark
    ? {
        shadowColor: colors.Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: Platform.OS === "android" ? 3 : 0,
      }
    : {};

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => !readOnly && onSelect(item)}
      className="px-4 py-4 rounded-2xl"
      style={{
        backgroundColor,
        marginBottom: 8,
        ...shadowStyle,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* 제목+주소 묶음 */}
        <View className="flex-1 mr-3">
          <Text
            className="font-sf-b text-lg mb-1"
            style={{
              color: isSelected ? colors.Colors.green : colors.Colors.black,
            }}
            numberOfLines={1}
          >
            {isBookmark ? item.bookmarkLabel : item.place_name}
          </Text>

          <Text
            className="font-sf-md text-base"
            numberOfLines={1}
            style={{
              color: isSelected ? colors.Colors.green : colors.Colors.darkGray,
            }}
          >
            {isBookmark ? item.address : item.address_name}
          </Text>
        </View>

        {/* 버튼 */}
        {!isBookmark ? (
          <TouchableOpacity
            onPress={() => onAdd(item)}
            className="px-3 py-1 rounded-lg bg-[#4CAF50]"
          >
            <Text className="text-white text-label">북마크 추가</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onDetail(item)}
            className="px-3 py-1 rounded-lg bg-[#318643]"
          >
            <Text className="text-white text-label">상세보기</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
