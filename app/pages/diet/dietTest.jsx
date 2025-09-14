import React, { useRef, useState } from "react";
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

const { FoodLensModule } = NativeModules;

// === 플랫폼별 predict ===
async function predictBase64Cross(base64) {
  if (!FoodLensModule) throw new Error("FoodLensModule 없음");

  // iOS (Promise API)
  if (Platform.OS === "ios" && typeof FoodLensModule.predictBase64 === "function") {
    const r = await FoodLensModule.predictBase64(base64);
    return typeof r === "string" ? JSON.parse(r) : r;
  }

  // Android (이벤트 API)
  if (Platform.OS === "android" && typeof FoodLensModule.predict === "function") {
    const emitter = new NativeEventEmitter(FoodLensModule);
    return await new Promise((resolve, reject) => {
      let timeoutId;
      const cleanup = () => {
        resultSub?.remove();
        errorSub?.remove();
        clearTimeout(timeoutId);
      };

      const onResult = (ev) => {
        cleanup();
        try {
          Alert.alert("📸 FoodLens Result", ev?.rawJson ?? "{}");
          resolve(JSON.parse(ev?.rawJson ?? "{}"));
        } catch (err) {
          reject(err);
        }
      };

      const onError = (ev) => {
        cleanup();
        Alert.alert("❌ FoodLens Error", ev?.message || "예측 오류");
        reject(new Error(ev?.message || "예측 오류"));
      };

      const resultSub = emitter.addListener("FoodLensResult", onResult);
      const errorSub = emitter.addListener("FoodLensError", onError);

      timeoutId = setTimeout(() => {
        cleanup();
        Alert.alert("⏰ Timeout", "예측 시간 초과");
        reject(new Error("예측 시간 초과"));
      }, 30000);

      FoodLensModule.predict(base64);
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
      const shot = await camRef.current.takePictureAsync({
        base64: true,
        quality: 1,
        skipProcessing: false,
      });
      Alert.alert("📷 촬영됨", `uri=${shot.uri}\nbase64=${shot.base64 ? "있음" : "없음"}`);
      setPhoto(shot);
      setPreview(true);
    } catch (e) {
      Alert.alert("❌ 촬영 에러", e?.message || "Unknown error");
    }
  };

  // === 예측 실행 ===
  const confirmAndPredict = async (mealType) => {
    try {
      Alert.alert("▶️ confirmAndPredict 시작", `mealType=${mealType}`);
      if (!photo?.base64) return;

      setLoading(true);

      const result = await predictBase64Cross(photo.base64);
      Alert.alert("📸 최종 Result", JSON.stringify(result));

      const payload = { ...toCarbonRequestPayload(result, { merge: true }), mealType };
      Alert.alert("📦 Payload 생성됨", JSON.stringify(payload));

      const carbon = await requestCarbon(payload).catch(() => ({ carbon: "dummy" }));
      Alert.alert("🌍 Carbon 응답", JSON.stringify(carbon));

      ResultStore.data = result;
      ResultStore.photoUri = photo.uri;
      ResultStore.carbon = carbon;
      ResultStore.carbonPayload = payload;

      setPreview(false);
      setModalVisible(false);
      router.push("/pages/diet/dietResult");
    } catch (e) {
      Alert.alert("❌ confirmAndPredict 에러", e?.message || "Unknown error");
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
          <View style={styles.previewBar(insets.bottom)}>
            <Pressable style={[styles.actionBtn, { backgroundColor: "#999" }]} onPress={() => setPreview(false)}>
              <Text style={styles.actionText}>다시 찍기</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: "#22c55e" }]} onPress={() => setModalVisible(true)}>
              <Text style={[styles.actionText, { fontWeight: "800" }]}>
                {loading ? "분석 중…" : "계산하기"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ✅ 커스텀 Modal */}
      <Modal visible={modalVisible}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>어디서 드셨나요?</Text>
        {[
          { key: "home", label: "집에서" },
          { key: "restaurant", label: "식당에서" },
          { key: "delivery", label: "배달" },
        ].map((opt) => (
          <Pressable key={opt.key} style={styles.sheetBtn} onPress={() => confirmAndPredict(opt.key)}>
            <Text style={styles.sheetBtnText}>{opt.label}</Text>
          </Pressable>
        ))}
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
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 6,
    borderRadius: 10,
  },
  actionText: { color: "white", fontWeight: "600" },
  sheetBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  sheetBtnText: { fontSize: 16, fontWeight: "500" },
};
