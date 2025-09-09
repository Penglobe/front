// app/(tabs)/home/index.jsx
import { View, StyleSheet, Pressable, Dimensions, Text } from "react-native";
import { Images } from "@constants/Images";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing, interpolate } from "react-native-reanimated";
import { useAuth } from "@hooks/useAuth";
import { getTotalScore } from "@utils/carbonUtils";

export default function Home() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  useFocusEffect(useCallback(() => { refreshUser(); }, [refreshUser]));

  const counters = user?.counters ?? user ?? {};
  const streakDays = Number(counters?.attendanceStreakDays ?? counters?.attendance_streak_days ?? 0) || 0;
  const totalPoint = Number(user?.totalPoint ?? user?.total_point ?? 0) || 0;

  const totalScore = getTotalScore(user, counters);
  const level = Number(totalScore) || 0;
  const stage = level >= 30 ? 4 : level >= 20 ? 3 : level >= 10 ? 2 : 1;

  const IpaComp  = Images[`Ipa${stage}`]  ?? Images.Ipa1;
  const ToriComp = Images[`Tori${stage}`] ?? Images.Tori1;
  const BgComp   = Images[`BgHome${stage}`] ?? Images.BgHome1;

  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(10,  { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1, true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => {
    const elev = interpolate(translateY.value, [-8, 0], [6, 4]);
    const radius = interpolate(translateY.value, [-8, 0], [8, 4]);
    return { transform: [{ translateY: translateY.value }], shadowRadius: radius, elevation: elev };
  });

  const { width } = Dimensions.get("window");
  const TORI_W = Math.min(width * 0.42, 220);
  const IPA_W  = Math.min(width * 0.36, 200);
  const IPA_H  = IPA_W * 1.4; 

  return (
    <View className="flex-1">
      <BgComp
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* 상단 카드들 */}
      <View className="mt-[66px] px-pageX flex-row justify-between">
        <Pressable
          onPress={() => router.push("/(tabs)/mypage")}
          className="flex-row items-center justify-between bg-blue rounded-[32px] px-4 py-2 w-[100px] h-[40px] shadow-md"
          style={{ shadowColor:"#065A93", shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:2, elevation:4 }}
        >
          <Images.Snow width={30} height={30} />
          <Text className="text-white font-sf-md text-[16px]">{streakDays.toLocaleString("ko-KR")}일</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/pages/point/pointHistory")}
          className="flex-row items-center justify-between bg-green rounded-[32px] px-4 py-2 w-[100px] h-[40px] shadow-md"
          style={{ shadowColor:"#318643", shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:2, elevation:4 }}
        >
          <Images.Ice width={30} height={30} />
          <Text className="text-white font-sf-md text-[16px]">{totalPoint.toLocaleString("ko-KR")}</Text>
        </Pressable>
      </View>

      {/* 탄소 절감량 */}
      <View className="mt-[22px] px-pageX">
        <Pressable
          onPress={() => router.push("/pages/home/mission")}
          className="px-[24px] py-[24px] bg-white/100 rounded-[10px] gap-[8px] items-start shadow-md active:bg-zinc-100"
          style={{ shadowColor:"#000", shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:4, elevation:4 }}
        >
          <Text className="text-black font-sf-md text-[18px]">총 탄소 절감량</Text>
          <Text className="font-grotesk-b text-[24px] text-green">
            {(Number(totalScore) || 0).toFixed(1)}
            <Text className="text-black"> kg</Text>
            <Text className="text-[14px] font-sf-md text-black"> (CO<Text className="text-[10px]">2</Text> 기준)</Text>
          </Text>
        </Pressable>
      </View>

      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {/* 토리: 왼쪽 하단 */}
        <View style={{ position:"absolute", right: 20, top: 200 }}>
          <ToriComp width={TORI_W} height={TORI_W} preserveAspectRatio="xMidYMid meet" />
        </View>

        {/* 이파: 오른쪽 하단 (살짝 위) */}
        <Animated.View style={[{ position:"absolute", left: 20, bottom: 300 }]}>
          <IpaComp width={IPA_W} height={IPA_H} preserveAspectRatio="xMidYMid meet" />
        </Animated.View>
      </View>

      {/* 퀴즈 버튼 */}
      <Animated.View className="mt-auto items-center mb-[180px]" style={animatedStyle}>
        <Pressable
          onPress={() => router.push("pages/home/quiz")}
          className="flex-row items-center justify-center rounded-[32px] px-6 py-3.5 gap-2 bg-yellow active:bg-amber-300"
          style={{ shadowColor:"#F9C332", shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:4, elevation:4 }}
        >
          <Images.Quiz width={24} height={24} />
          <Text className="text-white font-sf-b text-[16px]">오늘의 퀴즈</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
