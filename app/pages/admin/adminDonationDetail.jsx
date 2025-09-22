import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { apiFetch } from "@services/authService";
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
  const [qty, setQty] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false); //구매 확인 모달 상태
  const { user, refreshUser } = useAuth();

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
      setAlertMessage(e?.message ?? "기부 정보를 불러올 수 없습니다.");
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

  const totalPoint = Number(user?.totalPoint ?? 0);

  const minus = () => setQty((n) => Math.max(1, n - 1));
  const plus = () => setQty((n) => n + 1);

  // 모달 열기
  const openConfirm = () => {
    if (qty < 100) {
      setAlertTitle("최소 기부금 안내");
      setAlertMessage("기부금은 최소 100얼음 이상이어야 합니다.");
      setAlertVisible(true);
      return; // 100 미만이면 모달 열지 않음
    }
    setConfirmVisible(true); // 조건 만족 시 모달 열기
  };

  // 구매 처리 API
  const handleBuy = useCallback(async () => {
    try {
      const res = await apiFetch(`/shop/orders`, {
        method: "POST",
        body: JSON.stringify({ productId: item.productId, qty: qty }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `구매 실패(${res.status})`);
      const data = json?.data ?? json;

      setConfirmVisible(false); //모달 닫기

      setAlertTitle("기부 완료");
      setAlertMessage(
        `${item.name}\n사용한 얼음: ${
          data?.totalPoints?.toLocaleString?.() ?? data?.totalPoints ?? 0
        }얼음\n\n당신의 기부가 지구를 지키는 큰 힘이 됩니다!`
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

  const bottomGap = Math.max(insets.bottom, 16) + 76;

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="기부 수정" />

      {/* 본문: 스크롤이 흰 카드(View)만 감싸도록 배치 */}
      <View className="flex-1 px-pageX mt-llg">
        <ScrollView contentContainerStyle={{ paddingBottom: bottomGap }}>
          <View className="bg-white rounded-2xl px-pageX pt-md pb-llg">
            {/* 이미지 */}
            <View className="w-full h-[220px] rounded-2xl mt-xs mb-sm bg-gray items-center justify-center overflow-hidden">
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

            <View className="px-sm py-sm">
              <Text className="font-sf-b text-h3 mb-sm text-green">기부명</Text>
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
          <View className="flex-row justify-between mt-xl mb-lg gap-5">
            {/* 수정 버튼 */}
            <Pressable
              className="flex-1 py-4 rounded-xl bg-green items-center justify-center opacity-90"
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
              className="flex-1 y-4 rounded-xl bg-red items-center justify-center opacity-90"
              onPress={async () => {
                const confirm = await new Promise((resolve) => {
                  setAlertTitle("삭제 확인");
                  setAlertMessage("정말 삭제하시겠습니까?");
                  setAlertVisible(true);
                });
                if (!confirm) return;

                try {
                  const res = await apiFetch(
                    `/shop/products/${item.productId}`,
                    {
                      method: "DELETE",
                    }
                  );
                  const json = await res.json().catch(() => null);

                  if (!res.ok) {
                    throw new Error(json?.message ?? "삭제 실패");
                  }

                  setAlertTitle("삭제 완료");
                  setAlertMessage("기부가 삭제되었습니다.");
                  setAlertVisible(true);
                } catch (e) {
                  setAlertTitle("삭제 실패");
                  setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요");
                  setAlertVisible(true);
                }
              }}
            >
              <Text className="text-white font-sf-b text-h4 text-center">
                삭제
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        confirmText="확인"
        cancelText={alertTitle === "삭제 확인" ? "취소" : undefined} // 삭제 확인일 때만 취소 버튼 표시
        onConfirm={() => {
          setAlertVisible(false);

          // 원래 Alert에 있던 후속 동작들 반영
          if (alertTitle === "기부 완료") {
            router.back(); // 기부 완료 후 뒤로 이동
          }
          if (alertTitle === "삭제 완료") {
            router.push("/pages/admin/adminMain"); // 삭제 완료 후 관리자 메인으로 이동
          }
          if (alertTitle === "삭제 확인") {
            // 삭제 확정
            // 실제 삭제 API 호출 로직 실행
            (async () => {
              try {
                const res = await apiFetch(`/shop/products/${item.productId}`, {
                  method: "DELETE",
                });
                const json = await res.json().catch(() => null);

                if (!res.ok) throw new Error(json?.message ?? "삭제 실패");

                setAlertTitle("삭제 완료");
                setAlertMessage("기부가 삭제되었습니다.");
                setAlertVisible(true);
              } catch (e) {
                setAlertTitle("삭제 실패");
                setAlertMessage(e?.message ?? "잠시 후 다시 시도해주세요");
                setAlertVisible(true);
              }
            })();
          }
        }}
        onCancel={() => {
          // 삭제 확인에서만 취소 동작
          setAlertVisible(false);
        }}
      />
    </View>
  );
}
