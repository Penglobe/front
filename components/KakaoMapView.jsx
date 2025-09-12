import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function KakaoMapView({
  startLat,
  startLng,
  endLat,
  endLng,
  currentLat,
  currentLng,
  height = 300,
}) {
  const webviewRef = useRef(null);
  const SERVER_URL = "https://penglobe.shinhanacademy.co.kr";

  // ✅ 최초 로딩 시 출발/도착만 서버에서 그림
  const params = new URLSearchParams();
  if (startLat && startLng) {
    params.append("startLat", startLat);
    params.append("startLng", startLng);
  }
  if (endLat && endLng) {
    params.append("endLat", endLat);
    params.append("endLng", endLng);
  }
  if (currentLat && currentLng) {
    params.append("currentLat", currentLat);
    params.append("currentLng", currentLng);
  }
  const uri = `${SERVER_URL}/map?${params.toString()}`;

  // ✅ 마커만 갱신 (중심은 map.html에서 최초 1회만)
  const updateMarker = (name, lat, lng) => {
    if (!lat || !lng || !webviewRef.current) return;
    const jsCode = `
      if (window.map) {
        var pos = new kakao.maps.LatLng(${Number(lat)}, ${Number(lng)});
        if (!window.${name}Marker) {
          window.${name}Marker = new kakao.maps.Marker({ position: pos, map: window.map });
        } else {
          window.${name}Marker.setPosition(pos);
        }
      }
      true;
    `;
    webviewRef.current.injectJavaScript(jsCode);
  };

  // 출발 마커 갱신
  useEffect(() => {
    updateMarker("start", startLat, startLng);
  }, [startLat, startLng]);

  // 도착 마커 갱신
  useEffect(() => {
    updateMarker("end", endLat, endLng);
  }, [endLat, endLng]);

  // 현재 위치 마커 갱신
  useEffect(() => {
    updateMarker("current", currentLat, currentLng);
  }, [currentLat, currentLng]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ uri }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        // ✅ WebView 로딩 끝나면 지도 relayout 보장
        onLoadEnd={() => {
          if (webviewRef.current) {
            webviewRef.current.injectJavaScript(`
      if (window.map) {
        // 💡 중심은 HTML에서만, 여기서는 크기만 보정
        window.map.relayout();
      }
      true;
    `);
          }
        }}
        onMessage={(event) => {
          console.log("📩 WebView message:", event.nativeEvent.data);
        }}
        onError={(syntheticEvent) => {
          console.error("❌ WebView error:", syntheticEvent.nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          console.error("❌ WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
});
