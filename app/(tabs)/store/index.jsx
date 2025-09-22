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
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { apiFetch } from "@services/authService";
import { Images } from "@constants/Images";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import CustomAlert from "@components/CustomAlert";

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
  const [sortOrder, setSortOrder] = useState("latest"); // "asc", "desc", "latest"
  const router = useRouter();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const NUM_COLUMNS = 2;

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
      setAlertTitle("상품목록 불러오기 실패");
      setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요.");
      setAlertVisible(true);
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

  // 필터링
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = items;

    // 타입 필터
    if (filterType === "기부") {
      data = data.filter((it) => it.name?.startsWith("[기부]"));
    } else if (filterType === "상품") {
      data = data.filter((it) => !it.name?.startsWith("[기부]"));
    }

    // 검색 필터
    if (q) {
      data = data.filter((it) => {
        const name = (it?.name ?? "").toLowerCase();
        const desc = (it?.description ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    return data;
  }, [items, query, filterType]);

  // 정렬
  const sortedItems = useMemo(() => {
    if (filterType !== "상품") return filtered;

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

  // 상세 이동
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

  // 상품 카드
  const renderItem = ({ item, index }) => {
    const isRight = index % NUM_COLUMNS === 1;
    const imgUri = toUri(item?.img);

    return (
      <Pressable
        onPress={() => goDetail(item)}
        android_ripple={{ color: "#00000010" }}
        className={`w-[48%] ${isRight ? "mr-0" : "mr-[4%]"} mb-3 relative pb-12
          rounded-2xl overflow-hidden border border-black/10 bg-white/90 p-3`}
      >
        {!!imgUri && (
          <Image
            source={{ uri: imgUri }}
            className="w-full h-[120px] rounded-2xl mb-sm"
          />
        )}

        <Text className="text-h4 text-black font-sf-b" numberOfLines={1}>
          {item.name}
        </Text>

        {!!item.description && (
          <Text
            className="text-caption text-darkGray font-sf-md mt-xxs mb-xxs"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        {/* 가격 배지 */}
        {!item.name?.startsWith("[기부]") && (
          <View className="absolute right-3 bottom-3 flex-row items-center rounded-full py-xs">
            <Text className="text-green font-sf-b">
              {(item.price ?? 0).toLocaleString()}
            </Text>
            <Images.Ice width={20} height={20} />
          </View>
        )}
      </Pressable>
    );
  };

  // 로딩 화면
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
      <Stack.Screen
        options={{ gestureEnabled: false, headerBackVisible: false }}
      />
      <BgGradient />
      <View className="absolute inset-0 pb-[150px]">
        <HeaderBar title="얼음 거래소" />

        {/* 검색창 */}
        <View className="bg-green/20 px-pageX shadow-lg shadow-black/10">
          <View className="mt-5">
            <View className="flex-row items-center bg-white rounded-xl px-md py-md shadow-md shadow-black/5">
              <Ionicons
                name="search-outline"
                size={20}
                color={"green"}
                className="mr-1"
              />
              <TextInput
                placeholder="상품명을 검색하세요."
                value={query}
                onChangeText={setQuery}
                className="flex-1 font-sf-md text-gray-800"
                style={{ paddingVertical: 0, textAlignVertical: "center" }}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* 필터 (전체/기부/상품) */}
          <View className="flex-row justify-between items-center mt-md">
            <View className="flex-row items-center gap-4 mb-sm">
              {["전체", "기부", "상품"].map((type) => {
                const selected = filterType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setFilterType(type)}
                    android_ripple={{ color: "#16a34a20", borderless: false }}
                    style={({ pressed }) => [
                      { opacity: pressed ? 0.6 : 1 }, // 눌렀을 때 살짝 투명
                    ]}
                    className={`px-xl py-sm ${
                      selected
                        ? "border-b-2 border-green"
                        : "border-b-2 border-transparent"
                    }`}
                  >
                    <Text
                      className={`font-sf ${
                        selected
                          ? "text-label text-green font-sf-b"
                          : "text-label text-[#1F2937]"
                      }`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className="px-pageX mt-lg">
          {/*  정렬 (상품일 때만 표시) */}
          {filterType === "상품" && (
            <View className="flex-row items-center mb-lg justify-end gap-2">
              {[
                { key: "latest", label: "최신 순" },
                { key: "asc", label: "낮은 가격 순" },
                { key: "desc", label: "높은 가격 순" },
              ].map(({ key, label }) => {
                const selected = sortOrder === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSortOrder(key)}
                    className={`px-md py-sm rounded-xl ${
                      selected ? "bg-green" : "bg-white/80"
                    }`}
                  >
                    <Text className={selected ? "text-white" : "text-green"}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* 상품 목록 */}
          <FlatList
            data={filterType === "상품" ? sortedItems : filtered}
            keyExtractor={(it) => String(it.productId)}
            renderItem={renderItem}
            numColumns={NUM_COLUMNS}
            key={`cols-${NUM_COLUMNS}`}
            columnWrapperStyle={{ justifyContent: "flex-start" }}
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
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}
