import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import { Images } from "@constants/Images";
import { LinearGradient } from "expo-linear-gradient";

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
    <View className="flex-1 items-center justify-end">
      {/* Profile Image */}
      {AvatarComponent && (
        <View className="absolute w-16 h-16 -top-[28px] ml-llg">
          <AvatarComponent width="60%" height="60%" />
        </View>
      )}

      {/* Nickname */}
      <Text className="font-sf-b text-label text-black mt-xxs">
        {ranker.nickname}
      </Text>

      {/* Score */}
      <View
        className="px-xs py-xs rounded-md my-xxs"
        style={{ backgroundColor: "#318643" }}
      >
        <Text className="font-sf-r text-footnote text-white">
          {ranker.score}kg
        </Text>
      </View>

      {/* Podium Platform */}
      <View
        className="w-full items-center justify-center rounded-t-lg pt-xxs"
        style={{ height: height, backgroundColor: podiumColor }}
      >
        <Text className={`font-sf-b text-h1 ${rankTextColor}`}>
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
    <View className="px-pageX" style={{ flex: 1 }}>
      {/* --- Podium Section (Height Adjusted) --- */}
      <View className="h-48 flex-row items-end p-sm mt-xs">
        <PodiumItem
          ranker={ranker2}
          height={70}
          podiumColor="#DBDBDB" // 2nd place - Silver
          rankTextColor="text-black"
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

      {/* --- Separator / Message --- */}
      {showParticipationMessage ? (
        <View>
          <View className="bg-deactivateButton border-l-4 border-500 p-lg my-md rounded-lg">
            <Text className="font-bold">랭킹 참여 조건 미달</Text>
            <Text>
              전체 랭킹에 참여하려면 탄소 절감 활동 기록이 필요해요! {"\n"}
              활동을 통해 탄소 절감량을 늘리고 랭킹에 참여해보세요!
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-col items-center">
          <LinearGradient
            colors={["#58BE84", "#0C7B7E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="p-lg mb-md shadow"
            style={{ borderRadius: 8 }}
          >
            <Text className="text-center font-sf-b text-bodySm text-white">
              전체 랭킹
            </Text>
            <Text className="text-center font-sf-b text-cpation text-white -mt-xs">
              현재까지의 누적 탄소 절감량을 기준으로 랭킹을 매겨요!
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* --- Rest of the Ranking List --- */}
      <View className="flex-1 pb-md">
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
              <Text
                className="text-center text-black text-bold text-body my-xs -mt-sm"
                style={{ lineHeight: 18, fontWeight: "900" }}
              >
                .{"\n"}.{"\n"}.
              </Text>
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
      </View>
    </View>
  );
}
