import { useState, useRef } from "react";
import * as Location from "expo-location";
import {
  startTransport as startTransportApi,
  stopTransport as stopTransportApi,
} from "@services/transportService";

export default function useTransport(userId) {
  const [mode, setMode] = useState(null);
  const [activity, setActivity] = useState(null);
  const [tracking, setTracking] = useState(false);

  const positionsRef = useRef([]); // GPS 좌표 기록

  // 이동 시작
  const startTransport = async () => {
    if (!mode) throw new Error("이동 수단을 선택해주세요");

    const data = await startTransportApi(userId, mode);
    setActivity(data);
    setTracking(true);

    // 위치 추적 시작
    positionsRef.current = [];
    const loc = await Location.getCurrentPositionAsync({});
    positionsRef.current.push(loc.coords);
  };

  // 이동 종료
  const stopTransport = async (pathGeojson = null) => {
    if (!activity) throw new Error("진행 중인 이동이 없습니다");

    // 거리 계산
    let distanceM = 0;
    const points = positionsRef.current;
    for (let i = 1; i < points.length; i++) {
      distanceM += calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }

    const data = await stopTransportApi(
      activity.transportId,
      Math.round(distanceM),
      pathGeojson
    );

    setActivity(null);
    setTracking(false);
    return data;
  };

  return { mode, setMode, activity, startTransport, stopTransport, tracking };
}

// 거리 계산 함수
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
