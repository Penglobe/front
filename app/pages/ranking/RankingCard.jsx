import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Images } from "@constants/Images";

const AVATAR_MAP = {
  ToriFace: Images.ToriFace,
  IpaFace: Images.IpaFace,
};

const getAvatarRenderComponent = (profileKey) => {
  return AVATAR_MAP[profileKey] || null;
};

export default function RankingCard({ item, isProminent, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        className={`bg-white rounded-xl p-lg mb-2 shadow-sm ${
          isProminent ? "border-2 border-green" : ""
        }`}
        style={{
          shadowColor: "#000000", // 검은색으로 변경
          shadowOffset: { width: 0, height: 5 }, // 세로 오프셋 증가
          shadowOpacity: 1,
          shadowRadius: 5, // 블러 반경 증가
          elevation: 8, // Android 그림자 깊이 증가
        }}
      >
        <View className="flex-row justify-between items-center">
          <Text className="font-sf-b text-black w-1/6">{item.rank}위</Text>
          {item.profile &&
            (() => {
              const AvatarComponent = getAvatarRenderComponent(item.profile);
              return AvatarComponent ? (
                <View style={{ width: 30, height: 30, marginRight: 5 }}>
                  <AvatarComponent width={30} height={30} />
                </View>
              ) : null;
            })()}
          <Text className="font-sf-r text-black w-auto flex-1">
            {item.nickname}
          </Text>
          <Text className="font-sf-b text-black w-2/6 text-right">
            {item.score}kg
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
