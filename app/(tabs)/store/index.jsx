// app/(tabs)/store/index.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet, // ✅ 추가
} from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { apiFetch } from "@services/authService";
import { Images } from "../../../constants/Images";

export default function StoreListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const NUM_COLUMNS = 2;
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/shop/products");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `요청 실패(${res.status})`);

      const data = json?.data ?? json;
      if (!Array.isArray(data))
        throw new Error("상품 응답 형식이 예상과 다릅니다.");
      setItems(data);
    } catch (e) {
      Alert.alert(
        "상품목록 불러오기 실패",
        e?.message ?? "잠시 후 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const buy = useCallback(
    async (product) => {
      try {
        const res = await apiFetch(`/shop/orders`, {
          method: "POST",
          body: JSON.stringify({ productId: product.productId, qty: 1 }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok)
          throw new Error(json?.message || `구매 실패(${res.status})`);

        const data = json?.data ?? json;
        Alert.alert(
          "구매 완료",
          `${product.name} x1\n사용 포인트: ${
            data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0
          }점`,
          [
            { text: "주문내역 보기", onPress: () => router.push("/orders") },
            { text: "확인" },
          ]
        );
      } catch (e) {
        Alert.alert("구매 실패", e?.message ?? "구매 중 문제가 발생했습니다.");
      }
    },
    [router]
  );

  const goDetail = (id) => {
    router.push({ pathname: "/pages/detail", params: { id: String(id) } });
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => goDetail(item.productId)}
      android_ripple={{ color: "#eee" }}
      className="bg-white rounded-2xl p-4"
      style={styles.card}
    >
      {!!item.img && <Image source={{ uri: item.img }} style={styles.image} />}

      <Text className="text-green text-[16px] font-sf-b mt-1" numberOfLines={1}>
        {item.name}
      </Text>

      {!!item.description && (
        <Text
          className="text-darkGray text-[13px] font-sf-md mt-1"
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}

      {/* ✅ 가격: 카드 오른쪽 아래 고정 */}
      <View style={styles.priceRight} className="flex-row items-center">
        <Text className="text-black font-sf-b">
          {(item.price ?? 0).toLocaleString()}
        </Text>
        <Images.Ice width={20} height={20} />
      </View>
    </Pressable>
  );

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FB]">
        <ActivityIndicator />
        <Text className="text-gray-500 mt-2">불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BgGradient />
      <HeaderBar title="굿즈샵" />

      <View className="flex-1 px-pageX pt-3">
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.productId)}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS} // ✅ 2열
          columnWrapperStyle={styles.column} // ✅ 행 간격/정렬
          contentContainerStyle={styles.listContent} // ✅ 리스트 하단 여백
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-gray-500 mt-10">
                상품이 없습니다.
              </Text>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    marginBottom: 14,
    marginRight: "4%",
    position: "relative",
    paddingBottom: 40, // ⬅️ 아래 고정 영역만큼 여백 확보
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  priceRight: {
    position: "absolute",
    right: 16, // ⬅️ 오른쪽 고정
    bottom: 16, // ⬅️ 아래 고정
  },
});
