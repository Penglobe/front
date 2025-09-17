import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Text,
  BackHandler,
} from "react-native";
import { useFocusEffect, useRouter, usePathname } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import MainButton from "@components/MainButton";
import Modal from "@components/Modal";
import { apiFetch } from "@services/authService";
import AttendanceReward from "@components/AttendanceReward";
import { Images } from "@constants/Images";
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { StatusBar } from "expo-status-bar";

export default function Home() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [att, setAtt] = useState({ visible: false, loading: false });
  const [preview, setPreview] = useState(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [chestClicked, setChestClicked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );
      return () => subscription.remove();
    }, [])
  );

  // 모달 표시 여부
  const checkAttendancePopup = useCallback(async () => {
    try {
      const res = await apiFetch("/attendance/popup");
      const t = await res.text();
      let json = null;
      try {
        json = JSON.parse(t);
      } catch {}
      setAtt({
        visible: !!(res.ok && json?.data?.show === true),
        loading: false,
      });
      if (res.ok && json?.data?.show === true) {
        setLoadingPrev(true);
        const pRes = await apiFetch("/attendance/preview");
        const pt = await pRes.text();
        let pj = null;
        try {
          pj = JSON.parse(pt);
        } catch {}
        if (pRes.ok) setPreview(Number(pj?.data?.rewardPoints ?? 0));
        setLoadingPrev(false);
        setChestClicked(false);
      } else {
        setPreview(null);
        setChestClicked(false);
      }
    } catch {
      setAtt((s) => ({ ...s, loading: false }));
    }
  }, []);

  const onChestReveal = useCallback(async () => {
    setChestClicked(true);
    if (preview != null) return;
    try {
      setLoadingPrev(true);
      const res = await apiFetch("/attendance/preview");
      const t = await res.text();
      let json = null;
      try {
        json = JSON.parse(t);
      } catch {}
      if (res.ok) setPreview(Number(json?.data?.rewardPoints ?? 0));
    } finally {
      setLoadingPrev(false);
    }
  }, [preview]);

  const claimAttendance = useCallback(async () => {
    try {
      setClaiming(true);
      const res = await apiFetch("/attendance/claim", { method: "POST" });
      const t = await res.text();
      let json = null;
      try {
        json = JSON.parse(t);
      } catch {}
      if (!res.ok)
        throw new Error(json?.message || "보상 지급에 실패했습니다.");

      const reward = Number(json?.data?.rewardPoints ?? preview ?? 0);

      setAtt({ visible: false, loading: false });
      setPreview(null);
      setChestClicked(false);
      setTimeout(() => {
        refreshUser?.();
      }, 80);
    } catch (e) {
      setTimeout(() => {
        Alert.alert("오류", e?.message ?? "보상 지급에 실패했습니다.");
      }, 50);
    } finally {
      setClaiming(false);
    }
  }, [preview, refreshUser]);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      checkAttendancePopup();
    }, [refreshUser, checkAttendancePopup])
  );

  useEffect(() => {
    checkAttendancePopup();
  }, [checkAttendancePopup]);

  const counters = user?.counters ?? user ?? {};
  const streakDays =
    Number(
      counters?.attendanceStreakDays ?? counters?.attendance_streak_days ?? 0
    ) || 0;
  const totalPoint = Number(user?.totalPoint ?? 0);
  const totalScore = Number(user?.totalScore ?? 0);
  const level = Number(totalScore) || 0;
  const stage = level >= 300 ? 4 : level >= 150 ? 3 : level >= 50 ? 2 : 1;
  const BgComp = Images[`BgHome${stage}`] ?? Images.BgHome1;
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(10, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  return (
    <View className="flex-1">
      <StatusBar hidden />
      <BgComp
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View className="mt-6xl px-pageX flex-row justify-between">
        <Pressable
          onPress={() => router.push("/(tabs)/mypage")}
          className="flex-row items-center justify-between bg-blue rounded-3xl px-lg gap-4 py-xxs h-[40px] shadow-md"
          style={{
            shadowColor: "#065A93",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 2,
            elevation: 4,
          }}
        >
          <Images.Snow width={30} height={30} />
          <Text className="text-white font-sf-md text-label">
            {streakDays.toLocaleString("ko-KR")}일
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/pages/point/pointHistory")}
          className="flex-row items-center justify-between bg-green rounded-3xl px-lg gap-4 py-xxs h-[40px] shadow-md"
          style={{
            shadowColor: "#318643",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 2,
            elevation: 4,
          }}
        >
          <Images.Ice width={30} height={30} />
          <Text className="text-white font-sf-md text-label">
            {totalPoint.toLocaleString("ko-KR")}
          </Text>
        </Pressable>
      </View>

      {/* 탄소 절감량 카드 */}
      <View className="mt-llg px-pageX">
        <Pressable
          onPress={() => router.push("/pages/home/mission")}
          className="px-xl py-xl bg-white/100 rounded-xl gap-[8px] items-start shadow-md active:bg-zinc-100"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Text className="text-black text-body font-sf-md">
            총 탄소 절감량
          </Text>
          <Text className="font-grotesk-b text-h1 text-green">
            {(Number(totalScore) || 0).toFixed(2)}
            <Text className="text-black"> kg</Text>
            <Text className="text-label font-sf-md text-black">
              {" "}
              (CO<Text className="text-overline">2</Text> 기준)
            </Text>
          </Text>
        </Pressable>
      </View>

      {/* 퀴즈 버튼 */}
      <Animated.View className="mt-auto items-center mb-[180px]">
        <Pressable
          onPress={() => router.push("pages/home/quiz")}
          className="flex-row items-center justify-center rounded-3xl px-xl py-md gap-2 bg-yellow active:bg-amber-300"
          style={{
            shadowColor: "#F9C332",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Images.Quiz width={24} height={24} />
          <Text className="text-white font-sf-b text-body">오늘의 퀴즈</Text>
        </Pressable>
      </Animated.View>

      <Modal visible={att.visible}>
        <View className="flex-row items-center mb-3 justify-center relative">
          {/* 제목 */}
          <Text className="text-h1 font-sf-b">출석 보상</Text>
        </View>

        <Text className="text-center text-h4 text-black font-sf-md mb-md">
          상자를 클릭하여 랜덤 보상을 확인해보세요.
        </Text>

        <AttendanceReward
          previewPoints={preview}
          loadingPreview={loadingPrev}
          onReveal={onChestReveal}
        />

        <View className="mt-sm">
          <MainButton
            onPress={claimAttendance}
            disabled={claiming || !chestClicked || preview == null}
          >
            <Text className="text-white font-sf-b text-h4">
              {claiming ? "지급 중..." : "보상 받기"}
            </Text>
          </MainButton>
        </View>
      </Modal>
    </View>
  );
}
