import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  NativeModules,
  NativeEventEmitter,
  Linking,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Images } from "@constants/Images";
import { useIsFocused } from "@react-navigation/native";

import { ShutterButton } from "@pages/diet/ShutterButton";
import { ResultStore } from "@utils/storage";
import { toCarbonRequestPayload } from "@pages/diet/transformFoodlens";
import { requestCarbon } from "@services/dietService";
import Modal from "@components/Modal";
import MainButton from "@components/MainButton";
import CustomAlert from "@components/CustomAlert";

const { FoodLensModule } = NativeModules;

// Android 이벤트 리스너
let pendingResolver = null;
let pendingRejecter = null;

function setupFoodLensEmitter(FoodLensModule) {
  const emitter = new NativeEventEmitter(FoodLensModule);

  const subResult = emitter.addListener("FoodLensResult", (ev) => {
    if (pendingResolver) {
      try {
        const parsed = JSON.parse(ev?.rawJson ?? "{}");
        pendingResolver(parsed);
      } catch (e) {
        pendingRejecter?.(e);
      }
      pendingResolver = null;
      pendingRejecter = null;
    }
  });

  const subError = emitter.addListener("FoodLensError", (ev) => {
    if (pendingRejecter) {
      pendingRejecter(new Error(ev?.message || "예측 오류"));
    }
    pendingResolver = null;
    pendingRejecter = null;
  });

  return () => {
    subResult?.remove?.();
    subError?.remove?.();
  };
}

