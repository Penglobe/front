import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";

const MY_USER_NAME = "나의아이디";

export default function GlobalRanking() {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalRanking = async () => {
      try {
        // 백엔드 API 호출
        const response = await fetch(
          "http://192.168.0.79:8080/rankings/global"
        );
        const data = await response.json();

        setRankingList(data.top10);
        setMyRank(data.myRank);
      } catch (error) {
        console.error("Error fetching global ranking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalRanking();
  }, []);

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#0000ff"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  }

  const myRankingFromTop10 = rankingList.find(
    (item) => item.nickname === MY_USER_NAME
  );

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {/* 상단 박스 (사용자 순위 정보) */}
      {myRank && (
        <LinearGradient
          colors={["#58BE84", "#0C7B7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="p-4 mb-4 shadow"
          style={{ borderRadius: 8 }}
        >
          <View className="flex-col items-center">
            <Text className="text-white font-sf-b text-lg">
              나의 전체 순위 : {myRank.rank}위
            </Text>
            {/* 지난 주 랭킹은 전체 랭킹에는 없으므로 제거 */}
          </View>
        </LinearGradient>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      <ScrollView className="flex-1 bg-white rounded-xl p-4 shadow">
        {rankingList.map((item) => {
          const isCurrentUser = item.nickname === MY_USER_NAME;
          return (
            <RankingCard
              key={item.rank + item.nickname}
              item={{
                rank: item.rank,
                nickname: item.nickname,
                score: item.score,
              }}
              isProminent={isCurrentUser}
            />
          );
        })}

        {/* 10위 밖에 있을 경우 ... 및 사용자 카드 표시 */}
        {myRank && !myRankingFromTop10 && (
          <>
            <Text className="text-center text-gray-600 my-2">...</Text>
            <RankingCard
              item={{
                rank: myRank.rank,
                nickname: MY_USER_NAME, // 백엔드 응답에 닉네임이 없으므로 직접 설정
                score: myRank.score,
              }}
              isProminent={true}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
