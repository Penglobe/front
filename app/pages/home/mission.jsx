import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import MainButton from "../../../components/MainButton";

export default function MissionPage() {
  const router = useRouter();

  return (
    <View className="px-pageX flex-1 items-center justify-center bg-white px-6">
      <Text className="text-xl font-sf-b text-center mb-6">
        mission page
      </Text>
      <MainButton label="포인트 받기" onPress={() => router.push("/(tabs)/home")} />
      </View>
  );
}
