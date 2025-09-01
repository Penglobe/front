import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";

export default function QuizPage() {
  const router = useRouter();
  {
    /*날짜*/
  }
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <View className="flex-1">
      <Images.BgQuiz
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"  //X축·Y축 기준을 중앙 + 꽉 채움
        style={StyleSheet.absoluteFillObject}  //부모 컨테이너 안을 전부 채우도록 배치
        pointerEvents="none"  //터치 이벤트 금지 
      />

      <HeaderBar title="오늘의 퀴즈" />
      {/*날짜, 오늘의 퀴즈*/}
      <View className="px-pageX pt-[50px] gap-[30px]">
      <View className="bg-red-100 rounded-[10px] p-4">
        <Text className="text-black font-sf-md text-[16px]">
          {formattedDate}
        </Text>
        <Text className="font-sf-b text-[24px] text-green">
          오늘의 퀴즈 - 흰색으로 변경 🤔
        </Text>
      </View>

      {/*퀴즈*/}
      <View className="mb-20 bg-red-100 rounded-[10px] p-7">
        {/*mb-20은 뒤로가기 버튼이니까 추후 삭제*/}
        {/*퀴즈내용*/}
        <Text className="font-sf-b text-[21px]">
          Q.퀴즈내용퀴즈내용퀴즈내용퀴즈내용퀴즈내용퀴즈내용퀴즈내용퀴즈내용퀴즈내용
        </Text>
        {/*ox*/}
        <View className="flex-row justify-around w-full mt-10">
          <TouchableOpacity
            className="bg-blue py-3 px-10 rounded-lg opacity-90"
            onPress={() => handleAnswer("O")}
          >
            <Text className="text-white text-lg font-bold">O</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500 py-3 px-10 rounded-lg opacity-90"
            onPress={() => handleAnswer("X")}
          >
            <Text className="text-white text-lg font-bold">X</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </View>
  )
}
