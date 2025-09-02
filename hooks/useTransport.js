import { useState } from "react";
import { SERVER_URL } from "@env";
import useLocationTracking from "../app/(tabs)/calculator/transport/useLocationTracking";

export default function useTransport(userId = 1) {
  const [activityId, setActivityId] = useState(null);
  const [mode, setMode] = useState("WALK");
  const { startTracking, stopTracking, distance } = useLocationTracking();

  // 이동 시작
  const startTransport = async () => {
    try {
      const res = await fetch(
        `${SERVER_URL}/transport/start?userId=${userId}&mode=${mode}`,
        { method: "POST" }
      );

      const data = await res.json();
      console.log("Start response:", data);

      // ApiResponse<T> 구조 → data.data.id
      setActivityId(data.data.id);

      startTracking();
    } catch (err) {
      console.error("Start transport error:", err);
    }
  };

  // 이동 종료
  const stopTransport = async () => {
    if (!activityId) return;
    try {
      const res = await fetch(
        `${SERVER_URL}/transport/${activityId}/stop?distanceM=${distance || 0}`,
        { method: "POST" }
      );

      const data = await res.json();
      console.log("Stop response:", data);

      setActivityId(null);
      stopTracking();
    } catch (err) {
      console.error("Stop transport error:", err);
    }
  };

  return { activityId, mode, setMode, startTransport, stopTransport };
}
