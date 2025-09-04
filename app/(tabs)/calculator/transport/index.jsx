import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import TransportButton from "@components/TransportButton";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState("TRANSIT"); // ✅ 기본값: 대중교통
  const router = useRouter();

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
    })();
  }, []);

  if (!location) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

      {/* ✅ 다음 버튼 */}
      <View className="px-pageX">
        <MainButton
          className="m-16"
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
    </View>
  );
}
