import React from "react";
import { View, Text } from "react-native";

export default function RankingCard({ item, isProminent }) {
  return (
    <View
      className={`bg-white rounded-xl p-4 mb-2 shadow ${
        isProminent ? "border-2 border-green-500" : ""
      }`}
    >
      <View className="flex-row justify-between items-center">
        <Text className="font-sf-b text-black w-1/6">{item.rank}위</Text>
        <Text className="font-sf-r text-black w-3/6">
          {item.userName || item.regionName}
        </Text>
        <Text className="font-sf-b text-black w-2/6 text-right">
          {item.totalCo2 || item.carbonReduction}kg
        </Text>
      </View>
    </View>
  );
}
