import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import Constants from "expo-constants";

export default function GlobalRanking() {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserNickname, setCurrentUserNickname] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showParticipationMessage, setShowParticipationMessage] =
    useState(false); // New state for message visibility

  useEffect(() => {
    const fetchGlobalRanking = async () => {
      try {
        // Fetch current user's info using the 'me' function
        const userInfo = await me();
        if (userInfo && userInfo.nickname) {
          setCurrentUserNickname(userInfo.nickname);
        }
        if (userInfo && userInfo.userId) {
          setCurrentUserId(userInfo.userId);
        }

        const response = await apiFetch("/rankings/global");

        if (!response.ok)
          throw new Error(`Global ranking 에러: ${response.status}`);

        const data = await response.json();
        setRankingList(data.top10);
        setMyRank(data.myRank);

        // Check if myRank is null and display message
        if (!data.myRank) {
          setShowParticipationMessage(true); // Show message instead of alert
        } else {
          setShowParticipationMessage(false); // Hide message if rank is found
        }
      } catch (error) {
        console.error("Error fetching global ranking:", error);
        Alert.alert(
          "랭킹 불러오기 오류",
          "전체 랭킹을 불러오는 중 오류가 발생했습니다."
        );
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
    (item) => item.userId === currentUserId // Change to userId comparison
  );

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {/* 상단 박스 (사용자 순위 정보) */}
      {myRank && (
        <LinearGradient
          colors={["#58BE84", "#0C7B7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="p-lg mb-4 shadow"
          style={{ borderRadius: 8 }}
        >
          <View className="flex-col items-center">
            <Text className="text-white font-sf-b text-bodyLg">
              나의 전체 순위 : {myRank.rank}위
            </Text>
            {/* 지난 주 랭킹은 전체 랭킹에는 없으므로 제거 */}
          </View>
        </LinearGradient>
      )}

      {/* 랭킹 확인 불가 메시지 */}
      {showParticipationMessage && (
        <View className="bg-deactivateButton border-l-4 border-500 text-yellow-700 p-lg mb-4 rounded-lg">
          <Text className="font-bold">랭킹 확인 불가</Text>
          <Text>
            기록된 탄소 절감량이 없어서 전체 랭킹을 확인할 수 없습니다. 활동을
            통해 탄소 절감량을 늘려보세요!
          </Text>
        </View>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      <ScrollView
        className="flex-1 bg-white rounded-xl p-lg shadow"
        contentContainerStyle={{ paddingBottom: 15, flexGrow: 1 }}
      >
        {rankingList.map((item) => {
          const isCurrentUser = item.userId === currentUserId; // Change to userId comparison
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
                nickname: currentUserNickname, // 백엔드 응답에 닉네임이 없으므로 직접 설정
                score: myRank.score,
                profile: myRank.profile,
              }}
              isProminent={true}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
