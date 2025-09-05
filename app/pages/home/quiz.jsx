import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";
import MainButton from "@components/MainButton";
import { use, useEffect, useState } from "react";
import Modal from "@components/Modal";

export default function QuizPage() {
  const router = useRouter();
  const [question, setQuestion] = useState(null); //질문 가져오기
  const [open, setOpen] = useState(false); //모달 열기
  const [answer, setAnswer] = useState(null); //사용자 답변
  const [result, setResult] = useState(null); // 정답 여부에 따라서 모달 내용 변경

  /*날짜*/
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  /*핸들러*/
  const handleAnswer = (userAnswer) => {
    setAnswer(userAnswer); //사용자 답변 설정

    const userAnswerBool = userAnswer === "O"; //db에는 true/false로 저장되어 있음
    const isCorrect = userAnswerBool === Boolean(question.isAnswerTrue); //정답 여부 확인

    setResult(isCorrect); //결과 설정

    setOpen(true); //모달 열기
  };

  /*퀴즈 가져오기*/
  useEffect(() => {
    fetch("http://192.168.0.51:8080/quiz/today")
      .then((response) => response.json())
      .then((data) => {
        //console.log("질문", data);
        setQuestion(data);
      })
      .catch((error) => console.error("Error fetching quiz:", error));
  }, []);

  /*퀴즈 정답처리*/
  const handleSubmitAnswer = async () => {
    if (!question || !answer) return;

    try {
      const res = await fetch("http://192.168.0.51:8080/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, //임시 userId***************************************************
          quizId: question.quizId,
          answer: answer === "O",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json(); // 중복 제출 시
        alert(errorData.message); // 에러 메세지
        return;
      }
      const data = await res.json(); // 정상
    } catch (e) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  return (
    <View className="flex-1">
      {/*모달*/}
      <Modal visible={open} onClose={() => setOpen(false)}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text className="text-black text-[20px] font-sf-md text-center mb-2">
            {result ? "정답입니다!" : "오답입니다!"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-black text-[20px] font-sf-md">
              {result ? "10" : "1"}
            </Text>
            <Images.Ice width={40} height={40} />
            <Text className="text-black text-[20px] font-sf-md">
              을 받아주세요.
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            {result ? <Images.Ipa2 /> : <Images.Ipa_sad />}
          </View>
        </View>

        <MainButton
          label="포인트 받기"
          onPress={async () => {
            await handleSubmitAnswer(); // 정답 제출
            setOpen(false); // 모달 닫기
            router.push("/(tabs)/home"); // 홈 페이지 이동
          }}
        />
      </Modal>

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
          <Text className="text-green font-sf-md text-[22px]">
            {formattedDate}
          </Text>
          <Text className="font-sf-b text-[15px] mt-2">
            환경 퀴즈 첫 제출로만 얼음 적립! {"\n"}하지만 얼음은 없어도 지식은
            쌓을 수 있어요!
          </Text>
        </View>

        {/*퀴즈*/}
        <View className="bg-white rounded-[10px] p-7">
          {/*퀴즈내용*/}
          <Text className="font-sf-b text-[21px]">
            Q. {question ? question.question : "퀴즈를 불러오는 중입니다..."}
          </Text>

          {/*OX*/}
          <View className="flex-row justify-around mt-10">
            <TouchableOpacity
              className="bg-blue py-8 px-12 rounded-lg opacity-90"
              onPress={() => handleAnswer("O")}
            >
              <Text className="text-white text-[60px] font-extrabold">O</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-400 py-8 px-12 rounded-lg opacity-90"
              onPress={() => handleAnswer("X")}
            >
              <Text className="text-white text-[60px] font-extrabold">X</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/*퀴즈 캐릭터*/}
        <View style={{ flex: 1 }}>
          <Images.Quiz_IpaTory
            width={300}
            height={200}
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
