import { useState } from "react";
import { SERVER_URL } from "@env";
import useLocationTracking from "./useLocationTracking";

export default function useTransport() {
  const [activityId, setActivityId] = useState(null);
  const [mode, setMode] = useState("WALK");
  const { startTracking, stopTracking } = useLocationTracking();

  const startTransport = async () => {
    try {
      const res = await fetch(
        `${SERVER_URL}/transport/start?userId=1&mode=${mode}`,
        { method: "POST" }
      );
      const data = await res.json();
      setActivityId(data.data.id);
      await startTracking();
    } catch (err) {
      console.error(err);
    }
  };

  const stopTransport = async () => {
    if (!activityId) return;
    try {
      await fetch(`${SERVER_URL}/transport/${activityId}/stop?distanceM=1000`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(null),
      });
      setActivityId(null);
      await stopTracking();
    } catch (err) {
      console.error(err);
    }
  };

  return { activityId, mode, setMode, startTransport, stopTransport };
}
