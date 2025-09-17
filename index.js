// index.js
// 루트 엔트리: UI가 뜨지 않아도 항상 로드됨 (Headless에서도!)
import "./tasks/transportTrackingTask"; // ✅ 전역 BG 태스크 등록
import "expo-router/entry"; // ✅ Router 엔트리
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE, dlog } from "./tasks/transportShared";

// 앱 시작 시 로컬 상태 정리 (강제 종료 케이스 대비)
(async () => {
  try {
    const stopped = await AsyncStorage.getItem(STORAGE.STOPPED);
    const active = await AsyncStorage.getItem(STORAGE.ACTIVE);

    if (active === "1" && stopped !== "1") {
      // 강제 종료된 케이스 → 로컬만 종료 처리
      await AsyncStorage.multiSet([
        [STORAGE.ACTIVE, "0"],
        [STORAGE.STOPPED, "1"],
        [STORAGE.STOP_KIND, "fail"], // abort로 바꿔도 됨
        [STORAGE.STOP_REASON, "앱 강제 종료로 중단됨"],
      ]);
      await AsyncStorage.removeItem("@transport/pendingStop");
      dlog("INIT", { autoStop: "forced_exit_cleanup" });
    }
  } catch (e) {
    dlog("INIT", { error: String(e) });
  }
})();
