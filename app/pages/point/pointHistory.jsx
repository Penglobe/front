import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { apiFetch } from "@services/authService";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";
import colors from "@constants/Colors.cjs";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import Modal from "@components/Modal";

const { Colors } = colors;

const reasonLabels = {
  TRANSPORT_ACTIVITY: "환경 걸음",
  DIET: "식습관",
  ATTENDANCE: "출석",
  QUIZ: "퀴즈",
  SURVEY: "설문",
  MISSION_REWARD: "미션 보상",
  SHOP_PURCHASE: "굿즈 구매",
  TOPUP: "충전",
};

const ALLOWED_AMOUNTS = [100, 5000, 10000, 20000, 50000];

// 월별 그룹화
const groupByMonth = (points) => {
  const groups = {};
  points.forEach((p) => {
    const date = p.createdAt ? new Date(p.createdAt) : null;
    const key = date
      ? `${date.getFullYear()}년 ${date.getMonth() + 1}월`
      : "날짜 없음";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([title, data]) => ({ title, data }));
};

export default function PointHistory() {
  const [sections, setSections] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topupVisible, setTopupVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(ALLOWED_AMOUNTS[0]);
  const [payLoading, setPayLoading] = useState(false);

  const fetchData = async () => {
    try {
      // 거래 내역
      const res1 = await apiFetch("/points/ledger");
      const json1 = await res1.json();
      if (!res1.ok) throw new Error(json1?.message || "조회 실패");

      const list = json1?.data?.points || [];
      const grouped = groupByMonth(list);
      setSections(grouped);
      setCurrentIndex(0);

      // 잔액
      const res2 = await apiFetch("/points/balance");
      const json2 = await res2.json();
      if (res2.ok) {
        setBalance(json2?.data?.balance ?? 0);
      }
    } catch (err) {
      console.error("포인트 조회 실패:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startTopup = async () => {
    try {
      setPayLoading(true);
      // 1) callback(딥링크) 만들기: penglobe://pay/callback
      const callback = Linking.createURL("pay/callback");
      console.log("callback =", callback);
      // 2) 결제 의도 생성
      const res = await apiFetch("/payments/intents", {
        method: "POST",
        body: JSON.stringify({
          amount: selectedAmount,
          name: `얼음 ${selectedAmount.toLocaleString()} 충전`,
          callback,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "결제 의도 생성 실패");
      const payUrl = json?.data?.payUrl;
      if (!payUrl) throw new Error("payUrl이 없습니다.");

      // 3) 결제 세션 시작 (리다이렉트 대기)
      const result = await WebBrowser.openAuthSessionAsync(payUrl, callback);
      console.log("auth result url =", result?.url);
      // type === 'success' && url 포함 시, 콜백 URL 파싱
      const redirectedUrl = result?.url;
      if (!redirectedUrl) {
        // 취소/닫힘 등
        return;
      }
      const parsed = Linking.parse(redirectedUrl);
      console.log("parsed query =", parsed?.queryParams);
      const qp = parsed?.queryParams || {};
      const success = `${qp.success}` === "true";
      const imp_uid = qp.imp_uid;
      const merchant_uid = qp.merchant_uid;

      // 4) 결제 확정(검증)
      const res2 = await apiFetch("/payments/confirm", {
        method: "POST",
        body: JSON.stringify({
          imp_uid: imp_uid,
          merchant_uid: merchant_uid,
          success,
        }),
      });
      const json2 = await res2.json().catch(() => null);
      console.log("[CONFIRM] result", res2.status, json2);
      if (!res2.ok) throw new Error(json2?.message || "결제 확정 실패");

      // 5) 결과 반영
      if (json2?.data?.ok) {
        Alert.alert(
          "충전 완료",
          `보유 얼음: ${json2.data.newBalance.toLocaleString()}`
        );
        await fetchData(); // 잔액 + 리스트 재조회
        setTopupVisible(false);
      } else {
        Alert.alert("결제 실패", json2?.data?.message || "실패했습니다.");
      }
    } catch (e) {
      Alert.alert("오류", e?.message ?? "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setPayLoading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const isPlus = item.changeAmount > 0;
    return (
      <View
        className="flex-row justify-between items-center rounded-lg p-4 mb-3"
        style={{
          backgroundColor: Colors.white,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View className="flex-1">
          <Text className="text-base font-sf-md">
            {reasonLabels[item.reason] ?? item.reason}
          </Text>
          <Text className="text-xs text-zinc-400 mt-1">
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString("ko-KR")
              : "-"}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-base font-sf-b"
            style={{ color: isPlus ? Colors.green : "#D92D20" }}
          >
            {isPlus ? `+${item.changeAmount}` : item.changeAmount}
          </Text>
        </View>
      </View>
    );
  };

  // 최신 달 = index 0
  const goOlderMonth = () => {
    if (currentIndex < sections.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goNewerMonth = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white }}>
      <BgGradient />
      <HeaderBar title="얼음 적립 내역" className="px-pageX" />

      {/* 잔액 카드 */}
      <View className="px-pageX mt-4">
        <View
          className="rounded-xl p-4 flex-row justify-between items-center"
          style={{
            backgroundColor: Colors.white,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Text className="text-lg text-zinc-600 font-sf-md">
            현재 보유 얼음
          </Text>
          <View className="flex-row items-center">
            <Text
              className="text-2xl font-grotesk-b mr-2"
              style={{ color: Colors.green }}
            >
              {balance.toLocaleString("ko-KR")}
            </Text>
            <Images.Ice width={40} height={40} />
          </View>
        </View>
        {/* 충전하기 버튼 */}
        <Pressable
          onPress={() => setTopupVisible(true)}
          className="mt-3 rounded-xl items-center justify-center"
          style={{
            height: 48,
            backgroundColor: Colors.green,
            shadowColor: Colors.black,
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <Text className="text-white font-sf-b">충전하기</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 justify-center items-center px-pageX">
          <Text className="text-base text-zinc-500">
            포인트 적립 내역이 없습니다.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          {/* 월 이동 헤더 */}
          <View className="flex-row justify-between items-center mt-6 px-pageX">
            <Pressable
              onPress={goOlderMonth}
              disabled={currentIndex >= sections.length - 1}
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor:
                  currentIndex >= sections.length - 1
                    ? Colors.gray
                    : Colors.green,
                opacity: currentIndex >= sections.length - 1 ? 0.6 : 1,
              }}
            >
              <Text
                className="text-lg font-sf-b"
                style={{
                  color:
                    currentIndex >= sections.length - 1
                      ? Colors.darkGray
                      : Colors.white,
                }}
              >
                ◀
              </Text>
            </Pressable>

            <Text className="text-lg font-sf-b text-zinc-700">
              {sections[currentIndex].title}
            </Text>

            <Pressable
              onPress={goNewerMonth}
              disabled={currentIndex <= 0}
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: currentIndex <= 0 ? Colors.gray : Colors.green,
                opacity: currentIndex <= 0 ? 0.6 : 1,
              }}
            >
              <Text
                className="text-lg font-sf-b"
                style={{
                  color: currentIndex <= 0 ? Colors.darkGray : Colors.white,
                }}
              >
                ▶
              </Text>
            </Pressable>
          </View>

          {/* 해당 월 거래내역 */}
          <FlatList
            data={sections[currentIndex].data}
            renderItem={renderItem}
            keyExtractor={(item, idx) =>
              `${item.createdAt}-${item.reason}-${idx}`
            }
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      )}

      <Modal visible={topupVisible}>
        <View className="mb-3">
          <Text className="text-[20px] font-sf-b text-center">얼음 충전</Text>
        </View>

        <Text className="text-[14px] text-zinc-600 mb-3">
          충전 금액을 선택하세요
        </Text>

        <View className="flex-row flex-wrap -mx-1 mb-8">
          {ALLOWED_AMOUNTS.map((amt) => {
            const selected = selectedAmount === amt;
            return (
              <Pressable
                key={amt}
                onPress={() => setSelectedAmount(amt)}
                className="m-1 px-4 py-3 rounded-xl"
                style={{
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? Colors.green : "#E5E7EB",
                  backgroundColor: selected
                    ? "rgba(16,185,129,0.08)"
                    : "#FFFFFF",
                }}
              >
                <Text className="font-sf-b">{amt.toLocaleString()}원</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={startTopup}
          disabled={payLoading}
          className="rounded-2xl items-center justify-center"
          style={{
            height: 52,
            backgroundColor: payLoading ? "#9CA3AF" : Colors.green,
            opacity: payLoading ? 0.8 : 1,
          }}
        >
          <Text className="text-white font-sf-b">
            {payLoading ? "진행 중..." : "결제 진행"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => !payLoading && setTopupVisible(false)}
          className="mt-3 items-center justify-center"
        >
          <Text className="text-zinc-500">닫기</Text>
        </Pressable>
      </Modal>
    </View>
  );
}
