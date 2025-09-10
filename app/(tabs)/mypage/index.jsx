import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, Alert, ScrollView } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { getAccessToken, me } from "@services/authService";
import Constants from "expo-constants";
import { Calendar } from "react-native-calendars";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect

const BASE_URL = Constants.expoConfig.extra.SERVER_URL;

const AVATARS = [
  { key: "ToriFace", label: "토리", Render: Images.ToriFace },
  { key: "IpaFace", label: "이파", Render: Images.IpaFace },
];

const getAvatarRenderComponent = (profileKey) => {
  const avatar = AVATARS.find((a) => a.key === profileKey);
  return avatar ? avatar.Render : null;
};

export default function MyPage() {
  const [myPageInfo, setMyPageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, "0");
  const todayDateString = `${year}-${month}-${day}`;

  const [selectedDate, setSelectedDate] = useState(todayDateString); // State for selected date, default to today
  const [dailyReductionData, setDailyReductionData] = useState(null); // State for daily data
  const [dailyLoading, setDailyLoading] = useState(false); // Loading state for daily data
  const [attendanceDates, setAttendanceDates] = useState([]); // State for attendance dates

  const fetchMyPageInfo = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        console.warn("로그인 필요");
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`마이페이지 정보 가져오기 에러: ${response.status}`);
      }

      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setMyPageInfo(apiResponse.data);
      } else {
        Alert.alert(
          "오류",
          apiResponse.message || "마이페이지 정보를 가져오지 못했습니다."
        );
      }
    } catch (error) {
      console.error("Error fetching my page info:", error);
      Alert.alert("오류", "마이페이지 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyReductionData = useCallback(async (dateString) => {
    setDailyLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        console.warn("로그인 필요");
        setDailyLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/users/me/daily/${dateString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`일일 절감량 정보 가져오기 에러: ${response.status}`);
      }

      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setDailyReductionData(apiResponse.data);
      } else {
        Alert.alert(
          "오류",
          apiResponse.message || "일일 절감량 정보를 가져오지 못했습니다."
        );
      }
    } catch (error) {
      console.error("Error fetching daily reduction info:", error);
      Alert.alert(
        "오류",
        "일일 절감량 정보를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const fetchAttendanceDates = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.warn("로그인 필요");
        return;
      }

      const response = await fetch(`${BASE_URL}/users/me/attendance-dates`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`출석 날짜 정보 가져오기 에러: ${response.status}`);
      }

      const apiResponse = await response.json();
      if (apiResponse.status === 200) {
        setAttendanceDates(apiResponse.data);
      } else {
        Alert.alert(
          "오류",
          apiResponse.message || "출석 날짜 정보를 가져오지 못했습니다."
        );
      }
    } catch (error) {
      console.error("Error fetching attendance dates:", error);
      Alert.alert("오류", "출석 날짜 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyPageInfo();
      fetchAttendanceDates();
    }, [fetchMyPageInfo, fetchAttendanceDates])
  );

  const handleResetAttendance = useCallback(async () => {
    Alert.alert(
      "초기화 확인",
      "출석 데이터와 관련 활동 기록을 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          onPress: async () => {
            try {
              const token = await getAccessToken();
              if (!token) {
                console.warn("로그인 필요");
                return;
              }

              const response = await fetch(
                `${BASE_URL}/users/me/reset-attendance`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`출석 데이터 초기화 에러: ${response.status}`);
              }

              const apiResponse = await response.json();
              if (apiResponse.status === 200) {
                Alert.alert(
                  "성공",
                  "출석 데이터가 성공적으로 초기화되었습니다."
                );
                // Refresh data after reset
                fetchMyPageInfo();
                fetchAttendanceDates();
              } else {
                Alert.alert(
                  "오류",
                  apiResponse.message || "출석 데이터 초기화에 실패했습니다."
                );
              }
            } catch (error) {
              console.error("Error resetting attendance data:", error);
              Alert.alert("오류", "출석 데이터 초기화 중 오류가 발생했습니다.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [fetchMyPageInfo, fetchAttendanceDates]);

  useEffect(() => {
    fetchDailyReductionData(todayDateString); // Fetch daily data for today
  }, [fetchDailyReductionData, todayDateString]); // Only fetch daily data on initial mount or date change

  // Handler for calendar day press
  const handleDayPress = (day) => {
    const formattedDate = day.dateString; // day object from react-native-calendars has dateString property
    setSelectedDate(formattedDate);
    fetchDailyReductionData(formattedDate);
  };

  // Function to prepare markedDates for Calendar component
  const getMarkedDates = () => {
    const marked = {};

    // 1. Mark all attendance days first
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
              color: "#2E8B57", // SeaGreen for attendance
              textColor: "white",
              startingDay: formattedTempDate === currentStreakStart,
              endingDay: formattedTempDate === streakEndDate, // Fixed typo here
            };
            tempDate.setDate(tempDate.getDate() + 1);
          }
          currentStreakStart = null;
        }
      }
    }

    // 2. Override the style for the selected date
    if (selectedDate) {
      const isAttendanceDay = !!marked[selectedDate];
      const selectionColor = isAttendanceDay ? "#1E90FF" : "#D3D3D3"; // Blue for attendance, Gray for non-attendance

      marked[selectedDate] = {
        ...marked[selectedDate], // Keep starting/ending day properties if they exist
        color: selectionColor,
        // If it's not an attendance day, we need to make it a standalone period (a circle)
        startingDay: !isAttendanceDay
          ? true
          : marked[selectedDate]?.startingDay,
        endingDay: !isAttendanceDay ? true : marked[selectedDate]?.endingDay,
      };
    }
    return marked;
  };

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

  return (
    <View className="flex-1">
      <BgGradient />
      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="마이페이지" />

        <ScrollView className="flex-1 px-pageX">
          <View className="bg-white rounded-xl p-lg shadow mb-md">
            <Text className="text-lg font-bold mb-xxs">사용자 정보</Text>
            <Text>사용자 ID: {myPageInfo.userId}</Text>
            <Text>닉네임: {myPageInfo.nickname}</Text>
            {myPageInfo.profile && (
              <View className="w-[60px] h-[60px] mb-md">
                {getAvatarRenderComponent(myPageInfo.profile)
                  ? React.createElement(
                      getAvatarRenderComponent(myPageInfo.profile),
                      { width: 60, height: 60 }
                    )
                  : null}
              </View>
            )}
            <View className="flex-row items-center">
              <Text>얼음 이미지: {myPageInfo.totalPoint}</Text>
              <Images.Ice width={20} height={20} className="ml-xs" />
            </View>
            <Text>누적 출석일: {myPageInfo.attendanceTotalDays}</Text>
            <Text>최장 연속 출석일: {myPageInfo.longestAttendanceStreak}</Text>
            {myPageInfo.regionName && (
              <Text>지역: {myPageInfo.regionName}</Text>
            )}
          </View>

          <Calendar
            onDayPress={handleDayPress}
            markedDates={getMarkedDates()}
            markingType="period"
          />

          {/* Daily Carbon Reduction Section */}
          <View className="bg-white rounded-xl p-lg shadow mt-lg">
            <Text className="text-lg font-bold mb-xxs">일일 탄소 절감량</Text>
            {selectedDate ? (
              dailyLoading ? (
                <ActivityIndicator size="small" color="#0000ff" />
              ) : dailyReductionData ? (
                <View>
                  <Text>선택 날짜: {selectedDate}</Text>
                  <Text>
                    환경 걸음 절감량: {dailyReductionData.transportCo2Kg} kg
                  </Text>
                  <Text>식단 절감량: {dailyReductionData.dietCo2Kg} kg</Text>
                  <Text className="font-bold mt-sm">
                    총 절감량: {dailyReductionData.totalCo2Kg} kg
                  </Text>
                </View>
              ) : (
                <Text>선택한 날짜의 절감량 정보를 불러올 수 없습니다.</Text>
              )
            ) : (
              <Text>날짜를 선택하여 일일 절감량을 확인하세요.</Text>
            )}
          </View>

          {/* 추가 정보 섹션 (필요시 확장) */}
          {/* 추가 정보 섹션 (필요시 확장) */}
          <View className="bg-white rounded-xl p-lg shadow mt-lg">
            <Text className="text-lg font-bold mb-xxs">기타 정보</Text>
            <Text>현재 연속 출석일: {myPageInfo.attendanceStreakDays}</Text>
            {/* 여기에 다른 마이페이지 관련 정보를 추가할 수 있습니다. */}
            <MainButton
              label="출석 데이터 초기화 (테스트용)"
              onPress={handleResetAttendance}
              className="mt-lg bg-red-500"
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
