import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY } from "@env";
import * as Location from "expo-location";
import { useRouter } from "expo-router"; // ✅ expo-router 라우터 사용
import useTransport from "./useTransport";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import TransportButton from "@components/TransportButton";

// ✅ SVG 내용을 문자열로 정의
const startSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 24 24">
  <circle cx="12" cy="10" r="8" fill="#318643" stroke="black" stroke-width="1"/>
  <path d="M12 22 C10 18, 14 18, 12 22 Z" fill="#318643" stroke="black" stroke-width="1"/>
  <text x="12" y="10" text-anchor="middle" dominant-baseline="middle"
        font-size="7" font-family="SFPro-Bold, Arial, sans-serif" font-weight="bold" fill="white">
    출발
  </text>
</svg>
`;

export default function TransportStart() {
  const [location, setLocation] = useState(null);
  const { mode, setMode, activityId, startTransport, stopTransport } =
    useTransport();

  const router = useRouter(); // ✅ expo-router hook

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
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

  // ✅ SVG → Data URI 변환
  const imageSrc = "data:image/svg+xml;utf8," + encodeURIComponent(startSvg);

  const html = `
  <html><head><meta charset="utf-8" />
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}"></script>
  </head><body style="margin:0"><div id="map" style="width:100%;height:100%"></div>
  <script>
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${location.latitude}, ${location.longitude}),
      level: 3
    });

    var imageSize = new kakao.maps.Size(160, 160);
    var imageOption = { offset: new kakao.maps.Point(80, 150) };

    var markerImage = new kakao.maps.MarkerImage("${imageSrc}", imageSize, imageOption);

    var marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(${location.latitude}, ${location.longitude}),
      image: markerImage
    });
    marker.setMap(map);
  </script></body></html>
`;

  return (
    <View className="flex-1">
      {/* ✅ 배경 */}
      <BgGradient />

      {/* ✅ 지도 */}
      <View className="h-[250px] mt-20 mx-5 rounded-xl overflow-hidden">
        <WebView originWhitelist={["*"]} source={{ html }} className="flex-1" />
      </View>

      {/* ✅ 타이틀 */}
      <View className="px-4 mt-5">
        <Text
          className="text-xl text-[#318643]"
          style={{ fontFamily: "SFPro-Bold" }}
        >
          이동 수단을 선택해 주세요
        </Text>
      </View>

      {/* ✅ 이동수단 선택 */}
      <View className="m-5 flex-row flex-wrap justify-between">
        <View className="w-[48%]">
          <TransportButton
            label="대중교통"
            icon="bus-outline"
            selected={mode === "TRANSIT"}
            onPress={() => setMode("TRANSIT")}
            disabled={!!activityId}
          />
        </View>
        <View className="w-[48%]">
          <TransportButton
            label="도보"
            icon="walk-outline"
            selected={mode === "WALK"}
            onPress={() => setMode("WALK")}
            disabled={!!activityId}
          />
        </View>
        <View className="w-[48%]">
          <TransportButton
            label="자전거"
            icon="bicycle-outline"
            selected={mode === "BIKE"}
            onPress={() => setMode("BIKE")}
            disabled={!!activityId}
          />
        </View>
        <View className="w-[48%]" />
      </View>

      {/* ✅ 이동 시작/종료 버튼 & 다음 버튼 */}
      <View className="absolute bottom-[150px] left-0 right-0 px-4">
        {!activityId ? (
          <>
            <MainButton label="이동 시작" onPress={startTransport} />
            <View className="mt-4" />
            <MainButton
              label="다음"
              onPress={() =>
                router.push({
                  pathname: "/pages/transport/TransportBookmark",
                  params: {
                    startLat: location.latitude,
                    startLng: location.longitude,
                  },
                })
              }
            />
          </>
        ) : (
          <MainButton
            label="이동 종료"
            onPress={stopTransport}
            className="bg-red-500 active:bg-red-700"
            style={{ shadowColor: "#c53030" }}
          />
        )}
      </View>
    </View>
  );
}
