import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import MainButton from "../../../components/MainButton";

export default function QuizPage() {
  const router = useRouter();
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <View className="mt-[100px] px-pageX">
      {/*날짜, 오늘의 퀴즈*/}
      <View className="mb-20 bg-red-100 rounded-[10px] p-4">
        <Text className="text-black font-sf-md text-[16px]">
          {formattedDate}
        </Text>
        <Text className="font-grotesk-b text-[24px] text-green">
          오늘의 퀴즈 🤔
        </Text>
      </View>

      {/* 뒤로가기 버튼 */}
      <MainButton
        label="뒤로가기"
        onPress={() => router.push("/(tabs)/home")}
      />
    </View>
  );
}

//  <Text className="text-black font-sf-md text-[18px]">총 탄소 절감량</Text>
//           <Text className="font-grotesk-b text-[24px] text-green">535
//             <Text className="text-black"> kg</Text>
//             <Text className="text-[14px] font-sf-md text-black"> (kgCo2eq 기준)</Text>
//           </Text>

//  <MainButton
//         label="포인트 받기"
//         onPress={() => router.push("/(tabs)/home")}
//       />
