import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch } from "@services/authService";
import { useAuth } from "@hooks/useAuth"; // Import useAuth hook

export default function WeeklyRanking({ fetchRegionRankingData }) {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserNickname, setCurrentUserNickname] = useState(null);
  const [userId, setUserId] = useState(null); // Declare userId state variable
  const [showParticipationMessage, setShowParticipationMessage] =
    useState(false); // New state for message visibility

  const { user, isLoading: isAuthLoading } = useAuth();

  // --- Refactored Data Fetching Logic ---
  const fetchRankingData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/rankings/weekly");

      if (!response.ok) {
        throw new Error(`Weekly ranking 에러: ${response.status}`);
      }

      const data = await response.json();
      setRankingList(data.top10 || []);
      setMyRank(data.myRank || null);

      if (!data.myRank) {
        setShowParticipationMessage(true); // Show message instead of alert
      } else {
        setShowParticipationMessage(false); // Hide message if rank is found
      }
    } catch (error) {
      console.error("Error fetching weekly ranking:", error);
      Alert.alert(
        "랭킹 불러오기 오류",
        "주간 랭킹을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]); // Add userId to dependency array

  useEffect(() => {
    if (user && user.userId && user.nickname) {
      setUserId(user.userId);
      setCurrentUserNickname(user.nickname);
    }
  }, [user]);

  useEffect(() => {
    fetchRankingData();
  }, [fetchRankingData]);

  // --- New API call for the test button ---
  const handleAddDummyData = async () => {
    try {
      const response = await apiFetch("/users/me/add-dummy-data", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to add dummy data");
      }

      await fetchRankingData(); // Re-fetch data to show changes
      if (fetchRegionRankingData) {
        await fetchRegionRankingData(); // Re-fetch region data as well
      }
      Alert.alert("성공", "데이터가 추가되고 랭킹이 갱신되었습니다."); // Add a success alert
    } catch (error) {
      console.error("Error adding dummy data:", error);
      Alert.alert("오류", "데이터 추가 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#blue"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  }

  const myRankingFromTop10 = rankingList.find(
    (item) => item.userId === userId // Change to userId comparison
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
              실시간 현재 순위 : {myRank.rank}위
            </Text>
            {myRank.lastWeekRank !== null &&
              myRank.lastWeekRank !== undefined && (
                <Text className="text-white font-sf-r text-bodySm mt-1">
                  지난 주에는 {myRank.lastWeekRank}위로 완료했어요!
                </Text>
              )}
          </View>
        </LinearGradient>
      )}

      {/* 랭킹 참여 조건 미달 메시지 */}
      {showParticipationMessage && (
        <View className="bg-deactivateButton border-l-4 border-500 text-yellow-700 p-lg mb-4 rounded-lg">
          <Text className="font-bold">랭킹 참여 조건 미달</Text>
          <Text>
            주간 랭킹에 참여하려면 지난 주에 출석을 완료했었어야 해요! 이번 주에
            출석을 완료하고 다음 주에 다시 도전해보세요!
          </Text>
        </View>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      <ScrollView
        className="flex-1 bg-white rounded-xl p-lg shadow"
        contentContainerStyle={{ paddingBottom: 15, flexGrow: 1 }}
      >
        {rankingList.map((item) => {
          const isCurrentUser = item.userId === userId; // Change to userId comparison
          return (
            <RankingCard
              key={item.rank + item.nickname} // Keep key as is, or change to item.userId if unique
              item={{
                rank: item.rank,
                nickname: item.nickname,
                score: item.score,
                profile: item.profile,
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
                nickname: currentUserNickname,
                score: myRank.score,
                profile: myRank.profile, // Add profile to myRank card
              }}
              isProminent={true}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
