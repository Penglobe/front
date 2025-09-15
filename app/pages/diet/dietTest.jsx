import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Alert,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Button,
  Platform,
  NativeModules,
  NativeEventEmitter,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ShutterButton } from "@pages/diet/ShutterButton";
import { ResultStore } from "@utils/storage";
import { toCarbonRequestPayload } from "@pages/diet/transformFoodlens";
import { requestCarbon } from "@services/dietService";
import Modal from "@components/Modal";
import MainButton from "../../../components/MainButton";

const { FoodLensModule } = NativeModules;

// 긴 JSON을 알럿으로 보기 좋게(길면 자름)
function alertJSON(title, data, max = 1000) {
  try {
    const s = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const msg = s.length > max ? s.slice(0, max) + `\n… (총 ${s.length}자, 잘림)` : s;
    Alert.alert(title, msg);
  } catch (e) {
    Alert.alert(title, String(data));
  }
}

// === 글로벌 Promise 핸들러 ===
let pendingResolver = null;
let pendingRejecter = null;

// === 리스너 세팅 (Android) ===
function setupFoodLensEmitter(FoodLensModule) {
  const emitter = new NativeEventEmitter(FoodLensModule);

  emitter.addListener("FoodLensResult", (ev) => {
    if (pendingResolver) {
      try {
        const parsed = JSON.parse(ev?.rawJson ?? "{}");
        Alert.alert("📸 FoodLens Result", ev?.rawJson ?? "{}");
        pendingResolver(parsed);
      } catch (e) {
        pendingRejecter?.(e);
      }
      pendingResolver = null;
      pendingRejecter = null;
    }
  });

  emitter.addListener("FoodLensError", (ev) => {
    if (pendingRejecter) {
      Alert.alert("❌ FoodLens Error", ev?.message || "예측 오류");
      pendingRejecter(new Error(ev?.message || "예측 오류"));
    }
    pendingResolver = null;
    pendingRejecter = null;
  });
}

// === 플랫폼별 predict ===
async function predictBase64Cross(base64) {
  if (!FoodLensModule) throw new Error("FoodLensModule 없음");

  // iOS (Promise API)
  if (Platform.OS === "ios" && typeof FoodLensModule.predictBase64 === "function") {
    const r = await FoodLensModule.predictBase64(base64);
    const parsed = typeof r === "string" ? JSON.parse(r) : r;
    alertJSON("📸 FoodLens Result (iOS)", parsed);
    return parsed;
  }

  // Android (이벤트 API)
  if (Platform.OS === "android" && typeof FoodLensModule.predict === "function") {
    return await new Promise((resolve, reject) => {
      pendingResolver = resolve;
      pendingRejecter = reject;

      FoodLensModule.predict(base64);

      setTimeout(() => {
        if (pendingResolver) {
          reject(new Error("예측 시간 초과"));
          pendingResolver = null;
          pendingRejecter = null;
        }
      }, 30000);
    });
  }

  throw new Error("예측 API 없음");
}

