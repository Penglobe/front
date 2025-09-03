import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY } from "@env";

// ✅ 출발지 마커 (SVG)
const startSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 24 24">
  <circle cx="12" cy="10" r="8" fill="#318643" stroke="black" stroke-width="1"/>
  <path d="M12 22 C10 18, 14 18, 12 22 Z" fill="#318643" stroke="black" stroke-width="1"/>
  <text x="12" y="10" text-anchor="middle" dominant-baseline="middle"
        font-size="7" font-family="Arial" font-weight="bold" fill="white">
    출발
  </text>
</svg>
`;

// ✅ 도착지 마커 (SVG)
const endSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 24 24">
  <circle cx="12" cy="10" r="8" fill="#e53935" stroke="black" stroke-width="1"/>
  <path d="M12 22 C10 18, 14 18, 12 22 Z" fill="#e53935" stroke="black" stroke-width="1"/>
  <text x="12" y="10" text-anchor="middle" dominant-baseline="middle"
        font-size="7" font-family="Arial" font-weight="bold" fill="white">
    도착
  </text>
</svg>
`;

// ✅ 현재 위치 마커 (작은 원형)
const currentSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="6" fill="#1976d2" stroke="white" stroke-width="2"/>
</svg>
`;

export default function KakaoMapView({
  startLat = null,
  startLng = null,
  endLat = null,
  endLng = null,
  currentLat = null,
  currentLng = null,
  height = 250,
}) {
  const webviewRef = useRef(null);

  const startImage = "data:image/svg+xml;utf8," + encodeURIComponent(startSvg);
  const endImage = "data:image/svg+xml;utf8," + encodeURIComponent(endSvg);
  const currentImage =
    "data:image/svg+xml;utf8," + encodeURIComponent(currentSvg);

  // ✅ currentLat/currentLng 변경 시 현재 위치 갱신
  useEffect(() => {
    if (currentLat && currentLng && webviewRef.current) {
      const js = `
        if (window.currentMarker) {
          window.currentMarker.setPosition(
            new kakao.maps.LatLng(${currentLat}, ${currentLng})
          );
        } else {
          window.currentMarker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(${currentLat}, ${currentLng}),
            image: new kakao.maps.MarkerImage("${currentImage}", new kakao.maps.Size(24,24), {offset: new kakao.maps.Point(12,12)}),
            map: map
          });
        }
      `;
      webviewRef.current.injectJavaScript(js);
    }
  }, [currentLat, currentLng]);

  // ✅ 초기 중심 좌표
  let centerLat = 37.5665; // 기본 서울
  let centerLng = 126.978;
  if (startLat && startLng && endLat && endLng) {
    centerLat = (parseFloat(startLat) + parseFloat(endLat)) / 2;
    centerLng = (parseFloat(startLng) + parseFloat(endLng)) / 2;
  } else if (startLat && startLng) {
    centerLat = parseFloat(startLat);
    centerLng = parseFloat(startLng);
  } else if (endLat && endLng) {
    centerLat = parseFloat(endLat);
    centerLng = parseFloat(endLng);
  }

  // ✅ Kakao Map HTML
  const html = `
    <html><head><meta charset="utf-8" />
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}"></script>
    </head><body style="margin:0">
      <div id="map" style="width:100%;height:100%"></div>
      <script>
        var map = new kakao.maps.Map(document.getElementById('map'), {
          center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
          level: 3
        });

        // 출발지 마커
        ${
          startLat && startLng
            ? `
          new kakao.maps.Marker({
            position: new kakao.maps.LatLng(${startLat}, ${startLng}),
            image: new kakao.maps.MarkerImage("${startImage}", new kakao.maps.Size(160,160), {offset: new kakao.maps.Point(80,150)}),
            map: map
          });
        `
            : ""
        }

        // 도착지 마커
        ${
          endLat && endLng
            ? `
          new kakao.maps.Marker({
            position: new kakao.maps.LatLng(${endLat}, ${endLng}),
            image: new kakao.maps.MarkerImage("${endImage}", new kakao.maps.Size(160,160), {offset: new kakao.maps.Point(80,150)}),
            map: map
          });
        `
            : ""
        }
      </script>
    </body></html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1 }}
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
