// (tabs)/shop/index.jsx
import React, { useRef, useState } from "react";
import { View, Text, Button, Alert, ScrollView, ActivityIndicator, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeModules } from "react-native";

const { FoodLensModule } = NativeModules;

//*************** Food AI 테스트 중 *************/
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
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(null);
  const [foods, setFoods] = useState([]);

  // 권한 상태 로딩 중
  if (!perm) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>권한 상태 확인 중…</Text>
      </View>
    );
  }

  // 권한 미허용
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ marginBottom: 12 }}>카메라 권한이 필요합니다.</Text>
        <Button title="카메라 권한 허용" onPress={requestPerm} />
      </View>
    );
  }

  const takeAndPredict = async () => {
    try {
      if (!FoodLensModule) {
        Alert.alert("네이티브 모듈 없음", "iOS를 다시 빌드하세요: npx expo run:ios");
        return;
      }
      if (!camRef.current) {
        Alert.alert("카메라 준비 중", "잠시 후 다시 시도해 주세요.");
        return;
      }

      setLoading(true);
      setRaw(null);
      setFoods([]);

      // SDK 51/52: CameraView는 보통 takePhotoAsync (구버전 호환으로 둘 다 지원)
      const opts = { base64: true, quality: 0.9 };
      let photo;
      if (camRef.current.takePhotoAsync) {
        photo = await camRef.current.takePhotoAsync(opts);
      } else if (camRef.current.takePictureAsync) {
        photo = await camRef.current.takePictureAsync(opts);
      } else {
        throw new Error("카메라 메서드를 찾을 수 없습니다.");
      }

      if (!photo?.base64) throw new Error("base64 생성 실패");

      const userId = "1";
      const jsonStr = await FoodLensModule.predictBase64(photo.base64, userId);
      const result = JSON.parse(jsonStr || "{}");

      setRaw(result);
      setFoods(extractFoods(result));
    } catch (e) {
      console.error(e);
      Alert.alert("오류", String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, minHeight: 320 }}>
        <CameraView
          ref={camRef}
          style={{ flex: 1 }}
          facing="back"
          enableZoomGesture
          onCameraReady={() => setCameraReady(true)}
        />
        {!cameraReady && (
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                         alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 6 }}>카메라 초기화 중…</Text>
          </View>
        )}
      </View>

      <View style={{ marginBottom: 250, padding: 12, backgroundColor: "red" }}>
        <Button
          title={loading ? "인식 중..." : "촬영 후 인식"}
          onPress={takeAndPredict}
          disabled={loading || !cameraReady}
        />
      </View>

      <View style={{ maxHeight: 320, backgroundColor: "#F7F7F7", padding: 12 }}>
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 16 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>인식 중…</Text>
          </View>
        )}

        {!loading && raw && (
          <ScrollView>
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>인식 결과</Text>
            {foods.length > 0 ? (
              foods.map((f) => (
                <View key={f.id} style={{
                  backgroundColor: "white", borderRadius: 10, padding: 10, marginBottom: 8,
                  shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 }, elevation: 1,
                }}>
                  <Text style={{ fontWeight: "600" }}>{f.name}</Text>
                  {f.amount != null && <Text>양: {f.amount}</Text>}
                  {f.probability != null && <Text>신뢰도: {Math.round(f.probability * 100)}%</Text>}
                </View>
              ))
            ) : (
              <Text>표시할 후보가 없습니다. (아래 JSON 확인)</Text>
            )}
            <Text style={{ fontWeight: "700", fontSize: 16, marginTop: 12, marginBottom: 6 }}>원본 JSON</Text>
            <Text style={{ fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) }}>
              {JSON.stringify(raw, null, 2)}
            </Text>
          </ScrollView>
        )}

        {!loading && !raw && <Text>촬영 후 인식 버튼을 눌러 결과를 확인하세요.</Text>}
      </View>
    </View>
  );
}
