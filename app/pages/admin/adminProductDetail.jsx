import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { apiFetch } from "@services/authService";
import { Images } from "@constants/Images";
import MainButton from "@components/MainButton";
import Modal from "@components/Modal";
import Constants from "expo-constants";
import { useAuth } from "../../../hooks/useAuth";
import CustomAlert from "@components/CustomAlert";

const SERVER_URL = Constants.expoConfig.extra.SERVER_URL;
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
  const [confirmVisible, setConfirmVisible] = useState(false); // 구매 확인 모달 상태
  const { user, refreshUser } = useAuth();

  // 🔔 커스텀 알럿 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState(null);
  // "loadError" | "purchaseSuccess" | "purchaseFail" | "deleteConfirm" | "deleteSuccess" | "deleteFail"

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await apiFetch(`/shop/products/${pid}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `조회 실패(${res.status})`);
      setItem(json?.data ?? json);
    } catch (e) {
      setAlertTitle("오류");
      setAlertMessage(e?.message ?? "상품 정보를 불러올 수 없습니다.");
      setAlertMode("loadError");
      setAlertVisible(true);
    }
  }, [pid, router]);

  useEffect(() => {
    load();
  }, [load]);

  // 모달 열릴 때 보유 포인트 최신화
  useEffect(() => {
    if (confirmVisible) refreshUser();
  }, [confirmVisible, refreshUser]);

  const price = item?.price ?? 0;
  const total = price * qty;
  const totalPoint = Number(user?.totalPoint ?? 0);

  const minus = () => setQty((n) => Math.max(1, n - 1));
  const plus = () => setQty((n) => n + 1);

  // 모달 열기
  const openConfirm = () => {
    setConfirmVisible(true);
  };

  // 구매 처리 API
  const handleBuy = useCallback(async () => {
    try {
      const res = await apiFetch(`/shop/orders`, {
        method: "POST",
        body: JSON.stringify({ productId: item.productId, qty }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `구매 실패(${res.status})`);
      const data = json?.data ?? json;

      setConfirmVisible(false); // 모달 닫기

      setAlertTitle("구매 완료");
      setAlertMessage(
        `${item.name}\n사용한 얼음: ${
          data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0
        }개`
      );
      setAlertMode("purchaseSuccess");
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("구매 실패");
      setAlertMessage("잔액이 부족합니다.");
      setAlertMode("purchaseFail");
      setAlertVisible(true);
    }
  }, [item, qty, router]);

  // 삭제 처리
  const handleDelete = async () => {
    try {
      const res = await apiFetch(`/shop/products/${item.productId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.message ?? "삭제 실패");

      setAlertTitle("삭제 완료");
      setAlertMessage("상품이 삭제되었습니다.");
      setAlertMode("deleteSuccess");
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("삭제 실패");
      setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요.");
      setAlertMode("deleteFail");
      setAlertVisible(true);
    }
  };

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">불러오는 중...</Text>
      </View>
    );
  }

  const imgUri = toUri(item?.img);
  const bottomGap = Math.max(insets.bottom, 16) + 76;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="관리자 페이지 > 상품 정보" />

      {/* 본문 */}
      <View className="flex-1 px-pageX pt-md">
        <View className="flex-row justify-between mt-xl mb-lg gap-5">
          {/* 수정 버튼 */}
          <Pressable
            className="flex-1 py-4 rounded-xl bg-blue items-center justify-center opacity-90"
            onPress={() =>
              router.push(`/pages/admin/edit?id=${item.productId}`)
            }
          >
            <Text className="text-white font-sf-b text-h4 text-center">
              수정
            </Text>
          </Pressable>

          {/* 삭제 버튼 */}
          <Pressable
            className="flex-1 y-4 rounded-xl bg-red-600 items-center justify-center opacity-90"
            onPress={() => {
              setAlertTitle("삭제 확인");
              setAlertMessage("정말 삭제하시겠습니까?");
              setAlertMode("deleteConfirm");
              setAlertVisible(true);
            }}
          >
            <Text className="text-white font-sf-b text-h4 text-center">
              삭제
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: bottomGap }}>
          <View className="bg-white rounded-2xl px-pageX pt-md pb-llg">
            <View className="w-full h-[220px] rounded-2xl mt-xs mb-sm bg-gray items-center justify-center overflow-hidden">
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

            <View className="px-sm py-sm">
              <Text className="font-sf-b text-h3 mb-lg text-green">
                상품 정보
              </Text>
              <Text className="text-h2 font-sf-b">{item.name}</Text>
              {!!item.description && (
                <View className="mt-md mb-3xl">
                  <Text className="text-body text-gray-700">
                    {item.description}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ✅ CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText={
          alertMode === "deleteConfirm"
            ? "삭제"
            : alertMode === "purchaseSuccess"
              ? "사용 내역 보기"
              : "확인"
        }
        cancelText={alertMode === "deleteConfirm" ? "취소" : undefined}
        onConfirm={() => {
          setAlertVisible(false);

          if (alertMode === "loadError") {
            router.back();
          }
          if (alertMode === "purchaseSuccess") {
            router.push("/pages/shop/orderlist");
          }
          if (alertMode === "deleteConfirm") {
            handleDelete();
          }
          if (alertMode === "deleteSuccess") {
            router.push("/pages/admin/adminMain");
          }
        }}
        onCancel={() => {
          setAlertVisible(false);
        }}
      />
    </View>
  );
}
