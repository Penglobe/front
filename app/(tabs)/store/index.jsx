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
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig.extra.SERVER_URL;
function toUri(path) {
  if (!path) return null;
  return path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function StoreListPage() {
  const [items, setItems] = useState([]); // 원본
  const [query, setQuery] = useState(""); // 검색어
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("전체"); // 필터 타입
  const [sortOrder, setSortOrder] = useState("default"); // "asc", "desc", "default"
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = items;

    // 🔹 타입 필터
    if (filterType === "기부") {
      data = data.filter((it) => it.name?.startsWith("[기부]"));
    } else if (filterType === "상품") {
      data = data.filter((it) => !it.name?.startsWith("[기부]"));
    }

    // 🔹 검색 필터
    if (q) {
      data = data.filter((it) => {
        const name = (it?.name ?? "").toLowerCase();
        const desc = (it?.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    return data;
  }, [items, query, filterType]);

  const handleSearchSubmit = () => {
    // 실시간 필터라 submit 시 별도 요청은 없음.
  };

  const clearQuery = () => setQuery("");
  const sortedItems = useMemo(() => {
    if (filterType !== "상품") return filtered; // 상품이 아니면 그냥 필터링된 데이터

    if (sortOrder === "asc") {
      return [...filtered].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortOrder === "desc") {
      return [...filtered].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortOrder === "latest") {
      return [...filtered].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else {
      return filtered;
    }
  }, [filtered, sortOrder, filterType]);

  const goDetail = (item) => {
    const isDonation = item.name?.startsWith("[기부]");
    const pathname = isDonation
      ? "/pages/shop/donationDetail"
      : "/pages/shop/detail";

    router.push({
      pathname,
      params: { id: String(item.productId) },
    });
  };

  const renderItem = ({ item, index }) => {
    const isRight = index % NUM_COLUMNS === 1;
    const imgUri = toUri(item?.img);

    return (
      <Pressable
        onPress={() => goDetail(item)}
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
            className="w-full h-[120px] rounded-2xl mb-sm"
          />
        )}

        <Text className="text-h4 text-gray-900 font-sf-b" numberOfLines={1}>
          {item.name}
        </Text>

        {!!item.description && (
          <Text
            className="text-caption text-gray-500 font-sf-md mt-xxs"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        {/* 가격 배지: 우측 하단 고정 */}
        {!item.name?.startsWith("[기부]") && (
          <View className="absolute right-3 bottom-3 flex-row items-center rounded-full bg-emerald-600/10 px-sm py-xs">
            <Text className="text-green font-sf-b mr-xs">
              {(item.price ?? 0).toLocaleString()}
            </Text>
            <Images.Ice width={16} height={16} />
          </View>
        )}
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
      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="얼음 거래소" />

        {/* 🔎 검색창 */}
        <View className="px-pageX mt-4">
          <View className="flex-row items-center bg-white rounded-xl px-md py-md shadow-md shadow-black/5">
            <Ionicons name="search-outline" size={20} color={"#10B981"} />
            <View className="flex-1 ml-sm mr-sm">
              <View className="-mt-xs" />
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
        <View className="flex-1 px-pageX pt-md">
          <View className="flex-row justify-between items-center mb-sm px-xs">
            <Text className="text-gray-500 font-sf-md">
              {query
                ? `검색 결과 ${filtered.length}개`
                : `전체 ${items.length}개`}
            </Text>

            <View
              className="flex-row items-center gap-2 mt-md
            "
            >
              {["전체", "기부", "상품"].map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFilterType(type)}
                  className={`px-md py-xs rounded-xl  ${
                    filterType === type
                      ? "bg-emerald-600 border-emerald-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`font-sf-md ${
                      filterType === type ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center mb-4 mt-lg">
            {filterType === "상품" && (
              <>
                <Pressable
                  onPress={() => setSortOrder("latest")}
                  className={`ml-2 px-3 py-1 rounded-xl ${
                    sortOrder === "latest"
                      ? "bg-emerald-600 border-emerald-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      sortOrder === "latest" ? "text-white" : "text-gray-700"
                    }
                  >
                    최신 순
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSortOrder("asc")}
                  className={`ml-2 px-3 py-1 rounded-xl ${
                    sortOrder === "asc"
                      ? "bg-emerald-600 border-emerald-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      sortOrder === "asc" ? "text-white" : "text-gray-700"
                    }
                  >
                    낮은 가격 순
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSortOrder("desc")}
                  className={`ml-2 px-3 py-1 rounded-xl ${
                    sortOrder === "desc"
                      ? "bg-emerald-600 border-emerald-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      sortOrder === "desc" ? "text-white" : "text-gray-700"
                    }
                  >
                    높은 가격 순
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <FlatList
            data={filterType === "상품" ? sortedItems : filtered}
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
                <Text className="text-center text-gray-500 mt-2xl">
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
    </View>
  );
}
