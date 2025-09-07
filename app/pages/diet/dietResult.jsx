// app/(tabs)/home/index.jsx
import React from "react";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ResultStore } from "@utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* FoodLens 원본에서 간단 후보 리스트 뽑기 (기존 유지) */
function extractFoods(result) {
  const candidates = result?.foods || result?.items || result?.candidates || result?.results || [];
  return Array.isArray(candidates)
    ? candidates.map((it, idx) => ({
        id: it.id ?? idx,
        name: it.name ?? it.title ?? it.displayName ?? "이름 없음",
        amount: it.amount ?? it.weight ?? it.gram ?? it.size ?? null,
        probability: it.probability ?? it.score ?? null,
      }))
    : [];
}

/* 날짜 표기 유틸: 문자열/epoch 둘 다 수용 */
function formatDate(raw) {
  if (!raw) return "";
  try {
    // "2024-04-25 16:24:24" 같은 문자열이면 그대로 Date로 파싱 시도
    const d = typeof raw === "string" && raw.includes("-")
      ? new Date(raw.replace(" ", "T"))
      : new Date(
          // epoch sec/ms 구분
          typeof raw === "number" && raw < 2e10 ? raw * 1000 : raw
        );
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}. ${mm}. ${dd}`;
  } catch {
    return "";
  }
}

/* 숫자 포맷 유틸 */
const fmt = (n, digits = 1) => (n == null ? "-" : Number(n).toFixed(digits));

export default function DietResult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 원본(FoodLens) + 사진
  const result = ResultStore.data;
  const photoUri = ResultStore.photoUri;
  const foods = extractFoods(result);

  // 탄소 계산 결과(백엔드 응답)
  const carbon = ResultStore.carbon; // { totalCo2eq, items: [{ name, co2eq }] }
  // g → kg 변환
  const totalKg = carbon?.totalCo2eq != null ? carbon.totalCo2eq / 1000 : null;

  // 비교용(임시): "보통 한 끼 12 kg" 기준 (실제 서비스 값으로 교체 권장)
  const typicalMealKg = 12;
  const savedKg =
    totalKg != null ? Math.max(0, typicalMealKg - totalKg) : null;

  const dateStr =
    formatDate(result?.date) || formatDate(ResultStore?.carbonPayload?.timestamp) || ""; // 둘 중 있는 값 사용

  const [showRaw, setShowRaw] = React.useState(false);
  const [showCarbonRaw, setShowCarbonRaw] = React.useState(false);

  return (
    <View className="flex-1">
      <HeaderBar title="식단 측정 결과" />
      <View className="flex-1">
        <BgGradient />
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View className="flex-1 px-pageX gap-4">

            {/* 날짜 */}
            <View className="pt-[18px]">
              <Text className="font-sb-md text-black text-[12px]">식사 날짜</Text>
              <Text className="font-grotesk-md text-black text-[18px]">
                {dateStr || "—"}
              </Text>
            </View>

            {/* 촬영 사진 */}
            {photoUri && (
              <View style={{ height: 320, borderRadius: 12, overflow: "hidden" }}>
                <ExpoImage
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            )}

            {/* 인식 결과(간단 리스트) */}
            <View className="w-full bg-white rounded-[12px] px-[16px] py-[14px]">
              <Text className="font-sf-b text-[16px] mb-2">인식 결과</Text>

              {foods.length > 0 ? (
                foods.map((f) => (
                  <View
                    key={f.id}
                    className="bg-white rounded-[10px] px-[12px] py-[10px] mb-[8px] border border-[#eee]"
                    style={{
                      shadowColor: "#000",
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <Text className="font-sf-b">{f.name}</Text>
                    {f.amount != null && <Text>양: {f.amount}</Text>}
                    {f.probability != null && (
                      <Text>신뢰도: {Math.round(f.probability * 100)}%</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text>후보가 없습니다.</Text>
              )}

              {/* FoodLens 원본 JSON 토글 */}
              <Pressable
                onPress={() => setShowRaw((v) => !v)}
                className="mt-3 self-start px-3 py-2 rounded-[8px] bg-zinc-100 active:bg-zinc-200"
              >
                <Text className="font-sf-md">
                  {showRaw ? "원본 JSON 숨기기" : "원본 JSON 보기"}
                </Text>
              </Pressable>
              {showRaw && (
                <View className="mt-2">
                  <Text
                    style={{
                      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
                      fontSize: 12,
                      lineHeight: 16,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </Text>
                </View>
              )}
            </View>

            {/* 탄소 배출 결과 카드 */}
            <View className="w-[100%] bg-white rounded-[12px] px-[18px] py-[20px] gap-[8px] border-green border-2">
              <Text className="font-grotesk-b text-[28px] text-green">
                {/* totalCo2eq는 gCO2eq → kg로 변환하여 표시 */}
                {totalKg != null ? fmt(totalKg, 2) : "—"}
                <Text className="text-[18px] font-sf-md text-green">
                  {" "}kg (CO
                  <Text className="text-[10px]">2</Text>eq)
                </Text>
              </Text>

              {/* 비교 문구 (임시 기준값 활용) */}
              <Text className="font-sf-md text-black text-[16px]">
                {savedKg != null
                  ? `한 끼 식사로 ${fmt(savedKg, 2)} kg CO₂eq 를 절약했어요!`
                  : "탄소 배출량을 계산 중이에요."}
              </Text>
            </View>

            {/* 일반 정보/툴팁 */}
            <View className="w-[100%] ml-1 items-center flex-row gap-2">
              <Images.IpaFace width={28} height={29} />
              <Text className="font-sf-md text-[16px]">
                보통 한 끼 식사에서 약 {typicalMealKg} kg CO₂eq가 배출돼요!
              </Text>
            </View>

            {/* 항목별 배출량 리스트 */}
            {Array.isArray(carbon?.items) && carbon.items.length > 0 && (
              <View className="w-full bg-white rounded-[12px] px-[16px] py-[14px] mt-2">
                <Text className="font-sf-b text-[16px] mb-2">항목별 배출량</Text>
                {carbon.items.map((it, idx) => {
                  const kg = it?.co2eq != null ? it.co2eq / 1000 : null;
                  return (
                    <View
                      key={`${it.name}-${idx}`}
                      className="bg-white rounded-[10px] px-[12px] py-[10px] mb-[8px] border border-[#eee]"
                    >
                      <Text className="font-sf-b">{it.name ?? "이름 없음"}</Text>
                      <Text>{kg != null ? `${fmt(kg, 3)} kg CO₂eq` : "—"}</Text>
                    </View>
                  );
                })}

                {/* 탄소 API 응답 토글 (디버깅/검증용) */}
                <Pressable
                  onPress={() => setShowCarbonRaw((v) => !v)}
                  className="mt-3 self-start px-3 py-2 rounded-[8px] bg-zinc-100 active:bg-zinc-200"
                >
                  <Text className="font-sf-md">
                    {showCarbonRaw ? "탄소 JSON 숨기기" : "탄소 JSON 보기"}
                  </Text>
                </Pressable>
                {showCarbonRaw && (
                  <View className="mt-2">
                    <Text
                      style={{
                        fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      {JSON.stringify(ResultStore.carbon, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* CTA */}
            <MainButton
              className="mt-16"
              label="포인트 받기"
              onPress={() => router.push("/pages/diet/Test")}
            />
          </View>
        </ScrollView>
      </View>
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
