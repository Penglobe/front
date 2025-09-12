import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import BgGradient from "@components/BgGradient";
import { apiFetch } from "@services/authService";
import HeaderBar from "@components/HeaderBar";
import colors from "@constants/Colors.cjs";
import { Images } from "../../../constants/Images";

const { Colors } = colors;

export default function OrderList({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 월별 그룹화
  const groupByMonth = (orders) => {
    const groups = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });

    return Object.entries(groups)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // 최신 달 먼저
      .map(([title, data]) => ({ title, data }));
  };

  const fetchOrders = async () => {
    try {
      const response = await apiFetch("/shop/orders/me");
      const data = await response.json();
      const list = Array.isArray(data.data) ? data.data : [];
      const grouped = groupByMonth(list);
      setOrders(grouped);
      setCurrentIndex(0);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const goOlderMonth = () => {
    if (currentIndex < orders.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goNewerMonth = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <BgGradient />
        <HeaderBar title="얼음 사용 내역" />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            주문 내역이 없습니다.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BgGradient />
      <HeaderBar title="얼음 사용 내역" />

      {/* 월 이동 버튼 */}
      <View className="flex-row justify-between items-center mt-xl px-pageX">
        <Pressable
          onPress={goOlderMonth}
          disabled={currentIndex >= orders.length - 1}
          className="px-lg py-sm rounded-lg"
          style={{
            backgroundColor:
              currentIndex >= orders.length - 1 ? Colors.gray : Colors.green,
            opacity: currentIndex >= orders.length - 1 ? 0.6 : 1,
          }}
        >
          <Text
            className="text-lg font-sf-b"
            style={{
              color:
                currentIndex >= orders.length - 1
                  ? Colors.darkGray
                  : Colors.white,
            }}
          >
            ◀
          </Text>
        </Pressable>

        <Text className="text-lg font-bold">{orders[currentIndex].title}</Text>

        <Pressable
          onPress={goOlderMonth}
          disabled={currentIndex >= orders.length - 1}
          className="px-lg py-sm rounded-lg"
          style={{
            backgroundColor:
              currentIndex >= orders.length - 1 ? Colors.gray : Colors.green,
            opacity: currentIndex >= orders.length - 1 ? 0.6 : 1,
          }}
        >
          <Text
            className="text-lg font-sf-b"
            style={{
              color:
                currentIndex >= orders.length - 1
                  ? Colors.darkGray
                  : Colors.white,
            }}
          >
            ▶
          </Text>
        </Pressable>
      </View>

      <ScrollView className="p-4">
        {orders[currentIndex]?.data?.length === 0 ? (
          <Text className="text-center mt-10 text-gray-400">
            주문 내역이 없습니다.
          </Text>
        ) : (
          orders[currentIndex]?.data?.map((order) => (
            <View
              key={order.orderId}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row justify-between"
            >
              {/* 왼쪽: 주문명 + 날짜 */}
              <View className="flex-1">
                <Text className="text-lg font-sf-b">{order.productName}</Text>
                <Text className="text-gray-600 text-xs mt-1">
                  주문일:{" "}
                  {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>

              {/* 오른쪽: 수량, 아래쪽 정렬 */}
              <View className="flex-row items-center justify-end">
                <Text className="text-gray-600 mr-1">
                  {order.productName.startsWith("[기부]")
                    ? `기부금: ${order.qty}`
                    : `사용한 얼음: ${order.price * order.qty}`}
                </Text>
                <Images.Ice width={20} height={20} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
