import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function MissionPage() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-xl font-sf-b text-center mb-6">
        mission page
      </Text>

      </View>
  );
}
