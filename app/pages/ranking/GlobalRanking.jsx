import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import { Images } from "@constants/Images";
import CustomAlert from "@components/CustomAlert";

import LoadingScreen from "@components/LoadingScreen"; // LoadingScreen import
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect

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
  const [isInfoModalVisible, setInfoModalVisible] = useState(false);

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

  const fetchGlobalRanking = useCallback(async () => {
    setLoading(true); // Ensure loading is true when fetching starts
    let apiResponse;
    try {
      const userInfo = await me();
      if (userInfo) {
        setCurrentUserId(userInfo.userId);
        setCurrentUserNickname(userInfo.nickname); // 닉네임 설정 다시 추가
      }

      apiResponse = await apiFetch("/rankings/global");
      if (!apiResponse.ok)
        throw new Error(`전체 랭킹 에러: ${apiResponse.status}`);

      const data = await apiResponse.json();
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
      // Ensure loading screen is shown for at least 0.7 seconds
      await new Promise((resolve) => setTimeout(resolve, 700));
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGlobalRanking();
    }, [fetchGlobalRanking])
  );

  if (loading) {
    return <LoadingScreen message="전체 랭킹을 불러오는 중..." />;
  }

  // 시상대 및 목록 데이터 처리
  const ranker1 = rankingList.find((r) => r.rank === 1);
  const ranker2 = rankingList.find((r) => r.rank === 2);
  const ranker3 = rankingList.find((r) => r.rank === 3);
  const others = rankingList.filter((r) => r.rank > 3);
  const myRankInList = rankingList.find((r) => r.userId === currentUserId);

  return (
    <View className="flex-1 px-pageX">
      <CustomAlert visible={alertVisible} {...alertProps} />

      {/* 정보 버튼 */}
      <View className="items-end my-sm">
        <Pressable onPress={() => setInfoModalVisible(true)}>
          <Text className="text-black font-bold text-h2">ⓘ</Text>
        </Pressable>
      </View>

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
          rankTextColor="text-black"
        />
        <PodiumItem
          ranker={ranker3}
          height={50}
          podiumColor="#858494" // 3등 - 동색
          rankTextColor="text-black"
        />
      </View>

      {/* 구분선 / 메시지 */}
      {showParticipationMessage ? (
        <View>
          <View className="bg-deactivateButton p-lg my-md rounded-lg">
            <Text className="font-bold">랭킹 참여 조건 미달</Text>
            <Text>
              전체 랭킹에 참여하려면 탄소 절감 활동 기록이 필요해요! 활동을 통해
              탄소 절감량을 늘리고 랭킹에 참여해보세요!
            </Text>
          </View>
        </View>
      ) : null}

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

      <Modal visible={isInfoModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-md">
            <Text className="text-lg font-bold mb-4">전체 랭킹 안내</Text>
            <Text className="mb-4 ">
              전체 랭킹은 Penglobe를 사용하는 모든 사용자의 누적 탄소 절감량을
              기준으로 합니다.
            </Text>
            <Pressable
              onPress={() => setInfoModalVisible(false)}
              className="bg-blue-500 p-3 rounded-md items-center"
            >
              <Text className="text-green font-bold">닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
