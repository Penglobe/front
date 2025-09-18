import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch, me } from "@services/authService";
import { Images } from "@constants/Images";
import CustomAlert from "@components/CustomAlert";
import colors from "@constants/Colors.cjs";
import LoadingScreen from "@components/LoadingScreen"; // LoadingScreen import
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect

const { Colors } = colors;

// 아바타 관련 로직
const AVATAR_MAP = {
  ToriFace: Images.ToriFace,
  IpaFace: Images.IpaFace,
  ProfileIce: Images.ProfileIce,
  Fish: Images.Fish,
  Polarbear: Images.Polarbear,
};

const getAvatarRenderComponent = (profileKey) => {
  return AVATAR_MAP[profileKey] || null;
};

// 시상대 아이템 컴포넌트
const PodiumItem = ({ ranker, height, podiumColor, rankTextColor }) => {
  if (!ranker) return <View style={{ flex: 1 }} />;

  const AvatarComponent = getAvatarRenderComponent(ranker.profile);
  const topOffset = Math.max(4, Math.round(height * 0.08)); // 등수 살짝 내릴 오프셋

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

      {/* 시상대 */}
      <View
        className="w-full rounded-t-lg relative" // relative로 기준점 설정
        style={{ height, backgroundColor: podiumColor }}
      >
        {/* 등수: 위쪽에 고정 + 살짝 내림 */}
        <View
          style={{
            position: "absolute",
            top: topOffset,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text className={`font-sf-b text-h2 text-white`}>
            {ranker.rank}위
          </Text>
        </View>

        {/* 점수: 아래에 고정 (위 변경의 영향 없음) */}
        <View
          style={{
            position: "absolute",
            bottom: 1,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View className="px-xs py-xxs rounded-md">
            <Text className="font-sf-b text-caption text-white">
              {ranker.score}kg
            </Text>
          </View>
        </View>
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

      apiResponse = await apiFetch("/rankings/global"); // 업데이트된 데이터 조회
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

      {/* 시상대 섹션 (높이 조절) */}
      <View className="h-48 flex-row items-end p-sm mt-xs relative">
        {/* 정보 버튼: 우상단 고정 */}
        <Pressable
          onPress={() => setInfoModalVisible(true)}
          className="absolute top-2 right-2 z-10"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text className="text-black font-bold text-h2">ⓘ</Text>
        </Pressable>

        <PodiumItem ranker={ranker2} height={70} podiumColor="#749BF0" />
        <PodiumItem ranker={ranker1} height={100} podiumColor="#D64D2D" />
        <PodiumItem ranker={ranker3} height={50} podiumColor="#40BF58" />
      </View>

      {/* 나머지 랭킹 목록 */}
      <View className="flex-1 pb-md">
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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
        <View
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: Colors.bgblack }}
        >
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
