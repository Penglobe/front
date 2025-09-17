import React from "react";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { Images } from "@constants/Images";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { ResultStore } from "@utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@hooks/useAuth";
import { apiFetch } from "@services/authService";
import Modal from "@components/Modal";
import CustomAlert from "@components/CustomAlert";

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

const fmt = (n, digits = 2) => (n == null ? "-" : Number(n).toFixed(digits));

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

  // 한 끼 식사 평균 배출량
  const typicalMealKg = 1.5;
  const savedKg = totalKg != null ? Math.max(0, typicalMealKg - totalKg) : null;

  // 날짜 문자열
  const dateStr = formatDate(new Date());

  // 저장 상태
  const [saving, setSaving] = React.useState(false);
  const userId = user?.userId;

  const isZeroPoint = savedKg != null && savedKg <= 0;
  const rightLabel = isZeroPoint
    ? "홈으로"
    : saving
    ? "저장 중..."
    : "얼음 받기";

  const onRightPress = () => {
    if (saving || totalKg == null || savedKg == null) return;

    // 0얼음
    if (isZeroPoint) {
      CustomAlert.alert(
        "얼음 적립",
        "이번 식사는 평균보다 배출량이 높아 0얼음 입니다.",
        [{ text: "홈으로", onPress: () => router.push("/(tabs)/home") }]
      );
      return;
    }

    // 100g → 10얼음 = 1kg → 100얼음
    const ice = Math.round(Number(savedKg?.toFixed(2)) * 100);

    CustomAlert.alert(
      "얼음 적립",
      `절감량 ${fmt(savedKg)} kg CO₂ → ${ice} 얼음 적립합니다.`,
      [{ text: "받기", onPress: () => saveDietRecord() }]
    );
  };

  const saveDietRecord = async () => {
    try {
      if (!userId) {
        CustomAlert.alert(
          "로그인 필요",
          "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요."
        );
        return;
      }
      if (savedKg == null) {
        CustomAlert.alert("저장 불가", "절감량을 먼저 계산해 주세요.");
        return;
      }
      if (savedKg <= 0) {
        CustomAlert.alert("저장 불가", "절감한 탄소가 0kg CO₂ 입니다.");
        return;
      }

      setSaving(true);
      const body = { co2Kg: Number(savedKg.toFixed(2)) };

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

      CustomAlert.alert("저장 완료", "절감한 탄소량이 기록되었습니다.", [
        { text: "확인", onPress: () => router.push("/(tabs)/home") },
      ]);
    } catch (e) {
      CustomAlert.alert("저장 실패", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const [open, setOpen] = React.useState(false);

  return (
    <View className="flex-1">
      <HeaderBar title="식단 측정 결과" />
      <View className="flex-1">
        <BgGradient />
        <View className="px-pageX">
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* 날짜 */}
            <View className="pt-md flex-row justify-center items-center">
              <View className="flex-1">
                <Text className="font-sb-md text-black text-caption">
                  식사 날짜
                </Text>
                <Text className="font-grotesk-md text-black text-h3">
                  {dateStr || "—"}
                </Text>
              </View>
              <Images.Ipa_diet width={72} height={72} />
            </View>

            <View className="gap-4">
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
              <View className="bg-white rounded-2xl px-6 py-5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sf-md text-lg">식사 탄소 절감량</Text>
                  <TouchableOpacity onPress={() => setOpen(true)}>
                    <Images.Information width={28} height={28} />
                  </TouchableOpacity>
                </View>
                <View className="items-end">
                  <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                    {fmt(savedKg)} kg CO₂
                  </Text>
                </View>
                {isZeroPoint && (
                  <View
                    className="mt-md rounded-lg px-sm py-sm"
                    style={{ backgroundColor: "#FEF2F2" }}
                  >
                    <Text className="text-[12px] font-sf-md text-red">
                      이번 식사는 평균보다 배출량이 많아 얼음 지급이 없습니다.
                    </Text>
                  </View>
                )}
              </View>

              {/* 항목별 배출량 리스트 */}
              {Array.isArray(carbon?.items) && carbon.items.length > 0 && (
                <View className="bg-white rounded-2xl px-6 py-5">
                  <View className="justify-between gap-2">
                    <Text className="font-sf-md text-lg">항목별 배출량</Text>
                    {carbon.items.map((it, idx) => {
                      const kg =
                        typeof it?.co2Kg === "number" ? it.co2Kg : null;
                      return (
                        <View
                          key={`${it.name}-${idx}`}
                          className="bg-white rounded-xl gap-2 px-md py-md mb-sm border border-gray"
                        >
                          <Text className="font-sf-b">
                            {it.name ?? "이름 없음"}
                          </Text>
                          <Text>{kg != null ? `${fmt(kg)} kg CO₂` : "—"}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View className="flex-row mt-sm gap-2">
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
                  <Text className="font-sf-b text-button text-white">
                    다시 찍기
                  </Text>
                </Pressable>

                {/* 포인트/0포인트 */}
                <Pressable
                  className="flex-1 rounded-xl items-center justify-center py-llg bg-green"
                  onPress={onRightPress}
                  disabled={saving || totalKg == null || savedKg == null}
                  style={({ pressed }) => [
                    isZeroPoint && pressed && { backgroundColor: "#d1d5db" },
                    !isZeroPoint && pressed && { backgroundColor: "#318643" },
                  ]}
                >
                  <Text className="font-sf-md text-button text-white">
                    {rightLabel}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Modal visible={open} onClose={() => setOpen(false)}>
              <View className="flex-row justify-between items-center mb-md">
                <View className="flex-row items-center">
                  <Images.Tori_diet width={34} height={34} />
                  <Text className="text-body font-sf-b">식단 계산 기준</Text>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text className="text-green text-label font-sf-md">닫기</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-2">
                <Text className="font-sf-b text-bodySm text-green leading-[20px]">
                  절감량 = 한 끼 식사 탄소 배출량 - 해당 식단 탄소배출량
                </Text>
                <Text className="text-caption text-gray-600 leading-[20px]">
                  ※ 한국인 한 끼 식사 탄소 배출량은 약 4.5kg CO₂ 입니다.
                </Text>
                <View className="gap-4 mt-sm mb-lg">
                  <View className="flex-row items-center gap-1">
                    <Images.House width={20} height={20} />
                    <Text className="text-black font-sf text-label">집: </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Images.Delivery width={20} height={20} />
                    <Text className="text-black font-sf text-label">
                      배달:{" "}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Images.Takeout width={20} height={20} />
                    <Text className="text-black font-sf text-label">
                      포장(테이크아웃):
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Images.Restaurant width={20} height={20} />
                    <Text className="text-black font-sf text-label">
                      식당:{" "}
                    </Text>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
