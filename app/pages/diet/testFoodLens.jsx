import React, { useEffect, useState } from "react";
import { Button, View, Text, ScrollView } from "react-native";
import { NativeModules, NativeEventEmitter } from "react-native";

const { FoodLensModule } = NativeModules;
const emitter = new NativeEventEmitter(FoodLensModule);

export default function FoodLensScreen() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    // === 로그 이벤트 수신 ===
    const logSub = emitter.addListener("FoodLensLog", (ev) => {
      console.log(`[FoodLensLog/${ev.level}] ${ev.message}`);
    });

    // === 카메라 결과 이벤트 수신 ===
    const resultSub = emitter.addListener("FoodLensResult", (ev) => {
      console.log("📸 FoodLens Result:", ev.rawJson);
      setResult(ev.rawJson); // 👉 state에 저장해서 UI 표시
    });

    return () => {
      logSub.remove();
      resultSub.remove();
    };
  }, []);

  // === SDK 초기화 + 옵션 설정 ===
  async function initSDK() {
    try {
      await FoodLensModule.initialize("YOUR_API_KEY", null);
      await FoodLensModule.setNutritionRetrieveOption("ALL_NUTRITION");
      console.log("✅ FoodLens SDK initialized");
    } catch (e) {
      console.error("❌ SDK init failed:", e);
    }
  }

  // === 카메라 실행 ===
  async function openCamera() {
    try {
      await FoodLensModule.startCameraUI();
    } catch (e) {
      console.error("❌ startCameraUI failed:", e);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Initialize SDK" onPress={initSDK} />
      <View style={{ height: 20 }} />
      <Button title="Open FoodLens Camera" onPress={openCamera} />

      {result && (
        <ScrollView style={{ marginTop: 20, backgroundColor: "#f5f5f5", padding: 10 }}>
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            📊 인식 결과 JSON
          </Text>
          <Text selectable>{result}</Text>
        </ScrollView>
      )}
    </View>
  );
}
