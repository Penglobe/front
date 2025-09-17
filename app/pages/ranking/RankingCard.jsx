import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Images } from "@constants/Images";

const AVATAR_MAP = {
  ToriFace: Images.ToriFace,
  IpaFace: Images.IpaFace,
  ProfileIce: Images.ProfileIce,
  Fish: Images.Fish,
  Polarbear: Images.Polarbear,
};

const getAvatarRenderComponent = (profileKey) => {
  return AVATAR_MAP[profileKey] || null;
};

export default function RankingCard({ item, isProminent, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        className={`bg-white rounded-xl p-lg mb-sm shadow-sm ${
          isProminent ? "border-2 border-green" : "border-2 border-gray"
        }`}
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
