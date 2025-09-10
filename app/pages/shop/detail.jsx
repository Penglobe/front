import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, ScrollView, Pressable, Alert } from "react-native";
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
  const [confirmVisible, setConfirmVisible] = useState(false); //구매 확인 모달 상태
  const { user, refreshUser } = useAuth();

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
      console.log("BUY status:", res.status, "resp:", json);
      if (!res.ok) throw new Error(json?.message || `구매 실패(${res.status})`);
      const data = json?.data ?? json;

      setConfirmVisible(false); //모달 닫기

      Alert.alert(
        "구매 완료",
        `${item.name} x${qty}\n사용 포인트: ${
          data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0
        }점`,
        [
          { text: "주문내역 보기", onPress: () => router.push("/shop/orders") },
          { text: "확인", onPress: () => router.back() },
        ]
      );
    } catch (e) {
      Alert.alert("구매 실패", "잔액이 부족합니다.");
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
      <View className="flex-1 px-pageX pt-md">
        <ScrollView contentContainerStyle={{ paddingBottom: bottomGap }}>
          {/* ⬇️ 이 흰 카드가 컨텐츠 높이만큼만 렌더 → 버튼 위에서 끝남 */}
          <View className="bg-white rounded-2xl px-pageX pt-md pb-llg">
            {/* 이미지 */}
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
              <Text className="font-sf-b text-h3 mb-sm text-green">
                구매 정보
              </Text>
              <View className="flex-row items-center justify-between h-10">
                <Text className="text-h4 leading-[16px]">수량</Text>

                <View className="flex-row items-center h-full">
                  <Pressable
                    className="w-10 h-10 rounded-3xl items-center justify-center bg-green/50"
                    onPress={minus}
                  >
                    <Text className="text-xl">−</Text>
                  </Pressable>
                  <View className="h-10 justify-center">
                    <Text className="mx-lg text-lg font-sf-b"> {qty} </Text>
                  </View>

                  <Pressable
                    className="w-10 h-10 rounded-3xl items-center justify-center bg-green/50"
                    onPress={plus}
                  >
                    <Text className="text-xl">＋</Text>
                  </Pressable>
                </View>
              </View>
              <View className="flex-row items-center mt-llg self-end">
                <Text className="text-green font-sf-b text-h1">
                  {total.toLocaleString()}
                </Text>
                <Images.Ice width={35} height={35} />
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
          className="px-pageX pb-md"
        >
          <MainButton onPress={openConfirm} className="w-full">
            <View className="flex-row items-center">
              <Text className="text-white font-sf-b ml-sm text-h4">
                구매하기
              </Text>
            </View>
          </MainButton>
        </View>
      </View>

      {/* 구매 확인 모달 */}
      <Modal visible={confirmVisible}>
        <View className="mb-4">
          <Text className="text-black text-h1 font-sf-b mb-4 text-center">
            주문 확인
          </Text>
          <Pressable
            onPress={() => setConfirmVisible(false)}
            style={{ position: "absolute", right: 10, top: 0, padding: 2 }}
          >
            <Text className="text-h1 text-gray-400">✕</Text>
          </Pressable>
        </View>

        {/* 구매 상품 */}
        <View className="flex-row items-center mb-lg min-h-[28px]">
          {/* 고정 폭 레이블 */}
          <Text className="w-[112px] text-black font-sf-sb text-h3">
            구매 상품
          </Text>
          {/* 값: 우측 정렬 (긴 이름은 1줄 말줄임) */}
          <View className="flex-1 flex-row items-center justify-end">
            <Text
              className="text-h3 font-sf-b text-green leading-[22px]"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
          </View>
        </View>

        {/* 구매 수량 */}
        <View className="flex-row items-center mb-3 min-h-[28px]">
          <Text className="w-[112px] text-black font-sf-sb text-h3">
            구매 수량
          </Text>
          <View className="flex-1 flex-row items-center justify-end">
            <Text className="text-h3 font-sf-b text-green leading-[22px]">
              {qty}개
            </Text>
          </View>
        </View>

        {/* 총 결제 얼음 */}
        <View className="flex-row items-center mb-3 min-h-[28px]">
          <Text className="w-[112px] text-black font-sf-sb text-h3">
            총 결제 얼음
          </Text>
          <View className="flex-1 flex-row items-center justify-end">
            <Text className="text-h3 font-sf-b text-green leading-[22px]">
              {total.toLocaleString()}
            </Text>
            <Images.Ice width={22} height={22} />
          </View>
        </View>

        {/* 현재 보유 얼음 */}
        <View
          className={`flex-row items-center min-h-[28px] ${
            totalPoint < total ? "mb-1" : "mb-5"
          }`}
        >
          <Text className="w-[112px] text-black font-sf-sb text-h3">
            현재 보유 얼음
          </Text>
          <View className="flex-1 flex-row items-center justify-end">
            <Text className="text-h3 font-sf-b text-green leading-[22px]">
              {totalPoint.toLocaleString()}
            </Text>
            <Images.Ice width={22} height={22} />
          </View>
        </View>

        {totalPoint < total && (
          <Text className="text-rose-600 w-full text-right mb-md">
            잔액이 부족합니다.
          </Text>
        )}

        <MainButton
          onPress={handleBuy}
          disabled={totalPoint < total}
          className={totalPoint < total ? "opacity-60" : ""}
        >
          <View className="flex-row items-center">
            <Text className="text-white font-sf-b ml-2 text-h4">결제하기</Text>
          </View>
        </MainButton>
      </Modal>
    </View>
  );
}
