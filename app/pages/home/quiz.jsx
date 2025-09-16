import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import HeaderBar from "@components/HeaderBar";
import { Images } from "@constants/Images";
import MainButton from "@components/MainButton";
import { useEffect, useState } from "react";
import Modal from "@components/Modal";
import { useAuth } from "@hooks/useAuth";
import Constants from "expo-constants";

const BASE_URL = `${Constants.expoConfig.extra.SERVER_URL}/quiz`;

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [open, setOpen] = useState(false); // 정답/오답 모달
  const [submittedModalOpen, setSubmittedModalOpen] = useState(false); // 이미 제출 모달
  const [answer, setAnswer] = useState(null);
  const [result, setResult] = useState(null);

  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 퀴즈 가져오기
  useEffect(() => {
    fetch(`${BASE_URL}/today`)
      .then((res) => res.json())
      .then((data) => setQuestion(data))
      .catch((err) => console.error("Error fetching quiz:", err));
  }, []);

  // 답 제출 처리
  const handleSubmitAnswer = async (userAnswer) => {
    if (!question) return;

    try {
      const res = await fetch(`${BASE_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          quizId: question.quizId,
          answer: userAnswer === "O",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      const isCorrect =
        userAnswer === "O" ? question.isAnswerTrue : !question.isAnswerTrue;
      setAnswer(userAnswer);
      setResult(isCorrect);

      if (data.submitted) {
        setSubmittedModalOpen(true); // 이미 제출 모달
      } else {
        setOpen(true); // 정답/오답 모달
      }
    } catch (e) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  return (
    <View className="flex-1">
      {/* 정답/오답 모달 */}
      <Modal visible={open} onClose={() => setOpen(false)}>
        <View className="items-center">
          <Text className="text-black text-h2 font-sf-b text-center">
            {result ? "정답입니다!" : "오답입니다!"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-black text-h2 font-sf-b">
              {result ? "10" : "1"}
            </Text>
            <Images.Ice width={40} height={40} />
            <Text className="text-black text-h2 font-sf-b">을 받았어요.</Text>
          </View>
          <View className="items-center">
            {result ? <Images.Ipa2 /> : <Images.Ipa_sad />}
          </View>
        </View>
        <MainButton
          label="확인"
          onPress={() => {
            setOpen(false);
            router.push("/(tabs)/home");
          }}
        />
      </Modal>

      {/* 이미 제출 모달 */}
      <Modal
        visible={submittedModalOpen}
        onClose={() => setSubmittedModalOpen(false)}
      >
        <View className="items-center">
          <Text className="text-black text-h2 font-sf-b text-center">
            {result ? "정답입니다!" : "오답입니다!"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          ></View>
          <Text className="text-black text-caption font-sf-b py-xs">
            오늘 퀴즈로 더 받을 수 있는 얼음은 없어요
          </Text>
          <View className="items-center">
            {result ? (
              <Images.Ipa2 width={200} height={200} />
            ) : (
              <Images.Ipa_sad width={200} height={200} />
            )}
          </View>
        </View>
        <MainButton
          label="확인"
          onPress={() => {
            setSubmittedModalOpen(false);
            router.push("/(tabs)/home");
          }}
        />
      </Modal>

      {/* 배경 */}
      <Images.BgQuiz
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <HeaderBar title="오늘의 퀴즈" />

      <View className="px-pageX pt-2xl gap-2xl">
        {/* 날짜/설명 */}
        <View className="bg-white rounded-xl px-lg py-lg">
          <Text className="text-green font-sf-b text-body">
            {formattedDate}
          </Text>
          <Text className="font-sf-b text-body mt-sm">
            환경 퀴즈 첫 제출로만 얼음 적립! {"\n"}얼음은 없어도 지식은 쌓을 수
            있어요!
          </Text>
        </View>

        {/* 퀴즈 내용 */}
        <View className="bg-white rounded-xl p-xl">
          <Text className="font-sf-b text-h2">
            Q. {question ? question.question : "퀴즈를 불러오는 중입니다..."}
          </Text>

          <View className="flex-row justify-around mt-3xl">
            <TouchableOpacity
              className="bg-blue py-sm px-2xl rounded-lg opacity-90"
              onPress={() => handleSubmitAnswer("O")}
            >
              <Text className="text-white text-[60px] font-extrabold">O</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-400 py-sm px-2xl rounded-lg opacity-90"
              onPress={() => handleSubmitAnswer("X")}
            >
              <Text className="text-white text-[60px] font-extrabold">X</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="items-center justify-center py-md">
          <Images.IpaTori1 width={250} height={180} />
        </View>
      </View>
    </View>
  );
}
