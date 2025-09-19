import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import CustomAlert from "@components/CustomAlert";
import { apiFetch } from "@services/authService";

const BASE_URL = Constants.expoConfig?.extra?.SERVER_URL || "";
function toUri(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function AdminProductView() {
  const { id } = useLocalSearchParams();
  const pid = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);

  const safeOpenAlert = (title, message, mode) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertMode(mode ?? null);
    setAlertVisible(true);
  };

  const fetchItem = useCallback(async () => {
    if (!pid) {
      safeOpenAlert("잘못된 접근", "항목 ID가 없습니다.", "no-id");
      setLoading(false);
      return;
    }
    try {
      if (!refreshing) setLoading(true);
      const res = await apiFetch(`/shop/products/${encodeURIComponent(pid)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(json?.message || `조회 실패 (${res.status})`);
      setItem(json?.data ?? json);
    } catch (e) {
      safeOpenAlert(
        "오류",
        e?.message ?? "상품을 불러올 수 없습니다.",
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pid, refreshing]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItem();
  };

  const onPressDelete = () => {
    if (acting) return;
    if (!item?.productId) {
      safeOpenAlert("삭제 불가", "상품 정보가 올바르지 않습니다.", "error");
      return;
    }
    safeOpenAlert("삭제 확인", "정말 삭제하시겠습니까?", "confirm-delete");
  };

  const doDelete = async () => {
    if (acting) return;
    setActing(true);
    try {
      const res = await apiFetch(`/shop/products/${item.productId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? "삭제 실패");
      safeOpenAlert("삭제 완료", "상품이 삭제되었습니다.", "deleted");
    } catch (e) {
      safeOpenAlert(
        "삭제 실패",
        e?.message ?? "잠시 후 다시 시도해주세요.",
        "error"
      );
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
        <Text className="text-gray-500 mt-xs">불러오는 중…</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">상품을 찾을 수 없습니다.</Text>
        <Pressable
          className="mt-md py-3 px-4 rounded-xl bg-green"
          onPress={fetchItem}
        >
          <Text className="text-white font-sf-b">다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const imgUri = toUri(item.img);
  const bottomGap = Math.max(insets.bottom, 16) + 76;

  const goEdit = () => {
    if (acting) return;
    if (!item?.productId) {
      safeOpenAlert("이동 불가", "상품 정보가 올바르지 않습니다.", "error");
      return;
    }
    router.push(`/pages/admin/edit?id=${item.productId}`);
  };

  return (
    <View className="flex-1 bg-white">
      <BgGradient />
      <HeaderBar title="상품 상세" />

      <View className="flex-1 px-pageX mt-llg">
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomGap }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 카드 */}
          <View className="bg-white rounded-2xl px-pageX pt-md pb-llg shadow-sm">
            {/* 이미지 영역 */}
            <View className="w-full h-[240px] rounded-2xl mt-xs mb-md bg-gray items-center justify-center overflow-hidden">
              {imgUri ? (
                <Image
                  source={{ uri: imgUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-gray-400">이미지 없음</Text>
              )}
            </View>

            {/* 텍스트 영역 */}
            <Text className="text-h2 font-sf-b text-black">{item.name}</Text>
            {typeof item.price === "number" && (
              <Text className="mt-xxs text-body font-sf-md text-green">
                {item.price.toLocaleString()} 얼음
              </Text>
            )}
            {!!item.description && (
              <Text className="mt-md text-body text-gray-700">
                {item.description}
              </Text>
            )}
          </View>

          {/* 수정 / 삭제 */}
          <View className="flex-row justify-between mt-xl mb-lg gap-4">
            <Pressable
              className="flex-1 py-4 rounded-xl bg-green items-center justify-center"
              onPress={goEdit}
              disabled={acting}
              style={({ pressed }) => [
                { opacity: acting ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text className="text-white font-sf-b text-h4">
                {acting ? "처리 중…" : "수정"}
              </Text>
            </Pressable>

            <Pressable
              className="flex-1 py-4 rounded-xl bg-red items-center justify-center"
              onPress={onPressDelete}
              disabled={acting}
              style={({ pressed }) => [
                { opacity: acting ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text className="text-white font-sf-b text-h4">
                {acting ? "삭제 중…" : "삭제"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* 공용 Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText={
          alertMode === "confirm-delete"
            ? "삭제"
            : alertMode === "no-id"
            ? "뒤로가기"
            : "확인"
        }
        cancelText={alertMode === "confirm-delete" ? "취소" : undefined}
        onConfirm={() => {
          setAlertVisible(false);
          if (alertMode === "confirm-delete") {
            doDelete();
          } else if (alertMode === "deleted") {
            router.replace("/pages/admin/adminMain");
          } else if (alertMode === "no-id") {
            router.back();
          }
        }}
        onCancel={() => setAlertVisible(false)}
      />
    </View>
  );
}
