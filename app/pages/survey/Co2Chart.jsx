import React, { useEffect, useState } from "react";
import { View, Dimensions, ScrollView, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";

const Co2Chart = () => {
  const { userId } = useLocalSearchParams();
  const BASE_URL = `${Constants.expoConfig.extra.SERVER_URL}/surveys`;
  const screenWidth = Dimensions.get("window").width;

  const [userCo2, setUserCo2] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [totalCo2, setTotalCo2] = useState([0, 0, 0, 0, 0, 0, 0]);
  useEffect(() => {
    async function fetchCo2Data() {
      try {
        const resUser = await fetch(`${BASE_URL}/weekly/user/${userId}`);
        const userData = await resUser.json();
        setUserCo2(userData);

        const resTotal = await fetch(`${BASE_URL}/weekly/total`);
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
        label: "사용자 평균 CO2",
      },
      {
        data: totalCo2,
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 3,
        label: "전체 평균 CO2",
      },
    ],
    legend: ["사용자 평균 CO2", "전체 평균 CO2"],
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
    <ScrollView horizontal>
      <View className="pt-2">
        <Text style={{ fontSize: 15, marginBottom: 16 }}>주간 CO2 평균</Text>
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
