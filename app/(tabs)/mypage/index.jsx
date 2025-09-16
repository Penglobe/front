import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { apiFetch, me, logout as authLogout } from "@services/authService";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Images } from "@constants/Images";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import CustomAlert from "@components/CustomAlert"; // CustomAlert import

// 한국어 설정
LocaleConfig.locales["ko"] = {
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

const AVATARS = [
  { key: "ToriFace", label: "토리", Render: Images.ToriFace },
  { key: "IpaFace", label: "이파", Render: Images.IpaFace },
  { key: "ProfileIce", label: "얼음", Render: Images.ProfileIce },
  { key: "Fish", label: "물고기", Render: Images.Fish },
  { key: "Polarbear", label: "북극곰", Render: Images.Polarbear },
  { key: "Polarbear2", label: "북극곰2", Render: Images.Polarbear2 },
];

const getAvatarRenderComponent = (profileKey) => {
  const avatar = AVATARS.find((a) => a.key === profileKey);
  return avatar ? avatar.Render : null;
};

export default function MyPage() {
  const router = useRouter();
  const [myPageInfo, setMyPageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  const todayDateString = `${year}-${month}-${day}`;

  const [selectedDate, setSelectedDate] = useState(todayDateString);
  const [currentMonth, setCurrentMonth] = useState(todayDateString);
  const [dailyReductionData, setDailyReductionData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertProps, setAlertProps] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: null,
    confirmText: "확인",
    cancelText: "취소",
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

  const fetchMyPageInfo = useCallback(async () => {
    setLoading(true);
    try {
      const userInfo = await me();
      setMyPageInfo(userInfo);
    } catch (error) {
      showAlert({
        title: "오류",
        message: "마이페이지 정보를 불러오는 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyReductionData = useCallback(async (dateString) => {
    setDailyLoading(true);
    try {
      const response = await apiFetch(`/users/me/daily/${dateString}`);
      if (!response.ok) {
        throw new Error(`일일 절감량 정보 가져오기 에러: ${response.status}`);
      }
      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setDailyReductionData(apiResponse.data);
      } else {
        setDailyReductionData(null); // 에러 또는 200이 아닌 상태에서는 데이터 비우기
      }
    } catch (error) {
      setDailyReductionData(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const fetchAttendanceDates = useCallback(async () => {
    try {
      const response = await apiFetch("/users/me/attendance-dates");
      if (!response.ok) {
        throw new Error(`출석 날짜 정보 가져오기 에러: ${response.status}`);
      }
      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setAttendanceDates(apiResponse.data);
      } else {
        showAlert({
          title: "오류",
          message:
            apiResponse.message || "출석 날짜 정보를 가져오지 못했습니다.",
        });
      }
    } catch (error) {
      showAlert({
        title: "오류",
        message: "출석 날짜 정보를 불러오는 중 오류가 발생했습니다.",
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyPageInfo();
      fetchAttendanceDates();
    }, [fetchMyPageInfo, fetchAttendanceDates])
  );

  useEffect(() => {
    if (selectedDate) {
      fetchDailyReductionData(selectedDate);
    }
  }, [selectedDate, fetchDailyReductionData]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const getMarkedDates = useCallback(() => {
    const marked = {};

    // 1. 보이는 월 전체에 주말 텍스트 색상 적용
    const month = new Date(currentMonth).getMonth();
    const year = new Date(currentMonth).getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      const dayOfWeek = day.getDay();
      const dateString = day.toISOString().split("T")[0];

      if (dayOfWeek === 6) {
        // 토요일
        marked[dateString] = { textStyle: { color: "blue" } };
      } else if (dayOfWeek === 0) {
        // 일요일
        marked[dateString] = { textStyle: { color: "red" } };
      }
    }

    // 2. 모든 출석일 표시 (필요시 주말 텍스트 색상 덮어씀)
    const sortedAttendanceDates = [...attendanceDates].sort(
      (a, b) => new Date(a) - new Date(b)
    );

    if (sortedAttendanceDates.length > 0) {
      let currentStreakStart = null;
      for (let i = 0; i < sortedAttendanceDates.length; i++) {
        const currentDate = sortedAttendanceDates[i];
        const nextDate = sortedAttendanceDates[i + 1];

        if (!currentStreakStart) {
          currentStreakStart = currentDate;
        }

        const isLastDayOfStreak =
          !nextDate ||
          new Date(nextDate).getTime() - new Date(currentDate).getTime() >
            24 * 60 * 60 * 1000;

        if (isLastDayOfStreak) {
          const streakEndDate = currentDate;
          let tempDate = new Date(currentStreakStart);
          while (tempDate.getTime() <= new Date(streakEndDate).getTime()) {
            const formattedTempDate = tempDate.toISOString().split("T")[0];
            marked[formattedTempDate] = {
              ...(marked[formattedTempDate] || {}),
              color: "#b1e666",
              textColor: "white",
              startingDay: formattedTempDate === currentStreakStart,
              endingDay: formattedTempDate === streakEndDate,
            };
            tempDate.setDate(tempDate.getDate() + 1);
          }
          currentStreakStart = null;
        }
      }
    }

    // 선택된 날짜 스타일 재정의
    if (selectedDate) {
      const selectionColor =
        marked[selectedDate]?.color === "#b1e666" ? "green" : "green";
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        color: selectionColor,
        startingDay: marked[selectedDate]?.startingDay ?? true,
        endingDay: marked[selectedDate]?.endingDay ?? true,
      };
    }

    return marked;
  }, [attendanceDates, selectedDate, currentMonth]);

  const handleLogout = useCallback(() => {
    showAlert({
      title: "로그아웃",
      message: "정말 로그아웃 하시겠습니까?",
      confirmText: "로그아웃",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await authLogout();
          router.replace("/"); // 로그인 화면으로 이동
        } catch (error) {
          showAlert({
            title: "오류",
            message: "로그아웃 중 오류가 발생했습니다.",
          });
        }
      },
      onCancel: () => {},
    });
  }, [router]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!myPageInfo) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>마이페이지 정보를 불러오지 못했습니다.</Text>
      </View>
    );
  }

  const totalPoint = Number(myPageInfo.totalPoint ?? 0);
  const attendanceTotalDays = Number(myPageInfo.attendanceTotalDays ?? 0);
  const longestAttendanceStreak = Number(
    myPageInfo.longestAttendanceStreak ?? 0
  );

  const UserAvatar = myPageInfo.profile
    ? getAvatarRenderComponent(myPageInfo.profile)
    : null;

  return (
    <View className="flex-1">
      <BgGradient />
      <CustomAlert visible={alertVisible} {...alertProps} />
      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="마이페이지" />

        <ScrollView className="flex-1 px-pageX">
          {/* 상단 프로필 영역 */}
          <View className="bg-white rounded-xl p-lg shadow mt-4 mb-4">
            <View className="items-center mb-0">
              {UserAvatar && (
                <View className="w-24 h-24 rounded-full overflow-hidden mb-2 bg-gray items-center justify-center">
                  {React.createElement(UserAvatar, { width: 96, height: 96 })}
                </View>
              )}
              <Text className="text-black font-sf-b text-h3 mb-4">
                {myPageInfo.nickname}
              </Text>
              <View className="flex-row justify-around w-full max-w-md">
                <View
                  className="items-center flex-1 p-sm rounded-md shadow-sm mx-1 "
                  backgroundColor="#9fcbe8ff"
                >
                  <Text className="text-black font-sf-r text-right text-caption">
                    누적 출석
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Images.Snow width={30} height={30} />
                    <Text className="text-black font-sf-b text-body ml-1">
                      {attendanceTotalDays}일
                    </Text>
                  </View>
                </View>
                <View
                  className="items-center flex-1 p-sm rounded-md shadow-sm mx-1"
                  backgroundColor="#9fcbe8ff"
                >
                  <Text className="text-black font-sf-r text-caption">
                    최장 연속 출석
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Images.Snow width={30} height={30} />
                    <Text className="text-black font-sf-b text-body ml-1">
                      {longestAttendanceStreak}일
                    </Text>
                  </View>
                </View>
              </View>
              <View
                className="flex-1 p-sm rounded-md border-2 border-gray mx-1 mt-sm"
                style={{
                  width: "98%",
                  height: 60,
                }}
              >
                <Text className="text-black font-sf-r px-xxs text-left -mb-xs text-caption">
                  보유 얼음
                </Text>
                <View className="flex-row justify-end items-end mt-1">
                  <Text className="text-black font-sf-b text-body ml-1 mb-1">
                    {totalPoint.toLocaleString("ko-KR")}
                  </Text>
                  <Images.Ice width={30} height={30} />
                </View>
              </View>
            </View>
          </View>
          {/* 달력 섹션 */}
          <View className="bg-white rounded-xl p-lg shadow mb-4">
            <Calendar
              onDayPress={handleDayPress}
              markedDates={getMarkedDates()}
              markingType={"period"}
              monthFormat="yyyy년 MM월"
              onMonthChange={(month) => {
                setCurrentMonth(month.dateString);
              }}
              maxDate={todayDateString} // 오늘 이후 날짜 선택 비활성화
              theme={{
                arrowColor: "black",
                "stylesheet.calendar.header": {
                  dayTextAtIndex0: {
                    color: "red", // 일요일
                  },
                  dayTextAtIndex6: {
                    color: "blue", // 토요일
                  },
                },
              }}
              style={{
                borderRadius: 10,
                overflow: "hidden", // 자식 요소가 부모의 경계를 넘지 않도록 설정
              }}
            />
          </View>
          {/* 일일 탄소 절감량 섹션 */}
          <View className="bg-white rounded-xl p-lg shadow mt-1">
            <Text className="text-bodyLg text-center font-bold mb-2">
              {selectedDate}
            </Text>
            {selectedDate ? (
              dailyLoading ? (
                <ActivityIndicator size="small" color="green" />
              ) : dailyReductionData ? (
                <View className="space-y-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Images.Walk width={24} height={24} />
                      <Text className="text-black font-sf-md text-body ml-2">
                        환경 걸음
                      </Text>
                    </View>
                    <Text className="text-black font-sf-b text-body">
                      {dailyReductionData.transportCo2Kg} kg
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Images.Diet width={24} height={24} />
                      <Text className="text-black font-sf-md text-body ml-2">
                        식단
                      </Text>
                    </View>
                    <Text className="text-black font-sf-b text-body">
                      {dailyReductionData.dietCo2Kg} kg
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center pl-xs">
                      <Images.Survey width={20} height={20} />
                      <Text className="text-black font-sf-md text-body ml-2">
                        빙하 리포트
                      </Text>
                    </View>
                    <Text className="text-black font-sf-b text-body">
                      {dailyReductionData.surveyCo2Kg} kg
                    </Text>
                  </View>
                  <View className="pt-md flex-row px-2 justify-between items-center">
                    <Text className="font-bold text-body text-green">
                      총 절감량
                    </Text>
                    <Text className="font-sf-md font-bold text-body text-right -mx-xs text-green">
                      {dailyReductionData.totalCo2Kg} kg
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-gray">
                  선택한 날짜의 절감량 정보를 불러올 수 없습니다.
                </Text>
              )
            ) : (
              <Text className="text-gray">
                날짜를 선택하여 일일 절감량을 확인하세요.
              </Text>
            )}
          </View>

          <View className="bg-white rounded-xl p-lg shadow mt-4">
            {/* 주문 내역 */}
            <Pressable
              onPress={() => router.push("/pages/shop/orderlist")}
              className="flex-row items-center justify-between py-md"
            >
              <View className="flex-row items-center">
                <Images.Order width={24} height={24} />
                <Text className="text-black font-sf-md text-body ml-md">
                  주문 내역
                </Text>
              </View>
            </Pressable>
            {/* 도움말 */}
            <Pressable
              onPress={() => router.push("/pages/faq/faq")}
              className="flex-row items-center justify-between py-md"
            >
              <View className="flex-row items-center">
                <Images.Faq width={24} height={24} />
                <Text className="text-black font-sf-md text-body ml-md">
                  도움말
                </Text>
              </View>
            </Pressable>
            {/* 로그아웃 */}
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center justify-between py-md"
            >
              <View className="flex-row items-center">
                <Images.LogOut width={24} height={24} />
                <Text className="text-black font-sf-md text-body ml-md">
                  로그아웃
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
