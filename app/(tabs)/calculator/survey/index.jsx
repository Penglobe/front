import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import BgGradient from "@components/BgGradient";
import { useEffect, useState } from "react";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";

export default function Survey() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]); // 질문 데이터
  const [answer, setAnswer] = useState({}); // { itemId: 선택값 }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuestion() {
      try {
        const response = await fetch("http://192.168.0.51:8080/surveys/today");
        const data = await response.json();
        console.log("불러온 질문:", data);
        setQuestions(data);
      } catch (error) {
        console.error("질문 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestion();
  }, []);

  /*제출하기*/
  const submitHandler = async () => {
    try {
      console.log("보낼 answer 객체:", answer);

      // answer 객체 → DTO 배열 변환
      const answerArray = Object.entries(answer).map(
        ([itemId, selectValue]) => ({
          itemId: Number(itemId), // 키는 문자열이라 Number 변환
          selectValue,
        })
      );

      const payload = {
        userId: 1,
        answer: answerArray,
      };

      console.log("보낼 payload:", payload);

      const response = await fetch("http://192.168.0.51:8080/surveys/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("서버 에러:", text);
        alert("서버 요청 실패: " + response.status);
        return;
      }

      const data = await response.json();
      console.log("서버 응답:", data);
      console.log(data.data.top3);

      // 결과 페이지로 이동
      router.push({
        pathname: "/(tabs)/calculator/survey/result",
      });

      alert("제출 성공!");
    } catch (error) {
      console.error("네트워크 에러:", error);
      alert("서버 요청 실패");
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="flex-1">
        {/* 배경 */}
        <BgGradient />

        {/* 헤더 */}
        <HeaderBar title="설문조사" />

        {/* 타이틀 */}
        <View className="bg-secondary rounded-xl px-4 py-2 self-start mt-5 left-5 mb-2 flex-row items-center gap-1">
          <Images.IpaFace />
          <Text className="text-black text-lg font-bold">설문조사 설명</Text>
        </View>

        {/* 질문 카드 */}
        {questions.map((q) => (
          <View
            key={q.itemId}
            className="w-11/12 p-5 bg-white rounded-lg shadow-md justify-center self-center gap-4 mb-5"
          >
            {/* 질문 */}
            <Text className="text-black text-lg font-sf-b">{q.code}</Text>

            {/* 라디오 버튼 */}
            {q.options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                className="flex-row items-center mb-3"
                onPress={() =>
                  setAnswer((prev) => ({ ...prev, [q.itemId]: opt.value }))
                }
              >
                <View className="h-5 w-5 border-2 border-black rounded-full items-center justify-center mr-3">
                  {answer[q.itemId] === opt.value && (
                    <View className="h-3 w-3 bg-black rounded-full" />
                  )}
                </View>

                <Text className="text-black text-base font-sf-md">
                  {opt.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <MainButton label="제출하기" onPress={submitHandler} />
      </View>
    </ScrollView>
  );
}
