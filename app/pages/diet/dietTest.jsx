// (tabs)/shop/index.jsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeModules } from "react-native";
import MainButton from "@components/MainButton";
import { ShutterButton } from "@pages/diet/ShutterButton";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ResultStore } from "@utils/storage";

const { FoodLensModule } = NativeModules;

/* ---------- 에러 포맷터: 네이티브 Error를 보기 좋게 ---------- */
function formatNativeError(e) {
  const raw = e;
  const codeField = e?.code ?? e?.errorCode ?? null; // RCTPromiseRejectBlock → Error.code 로 옴
  const msg = e?.message ?? e?.userInfo?.NSLocalizedDescription ?? String(e);
  let domain = null,
    numCode = null;

  // Swift에서 reject("${domain}#${code}", msg, error) 형태를 보냈다면 분해
  if (typeof codeField === "string") {
    const m = codeField.match(/^([^#]+)#(-?\d+)$/);
    if (m) {
      domain = m[1];
      numCode = Number(m[2]);
    } else {
      domain = codeField;
    }
  } else if (typeof codeField === "number") {
    numCode = codeField;
  }

  // 힌트(자주 나오는 케이스 매핑)
  const hints = [];
  if (domain?.includes("NSURLErrorDomain") || [-1009, -1001, -1200].includes(numCode)) {
    // -1009 오프라인, -1001 타임아웃, -1200 SSL/ATS
    hints.push("네트워크 연결/방화벽/ATS(HTTPS) 설정을 확인하세요.");
  }
  if (codeField === "E_DECODE" || /base64/i.test(msg)) {
    hints.push("촬영 결과의 base64 생성이 실패했습니다(옵션/권한 확인).");
  }
  if ((domain && /foodlens/i.test(domain)) || /FoodLens/i.test(msg) || codeField === "E_PREDICT") {
    hints.push("FoodLens API 키/초기화/도메인 허용(ATS) 여부를 확인하세요.");
  }

  return {
    title: `${domain ?? "NativeError"}${numCode != null ? ` #${numCode}` : ""}`,
    message: msg,
    hint: hints.length ? hints.join("\n") : null,
    raw,
  };
}

/* ---------- 결과 파싱 유틸 ---------- */
function extractFoods(result) {
  const candidates =
    result?.foods || result?.items || result?.candidates || result?.results || [];
  return Array.isArray(candidates)
    ? candidates.map((it, idx) => ({
        id: it.id ?? idx,
        name: it.name ?? it.title ?? it.displayName ?? "이름 없음",
        amount: it.amount ?? it.weight ?? it.gram ?? it.size ?? null,
        probability: it.probability ?? it.score ?? null,
      }))
    : [];
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 권한/카메라
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  // UI/데이터 상태
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(null);
  const [foods, setFoods] = useState([]);
  const [lastError, setLastError] = useState(null);

  // 미리보기 상태
  const [photo, setPhoto] = useState(null); 
  const [preview, setPreview] = useState(false);

  // --- 권한 단계 처리 ---
  if (!perm) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>권한 상태 확인 중…</Text>
      </View>
    );
  }

  if (!perm.granted) {
    return (
      <View style={[styles.center, { padding: 16 }]}>
        <Text style={{ marginBottom: 12 }}>음식을 촬영하기 위해 카메라 접근 권한이 필요합니다.</Text>
        <Button title="카메라 권한 허용" onPress={requestPerm} />
      </View>
    );
  }

  // --- 촬영: 촬영만 하고 미리보기 열기 ---
  const takePhoto = async () => {
    try {
      if (!camRef.current) {
        Alert.alert("카메라 준비 중", "잠시 후 다시 시도해 주세요.");
        return;
      }
      setLastError(null);

      const opts = { base64: true, quality: 0.9, skipProcessing: false };
      let shot;
      if (camRef.current.takePhotoAsync) {
        shot = await camRef.current.takePhotoAsync(opts);
      } else if (camRef.current.takePictureAsync) {
        shot = await camRef.current.takePictureAsync(opts);
      } else {
        throw new Error("카메라 메서드를 찾을 수 없습니다.");
      }

      if (!shot?.uri) throw new Error("촬영 실패");
      setPhoto(shot);
      setPreview(true);
    } catch (e) {
      const info = formatNativeError(e);
      setLastError(info);
      Alert.alert(info.title, info.hint ? `${info.message}\n\n${info.hint}` : info.message);
    }
  };

  // --- 다시 찍기 ---
  const retake = () => {
    setPreview(false);
    setPhoto(null);
  };

  // --- 확인 후 예측 API 호출 ---
  const confirmAndPredict = async () => {
    try {
      if (!FoodLensModule) {
        Alert.alert("네이티브 모듈 없음", "iOS를 다시 빌드하세요: npx expo run:ios");
        return;
      }
      if (!photo?.base64) {
        Alert.alert("알림", "이미지 데이터가 없습니다. 다시 촬영해 주세요.");
        return;
      }

      setLoading(true);
      setRaw(null);
      setFoods([]);
      setLastError(null);

      const userId = "1";
      const jsonStr = await FoodLensModule.predictBase64(photo.base64, userId);
      const result = JSON.parse(jsonStr || "{}");

      setRaw(result);
      setFoods(extractFoods(result));

      // 미리보기 닫기 
      setPreview(false);
      ResultStore.data = result;
      ResultStore.photoUri = photo?.uri ?? null;
      router.push("/pages/diet/dietResult");
    } catch (e) {
      const info = formatNativeError(e);
      setLastError(info);
      Alert.alert(info.title, info.hint ? `${info.message}\n\n${info.hint}` : info.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1) 카메라: 화면 꽉 채우기 */}
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableZoomGesture
        onCameraReady={() => setCameraReady(true)}
      />

      {/* 2) 초기화 오버레이 */}
      {!cameraReady && (
        <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 6, color: "white" }}>카메라 초기화 중…</Text>
        </View>
      )}

      {/* 3) 셔터: 미리보기 아닐 때만 노출 */}
      {!preview && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + 24,
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <ShutterButton
            onPress={takePhoto} // ✅ 촬영만
            disabled={loading || !cameraReady}
            loading={loading}
          />
        </View>
      )}

      {/* 4) 미리보기 오버레이 */}
      {preview && photo?.uri && (
        <View style={[StyleSheet.absoluteFillObject]}>
          {/* 찍은 사진 꽉 채우기 */}
          <ExpoImage source={{ uri: photo.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />

          {/* 하단 액션 바 */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: insets.bottom + 16,
              paddingTop: 12,
              paddingHorizontal: 16,
              backgroundColor: "rgba(0,0,0,0.35)", // 필요시 "transparent"
              flexDirection: "row",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={retake}
                style={{
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>다시 찍기</Text>
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              <Pressable
                  className="items-center rounded-[10px] bg-green"
                  onPress={confirmAndPredict}
                  disabled={loading}
                  style={{
                    paddingVertical: 14,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {loading ? "전송 중…" : "계산하기"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
};
