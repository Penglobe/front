import { NativeModules, NativeEventEmitter } from "react-native";
const { FoodLensModule } = NativeModules;

const emitter = new NativeEventEmitter(FoodLensModule);

// 1) 네이티브 로그를 JS 콘솔로 연결
const sub = emitter.addListener("FoodLensLog", (ev) => {
  console.log(`[FoodLensLog/${ev?.level}] ${ev?.message}`);
});

// 2) 초기화 + 옵션 + 더미 인식
async function testFoodLens() {
  await FoodLensModule.initialize("YOUR_API_KEY", null);
  await FoodLensModule.setNutritionRetrieveOption("ALL_NUTRITION");
  const base64 = "iVBORw0KGgoAAA..." // 테스트로 아무 Base64(짧아도 됨)
  const res = await FoodLensModule.recognizeBase64(base64);
  console.log("recognize result:", res);
}

// 언마운트 시
// sub.remove();
