// (tabs)/shop/index.jsx
import React, { useRef, useState } from "react";
import { View, Text, Button, Alert, ScrollView, ActivityIndicator, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeModules } from "react-native";
import MainButton from "../../../components/MainButton";

const { FoodLensModule } = NativeModules;

/* ---------- 에러 포맷터: 네이티브 Error를 보기 좋게 ---------- */
function formatNativeError(e) {
  const raw = e;
  const codeField = e?.code ?? e?.errorCode ?? null;   // RCTPromiseRejectBlock → Error.code 로 옴
  const msg = e?.message ?? e?.userInfo?.NSLocalizedDescription ?? String(e);
  let domain = null, numCode = null;

  // Swift에서 reject("\${domain}#\${code}", msg, error) 형태를 보냈다면 분해
  if (typeof codeField === "string") {
    const m = codeField.match(/^([^#]+)#(-?\d+)$/);
    if (m) { domain = m[1]; numCode = Number(m[2]); }
    else { domain = codeField; }
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
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(null);
  const [foods, setFoods] = useState([]);
  const [lastError, setLastError] = useState(null);   // ⬅️ 에러 상태 추가

  if (!perm) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>권한 상태 확인 중…</Text>
      </View>
    );
  }

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
      setLastError(null);

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
      const info = formatNativeError(e);
      setLastError(info);
      console.error("[FoodLens Error]", info.raw);

      Alert.alert(
        info.title,
        info.hint ? `${info.message}\n\n${info.hint}` : info.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, zIndex: 1000 }}>
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

      <View style={{ marginBottom: 20, padding: 12, backgroundColor: "red" }}>
        <Button
          title={loading ? "인식 중..." : "촬영 후 인식"}
          onPress={takeAndPredict}
          disabled={loading || !cameraReady}
        />
      </View>

      {/* 에러 상세 박스 */}
      {lastError && !loading && (
        <View style={{
          marginHorizontal: 12, marginTop: 8, padding: 12,
          backgroundColor: "#FFF4F4", borderColor: "#F5BDBD", borderWidth: 1, borderRadius: 10
        }}>
          <Text style={{ fontWeight: "700" }}>에러: {lastError.title}</Text>
          <Text style={{ marginTop: 4 }}>{lastError.message}</Text>
          {lastError.hint && (
            <Text style={{ marginTop: 6, color: "#A00" }}>힌트: {lastError.hint}</Text>
          )}
        </View>
      )}

      <View style={{ maxHeight: 320, backgroundColor: "#F7F7F7", padding: 12, }}>
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>인식 중…</Text>
          </View>
        )}

        {!loading && raw && (
          <ScrollView>
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 20 }}>인식 결과</Text>
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
            <MainButton />
          </ScrollView>
        )}

        {!loading && !raw && !lastError && <Text>촬영 후 인식 버튼을 눌러 결과를 확인하세요.</Text>}
      </View>
    </View>
  );
}
