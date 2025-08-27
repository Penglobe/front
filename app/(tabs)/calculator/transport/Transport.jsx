import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Button,
  Text,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_API_KEY, SERVER_URL } from "@env"; // .env에서 환경 변수 불러오기
import * as Location from "expo-location"; // 위치 모듈
import * as TaskManager from "expo-task-manager"; // 백그라운드 작업 관리

// 📌 Task 이름 상수
const LOCATION_TASK_NAME = "background-location-task";

/**
 * 📌 백그라운드 위치 추적 Task 정의
 * 앱이 백그라운드에 있을 때도 이 함수가 실행됨
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("위치 추적 태스크 에러:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      console.log("📍 백그라운드 위치:", latitude, longitude);

      // 👉 여기서 서버로 위치 전송 (예: 이동 중 활동 ID를 기반으로 업데이트)
      try {
        await fetch(`${SERVER_URL}/transport/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude }),
        });
      } catch (err) {
        console.error("서버 전송 에러:", err);
      }
    }
  }
});

export default function Transport() {
  const [location, setLocation] = useState(null); // 현재 GPS 좌표
  const [mode, setMode] = useState("WALK"); // 선택된 이동 모드
  const [activityId, setActivityId] = useState(null); // 서버에서 받은 활동 ID

  /**
   * 앱 시작 시 1회 현재 위치 가져오기
   */
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ 위치 권한 거부됨");
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  /**
   * 🚀 백그라운드 위치 추적 시작
   */
  const startBackgroundLocation = async () => {
    // 권한 요청
    let { status: fg } = await Location.requestForegroundPermissionsAsync();
    let { status: bg } = await Location.requestBackgroundPermissionsAsync();

    if (fg !== "granted" || bg !== "granted") {
      alert("위치 권한이 필요합니다.");
      return;
    }

    // 위치 업데이트 시작
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5초마다 업데이트
      distanceInterval: 10, // 10m 이동마다 업데이트
      showsBackgroundLocationIndicator: true, // iOS 상태바에 표시
      foregroundService: {
        // Android Foreground Service 알림
        notificationTitle: "위치 추적 중",
        notificationBody: "이동 경로를 기록하고 있습니다.",
      },
    });

    console.log("✅ 백그라운드 위치 추적 시작됨");
  };

  /**
   * ⛔️ 백그라운드 위치 추적 중단
   */
  const stopBackgroundLocation = async () => {
    const hasStarted =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("🛑 백그라운드 위치 추적 종료됨");
    }
  };

  /**
   * 🚶 이동 시작 API 호출 + 위치 추적 시작
   */
  const startTransport = async () => {
    try {
      const response = await fetch(
        `${SERVER_URL}/transport/start?userId=1&mode=${mode}`,
        { method: "POST" }
      );
      const data = await response.json();
      console.log("start response:", data);

      setActivityId(data.data.id); // 활동 ID 저장

      // 백그라운드 위치 추적 시작
      await startBackgroundLocation();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * 🏁 이동 종료 API 호출 + 위치 추적 종료
   */
  const stopTransport = async () => {
    if (!activityId) return;

    try {
      const response = await fetch(
        `${SERVER_URL}/transport/${activityId}/stop?distanceM=1000`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(null), // 경로(pathGeojson)는 아직 미구현
        }
      );
      const data = await response.json();
      console.log("stop response:", data);

      setActivityId(null); // 상태 초기화

      // 백그라운드 위치 추적 종료
      await stopBackgroundLocation();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * 위치 불러오기 전 → 로딩 화면
   */
  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /**
   * 카카오 지도 WebView HTML
   */
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body, html { margin:0; padding:0; height:100% }
          #map { width:100%; height:100% }
        </style>
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var container = document.getElementById('map');
          var options = {
            center: new kakao.maps.LatLng(${location.latitude}, ${location.longitude}),
            level: 3
          };
          var map = new kakao.maps.Map(container, options);
          var marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(${location.latitude}, ${location.longitude})
          });
          marker.setMap(map);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* 카카오 지도 */}
      <WebView originWhitelist={["*"]} source={{ html }} style={{ flex: 1 }} />

      {/* 이동 모드 선택 버튼 */}
      <View style={styles.modeContainer}>
        {["WALK", "BIKE", "TRANSIT"].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.selected]}
            onPress={() => setMode(m)}
            disabled={!!activityId}
          >
            <Text style={{ color: mode === m ? "#fff" : "#000" }}>
              {m === "WALK" ? "도보" : m === "BIKE" ? "자전거" : "대중교통"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 이동 시작/종료 버튼 */}
      <View style={styles.controlContainer}>
        {!activityId ? (
          <Button title="이동 시작" onPress={startTransport} />
        ) : (
          <Button title="이동 종료" onPress={stopTransport} color="red" />
        )}
      </View>
    </View>
  );
}

/**
 * 스타일 정의
 */
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#eee",
  },
  modeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
  },
  selected: { backgroundColor: "#4CAF50" },
  controlContainer: { padding: 10, backgroundColor: "#fff" },
});
