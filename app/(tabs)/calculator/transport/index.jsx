// pages/transport/transportStart.jsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import useTransport from "@hooks/useTransport";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import TransportButton from "@components/TransportButton";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView"; // ✅ 공통 컴포넌트 import

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const router = useRouter();

  const userId = 1; // TODO: 나중에 auth 훅에서 가져오기
  const { mode, setMode, activity, startTransport, stopTransport } =
    useTransport(userId);

  // ✅ 권한 요청 & 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("위치 권한이 필요합니다.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      // ✅ 기본 모드 대중교통
      if (!mode) {
        setMode("TRANSIT");
      }
    })();
  }, []);

  if (!location) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 👉 이동 시작 버튼 핸들러
  const handleStart = async () => {
    try {
      await startTransport(mode || "TRANSIT");
    } catch (err) {
      Alert.alert("이동 시작 실패", "서버와 통신할 수 없습니다.");
    }
  };

  // 👉 이동 종료 버튼 핸들러
  const handleStop = async () => {
    try {
      const result = await stopTransport();
      Alert.alert("이동 종료", `총 이동 거리: ${result.distanceM}m`);
    } catch (err) {
      Alert.alert("이동 종료 실패", "서버와 통신할 수 없습니다.");
    }
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="환경 걸음" className="px-pageX" />

      {/* ✅ 공통 카카오맵 */}
      <View className="h-[250px] m-[17px] rounded-xl overflow-hidden">
        <KakaoMapView
          startLat={location.latitude}
          startLng={location.longitude}
          height={250}
        />
      </View>

      {/* ✅ 타이틀 */}
      <View className="px-pageX mb-4">
        <Text
          className="text-xl text-[#318643]"
          style={{ fontFamily: "SFPro-Bold" }}
        >
          이동 수단을 선택해 주세요
        </Text>
      </View>

      {/* ✅ 이동수단 선택 */}
      <View className="px-pageX flex-row flex-wrap justify-between">
        <View className="w-[48%]">
          <TransportButton
            label="대중교통"
            icon="bus-outline"
            selected={mode === "TRANSIT"} // ✅ 기본 선택됨
            onPress={() => setMode("TRANSIT")}
            disabled={!!activity}
          />
        </View>
        <View className="w-[48%]">
          <TransportButton
            label="도보"
            icon="walk-outline"
            selected={mode === "WALK"}
            onPress={() => setMode("WALK")}
            disabled={!!activity}
          />
        </View>
        <View className="w-[48%]">
          <TransportButton
            label="자전거"
            icon="bicycle-outline"
            selected={mode === "BIKE"}
            onPress={() => setMode("BIKE")}
            disabled={!!activity}
          />
        </View>
        <View className="w-[48%]" />
      </View>

      {/* ✅ 이동 시작/종료 버튼 & 다음 버튼 */}
      <View className="px-pageX">
        {!activity ? (
          <>
            <MainButton label="이동 시작" onPress={handleStart} />
            <View className="mt-4" />
            <MainButton
              label="다음"
              onPress={() =>
                router.push({
                  pathname: "/pages/transport/transportBookmark",
                  params: {
                    startLat: location.latitude,
                    startLng: location.longitude,
                    mode: mode || "TRANSIT", // ✅ 항상 값 보장
                  },
                })
              }
            />
          </>
        ) : (
          <MainButton
            label="이동 종료"
            onPress={handleStop}
            className="bg-red-500 active:bg-red-700"
            style={{ shadowColor: "#c53030" }}
          />
        )}
      </View>
    </View>
  );
}
