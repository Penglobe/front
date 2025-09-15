import React from "react";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from "react-native";
import { ResultStore } from "@utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@hooks/useAuth";
import { apiFetch } from "@services/authService";

// 날짜
function formatDate(dateObj) {
  try {
    const d = dateObj instanceof Date ? dateObj : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}. ${mm}. ${dd}`;
  } catch {
    return "";
  }
}

const fmt = (n, digits = 1) => (n == null ? "-" : Number(n).toFixed(digits));

export default function DietResult() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      refreshUser?.();
    }, [refreshUser])
  );

  // 사진/결과
  const photoUri = ResultStore.photoUri;
  const result = ResultStore.data;

  // 탄소 계산 결과
  const rawCarbon = ResultStore.carbon;
  const carbon = rawCarbon?.data ?? rawCarbon;
  const totalKg =
    typeof carbon?.totalCo2Kg === "number" ? carbon.totalCo2Kg : null;

  // 한 끼 식사 평균 배출량 (임시)
  const typicalMealKg = 4.8;
  const savedKg = totalKg != null ? Math.max(0, typicalMealKg - totalKg) : null;

  // 날짜 문자열
  const dateStr = formatDate(new Date());

  // 저장 상태
  const [saving, setSaving] = React.useState(false);
  const userId = user?.userId;

  const isZeroPoint = savedKg != null && savedKg <= 0;
  const canSave = totalKg != null && savedKg != null && savedKg > 0 && !saving;
  const rightLabel = isZeroPoint ? "0포인트 받기" : (saving ? "저장 중..." : "포인트 받기");

  const onRightPress = () => {
  if (isZeroPoint) {
    Alert.alert(
      "0포인트 안내",
      "이번 식사는 평균보다 배출량이 높아 0포인트입니다.",
      [{ text: "홈으로", onPress: () => router.push("/(tabs)/home") }]
    );
    return;
  }
  // 저장 진행
  saveDietRecord();
};

  // 절약량 저장
  const saveDietRecord = async () => {
    try {
      if (!userId) {
        Alert.alert(
          "로그인 필요",
          "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요."
        );
        return;
      }
      if (savedKg == null) {
        Alert.alert("저장 불가", "절약량을 먼저 계산해 주세요.");
        return;
      }
      if (savedKg <= 0) {
        Alert.alert("저장 불가", "절약한 탄소가 0kg 입니다.");
        return;
      }

      setSaving(true);
      // 백엔드가 Authentication에서 userId 추출 → 바디엔 co2Kg만 보냄
      const body = { co2Kg: Number(savedKg.toFixed(1)) };

      const res = await apiFetch("/diet/ingest/save", {
        method: "POST",
        body,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || res.statusText || "요청 실패";
        throw new Error(msg);
      }

      // 유저 정보 갱신
      await refreshUser?.();

      Alert.alert("저장 완료", "절약한 탄소량이 기록되었습니다.", [
        { text: "확인", onPress: () => router.push("/(tabs)/home") },
      ]);
    } catch (e) {
      Alert.alert("저장 실패", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1">
      <HeaderBar title="식단 측정 결과"/>
      <View className="flex-1">
        <BgGradient />
        <View className="px-pageX">
        <ScrollView
          showsVerticalScrollIndicator={false}  
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32}}
        >
          <View className="gap-4">

            {/* 날짜 */}
            <View className="pt-llg flex-row justify-center items-center">
            <View className="flex-1">
              <Text className="font-sb-md text-black text-caption">
                식사 날짜
              </Text>
              <Text className="font-grotesk-md text-black text-h3">
                {dateStr || "—"}
              </Text>
              </View>
              <Images.Ipa_diet width={48} height={48} />
            </View>

            {/* 촬영 사진 */}
            {photoUri && (
              <View className="h-[320px] rounded-[12px] overflow-hidden">
                <ExpoImage
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            )}

            {/* 탄소 배출 결과 카드 */}
            <View className="w-[100%] bg-white rounded-xl px-lg py-llg gap-sm border-green border-2">
              <View className="flex-row">
              <Images.Diet width={32} height={32}/>
              <Text className="font-grotesk-b text-h1 text-green">
                {totalKg != null ? fmt(totalKg, 1) : "—"}
                <Text className="text-h3 font-sf-md text-green">
                  {" "}
                  kg (CO
                  <Text className="text-overline">2</Text>eq)
                </Text>
              </Text>
              </View>

              {/* 비교 문구 */}
              <Text className="font-sf-md px-ssm text-black text-bodySm">
                {savedKg != null ? (
                  savedKg > 0
                    ? `한 끼 식사로 ${fmt(savedKg, 1)} kg CO₂eq 를 절약했어요!`
                    : "이번 식사는 평균보다 배출량이 높아 포인트가 0점이에요"
                ) : (
                  "탄소 배출량을 계산 중이에요."
                )}
              </Text>
            </View>

            {/* 일반 정보 */}
            <View className="w-[100%] items-center flex-row">
              <Images.Tori_diet width={48} height={48} />
              <Text className="font-sf-md text-h4">
                보통 한 끼 식사에서 {"\n"}약 <Text className="font-sf-b text-green">{typicalMealKg} kg CO₂eq</Text>가 배출돼요!
              </Text>
            </View>

            {/* 항목별 배출량 리스트 */}
            {Array.isArray(carbon?.items) && carbon.items.length > 0 && (
              <View className="w-full bg-white rounded-xl px-lg py-md mt-xxs">
                <Text className="font-sf-b text-[16px] mb-2">
                  항목별 배출량
                </Text>
                {carbon.items.map((it, idx) => {
                  const kg = typeof it?.co2Kg === "number" ? it.co2Kg : null;
                  return (
                    <View
                      key={`${it.name}-${idx}`}
                      className="bg-white rounded-xl px-md py-md mb-sm border border-[#eee]"
                    >
                      <Text className="font-sf-b">
                        {it.name ?? "이름 없음"}
                      </Text>
                      <Text>{kg != null ? `${fmt(kg, 1)} kg CO₂eq` : "—"}</Text>
                    </View>
                  );
                })}
              </View>
            )}

          <View className="flex-row mt-sm gap-2">
          {/* 다시 찍기 → 카메라 화면 */}
          <Pressable
            className="flex-1 rounded-xl items-center justify-center py-llg bg-gray2"
            onPress={() => router.replace("/pages/diet/dietTest")}
            disabled={saving}
            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            style={({ pressed }) => [
              { opacity: saving ? 0.6 : 1 },
              pressed && { backgroundColor: "#e5e7eb" },
            ]}
          >
            <Text className="font-sf-b text-button text-white">다시 찍기</Text>
          </Pressable>

          {/* 포인트/0포인트 */}
          <Pressable
            className={`flex-1 rounded-xl items-center justify-center py-llg bg-green`}
            onPress={onRightPress}
            // 저장 자체가 불가능한 경우만 막음(값없음/저장중). 0포인트는 막지 않음!
            disabled={saving || totalKg == null || savedKg == null}
            android_ripple={{ color: isZeroPoint ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)" }}
            style={({ pressed }) => [
              // 0포인트일 때는 살짝 어둡게, 저장 가능일 때는 초록 눌림
              isZeroPoint && pressed && { backgroundColor: "#d1d5db" },     // gray-300 → pressed gray-400 느낌
              !isZeroPoint && pressed && { backgroundColor: "#16a34a90" }, // green 눌림
            ]}
          >
            <Text className={`font-sf-md text-button text-white`}>
              {rightLabel}
            </Text>
          </Pressable>
        </View>


           </View>
        </ScrollView>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
