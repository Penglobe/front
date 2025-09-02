import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";
import MainButton from "@components/MainButton";
import { useEffect, useState } from "react";

export default function QuizPage() {
  const router = useRouter();
  const [question, setQuestion] = useState(null); //질문 가져오기
  const [modelVisible, setModelVisible] = useState(false); //정답 모달
  const [answer, setAnswer] = useState(null); //사용자 답변

  /*날짜*/
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const handleAnswer = (userAnswer) => {
    setAnswer(userAnswer);
    setModelVisible(true);
  };

  /*퀴즈 가져오기*/
  useEffect(() => {
    fetch("http://192.168.0.51:8080/quiz/today")
      .then((response) => response.json())
      .then((data) => {
        setQuestion(data);
      })
      .catch((error) => console.error("Error fetching quiz:", error));
  }, []);

  return (
    <View className="flex-1">
      {/*배경*/}
      <Images.BgQuiz
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice" //X축,Y축 기준을 중앙 + 꽉 채움
        style={StyleSheet.absoluteFillObject} //부모 컨테이너 안을 전부 채우도록 배치
        pointerEvents="none" //터치 이벤트 금지
      />

      <HeaderBar title="오늘의 퀴즈" />
      {/*날짜, 오늘의 퀴즈*/}
      <View className="px-pageX pt-[30px] gap-[30px]">
        <View className="bg-white rounded-[10px] p-4">
          <Text className="text-black font-sf-md text-[16px]">
            {formattedDate}
          </Text>
          <Text className="font-sf-b text-[24px] text-green">오늘의 퀴즈</Text>
        </View>

        {/*퀴즈*/}
        <View className="bg-white rounded-[10px] p-7">
          {/*퀴즈내용*/}
          <Text className="font-sf-b text-[21px]">
            Q. {question ? question.question : "퀴즈를 불러오는 중입니다..."}
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

        {/*퀴즈 캐릭터*/}
        <View style={{ flex: 1 }}>
          <Images.Quiz_IpaTory
            width={300}
            height={300}
            style={{
              position: "absolute",
              left: 30,
            }}
          />
        </View>
      </View>
    </View>
  );
}
