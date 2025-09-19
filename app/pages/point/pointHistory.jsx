import { useCallback, useEffect, useState } from "react";
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
import { Stack, useFocusEffect, useRouter } from "expo-router";
import Modal from "@components/Modal";
import MainButton from "@components/MainButton";

const { Colors } = colors;

const reasonLabels = {
  TRANSPORT_ACTIVITY: "펭걸음",
  DIET: "빙하 식탁",
  ATTENDANCE: "출석",
  QUIZ: "퀴즈",
  SURVEY: "빙하 리포트",
  MISSION_REWARD: "미션 보상",
  SHOP_PURCHASE: "굿즈 구매",
  DONATION: "기부",
  PAYMENT: "얼음 충전",
};

// 월별 그룹화
const groupByMonth = (points) => {
  const groups = {};
  points.forEach((p) => {
    const date = new Date(p.eventDate);
    const key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // 최신 달이 위로
    .map(([title, data]) => ({ title, data }));
};

export default function PointHistory() {
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChargeModalVisible, setIsChargeModalVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);

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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const renderItem = ({ item, index }) => {
    const isPlus = item.changeAmount > 0;
    return (
      <View
        className="flex-row justify-between items-center rounded-lg p-lg mb-md"
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
          <Text className="text-h4 font-sf-md">
            {reasonLabels[item.reason] ?? item.reason}
          </Text>
          <Text className="text-overline py-xs">
            {new Date(item.eventDate).toLocaleDateString("ko-KR")}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-base font-sf-b"
            style={{ color: isPlus ? Colors.green : "#D92D20" }}
          >
            {isPlus ? `+${item.changeAmount}` : item.changeAmount}
          </Text>
          <Text className="text-overline py-xs">{item.balanceAfter} 얼음</Text>
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

  // ⬇️ 결제 진행 함수 (선택 후 버튼 눌렀을 때만 이동)
  const proceedCharge = () => {
    if (!selectedAmount) return;
    setIsChargeModalVisible(false);
    router.push({
      pathname: "/pages/point/webview", // ← 경로 소문자 webview
      params: { amount: String(selectedAmount) },
    });
  };

  const renderChargeModalContent = () => {
    const amounts = [1000, 5000, 10000, 30000, 50000, 100000];
    return (
      <View>
        <View className="flex-row items-center justify-center mb-md">
          {/* 왼쪽 더미 (취소와 폭 맞추기용) */}
          <View className="w-[40px]" />

          <Text className="text-h2 font-sf-b text-center flex-1 text-green">
            얼음 충전
          </Text>

          <Pressable
            onPress={() => setIsChargeModalVisible(false)}
            className="w-[40px] items-end"
          >
            <Text className="text-body text-darkGray">취소</Text>
          </Pressable>
        </View>
        <Text className="text-body font-sf-md text-center flex-1 mb-md">
          충전할 금액을 선택하세요.
        </Text>

        {/* 금액 칩 리스트 */}
        <View className="flex-row flex-wrap justify-between mb-xs">
          {amounts.map((amt) => {
            const selected = selectedAmount === amt;
            return (
              <Pressable
                key={amt}
                onPress={() => setSelectedAmount(amt)}
                className={`rounded-xl items-center justify-center m-1.5 ${
                  selected ? "bg-green" : "bg-gray"
                }`}
                style={{
                  width: "30%", // 3개씩 배치
                  height: 48, // 버튼 높이 고정
                }}
              >
                <Text
                  className={`text-button font-sf-sb ${
                    selected ? "text-white" : "text-black"
                  }`}
                >
                  {amt.toLocaleString()}원
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 진행 버튼 */}
        <View className="mt-lg">
          <MainButton
            label={
              selectedAmount
                ? `${selectedAmount.toLocaleString()}원 충전`
                : "금액을 선택하세요"
            }
            onPress={proceedCharge}
            disabled={!selectedAmount}
          />
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.white }}>
      <Stack.Screen
        options={{ gestureEnabled: false, headerBackVisible: false }}
      />
      <BgGradient />
      <HeaderBar
        title="얼음 내역"
        onBack={() => router.replace("/(tabs)/home")}
      />

      {/* 잔액 카드 */}
      <View className="px-pageX mt-5">
        <View
          className="rounded-xl p-lg flex-row justify-between items-center"
          style={{
            backgroundColor: Colors.white,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {/* 좌측 (텍스트들) */}
          <View className="flex-col">
            <Text className="text-caption font-sf-md">보유 얼음</Text>
            <View className="flex-row items-center mt-1">
              <Text
                className="text-h1 font-grotesk-b"
                style={{ color: Colors.green }}
              >
                {balance.toLocaleString("ko-KR")}
              </Text>
              <Images.Ice width={40} height={40} />
            </View>
          </View>

          {/* 우측 (버튼) */}
          <Pressable
            onPress={() => setIsChargeModalVisible(true)}
            accessibilityRole="button"
            className="rounded-xl py-sm px-lg active:bg-green"
            style={{ backgroundColor: Colors.green }}
          >
            <Text className="text-white font-sf-md text-caption">
              얼음 충전
            </Text>
          </Pressable>
        </View>
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
          <View className="flex-row justify-between items-center mt-xl px-pageX">
            <Pressable
              onPress={goOlderMonth}
              disabled={currentIndex >= sections.length - 1}
              className="px-lg py-sm rounded-lg"
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
              className="px-lg py-sm rounded-lg"
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
              `${item.eventDate}-${item.reason}-${idx}`
            }
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      )}

      <Modal visible={isChargeModalVisible}>{renderChargeModalContent()}</Modal>
    </View>
  );
}
