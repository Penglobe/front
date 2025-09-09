import React from "react";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { ResultStore } from "@utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
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
  const totalKg = typeof carbon?.totalCo2Kg === "number" ? carbon.totalCo2Kg : null;

  // 한 끼 식사 평균 배출량 (임시)
  const typicalMealKg = 12;
  const savedKg = totalKg != null ? Math.max(0, typicalMealKg - totalKg) : null;

  // 날짜 문자열
  const dateStr = formatDate(new Date());

  // 저장 상태
  const [saving, setSaving] = React.useState(false);
  const userId = user?.id ?? user?.userId ?? user?.user_id ?? null;

  // 절약량 저장
  const saveDietRecord = async () => {
    try {
      if (!userId) {
        Alert.alert("로그인 필요", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
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

      // 저장 직후 최신 유저정보로 갱신 → 홈에서 총 절감량 즉시 반영
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

            {/* 탄소 배출 결과 카드 */}
            <View className="w-[100%] bg-white rounded-[12px] px-[18px] py-[20px] gap-[8px] border-green border-2">
              <Text className="font-grotesk-b text-[28px] text-green">
                {totalKg != null ? fmt(totalKg, 1) : "—"}
                <Text className="text-[18px] font-sf-md text-green">
                  {" "}kg (CO
                  <Text className="text-[10px]">2</Text>eq)
                </Text>
              </Text>

              {/* 비교 문구 */}
              <Text className="font-sf-md text-black text-[16px]">
                {savedKg != null
                  ? `한 끼 식사로 ${fmt(savedKg, 1)} kg CO₂eq 를 절약했어요!`
                  : "탄소 배출량을 계산 중이에요."}
              </Text>
            </View>

            {/* 일반 정보 */}
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
                  const kg = typeof it?.co2Kg === "number" ? it.co2Kg : null;
                  return (
                    <View
                      key={`${it.name}-${idx}`}
                      className="bg-white rounded-[10px] px-[12px] py-[10px] mb-[8px] border border-[#eee]"
                    >
                      <Text className="font-sf-b">{it.name ?? "이름 없음"}</Text>
                      <Text>{kg != null ? `${fmt(kg, 1)} kg CO₂eq` : "—"}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 저장 버튼 */}
            <MainButton
              className="mt-16"
              label={saving ? "저장 중..." : "포인트 받기"}
              onPress={saveDietRecord}
              disabled={saving || totalKg == null || savedKg == null || savedKg <= 0}
            />

            <MainButton
              className="mt-4"
              label="지도 테스트"
              onPress={() => router.push("/pages/diet/Test")}
            />
          </View>
        </ScrollView>
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
