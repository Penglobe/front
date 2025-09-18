import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { apiFetch, me, logout as authLogout } from "@services/authService";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Images } from "@constants/Images";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import CustomAlert from "@components/CustomAlert";
import LoadingScreen from "@components/LoadingScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
];

const getAvatarRenderComponent = (profileKey) => {
  const avatar = AVATARS.find((a) => a.key === profileKey);
  return avatar ? avatar.Render : null;
};

export default function MyPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayDateString = `${y}-${m}-${d}`;

  const [myPageInfo, setMyPageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(todayDateString);
  const [currentMonth, setCurrentMonth] = useState(`${y}-${m}-01`);
  const [dailyReductionData, setDailyReductionData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState([]);

  // CustomAlert
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
    } catch {
      showAlert({
        title: "오류",
        message: "마이페이지 정보를 불러오는 중 오류가 발생했습니다.",
      });
    } finally {
      // 로딩 최소 노출
      await new Promise((r) => setTimeout(r, 700));
      setLoading(false);
    }
  }, []);

  const fetchDailyReductionData = useCallback(async (dateString) => {
    setDailyLoading(true);
    try {
      const response = await apiFetch(`/users/me/daily/${dateString}`);
      if (!response.ok)
        throw new Error(`일일 절감량 정보 에러: ${response.status}`);
      const apiResponse = await response.json();
      setDailyReductionData(
        apiResponse.status === 200 ? apiResponse.data : null
      );
    } catch {
      setDailyReductionData(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const fetchAttendanceDates = useCallback(async () => {
    try {
      const response = await apiFetch("/users/me/attendance-dates");
      if (!response.ok)
        throw new Error(`출석 날짜 정보 에러: ${response.status}`);
      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setAttendanceDates(apiResponse.data || []);
      } else {
        showAlert({
          title: "오류",
          message:
            apiResponse.message || "출석 날짜 정보를 가져오지 못했습니다.",
        });
      }
    } catch {
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
    if (selectedDate) fetchDailyReductionData(selectedDate);
  }, [selectedDate, fetchDailyReductionData]);

  const handleDayPress = (day) => setSelectedDate(day.dateString);

  const getMarkedDates = useCallback(() => {
    const marked = {};

    // 1) 보이는 월 주말 색상
    const base = new Date(currentMonth);
    const year = base.getFullYear();
    const month = base.getMonth(); // 0~11
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dt = new Date(year, month, i);
      const dow = dt.getDay();
      const dateString = dt.toISOString().split("T")[0];
      if (dow === 6) marked[dateString] = { textStyle: { color: "blue" } };
      if (dow === 0) marked[dateString] = { textStyle: { color: "red" } };
    }

    // 2) 출석 연속 구간(period) 칠하기
    const sorted = [...attendanceDates].sort(
      (a, b) => new Date(a) - new Date(b)
    );

    if (sorted.length > 0) {
      let streakStart = null;
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];

        if (!streakStart) streakStart = cur;

        const isBreak =
          !next ||
          new Date(next).getTime() - new Date(cur).getTime() >
            24 * 60 * 60 * 1000;

        if (isBreak) {
          const streakEnd = cur;
          let t = new Date(streakStart);
          while (t.getTime() <= new Date(streakEnd).getTime()) {
            const s = t.toISOString().split("T")[0];
            marked[s] = {
              ...(marked[s] || {}),
              color: "#b1e666",
              textColor: "white",
              startingDay: s === streakStart,
              endingDay: s === streakEnd,
            };
            t.setDate(t.getDate() + 1);
          }
          streakStart = null;
        }
      }
    }

    // 3) 선택 날짜 강조 (period 유지)
    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        color: "green",
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
          router.replace("/");
        } catch {
          showAlert({
            title: "오류",
            message: "로그아웃 중 오류가 발생했습니다.",
          });
        }
      },
    });
  }, [router]);

  if (loading) {
    return (
      <View className="flex-1">
        <BgGradient />
        <LoadingScreen message="마이페이지 정보를 불러오는 중..." />
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

  const bottomGap = Math.max(insets.bottom, 16) + 20;

  return (
    <View className="flex-1">
      <BgGradient />
      <CustomAlert visible={alertVisible} {...alertProps} />

      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="마이페이지" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomGap }}
          className="flex-1 px-pageX py-lg"
        >
          <View className="gap-4">
            {/* 상단 프로필 */}
            <View className="bg-white rounded-xl p-lg shadow">
              <View className="items-center mb-0">
                {UserAvatar && (
                  <View className="w-28 h-28 rounded-full overflow-hidden mb-2 bg-gray/60 items-center justify-center">
                    {React.createElement(UserAvatar, { width: 96, height: 96 })}
                  </View>
                )}
                <Text className="text-black font-sf-b text-h3 mb-4">
                  {myPageInfo.nickname}
                </Text>

                <View className="flex-row justify-around w-full gap-2">
                  <View
                    className="items-center flex-1 p-sm rounded-md shadow-sm gap-1"
                    style={{ backgroundColor: "#9FCBE8" }}
                  >
                    <Text className="text-black font-sf text-caption">
                      누적 출석
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Images.Snow width={30} height={30} />
                      <Text className="text-black font-sf-b text-body">
                        {attendanceTotalDays}일
                      </Text>
                    </View>
                  </View>

                  <View
                    className="items-center flex-1 p-sm rounded-md shadow-sm gap-1"
                    style={{ backgroundColor: "#9FCBE8" }}
                  >
                    <Text className="text-black font-sf text-caption">
                      최장 연속 출석
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Images.Snow width={30} height={30} />
                      <Text className="text-black font-sf-b text-body">
                        {longestAttendanceStreak}일
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="w-full flex-1 p-sm rounded-md border-2 border-gray mx-1 mt-sm">
                  <Text className="text-black font-sf text-left text-caption">
                    보유 얼음
                  </Text>
                  <View className="flex-row items-center justify-end">
                    <Text className="text-black font-sf-b text-body">
                      {totalPoint.toLocaleString("ko-KR")}
                    </Text>
                    <Images.Ice width={30} height={30} />
                  </View>
                </View>
              </View>
            </View>

            {/* 달력 */}
            <View className="bg-white rounded-xl p-lg shadow">
              <Calendar
                onDayPress={handleDayPress}
                markedDates={getMarkedDates()}
                markingType="period"
                monthFormat="yyyy년 MM월"
                onMonthChange={(m) => {
                  // react-native-calendars: onMonthChange는 year/month만 제공
                  const mm = String(m.month).padStart(2, "0");
                  setCurrentMonth(`${m.year}-${mm}-01`);
                }}
                maxDate={todayDateString}
                theme={{
                  arrowColor: "black",
                  "stylesheet.calendar.header": {
                    dayTextAtIndex0: { color: "red" }, // 일요일
                    dayTextAtIndex6: { color: "blue" }, // 토요일
                  },
                }}
                style={{ borderRadius: 10, overflow: "hidden" }}
              />
            </View>

            {/* 일일 절감량 */}
            <View className="bg-white rounded-xl px-llg py-xl shadow">
              <Text className="text-body text-center font-sf-b mb-2">
                {selectedDate}
              </Text>

              {selectedDate ? (
                dailyLoading ? (
                  <ActivityIndicator size="small" color="green" />
                ) : dailyReductionData ? (
                  <View className="gap-4 mt-md">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Images.Walk width={24} height={24} />
                        <Text className="text-black font-sf-md text-body">
                          환경 걸음
                        </Text>
                      </View>
                      <Text className="text-black font-grotesk-md text-body">
                        {dailyReductionData.transportCo2Kg} kg
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Images.Diet width={24} height={24} />
                        <Text className="text-black font-sf-md text-body">
                          식단
                        </Text>
                      </View>
                      <Text className="text-black font-grotesk-md text-body">
                        {dailyReductionData.dietCo2Kg} kg
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Images.Survey width={24} height={24} />
                        <Text className="text-black font-sf-md text-body">
                          빙하 리포트
                        </Text>
                      </View>
                      <Text className="text-black font-grotesk-md text-body">
                        {dailyReductionData.surveyCo2Kg} kg
                      </Text>
                    </View>

                    <View className="pt-sm flex-row justify-between items-center">
                      <Text className="font-sf-b text-body text-green">
                        총 절감량
                      </Text>
                      <Text className="font-grotesk-b text-body text-right text-green">
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

            {/* 메뉴 */}
            <View className="bg-white rounded-xl p-lg shadow">
              <Pressable
                onPress={() => router.push("/pages/shop/orderlist")}
                className="flex-row items-center justify-between py-sm"
              >
                <View className="flex-row items-center gap-2">
                  <Images.Order width={32} height={32} />
                  <Text className="text-black font-sf-md text-body">
                    얼음 사용 내역
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => router.push("/pages/faq/faq")}
                className="flex-row items-center justify-between py-sm"
              >
                <View className="flex-row items-center gap-2">
                  <Images.Faq width={32} height={32} />
                  <Text className="text-black font-sf-md text-body">
                    도움말
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleLogout}
                className="flex-row items-center justify-between py-sm"
              >
                <View className="flex-row items-center gap-2">
                  <Images.LogOut width={32} height={32} />
                  <Text className="text-black font-sf-md text-body">
                    로그아웃
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
