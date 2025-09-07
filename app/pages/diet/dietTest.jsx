// (tabs)/shop/index.jsx
import React, { useRef, useState } from "react";
import { toCarbonRequestPayload } from "@utils/transformFoodlens";
import { requestCarbon } from "@services/carbonApi";
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

// 로컬 상태 저장소 (촬영→결과 페이지 간 데이터 전달용)
import { ResultStore } from "@utils/storage";

const { FoodLensModule } = NativeModules;

// 네이티브 에러 포맷팅
function formatNativeError(e) {
  const raw = e;
  const codeField = e?.code ?? e?.errorCode ?? null; // RCTPromiseRejectBlock → Error.code 로 옴
  const msg = e?.message ?? e?.userInfo?.NSLocalizedDescription ?? String(e);
  let domain = null,
    numCode = null;

  // Swift에서 reject("도메인#코드", msg, err) 형태로 온 경우 분해
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

  // 자주 발생하는 에러
  const hints = [];
  if (domain?.includes("NSURLErrorDomain") || [-1009, -1001, -1200].includes(numCode)) {
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

// 결과에서 음식 배열만 추출 
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

  // 카메라 권한 상태
  const [perm, requestPerm] = useCameraPermissions();

  // 카메라 ref
  const camRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  // UI/데이터 상태
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(null);
  const [foods, setFoods] = useState([]);
  const [lastError, setLastError] = useState(null);

  // 미리보기 상태
  const [photo, setPhoto] = useState(null);   // 촬영된 사진 
  const [preview, setPreview] = useState(false);  // 미리보기 모드 여부

  // 권한 확인
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

  // 사진 촬영 
  const takePhoto = async () => {
    try {
      if (!camRef.current) {
        Alert.alert("카메라 준비 중", "잠시 후 다시 시도해 주세요.");
        return;
      }
      setLastError(null);

      // expo-camera 옵션 
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
      setPhoto(shot);  // 사진 저장
      setPreview(true);  // 미리보기 모드 ON
    } catch (e) {
      const info = formatNativeError(e);
      setLastError(info);
      Alert.alert(info.title, info.hint ? `${info.message}\n\n${info.hint}` : info.message);
    }
  };

  // 다시 찍기 
  const retake = () => {
    setPreview(false);
    setPhoto(null);
  };

  // 확인 후 : FoodLens + 백엔드 API 호출 
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

      // 1) FoodLens API 호출 -> 음식 json 받기 
      const userId = "1";
      const jsonStr = await FoodLensModule.predictBase64(photo.base64, userId);
      const result = JSON.parse(jsonStr || "{}");

      setRaw(result);
      setFoods(extractFoods(result));

      // 2) json -> 백엔드 전송용 최소 페이로드 변환
      const payload = toCarbonRequestPayload(result, { merge: true });

      // 3) 탄소배출량 계산 API 호출 
      const carbon = await requestCarbon(payload);

      // 4) 결과 저장 후 dietResult 페이지로 이동 
      setPreview(false);
      ResultStore.data = result;  // 원본 JSON
      ResultStore.photoUri = photo?.uri ?? null;
      ResultStore.carbon = carbon;   // 탄소 계산 결과 
      ResultStore.carbonPayload = payload;   // 전송 페이로드 기록 
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
      {/* 1) 카메라 뷰 */}
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableZoomGesture
        onCameraReady={() => setCameraReady(true)}
      />

      {/* 2) 로딩/오류/권한 대기 중 오버레이 */}
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
            onPress={takePhoto} 
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

          {/* 하단 액션 바 : 다시찍기 or 계산하기 */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: insets.bottom + 16,
              paddingTop: 12,
              paddingHorizontal: 16,
              backgroundColor: "rgba(0,0,0,0.35)", 
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
                  {loading ? "분석 중…" : "계산하기"}
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
