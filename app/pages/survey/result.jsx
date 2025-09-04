import { View, Text } from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "../../../components/MainButton";
import { router } from "expo-router";

export default function SurveyResult() {
  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />

      {/* 헤더 */}
      <HeaderBar title="설문조사" />

      <Text> 결과화면</Text>

      <MainButton text="홈으로" onPress={() => router.push("/(tabs)/home")} />
    </View>
  );
}
