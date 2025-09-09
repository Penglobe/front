import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Images } from "@constants/Images";

const AVATARS = [
  { key: "ToriFace", label: "토리", Render: Images.ToriFace },
  { key: "IpaFace", label: "이파", Render: Images.IpaFace },
];

const getAvatarRenderComponent = (profileKey) => {
  const avatar = AVATARS.find((a) => a.key === profileKey);
  return avatar ? avatar.Render : null;
};

export default function RankingCard({ item, isProminent, onPress }) {
  // console.log("RankingCard item.profile:", item.profile);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        className={`bg-white rounded-xl p-4 mb-2 shadow ${
          isProminent ? "border-2 border-green-500" : ""
        }`}
      >
        <View className="flex-row justify-between items-center">
          <Text className="font-sf-b text-black w-1/6">{item.rank}위</Text>
          {item.profile && (
            <View style={{ width: 30, height: 30, marginRight: 5 }}>
              {getAvatarRenderComponent(item.profile) ? (
                React.createElement(getAvatarRenderComponent(item.profile), { width: 30, height: 30 })
              ) : null}
            </View>
          )}
          <Text className="font-sf-r text-black w-auto flex-1">{item.nickname}</Text>
          <Text className="font-sf-b text-black w-2/6 text-right">
            {item.score}kg
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
