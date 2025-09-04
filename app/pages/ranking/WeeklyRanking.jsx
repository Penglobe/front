import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";

const MY_USER_NAME = "나의아이디"; // 백엔드 data.sql에 추가한 테스트 사용자 닉네임

export default function WeeklyRanking() {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Start of re-added test logic ---
  const updateRanks = useCallback((list) => {
    const sortedList = [...list].sort(
      (a, b) => b.score - a.score
    );
    const rankedList = sortedList.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const myRankInfo = rankedList.find(
      (item) => item.nickname === MY_USER_NAME
    );

    if (myRankInfo) {
      setMyRank((prev) => ({
        ...(prev || {}),
        rank: myRankInfo.rank,
        score: myRankInfo.score, // Update score here
      }));
    }

    setRankingList(rankedList);
  }, []);

  const increaseMyCarbon = () => {
    console.log("Increasing my carbon for:", MY_USER_NAME);
    const newList = rankingList.map((item) => {
      console.log("Checking item:", item.nickname, "vs MY_USER_NAME:", MY_USER_NAME);
      if (item.nickname === MY_USER_NAME) {
        console.log("Found my user, increasing score.");
        return { ...item, score: item.score + 600 };
      }
      return item;
    });
    updateRanks(newList);
  };

  const increaseOthersCarbon = () => {
    console.log("Increasing others carbon, excluding:", MY_USER_NAME);
    const newList = rankingList.map((item) => {
      console.log("Checking item:", item.nickname, "vs MY_USER_NAME:", MY_USER_NAME);
      if (item.nickname !== MY_USER_NAME) {
        console.log("Found other user, increasing score.");
        return { ...item, score: item.score + 100 };
      }
      return item;
    });
    updateRanks(newList);
  };
  // --- End of re-added test logic ---

  useEffect(() => {
    const fetchWeeklyRanking = async () => {
      try {
        // 백엔드 API 호출
        const response = await fetch(
          "http://192.168.0.79:8080/rankings/weekly"
        );
        const data = await response.json();

        setRankingList(data.top10); // Directly set data.top10

        setMyRank(data.myRank);
      } catch (error) {
        console.error("Error fetching weekly ranking:", error);
        // 에러 처리 (예: 에러 메시지 표시)
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyRanking();
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
              실시간 현재 순위 : {myRank.rank}위
            </Text>
            {myRank.lastWeekRank !== null && myRank.lastWeekRank !== undefined && (
              <Text className="text-white font-sf-r text-sm mt-1">
                지난 주에는 {myRank.lastWeekRank}위로 완료했어요!
              </Text>
            )}
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

      {/* 테스트 버튼 */}
      <View className="flex-row justify-around mt-4">
        <TouchableOpacity
          onPress={increaseMyCarbon}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <Text className="text-white font-bold">나의 절감량 늘리기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={increaseOthersCarbon}
          className="bg-red-500 p-3 rounded-lg"
        >
          <Text className="text-white font-bold">
            다른 사용자 절감량 늘리기
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
