// DietCamera (iOS/Android 공용) — iOS 스타일 + MOCK 테스트 지원
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
  NativeModules,
  NativeEventEmitter,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ShutterButton } from "@pages/diet/ShutterButton";
import { useAuth } from "@hooks/useAuth";
import { ResultStore } from "@utils/storage";
import { toCarbonRequestPayload } from "@pages/diet/transformFoodlens";
import { requestCarbon } from "@services/dietService";

const { FoodLensModule } = NativeModules;

/** === MOCK 설정 시작 === */
const MOCK_MODE = true; // ← 실제 테스트 시 false로!
const SAMPLE_PHOTO_URI = "https://picsum.photos/1080/1920"; // 프리뷰용
const MOCK_FOODLENS_RESULT = {
  // transformFoodlens가 주로 참조하는 형태를 가정(foods)
  foods: [
    {
      name: "제육덮밥",
      weight: 350, // g
      calories: 690,
      // 필요 시 여기에 nutrition / candidates 등 더 넣어도 됨
    },
    {
      name: "김치",
      weight: 50,
      calories: 20,
    },
  ],
  meta: { source: "mock" },
};
const MOCK_CARBON_RESPONSE = {
  totalCarbon: 1.72, // kgCO2eq 가정
  items: [
    { name: "제육덮밥", carbon: 1.6 },
    { name: "김치", carbon: 0.12 },
  ],
  meta: { source: "mock" },
};
/** === MOCK 설정 끝 === */

const jlog = (event, data = {}) => {
  try {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        tag: "diet-camera",
        event,
        ...data,
      })
    );
  } catch {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        tag: "diet-camera",
        event,
        note: "stringify-failed",
      })
    );
  }
};

function formatNativeError(e) {
  const message =
    e?.message ||
    e?.toString?.() ||
    (typeof e === "string" ? e : "알 수 없는 오류가 발생했습니다.");
  let title = "오류";
  let hint = "";

  if (/permission|denied|카메라/i.test(message)) {
    title = "권한 오류";
    hint = "설정 > 앱 권한에서 카메라 사용을 허용해 주세요.";
  } else if (/timeout/i.test(message)) {
    title = "시간 초과";
    hint = "네트워크 상태를 확인하거나 다시 시도해 주세요.";
  } else if (/module|FoodLens/i.test(message)) {
    title = "네이티브 모듈 오류";
    hint = Platform.select({
      ios: "iOS 프로젝트를 다시 빌드해주세요 (Xcode/EAS).",
      android: "Android 프로젝트를 다시 빌드해주세요 (Gradle/EAS).",
      default: "",
    });
  }

  return { title, message, hint };
}

/** 플랫폼별 예측 호출을 하나로 통일 */
async function predictBase64Cross(base64) {
  if (!FoodLensModule) {
    throw new Error("FoodLensModule을 찾을 수 없습니다.");
  }

  // iOS(또는 양 플랫폼) Promise API
  if (typeof FoodLensModule.predictBase64 === "function") {
    const r = await FoodLensModule.predictBase64(base64);
    return typeof r === "string" ? JSON.parse(r) : r;
  }

  // Android: predict + NativeEventEmitter
  if (typeof FoodLensModule.predict === "function") {
    const emitter = new NativeEventEmitter(FoodLensModule);
    return await new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = () => {
        try {
          resultSub?.remove();
          errorSub?.remove();
        } catch {}
        if (timeoutId) clearTimeout(timeoutId);
      };

      const onResult = (ev) => {
        cleanup();
        try {
          const json = ev?.rawJson ?? "{}";
          resolve(JSON.parse(json));
        } catch (err) {
          reject(err);
        }
      };

      const onError = (ev) => {
        cleanup();
        reject(new Error(ev?.message || "FoodLens 예측 중 오류"));
      };

      const resultSub = emitter.addListener("FoodLensResult", onResult);
      const errorSub = emitter.addListener("FoodLensError", onError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("예측 시간 초과"));
      }, 30000);

      try {
        FoodLensModule.predict(base64);
      } catch (callErr) {
        cleanup();
        reject(callErr);
      }
    });
  }

  throw new Error("예측 API를 찾을 수 없습니다.");
}

