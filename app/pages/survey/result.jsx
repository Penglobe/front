import { View, Text } from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { router, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useSearchParams } from "expo-router/build/hooks";

export default function SurveyResult() {
  const { userId, resultData } = useLocalSearchParams();

  let data = null;
  try {
    data = resultData ? JSON.parse(decodeURIComponent(resultData)) : null;
  } catch (e) {
    console.error("resultData 파싱 실패:", e);
  }

  // console.log("결과페이지 도착");
  // console.log("userId:", userId);
  // console.log("data 확인:", data);

  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />

      {/* 헤더 */}
      <HeaderBar title="설문조사" />

      <View>
        {data ? (
          <>
            <View className="bg-white rounded-[10px] p-4 mt-5 mx-2">
              <Text
                style={{ color: "#0c7e3cff", fontSize: 16, lineHeight: 24 }}
              >
                <Text style={{ fontWeight: "bold" }}>
                  오늘 탄소 절감량{"\n"}
                </Text>
                평균{" "}
                <Text
                  style={{ color: "#007E33", fontSize: 20, fontWeight: "bold" }}
                >
                  {data.top3
                    .reduce((sum, item) => sum + item.co2kg, 0)
                    .toFixed(2)}
                </Text>{" "}
                <Text style={{ color: "#0c7e3cff", fontSize: 16 }}>
                  kgCO₂eq
                </Text>
              </Text>
            </View>

            <View className="bg-white rounded-[10px] p-4 mt-5 mx-2">
              <Text
                style={{ color: "#007E33", fontSize: 16, fontWeight: "bold" }}
              >
                오늘의 탄소 절감 상위 TOP3 {"\n"}
              </Text>
              {data.top3.map((item, index) => (
                <View key={index} style={{ marginTop: 4 }}>
                  <Text>
                    {index + 1}. {item.code}_
                    <Text style={{ fontSize: 11 }}>{item.co2kg} kgCO₂eq</Text>
                  </Text>
                </View>
              ))}
            </View>

            <View className="bg-white rounded-[10px] p-4 mt-5 mx-2">
              <Text>피드백</Text>
            </View>

            <View className="bg-white rounded-[10px] p-4 mt-5 mx-2">
              <Text>차트</Text>
            </View>
          </>
        ) : (
          <Text>결과를 불러오는 중...</Text>
        )}
      </View>

      <MainButton
        label="홈으로"
        className="mt-5 mb-10"
        onPress={() => router.push("/(tabs)/home")}
      />
    </View>
  );
}
