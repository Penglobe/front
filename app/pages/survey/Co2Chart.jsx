import React, { useEffect, useState } from "react";
import { View, Dimensions, ScrollView, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useLocalSearchParams } from "expo-router";
import { apiFetch } from "@services/authService";

const Co2Chart = () => {
  const { userId } = useLocalSearchParams();
  const screenWidth = Dimensions.get("window").width;

  const [userCo2, setUserCo2] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [totalCo2, setTotalCo2] = useState([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    async function fetchCo2Data() {
      try {
        const resUser = await apiFetch(`/surveys/weekly/user/${userId}`);
        const userData = await resUser.json();
        setUserCo2(userData);

        const resTotal = await apiFetch("/surveys/weekly/total");
        const totalData = await resTotal.json();
        setTotalCo2(totalData);

        //console.log("userCo2", userData);
        // console.log("totalCo2", totalData);
      } catch (error) {
        console.error(error);
      }
    }

    fetchCo2Data();
  }, [userId]);

  const chartData = {
    labels: ["월", "화", "수", "목", "금", "토", "일"],
    datasets: [
      {
        data: userCo2,
        color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
        strokeWidth: 3,
        label: "나의 평균 절감량",
      },
      {
        data: totalCo2,
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 3,
        label: "전체 사용자 평균 CO₂",
      },
    ],
    legend: ["나의 평균 절감량", "전체 사용자 평균 절감량"],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" },
  };

  return (
    <ScrollView
      horizontal
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View className="pt-2">
        <Text className="text-lg font-sf-md mb-lg">주간 평균 절감량</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 30}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 16 }}
          withShadow={false}
        />
      </View>
    </ScrollView>
  );
};

export default Co2Chart;
