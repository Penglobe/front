import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import { Images } from "@constants/Images";
import { LinearGradient } from "expo-linear-gradient";
import CustomAlert from "@components/CustomAlert"; // CustomAlert import

// 아바타 관련 로직
const AVATAR_MAP = {
  ToriFace: Images.ToriFace,
  IpaFace: Images.IpaFace,
  ProfileIce: Images.ProfileIce,
  Fish: Images.Fish,
  Polarbear: Images.Polarbear,
  Polarbear2: Images.Polarbear2,
};

const getAvatarRenderComponent = (profileKey) => {
  return AVATAR_MAP[profileKey] || null;
};

// 시상대 아이템 컴포넌트
const PodiumItem = ({ ranker, height, podiumColor, rankTextColor }) => {
  if (!ranker) return <View style={{ flex: 1 }} />;

  const AvatarComponent = getAvatarRenderComponent(ranker.profile);

  return (
    <View className="flex-1 items-center justify-end">
      {/* 프로필 이미지 */}
      {AvatarComponent && (
        <View className="absolute w-16 h-16 -top-[28px] ml-llg">
          <AvatarComponent width="60%" height="60%" />
        </View>
      )}

      {/* 닉네임 */}
      <Text className="font-sf-b text-label text-black mt-xxs">
        {ranker.nickname}
      </Text>

      {/* 점수 */}
      <View
        className="px-xs py-xs rounded-md my-xxs"
        style={{ backgroundColor: "#318643" }}
      >
        <Text className="font-sf-r text-footnote text-white">
          {ranker.score}kg
        </Text>
      </View>

      {/* 시상대 */}
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
  const [currentUserNickname, setCurrentUserNickname] = useState(null); // 닉네임 상태 다시 추가
  const [showParticipationMessage, setShowParticipationMessage] =
    useState(false);

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertProps, setAlertProps] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: null,
  });

  const showAlert = (props) => {
    setAlertProps({
      ...props,
      onConfirm: () => {
        setAlertVisible(false);
        props.onConfirm && props.onConfirm();
      },
      onCancel: props.onCancel
        ? () => {
            setAlertVisible(false);
            props.onCancel && props.onCancel();
          }
        : null,
    });
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchGlobalRanking = async () => {
      try {
        const userInfo = await me();
        if (userInfo) {
          setCurrentUserId(userInfo.userId);
          setCurrentUserNickname(userInfo.nickname); // 닉네임 설정 다시 추가
        }

        const response = await apiFetch("/rankings/global");
        if (!response.ok) throw new Error(`전체 랭킹 에러: ${response.status}`);

        const data = await response.json();
        setRankingList(data.top10 || []); // API 응답의 'top10' 키 사용
        setMyRank(data.myRank);

        if (!data.myRank) {
          setShowParticipationMessage(true);
        } else {
          setShowParticipationMessage(false);
        }
      } catch (error) {
        showAlert({
          title: "랭킹 불러오기 오류",
          message: "전체 랭킹을 불러오는 중 오류가 발생했습니다.",
        });
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

  // 시상대 및 목록 데이터 처리
  const ranker1 = rankingList.find((r) => r.rank === 1);
  const ranker2 = rankingList.find((r) => r.rank === 2);
  const ranker3 = rankingList.find((r) => r.rank === 3);
  const others = rankingList.filter((r) => r.rank > 3);
  const myRankInList = rankingList.find((r) => r.userId === currentUserId);

  return (
    <View className="px-pageX" style={{ flex: 1 }}>
      <CustomAlert visible={alertVisible} {...alertProps} />
      {/* 시상대 섹션 (높이 조절) */}
      <View className="h-48 flex-row items-end p-sm mt-xs">
        <PodiumItem
          ranker={ranker2}
          height={70}
          podiumColor="#DBDBDB" // 2등 - 은색
          rankTextColor="text-black"
        />
        <PodiumItem
          ranker={ranker1}
          height={100}
          podiumColor="#F9C332" // 1등 - 금색
          rankTextColor="text-white"
        />
        <PodiumItem
          ranker={ranker3}
          height={50}
          podiumColor="#858494" // 3등 - 동색
          rankTextColor="text-white"
        />
      </View>

      {/* 구분선 / 메시지 */}
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

      {/* 나머지 랭킹 목록 */}
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

          {/* 사용자의 순위가 목록에 표시되지 않은 경우 표시 */}
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
