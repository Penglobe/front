import { View, Text } from "react-native";
import BgGradient from "@components/BgGradient";

export default function SurveyResult() {
  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />

      <Text> 결과화면</Text>
    </View>
  );
}
