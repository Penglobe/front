// TransportStart.jsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, ScrollView } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import TransportButton from "@components/TransportButton";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";
import CustomAlert from "@components/CustomAlert";
import LoadingScreen from "@components/LoadingScreen";

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState("TRANSIT");
  const router = useRouter();

  // ✅ Alert 상태
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: "",
    onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
    onCancel: undefined,
  });

  // ✅ Alert 오픈 헬퍼 함수
  const openAlert = (config) =>
    setAlertConfig({
      visible: true,
      title: config.title || "",
      message: config.message || "",
      confirmText: config.confirmText || "확인",
      cancelText: config.cancelText,
      onConfirm: () => {
        if (config.onConfirm) config.onConfirm();
        setAlertConfig((prev) => ({ ...prev, visible: false }));
      },
      onCancel: config.onCancel
        ? () => {
            config.onCancel();
            setAlertConfig((prev) => ({ ...prev, visible: false }));
          }
        : undefined,
    });

  // ✅ 권한 요청 & 현재 위치 가져오기 (빠르게 + 보완)
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          openAlert({
            title: "권한 필요",
            message: "위치 권한이 필요합니다.",
          });
          return;
        }

        // 🔹 1단계: 캐싱된 위치 먼저 가져오기 (빠른 응답)
        let lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          setLocation(lastLoc.coords);
        }

        // 🔹 2단계: watchPositionAsync로 지속 업데이트 (정확도 보완)
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // 적당한 정확도 & 속도 균형
            distanceInterval: 10, // 10m 이동 시 업데이트
          },
          (loc) => {
            setLocation(loc.coords);
          }
        );
      } catch (err) {
        console.error("위치 가져오기 실패:", err);
        openAlert({
          title: "위치 실패",
          message: "현재 위치를 가져올 수 없습니다.",
        });
      }
    })();
  }, []);

  if (!location) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <LoadingScreen message="현재 위치를 찾는 중..." />
        {/* ✅ CustomAlert */}
        <CustomAlert {...alertConfig} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <BgGradient />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 150,
        }}
      >
        <HeaderBar title="환경 걸음" className="px-pageX" />

        {/* ✅ ScrollView로 감싸서 스크롤 가능 */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ KakaoMapView */}
          <View className="overflow-hidden">
            <KakaoMapView
              key={`${location.latitude}-${location.longitude}`}
              startLat={location.latitude}
              startLng={location.longitude}
              height={280}
            />
          </View>

          {/* 타이틀 */}
          <View className="px-pageX py-llg">
            <Text className="text-xl" style={{ fontFamily: "SFPro-Bold" }}>
              이동 수단을 선택해 주세요.
            </Text>
          </View>

          {/* 이동수단 선택 */}
          <View className="px-pageX flex-row flex-wrap justify-between">
            <View className="w-[48%]">
              <TransportButton
                label="대중교통"
                icon="bus-outline"
                selected={mode === "TRANSIT"}
                onPress={() => setMode("TRANSIT")}
              />
            </View>
            <View className="w-[48%]">
              <TransportButton
                label="도보"
                icon="walk-outline"
                selected={mode === "WALK"}
                onPress={() => setMode("WALK")}
              />
            </View>
            <View className="w-[48%]">
              <TransportButton
                label="자전거"
                icon="bicycle-outline"
                selected={mode === "BIKE"}
                onPress={() => setMode("BIKE")}
              />
            </View>
            <View className="w-[48%]" />
          </View>

          {/* 다음 버튼 */}
          <View className="px-pageX py-xl">
            <MainButton
              label="다음"
              onPress={() =>
                router.push({
                  pathname: "/pages/transport/transportBookmark",
                  params: {
                    startLat: location.latitude,
                    startLng: location.longitude,
                    mode,
                  },
                })
              }
            />
          </View>
        </ScrollView>
      </View>

      {/* ✅ CustomAlert */}
      <CustomAlert {...alertConfig} />
    </View>
  );
}
