import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { apiFetch } from "@services/authService";
import { SERVER_URL } from "@env";
import { Images } from "@constants/Images";
import MainButton from "@components/MainButton";

const BASE = (SERVER_URL || "").replace(/\/+$/, "");
function toUri(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${rel}`;
}

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams();
  const pid = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await apiFetch(`/shop/products/${pid}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `조회 실패(${res.status})`);
      setItem(json?.data ?? json);
    } catch (e) {
      Alert.alert("오류", e?.message ?? "상품 정보를 불러올 수 없습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    }
  }, [pid, router]);

  useEffect(() => {
    load();
  }, [load]);

  const price = item?.price ?? 0;
  const total = price * qty;

  const minus = () => setQty((n) => Math.max(1, n - 1));
  const plus = () => setQty((n) => n + 1);

  const handleBuy = useCallback(async () => {
    try {
      const res = await apiFetch(`/shop/orders`, {
        method: "POST",
        body: JSON.stringify({ productId: item.productId, qty }),
      });
      const json = await res.json().catch(() => null);
      console.log("BUY status:", res.status, "resp:", json);
      if (!res.ok) throw new Error(json?.message || `구매 실패(${res.status})`);
      const data = json?.data ?? json;

      Alert.alert(
        "구매 완료",
        `${item.name} x${qty}\n사용 포인트: ${
          data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0
        }점`,
        [
          { text: "주문내역 보기", onPress: () => router.push("/orders") },
          { text: "확인", onPress: () => router.back() },
        ]
      );
    } catch (e) {
      Alert.alert("구매 실패", e?.message ?? "구매 중 문제가 발생했습니다.");
    }
  }, [item, qty, router]);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">불러오는 중...</Text>
      </View>
    );
  }

  const imgUri = toUri(item?.img);

  // 플로팅 버튼 높이(+여백)만큼 스크롤 하단에 공간 확보
  const bottomGap = Math.max(insets.bottom, 16) + 76;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="상품 정보" />

      {/* 본문: 스크롤이 흰 카드(View)만 감싸도록 배치 */}
      <View className="flex-1 px-pageX pt-3">
        <ScrollView contentContainerStyle={{ paddingBottom: bottomGap }}>
          {/* ⬇️ 이 흰 카드가 컨텐츠 높이만큼만 렌더 → 버튼 위에서 끝남 */}
          <View className="bg-white rounded-2xl px-pageX pt-3 pb-5">
            {/* 이미지 */}
            <View className="w-full h-[280px] rounded-2xl mt-1 mb-3 bg-white items-center justify-center overflow-hidden">
              {imgUri ? (
                <Image
                  source={{ uri: imgUri }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-gray-400">이미지 없음</Text>
              )}
            </View>

            <View className="px-pageX py-4">
              <Text className="text-xl font-sf-b">{item.name}</Text>
              <View className="flex-row items-center mt-2">
                <Text className="text-emerald-600 font-sf-b mr-1">
                  {price.toLocaleString()}
                </Text>
                <Images.Ice width={18} height={18} />
              </View>

              {!!item.description && (
                <View className="mt-6">
                  <Section title="상품구성">
                    <Text className="text-gray-700">{item.description}</Text>
                  </Section>
                </View>
              )}

              <Section title="유효기간">
                <Text className="text-gray-700">구매일로부터 6개월</Text>
              </Section>
              <Section title="사용가능매장">
                <Text className="text-gray-700">전 매장 사용 가능</Text>
              </Section>

              <View className="mt-10">
                <Text className="text-base font-sf-b mb-3">수량</Text>
                <View className="flex-row items-center">
                  <Pressable
                    className="w-10 h-10 rounded-xl items-center justify-center bg-gray-100"
                    onPress={minus}
                  >
                    <Text className="text-xl">−</Text>
                  </Pressable>
                  <Text className="mx-4 text-lg font-sf-b">{qty}</Text>
                  <Pressable
                    className="w-10 h-10 rounded-xl items-center justify-center bg-gray-100"
                    onPress={plus}
                  >
                    <Text className="text-xl">＋</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 플로팅 결제 버튼 (배경 바 없음) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom ? insets.bottom : 12,
          }}
          className="px-pageX pb-3"
        >
          <MainButton onPress={handleBuy} className="w-full">
            <View className="flex-row items-center">
              <Text className="text-white font-sf-b mr-1">
                {total.toLocaleString()}
              </Text>
              <Images.Ice width={18} height={18} />
              <Text className="text-white font-sf-b ml-1">결제하기</Text>
            </View>
          </MainButton>
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center mb-2">
        <Text className="text-base font-sf-b">📦 {title}</Text>
      </View>
      {children}
    </View>
  );
}
