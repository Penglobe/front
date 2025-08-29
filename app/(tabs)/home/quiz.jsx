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

      <View className="w-full gap-3">
        {["북극", "남극", "사막", "정글"].map((choice, i) => (
          <Pressable
            key={i}
            onPress={() => alert(`선택한 답: ${choice}`)}
            className="bg-yellow rounded-[16px] px-4 py-3 items-center shadow"
            accessibilityRole="button"
            accessibilityLabel={`답변 ${choice}`}
          >
            <Text className="text-white font-sf-b text-lg">{choice}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.back()}
        className="mt-10 px-6 py-3 rounded-[16px] bg-gray-200"
      >
        <Text className="font-sf text-gray-800">돌아가기</Text>
      </Pressable>
    </View>
  );
}
