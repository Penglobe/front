import React from "react";
import { View, Dimensions, ScrollView, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const data = {
  labels: ["월", "화", "수", "목", "금", "토", "일"], // 요일
  datasets: [
    {
      data: [3.5, 2.8, 4.0, 3.2, 3.9, 2.5, 3.0], // 사용자 평균 CO2
      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`, // 파란색
      strokeWidth: 3,
      label: "사용자 평균 CO2",
    },
    {
      data: [3.0, 3.1, 3.8, 3.0, 3.5, 2.8, 3.2], // 전체 평균 CO2
      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // 빨간색
      strokeWidth: 3,
      label: "전체 평균 CO2",
    },
  ],
  legend: ["사용자 평균 CO2", "전체 평균 CO2"], // 범례
};

const chartConfig = {
  backgroundGradientFrom: "#ffffffff",
  backgroundGradientTo: "#ffffffff",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#ffffffff",
  },
};

export default function Co2Chart() {
  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          주간 CO2 평균
        </Text>
        <LineChart
          data={data}
          width={screenWidth - 100}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{
            borderRadius: 16,
          }}
          withShadow={false}
        />
      </View>
    </ScrollView>
  );
}
