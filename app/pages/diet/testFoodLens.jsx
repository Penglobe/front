import React, { useEffect, useState, useRef } from "react";
import { Button, View, Text, ScrollView, Alert } from "react-native";
import { NativeModules, NativeEventEmitter } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const { FoodLensModule } = NativeModules;
const emitter = new NativeEventEmitter(FoodLensModule);

export default function FoodLensScreen() {
  const [result, setResult] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => {
    // === 로그 이벤트 수신 ===
    const logSub = emitter.addListener("FoodLensLog", (ev) => {
      console.log(`[FoodLensLog/${ev.level}] ${ev.message}`);
    });

    // === 결과 이벤트 수신 ===
    const resultSub = emitter.addListener("FoodLensResult", (ev) => {
      console.log("📸 FoodLens Result:", ev.rawJson);
      setResult(ev.rawJson);
    });

    return () => {
      logSub.remove();
      resultSub.remove();
    };
  }, []);

  // === SDK 초기화 ===
  async function initSDK() {
    try {
      await FoodLensModule.initialize("YOUR_API_KEY", null);
      await FoodLensModule.setNutritionRetrieveOption("ALL_NUTRITION");
      console.log("✅ FoodLens SDK initialized");
    } catch (e) {
      console.error("❌ SDK init failed:", e);
    }
  }

  // === Expo Camera로 촬영 + 예측 ===
  async function takeAndPredict() {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("카메라 권한이 필요합니다.");
        return;
      }
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      console.log("📷 Base64 captured, sending to SDK...");
      await FoodLensModule.predict(photo.base64); // 👉 Core SDK predict 호출
    } catch (e) {
      console.error("❌ Predict failed:", e);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Initialize SDK" onPress={initSDK} />
      <View style={{ height: 20 }} />

      <CameraView ref={cameraRef} style={{ flex: 1, marginVertical: 10 }} />

      <Button title="Take Photo & Predict" onPress={takeAndPredict} />

      {result && (
        <ScrollView
          style={{ marginTop: 20, backgroundColor: "#f5f5f5", padding: 10 }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            📊 인식 결과 JSON
          </Text>
          <Text selectable>{result}</Text>
        </ScrollView>
      )}
    </View>
  );
}
