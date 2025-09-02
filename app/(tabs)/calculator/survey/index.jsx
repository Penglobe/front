// app/(tabs)/home/index.jsx
import { View, Text } from "react-native";
import BgGradient from "@components/BgGradient";

export default function Survey() {
  return (
    <View className="flex-1">
      <BgGradient />
      <Text>Survey</Text>
    </View>
  );
}
