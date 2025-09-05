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

const { Colors } = colors;

const reasonLabels = {
  TRANSPORT_ACTIVITY: "환경 걸음",
  DIET: "식습관",
  ATTENDANCE: "출석",
  QUIZ: "퀴즈",
  SURVEY: "설문",
  MISSION_REWARD: "미션 보상",
  SHOP_PURCHASE: "굿즈 구매",
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
  const [sections, setSections] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

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
          <Text className="text-xs text-zinc-500 mt-1">
            {item.balanceAfter} 얼음
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
              `${item.eventDate}-${item.reason}-${idx}`
            }
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      )}
    </View>
  );
}
