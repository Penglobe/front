import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";

const MY_USER_NAME = "나의아이디";

// 초기 더미 데이터
const getInitialDummyData = () =>
  Array.from({ length: 15 }, (_, i) => ({
    rank: i + 1,
    userName:
      i + 1 === 7 ? MY_USER_NAME : `사용자${String.fromCharCode(65 + i)}`,
    carbonReduction: 10000 - i * 500,
  }));

export default function WeeklyRanking() {
  const [weeklyRankingList, setWeeklyRankingList] = useState([]);
  const [userRankData, setUserRankData] = useState(null);

  // 순위를 업데이트하고 상태를 설정하는 함수
  const updateRanks = useCallback((list) => {
    const sortedList = [...list].sort(
      (a, b) => b.carbonReduction - a.carbonReduction
    );
    const rankedList = sortedList.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const myRankInfo = rankedList.find(
      (item) => item.userName === MY_USER_NAME
    );

    if (myRankInfo) {
      setUserRankData((prev) => ({
        ...(prev || {}),
        currentRank: myRankInfo.rank,
        // lastWeekRank는 초기값 유지
      }));
    }

    setWeeklyRankingList(rankedList);
  }, []);

  // 데이터 초기화
  useEffect(() => {
    const initialList = getInitialDummyData();
    updateRanks(initialList);

    // 지난주 랭킹 정보는 초기 한 번만 설정
    setUserRankData({ currentRank: 7, lastWeekRank: 12 });
  }, [updateRanks]);

  // 나의 절감량 늘리기 핸들러
  const increaseMyCarbon = () => {
    const newList = weeklyRankingList.map((item) => {
      if (item.userName === MY_USER_NAME) {
        return { ...item, carbonReduction: item.carbonReduction + 600 };
      }
      return item;
    });
    updateRanks(newList);
  };

  // 다른 사용자 절감량 늘리기 핸들러
  const increaseOthersCarbon = () => {
    const newList = weeklyRankingList.map((item) => {
      if (item.userName !== MY_USER_NAME) {
        return { ...item, carbonReduction: item.carbonReduction + 100 };
      }
      return item;
    });
    updateRanks(newList);
  };

  const myRanking = weeklyRankingList.find(
    (item) => item.userName === MY_USER_NAME
  );

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
            <Text className="text-white font-sf-b text-lg">
              실시간 현재 순위 : {userRankData.currentRank}위
            </Text>
            <Text className="text-white font-sf-r text-sm mt-1">
              지난 주에는 {userRankData.lastWeekRank}위로 완료했어요!
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      <ScrollView className="flex-1 bg-white rounded-xl p-4 shadow">
        {weeklyRankingList.slice(0, 10).map((item) => {
          const isCurrentUser = item.userName === MY_USER_NAME;
          return (
            <RankingCard
              key={item.rank}
              item={item}
              isProminent={isCurrentUser}
            />
          );
        })}

        {/* 10위 밖에 있을 경우 ... 및 사용자 카드 표시 */}
        {myRanking && myRanking.rank > 10 && (
          <>
            <Text className="text-center text-gray-600 my-2">...</Text>
            <RankingCard item={myRanking} isProminent={true} />
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