export default function DietTest() {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // === Android 이벤트 리스너 등록 ===
  useEffect(() => {
    if (Platform.OS === "android" && FoodLensModule) {
      setupFoodLensEmitter(FoodLensModule);
    }
  }, []);

  
  // === 촬영 ===
  const takePhoto = async () => {
    if (!perm?.granted) {
      const { granted } = await requestPerm();
      if (!granted) {
        Alert.alert("카메라 권한 필요");
        return;
      }
    }
    try {
      const shot = await camRef.current?.takePictureAsync?.({
        base64: true,
        quality: 1,
        skipProcessing: false,
      });
      Alert.alert("📷 촬영됨", `uri=${shot?.uri}\nbase64=${shot?.base64 ? "있음" : "없음"}`);
      setPhoto(shot);
      setPreview(true);
    } catch (e) {
      Alert.alert("❌ 촬영 에러", e?.message || "Unknown error");
    }
  };

  // === 예측 실행 ===
  const confirmAndPredict = async (mealType) => {
    try {
      if (!photo?.base64) {
        Alert.alert("사진 없음", "먼저 사진을 찍어주세요.");
        return;
      }

      setLoading(true);
      Alert.alert("▶️ 시작", `mealType=${mealType}`);

      // 1) FoodLens → result
      const result = await predictBase64Cross(photo.base64);
      alertJSON("📸 최종 Result", result);

      // 2) payload 생성 (서버 enum 맞게 대문자)
      const eatModeUpper = String(mealType).toUpperCase(); // HOME|DELIVERY|TAKEOUT|RESTAURANT
      const payload = {
        ...toCarbonRequestPayload(result, { merge: true }),
        eatMode: eatModeUpper,
      };
      alertJSON("📦 Payload 생성됨", payload);

      // 3) 안전 가드: items 유효성
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        Alert.alert("인식 실패", "음식을 찾지 못했어요. 사진을 다시 찍어주세요.");
        setLoading(false);
        return;
      }

      // 4) 서버 호출 (더미 catch 제거, Alert 디버그 켜기: requestCarbon에서 처리)
      const carbon = await requestCarbon(payload, { debugAlert: true });
      alertJSON("🌍 Carbon 응답(파싱 후)", carbon);

      // 5) 결과 저장 & 이동
      ResultStore.data = result;
      ResultStore.photoUri = photo.uri;
      ResultStore.carbon = carbon;
      ResultStore.carbonPayload = payload;

      setPreview(false);
      setModalVisible(false);
      router.push("/pages/diet/dietResult");
    } catch (e) {
      Alert.alert("❌ 탄소 계산 실패", String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  if (!perm) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>권한 확인 중…</Text>
      </View>
    );
  }

  if (!perm.granted) {
    return (
      <View style={styles.center}>
        <Text>카메라 권한이 필요합니다.</Text>
        <Button title="권한 허용" onPress={requestPerm} />
      </View>
    );
  }

  // ✅ Eat 모드 키 상수 (서버 enum 대문자)
  const EAT_MODE = {
    HOME: "HOME",
    DELIVERY: "DELIVERY",
    TAKEOUT: "TAKEOUT",
    RESTAURANT: "RESTAURANT",
  };

  return (
    <View style={styles.container}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFillObject} facing="back" />

      {!preview && (
        <View style={[styles.shutterWrap(insets.bottom)]}>
          <ShutterButton onPress={takePhoto} disabled={loading} loading={loading} />
        </View>
      )}

      {preview && photo?.uri && (
        <View style={[StyleSheet.absoluteFillObject]}>
          <ExpoImage source={{ uri: photo.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <View className="flex-1 gap-2" style={styles.previewBar(insets.bottom)}>
                        <Pressable
              className="flex-1 rounded-xl items-center justify-center py-llg bg-gray2"
              onPress={() => setPreview(false)}
              disabled={loading}
            >
              <Text className="font-sf-md text-button text-s">다시 찍기</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl items-center justify-center py-llg bg-green"
              onPress={() => setModalVisible(true)}
              disabled={loading}
            >
              <Text className="font-sf-md text-button text-white">
                {loading ? "분석 중…" : "계산하러 가기"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* EAT_MODE Modal */}
      <Modal visible={modalVisible}>
        <Text className="font-sf-sb text-black text-h3 mb-sm">이번 식사는 어디서/어떻게 드셨나요?</Text>
        <Text className="font-sf-sb mb-md text-darkGray">방식에 따라 추가 탄소 배출량이 달라져요!</Text>

        {[
          { key: EAT_MODE.HOME, label: "집에서 직접 조리" },
          { key: EAT_MODE.DELIVERY, label: "배달" },
          { key: EAT_MODE.TAKEOUT, label: "포장(테이크아웃)" },
          { key: EAT_MODE.RESTAURANT, label: "식당" },
        ].map((opt) => (
          <Pressable
            key={opt.key}
            className="w-full items-center rounded-xl py-lg bg-white overflow-hidden mb-xxs"
            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            disabled={loading}
            style={({ pressed }) => [
              { backgroundColor: pressed ? "#f4f4f5" : "#ffffff" },
              { opacity: loading ? 0.6 : 1 },
            ]}
            onPress={() => confirmAndPredict(opt.key)}
          >
            <Text className="font-sf-sb text-body text-green">{opt.label}</Text>
          </Pressable>
        ))}

        <MainButton onPress={() => setModalVisible(false)} label="취소" className="mt-4 bg-lightGray" disabled={loading} />
      </Modal>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  shutterWrap: (bottom) => ({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: bottom + 24,
    alignItems: "center",
  }),
  previewBar: (safeBottom) => ({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: safeBottom + 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.35)",
  }),
};
