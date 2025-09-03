import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";

export default function WeeklyRanking() {
  const [userRankData, setUserRankData] = useState(null);
  const [weeklyRankingList, setWeeklyRankingList] = useState([]);
  const [currentUserRanking, setCurrentUserRanking] = useState(null);

  useEffect(() => {
    // TODO: 실제 API 호출로 교체
    // 사용자 순위 데이터
    const dummyUserRank = {
      currentRank: 7, // 임시: 현재 사용자 순위
      lastWeekRank: 12, // 임시: 지난주 사용자 순위
    };
    setUserRankData(dummyUserRank);

    // 랭킹 리스트 데이터 (1위~10위)
    const dummyList = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      userName:
        i + 1 === 7 ? "나의아이디" : `사용자${String.fromCharCode(65 + i)}`,
      carbonReduction: 10000 - i * 500,
    }));
    setWeeklyRankingList(dummyList);

    // 현재 사용자 랭킹 (10위 밖일 경우)
    const dummyCurrentUser = {
      rank: 7, // 임시: 사용자 본인의 순위
      userName: "나의아이디",
      carbonReduction: 4500,
    };
    setCurrentUserRanking(dummyCurrentUser);
  }, []);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {/* 상단 박스 (사용자 순위 정보) */}
      {userRankData && (
        <LinearGradient
          colors={["#58BE84", "#0C7B7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="p-4 mb-4 shadow"
          style={{ borderRadius: 8 }}
        >
          <View className="flex-col items-center">
            {" "}
            {/* Changed to flex-col and items-center for central alignment */}
            <Text className="text-white font-sf-b text-lg">
              실시간 현재 순위 : {userRankData.currentRank}위
            </Text>
            <Text className="text-white font-sf-r text-sm mt-1">
              {" "}
              {/* Smaller font, slight margin-top */}
              지난 주에는 {userRankData.lastWeekRank}위로 완료했어요!
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      <ScrollView className="flex-1 bg-white rounded-xl p-4 shadow">
        {weeklyRankingList.map((item) => {
          const isCurrentUser = item.userName === currentUserRanking?.userName; // 실제 사용자 ID와 비교해야 함
          const isProminent = isCurrentUser && item.rank <= 10; // 10위 안에 있고 본인일 경우

          return (
            <RankingCard
              key={item.rank}
              item={item}
              isProminent={isProminent}
            />
          );
        })}

        {/* 10위 밖에 있을 경우 ... 및 사용자 카드 표시 */}
        {currentUserRanking && currentUserRanking.rank > 10 && (
          <>
            <Text className="text-center text-gray-600 my-2">...</Text>
            <RankingCard item={currentUserRanking} isProminent={true} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
