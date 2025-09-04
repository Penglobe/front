import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchProduct, buyProduct } from "@services/shopService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams(); // 목록에서 보낸 id 파라미터
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await fetchProduct(Number(id));
      setItem(res);
    } catch (e) {
      Alert.alert("오류", e?.message ?? "상품 정보를 불러올 수 없습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const price = item?.price ?? 0;
  const total = price * qty;

  const minus = () => setQty((n) => Math.max(1, n - 1));
  const plus = () => setQty((n) => n + 1);

  const handleBuy = async () => {
    try {
      const res = await buyProduct(item.productId, qty);
      Alert.alert(
        "구매 완료",
        `${item.name} x${qty}\n사용 포인트: ${res?.totalPoints?.toLocaleString?.() ?? res?.totalPoints ?? 0}점`,
        [
          { text: "주문내역 보기", onPress: () => router.push("/orders") },
          { text: "확인", onPress: () => router.back() },
        ]
      );
    } catch (e) {
      Alert.alert("구매 실패", e?.message ?? "구매 중 문제가 발생했습니다.");
    }
  };

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="상품 정보" />

      <View className="flex-1 px-pageX pt-3">
        <View className="flex-1 px-pageX pt-3 bg-white rounded-2xl">
          {/* 내용 */}
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
            {!!item.img && (
              <Image
                source={{ uri: item.img }}
                style={{ width: "100%", height: 280 }}
                resizeMode="cover"
                className="rounded-2xl mt-1"
              />
            )}

            <View className="px-pageX py-4">
              <Text className="text-xl font-sf-b">{item.name}</Text>
              <Text className="text-emerald-600 font-sf-b mt-2">
                {price.toLocaleString()} P
              </Text>

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

              {/* 수량 */}
              <View className="mt-10">
                <Text className="text-base font-sf-b mb-3">수량</Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={minus}
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Text className="text-xl">−</Text>
                  </Pressable>
                  <Text className="mx-4 text-lg font-sf-b">{qty}</Text>
                  <Pressable
                    onPress={plus}
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Text className="text-xl">＋</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
          {/* 하단 고정 결제 바 */}
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="px-pageX pt-3 pb-3 border-t border-gray-200 bg-white"
          >
            <View className="flex-row items-center">
              <Pressable
                onPress={() =>
                  Alert.alert("안내", "장바구니는 추후 제공 예정입니다.")
                }
                className="h-12 px-4 rounded-xl mr-2 items-center justify-center"
                style={{ backgroundColor: "#F3F4F6" }}
              >
                <Text className="font-sf-b">장바구니</Text>
              </Pressable>

              <Pressable
                onPress={handleBuy}
                className="flex-1 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: "#10B981" }}
              >
                <Text className="text-white font-sf-b">
                  {total.toLocaleString()} P 결제하기
                </Text>
              </Pressable>
            </View>
          </View>
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
