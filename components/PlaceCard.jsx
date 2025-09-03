import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@constants/Colors.cjs";

export default function PlaceCard({
  item,
  isBookmark = false,
  isSelected,
  onSelect,
  readOnly = false,
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
      className="px-4 py-4 rounded-2xl"
      style={{
        backgroundColor,
        marginBottom: isBookmark ? 8 : 0,
        ...shadowStyle,
      }}
      onPress={() => !readOnly && onSelect?.(item)}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text
            className="font-sf-b text-lg"
            style={{
              color: isSelected ? colors.Colors.green : colors.Colors.black,
            }}
          >
            {isBookmark ? item.bookmarkLabel : item.place_name}
          </Text>
          <Text
            className="font-sf-md text-base mt-1"
            style={{
              color: isSelected ? colors.Colors.green : colors.Colors.darkGray,
            }}
          >
            {isBookmark ? item.address : item.address_name}
          </Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.Colors.green}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
