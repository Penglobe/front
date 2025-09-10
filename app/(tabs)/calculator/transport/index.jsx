// TransportStart.jsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import TransportButton from "@components/TransportButton";
import HeaderBar from "@components/HeaderBar";
import KakaoMapView from "@components/KakaoMapView";

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState("TRANSIT");
  const router = useRouter();

  // ✅ 권한 요청 & 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("위치 권한이 필요합니다.");
          return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      } catch (err) {
        console.error("위치 가져오기 실패:", err);
        Alert.alert("현재 위치를 가져올 수 없습니다.");
      }
    })();
  }, []);

  if (!location) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-gray-600">현재 위치를 불러오는 중...</Text>
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
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ KakaoMapView */}
        <View className="mb-5 overflow-hidden">
          <KakaoMapView
            key={`${location.latitude}-${location.longitude}`}
            startLat={location.latitude}
            startLng={location.longitude}
            currentLat={location.latitude}
            currentLng={location.longitude}
            height={280}
          />
        </View>

        {/* 타이틀 */}
        <View className="px-pageX mb-4">
          <Text
            className="text-xl text-[#318643]"
            style={{ fontFamily: "SFPro-Bold" }}
          >
            이동 수단을 선택해 주세요
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
        <View className="px-pageX">
          <MainButton
            className="mt-10"
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
    </View>
  );
}
