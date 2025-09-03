import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";

export default function GlobalRanking() {
  const [globalRankingList, setGlobalRankingList] = useState([]);

  useEffect(() => {
    // TODO: 실제 API 호출로 교체
    const dummyList = Array.from({ length: 20 }, (_, i) => ({
      rank: i + 1,
      userName: `글로벌사용자${String.fromCharCode(65 + i)}`,
      carbonReduction: 20000 - i * 800,
    }));
    setGlobalRankingList(dummyList);
  }, []);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <ScrollView className="flex-1 bg-white rounded-xl p-4 shadow">
        <Text className="text-gray-800 font-sf-b text-lg mb-4">
          전체 사용자 랭킹
        </Text>
        {globalRankingList.map((item) => (
          <RankingCard
            key={item.rank}
            item={item}
            isProminent={false} // 전체 랭킹에서는 강조 없음
          />
        ))}
      </ScrollView>
    </View>
  );
}
