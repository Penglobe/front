// tasks/transportTrackingTask.js
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TASK_NAME,
  STORAGE,
  dlog,
  calculateDistance,
  readJSON,
  writeJSON,
  readNumber,
  writeNumber,
  shouldIgnoreMove,
  checkSpeed,
  ACCURACY_MAX_M,
  checkArrivalAndStop,
} from "./transportShared";

// ⚠️ 개발 중 핫리로드로 defineTask 중복 방지
if (!global.__TRANSPORT_TASK_DEFINED__) {
  global.__TRANSPORT_TASK_DEFINED__ = true;

  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    try {
      if (error) {
        dlog("BG", { error: String(error) });
        return;
      }
      if (!data) return;

      const loc = data.locations?.[data.locations.length - 1];
      if (!loc?.coords) return;

      const { latitude, longitude, accuracy } = loc.coords;
      const now = Date.now();

      if (accuracy > ACCURACY_MAX_M) {
        dlog("BG", { drop: "low_accuracy", accuracy });
        return;
      }

      const id = await AsyncStorage.getItem(STORAGE.ID);
      const isActive = await AsyncStorage.getItem(STORAGE.ACTIVE);
      if (!id || isActive !== "1") {
        dlog("BG", { stop: "not_active_or_no_id" });
        try {
          const started =
            await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
          if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
        } catch {}
        return;
      }

      // 이전 위치
      const prev = await readJSON(STORAGE.LAST);
      await writeJSON(STORAGE.LAST, { latitude, longitude, timestamp: now });

      if (!prev) {
        dlog("BG", { seed: "set_last_coord" });
        return;
      }

      // 출발 후 2초 이내면 거리 무시
      const startAt = await AsyncStorage.getItem(STORAGE.START);
      if (startAt && now - Number(startAt) < 2000) {
        dlog("BG", {
          ignore: "startup_grace_period",
          elapsed: now - Number(startAt),
        });
        return;
      }

      const d = calculateDistance(
        prev.latitude,
        prev.longitude,
        latitude,
        longitude
      );
      const dt = (now - (prev.timestamp || now)) / 1000;
      const ignore = shouldIgnoreMove(d, dt);
      if (ignore.ignore) {
        dlog("BG", {
          ignore: ignore.reason,
          d: Math.round(d),
          dt: Math.round(dt * 10) / 10,
        });
        return;
      }

      // 누적 거리
      const total = (await readNumber(STORAGE.DIST)) + d;
      await writeNumber(STORAGE.DIST, total);
      dlog("BG", { addDist: Math.round(d), total: Math.round(total) });

      // 속도 체크
      const mode = (await AsyncStorage.getItem(STORAGE.MODE)) || "WALK";
      if (dt > 0) {
        const instSpeed = d / dt;
        const speed = checkSpeed(instSpeed, mode);
        if (speed.over) {
          dlog("BG", {
            speedViolation: true,
            mode,
            speed: Math.round(speed.speed * 100) / 100,
            limit: speed.limit,
          });
          await AsyncStorage.multiSet([
            [STORAGE.STOPPED, "1"],
            [STORAGE.STOP_KIND, "fail"],
            [STORAGE.STOP_REASON, "이동 속도가 너무 빠릅니다."],
            [STORAGE.ACTIVE, "0"],
          ]);
          try {
            const started =
              await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
            if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
          } catch {}
          return;
        }
      }

      // 도착 판정 + 자동 종료
      const ar = await checkArrivalAndStop({
        latitude,
        longitude,
        totalDistance: total,
        source: "BG",
      });

      if (ar.arrived) {
        dlog("BG", { arrival: true, stopped: !!ar.stopped });
        // BG 업데이트 중지
        try {
          const started =
            await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
          if (started) await Location.stopLocationUpdatesAsync(TASK_NAME);
        } catch {}
      }
    } catch (e) {
      dlog("BG", { crash: String(e) });
    }
  });
}
