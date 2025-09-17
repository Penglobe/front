import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RankingCard from "@pages/ranking/RankingCard";
import { apiFetch } from "@services/authService";
import { useAuth } from "@hooks/useAuth"; // useAuth 훅 가져오기
import CustomAlert from "@components/CustomAlert"; // CustomAlert import
import LoadingScreen from "@components/LoadingScreen"; // LoadingScreen import
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect
import { Images } from "@constants/Images";
import { Pressable, Modal } from "react-native";

export default function WeeklyRanking() {
  const [rankingList, setRankingList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserNickname, setCurrentUserNickname] = useState(null);
  const [userId, setUserId] = useState(null); // userId 상태 변수 선언
  const [showParticipationMessage, setShowParticipationMessage] =
    useState(false); // 메시지 표시 여부 상태
  const [showNoDataImage, setShowNoDataImage] = useState(false); // 이미지 표시 여부 상태 추가
  const [isInfoModalVisible, setInfoModalVisible] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

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

  // 리팩토링된 데이터 가져오기 로직
  const fetchRankingData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/rankings/weekly"); // 업데이트된 데이터 조회

      if (!response.ok) {
        throw new Error(`주간 랭킹 에러: ${response.status}`);
      }

      const data = await response.json();
      setRankingList(data.top10 || []);
      setMyRank(data.myRank || null);

      // 랭킹 데이터가 없으면 이미지 표시
      if (data.top10 && data.top10.length === 0 && !data.myRank) {
        setShowNoDataImage(true);
      } else {
        setShowNoDataImage(false);
      }

      if (!data.myRank) {
        setShowParticipationMessage(true); // 경고 대신 메시지 표시
      } else {
        setShowParticipationMessage(false); // 순위가 있으면 메시지 숨기기
      }
    } catch (error) {
      showAlert({
        title: "랭킹 불러오기 오류",
        message: "주간 랭킹을 불러오는 중 오류가 발생했습니다.",
      });
    } finally {
      // Ensure loading screen is shown for at least 0.7 seconds
      await new Promise((resolve) => setTimeout(resolve, 700));
      setLoading(false);
    }
  }, [userId]); // 의존성 배열에 userId 추가

  useEffect(() => {
    if (user && user.userId && user.nickname) {
      setUserId(user.userId);
      setCurrentUserNickname(user.nickname);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRankingData();
    }, [fetchRankingData])
  );

  if (loading) {
    return <LoadingScreen message="주간 랭킹을 불러오는 중..." />;
  }

  const myRankingFromTop10 = rankingList.find(
    (item) => item.userId === userId // userId로 비교 변경
  );

  return (
    <View className="flex-1 px-pageX">
      <CustomAlert visible={alertVisible} {...alertProps} />
      {/* 상단 박스 (사용자 순위 정보) */}
      {myRank && (
        <View className="mb-sm">
          <LinearGradient
            colors={["#58BE84", "#0C7B7E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 8, padding: 8 }}
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
        </View>
      )}

      {/* 정보 버튼 */}
      {/*
      <View className="items-end my-sm">
        <Pressable onPress={() => setInfoModalVisible(true)}>
          <Text className="text-black font-bold text-h2">ⓘ</Text>
        </Pressable>
      </View> */}

      {/* 랭킹 참여 조건 미달 메시지 */}
      {showParticipationMessage && (
        <View className="bg-deactivateButton p-lg mb-sm rounded-lg">
          <Text className="font-bold">랭킹 참여 조건 미달</Text>
          <Text>지난 주에 출석해야 이번 주 주간 랭킹에 참여할 수 있어요!</Text>
        </View>
      )}

      {/* 랭킹 리스트 (카드 형식) */}
      {showNoDataImage ? (
        <View className="flex-1 justify-center items-center pb-md">
          <Images.IpaToriNoData width={300} height={300} />
          {/* NoData 이미지 컴포넌트 */}
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-white rounded-xl p-lg shadow"
          contentContainerStyle={{ paddingBottom: 15, flexGrow: 1 }}
        >
          {rankingList.map((item) => {
            const isCurrentUser = item.userId === userId; // userId로 비교 변경
            return (
              <RankingCard
                key={item.rank + item.nickname} // 키는 그대로 두거나 고유한 item.userId로 변경
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
                  profile: myRank.profile, // 내 순위 카드에 프로필 추가
                }}
                isProminent={true}
              />
            </>
          )}
        </ScrollView>
      )}
      <Modal visible={isInfoModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-md">
            <Text className="text-lg font-bold mb-4">주간 랭킹 안내</Text>
            <Text className="mb-4 ">
              주간 랭킹은 지난 주 출석을 한 사용자들을 대상으로 탄소 절감량을
              기준으로 산정됩니다.
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
