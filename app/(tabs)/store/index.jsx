// app/(tabs)/store/index.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { apiFetch } from "@services/authService";
import { Images } from "@constants/Images";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SERVER_URL } from "@env";

function toUri(path) {
  if (!path) return null;
  return path.startsWith("http")
    ? path
    : `${SERVER_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function StoreListPage() {
  const [items, setItems] = useState([]); // 원본
  const [query, setQuery] = useState(""); // 검색어
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const NUM_COLUMNS = 2;
  const TABBAR_H = 70; // 전역 탭바 높이에 맞게 조정

  // 서버에서 상품 불러오기
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

  // 🔎 검색: 실시간 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const name = (it?.name ?? "").toLowerCase();
      const desc = (it?.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [items, query]);

  const handleSearchSubmit = () => {
    // 실시간 필터라 submit 시 별도 요청은 없음.
  };

  const clearQuery = () => setQuery("");

  const goDetail = (id) => {
    router.push({ pathname: "/pages/detail", params: { id: String(id) } });
  };

  const renderItem = ({ item, index }) => {
    const isRight = index % NUM_COLUMNS === 1;
    const imgUri = toUri(item?.img);

    return (
      <Pressable
        onPress={() => goDetail(item.productId)}
        android_ripple={{ color: "#00000010" }}
        className={`
          w-[48%] ${isRight ? "mr-0" : "mr-[4%]"}
          mb-3
          relative pb-12
          rounded-2xl overflow-hidden
          border border-black/10
          bg-white/90
          p-3
        `}
      >
        {!!imgUri && (
          <Image
            source={{ uri: imgUri }}
            className="w-full h-[120px] rounded-2xl mb-2"
          />
        )}

        <Text className="text-[15px] text-gray-900 font-sf-b" numberOfLines={1}>
          {item.name}
        </Text>

        {!!item.description && (
          <Text
            className="text-[12px] text-gray-500 font-sf-md mt-0.5"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        {/* 가격 배지: 우측 하단 고정 */}
        <View className="absolute right-3 bottom-3 flex-row items-center rounded-full bg-emerald-600/10 px-2.5 py-1">
          <Text className="text-green font-sf-b mr-1">
            {(item.price ?? 0).toLocaleString()}
          </Text>
          <Images.Ice width={16} height={16} />
        </View>
      </Pressable>
    );
  };

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FB]">
        <ActivityIndicator />
        <Text className="text-gray-500 mt-2">불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="굿즈샵" />

      {/* 🔎 검색창 */}
      <View className="px-pageX mt-4">
        <View className="flex-row items-center bg-white rounded-xl px-3 py-3 shadow-md shadow-black/5">
          <Ionicons name="search-outline" size={20} color={"#10B981"} />
          <View className="flex-1 ml-2 mr-2">
            <View className="-mt-1" />
            <View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="상품명을 검색하세요"
                className="font-sf-md text-gray-800"
                returnKeyType="search"
                onSubmitEditing={handleSearchSubmit}
              />
            </View>
          </View>
          {!!query && (
            <Pressable onPress={clearQuery} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={"#94A3B8"} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 목록 */}
      <View className="flex-1 px-pageX pt-3">
        <View className="flex-row justify-between items-center mb-2 px-1">
          <Text className="text-gray-500 font-sf-md">
            {query
              ? `검색 결과 ${filtered.length}개`
              : `전체 ${items.length}개`}
          </Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(it) => String(it.productId)}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          key={`cols-${NUM_COLUMNS}`}
          columnWrapperStyle={{ justifyContent: "flex-start" }}
          contentContainerStyle={{
            paddingBottom: TABBAR_H + insets.bottom + 12,
          }}
          ListEmptyComponent={
            !loading ? (
              <Text className="text-center text-gray-500 mt-10">
                {query ? "검색 결과가 없습니다." : "상품이 없습니다."}
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
