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
  const result = ResultStore.data; // (미사용이어도 유지)

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

  const [alertState, setAlertState] = React.useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: undefined,
    onConfirm: undefined,
    onCancel: undefined,
  });

  const openAlert = (opts) =>
    setAlertState((s) => ({ ...s, visible: true, ...opts }));
  const closeAlert = () =>
    setAlertState((s) => ({
      ...s,
      visible: false,
      onConfirm: undefined,
      onCancel: undefined,
    }));

  const onRightPress = () => {
    if (saving || totalKg == null || savedKg == null) return;

    // 0얼음
    if (isZeroPoint) {
      openAlert({
        title: "얼음 적립",
        message: "이번 식사는 평균보다 배출량이 높아 0얼음 입니다.",
        confirmText: "홈으로",
        onConfirm: () => router.replace("/(tabs)/home"),
      });
      return;
    }

    // 100g → 10얼음 = 1kg → 100얼음
    const ice = Math.round(Number(savedKg.toFixed(2)) * 100);

    openAlert({
      title: "얼음 적립",
      message: `${ice.toLocaleString("ko-KR")} 얼음 적립합니다.`,
      confirmText: "받기",
      cancelText: "취소",
      onConfirm: async () => {
        const ok = await saveDietRecord();
        if (ok) router.replace("/(tabs)/home");
      },
    });
  };

  const saveDietRecord = async () => {
    setSaving(true);
    try {
      if (!userId) {
        openAlert({
          title: "로그인 필요",
          message: "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
          confirmText: "확인",
        });
        return false;
      }

      if (savedKg == null) {
        openAlert({
          title: "저장 불가",
          message: "절감량을 먼저 계산해 주세요.",
          confirmText: "확인",
        });
        return false;
      }

      if (savedKg <= 0) {
        openAlert({
          title: "저장 불가",
          message: "절감한 탄소가 0kg CO₂ 입니다.",
          confirmText: "확인",
        });
        return false;
      }

      // 저장 요청
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
      return true; // 성공
    } catch (err) {
      openAlert({
        title: "오류",
        message: err?.message ?? "저장 중 오류가 발생했습니다.",
        confirmText: "확인",
      });
      return false; // 실패
    } finally {
      setSaving(false);
    }
  };

  const [open, setOpen] = React.useState(false);

  return (
    <View className="flex-1">
      <HeaderBar title="빙하 식탁 결과" />
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
                  <Text className="text-body font-sf-b">
                    얼음 식탁 계산 기준
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text className="text-green text-label font-sf-md">닫기</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-2">
                <Text className="font-sf-b text-bodySm text-green">
                  절감량 = 표준 한 끼 배출량 − 이번 식사 배출량
                </Text>
                <Text className="text-caption text-green">
                  ※ 한국인 표준 한 끼는 1.5 kg CO₂ 입니다.
                </Text>
                <Text className="text-caption text-gray-600">
                  ※ ‘총 배출량’은 음식 자체 + (집/배달/포장/식당) 가감 포함이며,
                  표시는 소수 둘째 자리까지 반올림합니다.
                </Text>
                <View className="gap-4 mt-sm mb-lg">
                  <View className="mb-sm rounded-lg bg-gray-100 flex-row items-start gap-2">
                    <Images.Home width={16} height={16} className="mt-[2px]" />
                    <View className="flex-1">
                      <Text className="font-sf-sb text-body">집</Text>
                      <Text className="text-black font-sf text-caption mt-1">
                        · 가정 조리(한 끼당 1.19kg)
                        {"\n"}· 음식 자체 배출량
                      </Text>
                    </View>
                  </View>

                  <View className="mb-sm rounded-lg bg-gray-100 flex-row items-start gap-2">
                    <Images.Delivery
                      width={16}
                      height={16}
                      className="mt-[2px]"
                    />
                    <View className="flex-1">
                      <Text className="font-sf-sb text-body">배달</Text>
                      <Text className="text-black font-sf text-caption mt-1">
                        · 오토바이 (0.137kg/km × 4km){"\n"}· 일회용기 (0.050kg)
                        {"\n"}· 음식 자체 배출량
                      </Text>
                    </View>
                  </View>

                  <View className="mb-sm rounded-lg bg-gray-100 flex-row items-start gap-2">
                    <Images.Takeout
                      width={16}
                      height={16}
                      className="mt-[2px]"
                    />
                    <View className="flex-1">
                      <Text className="font-sf-sb text-body">
                        포장(테이크아웃)
                      </Text>
                      <Text className="text-black font-sf text-caption mt-1">
                        · 일회용기(0.050kg)
                        {"\n"}· 음식 자체 배출량
                      </Text>
                    </View>
                  </View>

                  <View className="mb-sm rounded-lg bg-gray-100 flex-row items-start gap-2">
                    <Images.Restaurant
                      width={16}
                      height={16}
                      className="mt-[2px]"
                    />
                    <View className="flex-1">
                      <Text className="font-sf-sb text-body">식당</Text>
                      <Text className="text-black font-sf text-caption mt-1">
                        · 시설·운영(한 끼당 3.43kg)
                        {"\n"}· 음식 자체 배출량
                      </Text>
                    </View>
                  </View>
                  <Text className="text-caption text-gray-600">
                    ※ 계산 기준: 기후변화행동연구소, 매일일보, 한겨레신문 참고
                  </Text>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </View>
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
        onConfirm={() => {
          closeAlert();
          alertState.onConfirm?.();
        }}
        onCancel={
          alertState.onCancel
            ? () => {
                closeAlert();
                alertState.onCancel?.();
              }
            : undefined
        }
      />
    </View>
  );
}
