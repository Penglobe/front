import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function KakaoMapView({
  startLat = null,
  startLng = null,
  endLat = null,
  endLng = null,
  currentLat = null,
  currentLng = null,
  height = 300,
}) {
  const webviewRef = useRef(null);

  // ✅ 서버 URL
  const SERVER_URL = "https://penglobe.shinhanacademy.co.kr";

  // ✅ 값이 있을 때만 파라미터 추가
  const params = new URLSearchParams();
  if (startLat != null && startLng != null) {
    params.append("startLat", startLat);
    params.append("startLng", startLng);
  }
  if (endLat != null && endLng != null) {
    params.append("endLat", endLat);
    params.append("endLng", endLng);
  }
  if (currentLat != null && currentLng != null) {
    params.append("currentLat", currentLat);
    params.append("currentLng", currentLng);
  }

  // ✅ 캐시 무효화를 위해 timestamp 추가
  params.append("_ts", Date.now());

  const uri = `${SERVER_URL}/map?${params.toString()}`;

  // ✅ WebView에 전달할 URL 로그
  console.log("🌍 KakaoMapView URI:", uri);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ uri }}
        style={{ flex: 1, minHeight: height }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowsBackForwardNavigationGestures={true}
        setSupportMultipleWindows={false}
        // ✅ WebView 내부에서 console.log → React Native로 전달
        onMessage={(event) => {
          console.log("📩 WebView message:", event.nativeEvent.data);
        }}
        // ✅ 에러 핸들링
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("❌ WebView error:", nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("❌ WebView HTTP error:", nativeEvent);
        }}
        onLoadEnd={() => {
          console.log("✅ WebView finished loading:", uri);
          // 👇 HTML 쪽 map 객체가 있으면 강제 relayout
          webviewRef.current?.injectJavaScript(`
            setTimeout(() => {
              if (window.map) {
                console.log("🔄 Forcing map.relayout()");
                map.relayout();
              }
            }, 300);
            true;
          `);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
});