export default function DietCamera() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(false);

  // 요청 ID로 지연/중복 결과 무시
  const activeReqIdRef = useRef(0);

  // (선택) Android 로그 이벤트 (디버깅용)
  useEffect(() => {
    if (!FoodLensModule) return;
    const emitter = new NativeEventEmitter(FoodLensModule);
    const sub = emitter.addListener("FoodLensLog", (ev) => {
      console.log(`[FoodLensLog/${ev?.level}] ${ev?.message}`);
    });
    return () => sub.remove();
  }, []);

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
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={{ marginBottom: 12 }}>
          음식을 촬영하기 위해 카메라 접근 권한이 필요합니다.
        </Text>
        <Button title="카메라 권한 허용" onPress={requestPerm} />
      </View>
    );
  }

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
        shot = await camRef.current.takePhotoAsync(opts); // Expo SDK 53+
      } else if (camRef.current.takePictureAsync) {
        shot = await camRef.current.takePictureAsync(opts); // 대체
      } else {
        throw new Error("카메라 메서드를 찾을 수 없습니다.");
      }

      if (!shot?.uri) throw new Error("촬영 실패");
      setPhoto(shot);
      setPreview(true);
    } catch (e) {
      const info = formatNativeError(e);
      setLastError(info);
      Alert.alert(
        info.title,
        info.hint ? `${info.message}\n\n${info.hint}` : info.message
      );
    }
  };

  const retake = () => {
    // 예측 중엔 비활성화되어 호출되지 않지만 안전하게 ID 무효화
    activeReqIdRef.current = 0;
    setPreview(false);
    setPhoto(null);
  };

  const confirmAndPredict = async () => {
    try {
      const userId = user?.userId;
      if (!userId) {
        Alert.alert("로그인 필요", "다시 로그인해 주세요.");
        return;
      }

      const reqId = Date.now();
      activeReqIdRef.current = reqId;
      setLoading(true);
      setLastError(null);

      // === MOCK FLOW ===
      if (MOCK_MODE) {
        const result = MOCK_FOODLENS_RESULT;

        let payload;
        try {
          payload = { ...toCarbonRequestPayload(result, { merge: true }), userId };
        } catch {
          // 만약 변환기가 결과 포맷을 더 요구하면, 간단히 폴백
          payload = { userId, foods: result.foods };
        }

        const carbon = MOCK_CARBON_RESPONSE;

        if (activeReqIdRef.current !== reqId) return; // stale 무시

        ResultStore.data = result;
        ResultStore.photoUri = photo?.uri ?? SAMPLE_PHOTO_URI;
        ResultStore.carbon = carbon;
        ResultStore.carbonPayload = payload;

        setPreview(false);
        router.push("/pages/diet/dietResult");
        return;
      }

      // === REAL FLOW ===
      if (!FoodLensModule) {
        Alert.alert("네이티브 모듈 없음", "프로젝트를 다시 빌드해 주세요.");
        return;
      }
      if (!photo?.base64) {
        Alert.alert("알림", "이미지 데이터가 없습니다. 다시 촬영해 주세요.");
        return;
      }

      const result = await predictBase64Cross(photo.base64);
      if (activeReqIdRef.current !== reqId) return;

      jlog("predict.ok", {
        foodsCount:
          (
            result?.foods ??
            result?.items ??
            result?.candidates ??
            result?.results ??
            []
          ).length || 0,
      });

      const payload = { ...toCarbonRequestPayload(result, { merge: true }), userId };
      const carbon = await requestCarbon(payload);

      ResultStore.data = result;
      ResultStore.photoUri = photo?.uri ?? null;
      ResultStore.carbon = carbon;
      ResultStore.carbonPayload = payload;

      setPreview(false);
      router.push("/pages/diet/dietResult");
    } catch (e) {
      const info = formatNativeError(e);
      setLastError(info);
      Alert.alert(
        info.title,
        info.hint ? `${info.message}\n\n${info.hint}` : info.message
      );
    } finally {
      setLoading(false);
    }
  };

  // 샘플 프리뷰 열기(카메라 없이)
  const openSamplePreview = () => {
    setPhoto({ uri: SAMPLE_PHOTO_URI, base64: "dGVzdA==" }); // 임시 base64
    setPreview(true);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableZoomGesture
        onCameraReady={() => setCameraReady(true)}
      />

      {/* 카메라 초기화 오버레이 */}
      {/* 필요하면 cameraReady 사용해서 로더 표시 */}
      {/* { !cameraReady && <.../> } */}

      {/* 하단 셔터 (프리뷰 아닐 때) */}
      {!preview && (
        <>
          {/* 샘플로 보기: MOCK_MODE일 때만 노출 (원하면 항상 보여도 됨) */}
          {MOCK_MODE && (
            <View style={styles.mockBar(insets.top)}>
              <Pressable onPress={openSamplePreview} style={styles.mockBtn}>
                <Text style={{ color: "white", fontWeight: "700" }}>샘플로 보기</Text>
              </Pressable>
            </View>
          )}

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
              disabled={loading}
              loading={loading}
            />
          </View>
        </>
      )}

      {/* 프리뷰 + 액션 바 */}
      {preview && photo?.uri && (
        <View style={[StyleSheet.absoluteFillObject]}>
          <ExpoImage
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />

          <View style={styles.previewBar(insets.bottom)}>
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={retake}
                disabled={loading}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: "rgba(255,255,255,0.2)",
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={styles.actionText}>다시 찍기</Text>
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              <Pressable
                onPress={confirmAndPredict}
                disabled={loading}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: "#22c55e",
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.actionText, { fontWeight: "800" }]}>
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
  previewBar: (safeBottom) => ({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: safeBottom + 16,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  }),
  actionBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
  },
  actionText: { color: "white", fontWeight: "600" },
  mockBar: (safeTop) => ({
    position: "absolute",
    top: safeTop + 12,
    right: 16,
    zIndex: 10,
  }),
  mockBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
};