// iOS/Android 공통 예측
async function predictBase64Cross(base64) {
  if (!FoodLensModule) throw new Error("FoodLensModule 없음");

  if (
    Platform.OS === "ios" &&
    typeof FoodLensModule.predictBase64 === "function"
  ) {
    const r = await FoodLensModule.predictBase64(base64);
    return typeof r === "string" ? JSON.parse(r) : r;
  }

  if (
    Platform.OS === "android" &&
    typeof FoodLensModule.predict === "function"
  ) {
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
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  const [camReady, setCamReady] = useState(false);

  const [alertState, setAlertState] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: undefined,
    onConfirm: undefined,
    onCancel: undefined,
  });
  const openAlert = (opts) =>
    setAlertState((s) => ({ ...s, visible: true, ...opts }));
  const closeAlert = () =>
    setAlertState((s) => ({
      ...s,
      visible: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));

  // Android 이벤트 리스너 등록
  useEffect(() => {
    if (Platform.OS === "android" && FoodLensModule) {
      const cleanup = setupFoodLensEmitter(FoodLensModule);
      return cleanup;
    }
  }, []);

  // 인식 실패 -> 다시 찍기
  const retake = () => {
    setModalVisible(false);
    setPreview(false);
    setPhoto(null);
    setSelectedMode(null);
    setLoading(false);
  };

  const alertedRef = useRef(false);
  useEffect(() => {
    if (!perm || perm.granted || alertedRef.current) return;

    if (perm.status === "undetermined") {
      alertedRef.current = true;
      requestPerm().finally(() => {
        alertedRef.current = false;
      });
      return;
    }

    // 거부 상태: 재요청 가능
    if (perm.canAskAgain) {
      alertedRef.current = true;
      openAlert({
        title: "카메라 권한 필요",
        message: "사진 촬영 기능을 사용하려면 권한을 허용해주세요.",
        cancelText: "취소",
        confirmText: "권한 허용",
        onCancel: () => {
          alertedRef.current = false;
        },
        onConfirm: async () => {
          await requestPerm();
          alertedRef.current = false;
        },
      });
      return;
    }

    // 영구 거부: 설정 열기
    alertedRef.current = true;
    openAlert({
      title: "권한이 비활성화되어 있어요",
      message: "설정 > 앱 권한에서 카메라를 허용해 주세요.",
      cancelText: "취소",
      confirmText: "설정 열기",
      onCancel: () => {
        alertedRef.current = false;
      },
      onConfirm: () => {
        Linking.openSettings();
        alertedRef.current = false;
      },
    });
  }, [perm?.status, perm?.canAskAgain, perm?.granted]);

  const ensureCameraPermission = async () => {
    if (!perm) {
      const r = await requestPerm();
      return !!r?.granted;
    }
    if (perm.granted) return true;
    if (perm.status === "undetermined") {
      const r = await requestPerm();
      return !!r?.granted;
    }
    if (perm.canAskAgain !== false) {
      const r = await requestPerm();
      return !!r?.granted;
    }
    openAlert({
      title: "권한이 비활성화되어 있어요",
      message: "설정 > 앱 권한에서 카메라를 허용해 주세요.",
      cancelText: "취소",
      confirmText: "설정 열기",
      onConfirm: () => Linking.openSettings(),
    });
    return false;
  };

  useEffect(() => {
    setCamReady(false);
  }, [isFocused, perm?.granted, preview]);

  const canShowCamera = isFocused && perm?.granted && !preview;
  const camKey = `cam:${isFocused ? 1 : 0}:${perm?.granted ? 1 : 0}:${
    preview ? 1 : 0
  }`;

  // 촬영
  const takePhoto = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    if (!camReady) {
      // 준비 전 촬영 방지
      return;
    }
    try {
      const shot = await camRef.current?.takePictureAsync?.({
        base64: true,
        quality: 1,
        skipProcessing: false,
      });
      setPhoto(shot);
      setPreview(true);
    } catch (e) {
      openAlert({
        title: "촬영 실패",
        message: "사진 촬영 중 문제가 발생했어요. 다시 시도해 주세요.",
        confirmText: "확인",
      });
    }
  };

  // 계산
  const confirmAndPredict = async (mealType) => {
    try {
      if (!photo?.base64) {
        openAlert({
          title: "사진 없음",
          message: "먼저 사진을 찍어주세요.",
          confirmText: "확인",
        });
        return;
      }
      if (!mealType) {
        openAlert({
          title: "방식 선택",
          message: "어디서 드셨는지 먼저 선택해 주세요.",
          confirmText: "확인",
        });
        return;
      }

      setLoading(true);

      const result = await predictBase64Cross(photo.base64);
      const payload = {
        ...toCarbonRequestPayload(result, { merge: true }),
        eatMode: String(mealType).toUpperCase(),
      };

      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        setLoading(false);
        openAlert({
          title: "인식 실패",
          message: "음식을 인식하지 못했어요. 다시 찍어주세요.",
          cancelText: "취소",
          confirmText: "다시 찍기",
          onConfirm: retake,
        });
        return;
      }

      const carbon = await requestCarbon(payload, { debugAlert: true });

      ResultStore.data = result;
      ResultStore.photoUri = photo.uri;
      ResultStore.carbon = carbon;
      ResultStore.carbonPayload = payload;

      setPreview(false);
      setModalVisible(false);
      router.replace("/pages/diet/dietResult");
    } catch (e) {
      setLoading(false);
      openAlert({
        title: "오류",
        message: "계산 중 문제가 발생했어요. 다시 찍어볼까요?",
        cancelText: "취소",
        confirmText: "다시 찍기",
        onConfirm: retake,
      });
    }
  };

  const EAT_MODE = {
    HOME: "HOME",
    DELIVERY: "DELIVERY",
    TAKEOUT: "TAKEOUT",
    RESTAURANT: "RESTAURANT",
  };

  return (
    <View style={styles.container}>
      {canShowCamera ? (
        <>
          <CameraView
            key={camKey}
            ref={camRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableAudio={false}
            onCameraReady={() => setCamReady(true)}
          />
          {!camReady && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator />
              <Text style={{ color: "white", marginTop: 8 }}>
                카메라 초기화 중…
              </Text>
            </View>
          )}
        </>
      ) : null}

      {/* 셔터 영역 */}
      {!preview && (
        <View style={[styles.shutterWrap(insets.bottom)]}>
          <ShutterButton
            onPress={takePhoto}
            disabled={loading || !camReady || !canShowCamera}
            loading={loading}
          />
        </View>
      )}

      {/* 미리보기 */}
      {preview && photo?.uri && (
        <View style={[StyleSheet.absoluteFillObject]}>
          <ExpoImage
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View
            className="flex-1 gap-2"
            style={styles.previewBar(insets.bottom)}
          >
            <Pressable
              className="flex-1 rounded-xl items-center justify-center py-llg bg-gray2"
              onPress={() => setPreview(false)}
              disabled={loading}
            >
              <Text className="font-sf-md text-button text-s">다시 찍기</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl items-center justify-center py-llg bg-green"
              onPress={() => {
                setSelectedMode(null);
                setModalVisible(true);
              }}
              disabled={loading}
            >
              <Text className="font-sf-md text-button text-white">
                {loading ? "분석 중…" : "계산하러 가기"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* EAT_MODE 선택 모달 */}
      <Modal visible={modalVisible}>
        <Text className="font-sf-sb text-black text-h3 mb-sm">
          이번 식사는 어디서/어떻게 드시나요?
        </Text>
        <Text className="font-sf-sb mb-md text-darkGray">
          방식에 따라 탄소 절감량 계산 방식이 달라져요!
        </Text>

        {[
          { key: EAT_MODE.HOME, label: "집에서 직접 조리", Icon: Images.House },
          { key: EAT_MODE.DELIVERY, label: "배달", Icon: Images.Delivery },
          {
            key: EAT_MODE.TAKEOUT,
            label: "포장(테이크아웃)",
            Icon: Images.Takeout,
          },
          { key: EAT_MODE.RESTAURANT, label: "식당", Icon: Images.Restaurant },
        ].map(({ key, label, Icon }) => {
          const selected = selectedMode === key;
          return (
            <Pressable
              key={key}
              className={`w-full rounded-xl py-llg px-md bg-white overflow-hidden mb-xxs ${
                selected ? "bg-green/30" : ""
              }`}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
              disabled={loading}
              style={({ pressed }) => [
                { backgroundColor: pressed ? "#f4f4f5" : "#ffffff" },
                { opacity: loading ? 0.6 : 1 },
              ]}
              onPress={() => setSelectedMode(key)}
            >
              <View className="flex-row items-center gap-2">
                {Icon ? <Icon width={20} height={20} /> : null}
                <Text
                  className={`font-sf-sb text-body ${
                    selected ? "text-green" : "text-black"
                  }`}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <MainButton
          onPress={() => confirmAndPredict(selectedMode)}
          label={loading ? "계산 중…" : "계산하기"}
          className={`mt-md ${
            loading || !selectedMode ? "bg-lightGray" : "bg-green"
          }`}
          disabled={loading || !selectedMode}
        />
      </Modal>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={() => {
          closeAlert();
          alertState.onConfirm?.();
        }}
        onCancel={
          alertState.onCancel
            ? () => {
                closeAlert();
                alertState.onCancel?.();
              }
            : undefined
        }
      />
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
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
};
