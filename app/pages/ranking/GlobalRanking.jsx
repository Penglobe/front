import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import { Images } from "@constants/Images";

// --- Avatar-related logic ---
const AVATAR_MAP = {
  ToriFace: Images.ToriFace,
  IpaFace: Images.IpaFace,
};

const getAvatarRenderComponent = (profileKey) => {
  return AVATAR_MAP[profileKey] || null;
};

// --- Podium Item Component ---
const PodiumItem = ({ ranker, height, podiumColor, rankTextColor }) => {
  if (!ranker) return <View style={{ flex: 1 }} />;

  const AvatarComponent = getAvatarRenderComponent(ranker.profile);

  return (
    <View className="flex-1 items-center justify-center">
      {/* Profile Image */}
      {AvatarComponent && (
        <View className="w-16 h-16 mt-2 mb-none">
          <AvatarComponent width="80%" height="80%" />
        </View>
      )}

      {/* Nickname */}
      <Text className="font-sf-b text-base text-black mt-1">
        {ranker.nickname}
      </Text>

      {/* Score */}
      <View
        className="px-2 py-1 rounded-md my-1"
        style={{ backgroundColor: "#318643" }}
      >
        <Text className="font-sf-r text-sm text-white">{ranker.score}kg</Text>
      </View>

      {/* Podium Platform */}
      <View
        className="w-full items-center justify-center rounded-t-lg pt-1"
        style={{ height: height, backgroundColor: podiumColor }}
      >
        <Text className={`font-sf-b text-2xl ${rankTextColor}`}>
          {ranker.rank}위
        </Text>
      </View>
    </View>
  );
};

export default function GlobalRanking() {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserNickname, setCurrentUserNickname] = useState(null); // Re-add state for nickname
  const [showParticipationMessage, setShowParticipationMessage] =
    useState(false);

  useEffect(() => {
    const fetchGlobalRanking = async () => {
      try {
        const userInfo = await me();
        if (userInfo) {
          setCurrentUserId(userInfo.userId);
          setCurrentUserNickname(userInfo.nickname); // Re-add nickname setter
        }

        const response = await apiFetch("/rankings/global");
        if (!response.ok)
          throw new Error(`Global ranking 에러: ${response.status}`);

        const data = await response.json();
        setRankingList(data.top10 || []); // Use 'top10' key from API response
        setMyRank(data.myRank);

        if (!data.myRank) {
          setShowParticipationMessage(true);
        } else {
          setShowParticipationMessage(false);
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

  // --- Data Processing for Podium and List ---
  const ranker1 = rankingList.find((r) => r.rank === 1);
  const ranker2 = rankingList.find((r) => r.rank === 2);
  const ranker3 = rankingList.find((r) => r.rank === 3);
  const others = rankingList.filter((r) => r.rank > 3);
  const myRankInList = rankingList.find((r) => r.userId === currentUserId);

  return (
    <View style={{ flex: 1 }} className="bg-gray-100">
      {/* --- Podium Section (Height Adjusted) --- */}
      <View className="h-48 flex-row items-end p-2 mx-2 mt-4">
        <PodiumItem
          ranker={ranker2}
          height={70}
          podiumColor="#DBDBDB" // 2nd place - Silver
          rankTextColor="text-gray-800"
        />
        <PodiumItem
          ranker={ranker1}
          height={100}
          podiumColor="#F9C332" // 1st place - Gold
          rankTextColor="text-white"
        />
        <PodiumItem
          ranker={ranker3}
          height={50}
          podiumColor="#858494" // 3rd place - Bronze
          rankTextColor="text-white"
        />
      </View>

      {/* --- Separator or Title --- */}
      <Text className="text-center font-sf-b text-lg my-4 text-gray-700">
        전체 랭킹
      </Text>

      {/* --- Rest of the Ranking List --- */}
      <View className="flex-1 px-4 pb-4">
        {showParticipationMessage ? (
          <View className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg">
            <Text className="font-bold">랭킹 확인 불가</Text>
            <Text>
              기록된 탄소 절감량이 없어서 전체 랭킹을 확인할 수 없습니다. 활동을
              통해 탄소 절감량을 늘려보세요!
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {others.map((item) => {
              const isCurrentUser = item.userId === currentUserId;
              return (
                <RankingCard
                  key={item.rank}
                  item={item}
                  isProminent={isCurrentUser}
                />
              );
            })}

            {/* Display user's rank if they exist but are not in the top list shown */}
            {myRank && !myRankInList && (
              <>
                <Text className="text-center text-gray-500 my-2">...</Text>
                <RankingCard
                  item={{
                    rank: myRank.rank,
                    nickname: currentUserNickname,
                    score: myRank.score,
                    profile: myRank.profile,
                  }}
                  isProminent={true}
                />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
