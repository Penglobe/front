import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function QuizPage() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-xl font-sf-b text-center mb-6">
        오늘의 퀴즈 🤔{"\n"}
        펭귄이 사는 곳은 어디일까요?
      </Text>

      </View>
  );
}
