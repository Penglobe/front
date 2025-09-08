import React, { useRef, useState } from "react";
import { toCarbonRequestPayload } from "@pages/diet/transformFoodlens";
import { requestCarbon } from "@services/carbonApi";
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeModules } from "react-native";
import { ShutterButton } from "@pages/diet/ShutterButton";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native"; 
import { useAuth } from "@hooks/useAuth";
import { ResultStore } from "@utils/storage";

const { FoodLensModule } = NativeModules;


export default function DietTest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      refreshUser?.();
    }, [refreshUser])
  );

  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(null);
  const [foods, setFoods] = useState([]);
  const [lastError, setLastError] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(false);

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

  const retake = () => {
    setPreview(false);
    setPhoto(null);
  };

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
    setLastError(null);

    const result = await FoodLensModule.predictBase64(photo.base64);

    const userId = user?.id ?? user?.userId ?? user?.user_id ?? null;
    if (!userId) {
      Alert.alert("로그인 필요", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    const payload = { ...toCarbonRequestPayload(result, { merge: true }), userId };

    const carbon = await requestCarbon(payload);

    // 화면 전환 직전 상태 저장
    ResultStore.data = result;
    ResultStore.photoUri = photo?.uri ?? null;
    ResultStore.carbon = carbon;
    ResultStore.carbonPayload = payload;

    setPreview(false);


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
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableZoomGesture
        onCameraReady={() => setCameraReady(true)}
      />

      {!cameraReady && (
        <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 6, color: "white" }}>카메라 초기화 중…</Text>
        </View>
      )}

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
          <ShutterButton onPress={takePhoto} disabled={loading || !cameraReady} loading={loading} />
        </View>
      )}

      {preview && photo?.uri && (
        <View style={[StyleSheet.absoluteFillObject]}>
          <ExpoImage source={{ uri: photo.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
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
                style={{ paddingVertical: 14, opacity: loading ? 0.6 : 1 }}
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
