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
import { useAuth } from "@hooks/useAuth";
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
  const [confirmVisible, setConfirmVisible] = useState(false); //구매 확인 모달 상태
  const { user, refreshUser } = useAuth();
  const closeConfirm = () => setConfirmVisible(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

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
      //console.log("BUY status:", res.status, "resp:", json);
      if (!res.ok) throw new Error(json?.message || `구매 실패(${res.status})`);
      const data = json?.data ?? json;

      setConfirmVisible(false); //모달 닫기

      setAlertTitle("구매 완료");
      setAlertMessage(
        <Text>
          {item.name}
          {"\n"}
          사용한 얼음:{" "}
          <Text className="text-green text-body font-sf-b">
            {data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0}
            얼음
          </Text>
        </Text>
      );
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle("구매 실패");
      setAlertMessage("잔액이 부족합니다.");
      setAlertVisible(true);
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

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomGap }}
      >
        <View className="flex-1 pt-md px-pageX">
          <View className="bg-white rounded-2xl pt-md pb-llg px-md">
            {/* 이미지 */}
            <View className="w-full h-[320px] rounded-2xl mt-xs mb-sm bg-gray items-center justify-center overflow-hidden">
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

            <View className="py-md gap-2 px-xs">
              <Text className="font-sf-b text-h4 text-green">상품명</Text>
              <Text className="text-h2 font-sf-b">{item.name}</Text>

              {!!item.description && (
                <Text className="text-body text-gray-700">
                  {item.description}
                </Text>
              )}

              <Text className="font-sf-b text-h4 text-green mt-3xl">
                구매 정보
              </Text>

              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-h4">수량</Text>

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

                <View className="flex-row items-center justify-between">
                  <Text className="text-h4">가격</Text>
                  <View className="flex-row items-center self-end mt-md mb-md">
                    <Text className="text-green font-sf-b text-h1">
                      {total.toLocaleString()}
                    </Text>
                    <Images.Ice width={35} height={35} />
                  </View>
                </View>
              </View>
            </View>
            <MainButton label="구매하기" onPress={openConfirm} />
          </View>
        </View>
      </ScrollView>

      {/* 구매 확인 모달 */}
      <Modal visible={confirmVisible}>
        <View className="mb-4">
          <Text className="text-black text-h3 font-sf-b mb-md text-center">
            주문 확인
          </Text>
          <View className="gap-lg">
            {/* 구매 상품 */}
            <View className="justify-between flex-row">
              <Text className="text-black font-sf-sb text-h4">구매상품</Text>
              <Text
                className="text-h4 font-sf-b text-green"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
            </View>

            {/* 구매 수량 */}
            <View className="justify-between flex-row">
              <Text className="text-black font-sf-sb text-h4">구매수량</Text>
              <Text className="text-h4 font-sf-b text-green">{qty} 개</Text>
            </View>

            {/* 현재 보유 얼음 */}
            <View className="justify-between flex-row">
              <Text
                className="text-black font-sf-sb text-h4"
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                현재 보유 얼음
              </Text>
              <View className="flex-row gap-1">
                <Text className="text-black font-sf-sb text-h4">
                  {totalPoint.toLocaleString()}
                </Text>
                <Images.Ice width={22} height={22} />
              </View>
            </View>

            {/* 총 결제 얼음 */}
            <View className="justify-between flex-row">
              <Text className="text-black font-sf-sb text-h4">
                총 결제 얼음
              </Text>
              <View className="flex-row gap-1">
                <Text className="text-black font-sf-sb text-h4">
                  {total.toLocaleString()}
                </Text>
                <Images.Ice width={22} height={22} />
              </View>
            </View>

            {totalPoint < total && (
              <Text className="text-red w-full text-label text-right mb-md">
                보유 얼음이 부족합니다.
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row gap-4">
          <Pressable
            onPress={closeConfirm}
            className="flex-1 rounded-xl items-center justify-center py-llg bg-darkGray"
          >
            <Text className="text-white font-sf-md">취소</Text>
          </Pressable>

          <Pressable
            onPress={handleBuy}
            disabled={totalPoint < total}
            className={`flex-1 rounded-xl items-center justify-center py-llg bg-green active:bg-emerald-700 ${
              totalPoint < total ? "opacity-60" : ""
            }`}
          >
            <Text className="text-white font-sf-md">구매하기</Text>
          </Pressable>
        </View>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => {
          setAlertVisible(false);
        }}
      />
    </View>
  );
}
