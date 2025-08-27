import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { SERVER_URL } from "@env";

const LOCATION_TASK_NAME = "background-location-task";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return console.error("위치 추적 에러:", error);
  if (data) {
    const { latitude, longitude } = data.locations[0].coords;
    console.log("📍 백그라운드 위치:", latitude, longitude);
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
});

export default function useLocationTracking() {
  const startTracking = async () => {
    let fg = await Location.requestForegroundPermissionsAsync();
    let bg = await Location.requestBackgroundPermissionsAsync();
    if (fg.status !== "granted" || bg.status !== "granted") {
      alert("위치 권한이 필요합니다.");
      return;
    }
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "위치 추적 중",
        notificationBody: "이동 경로를 기록하고 있습니다.",
      },
    });
  };

  const stopTracking = async () => {
    const running =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  };

  return { startTracking, stopTracking };
}
