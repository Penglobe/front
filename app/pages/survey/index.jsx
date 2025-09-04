import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import BgGradient from "@components/BgGradient";
import { useEffect, useRef, useState } from "react";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";

export default function Survey() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]); // 질문 데이터
  const [answer, setAnswer] = useState({}); // { itemId: 선택값 }
  const [firstUnanswered, setFirstUnanswered] = useState(null); // 제출 시 답 안 한 문항 id

  // 스크롤뷰 관련
  const scrollRef = useRef(null);
  const itemPositions = useRef({}); // 문항 id -> 화면 y좌표 저장

  /*질문 불러오기*/
  useEffect(() => {
    async function fetchQuestion() {
      try {
        const response = await fetch("http://192.168.0.51:8080/surveys/today");
        const data = await response.json();

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
    /*제출 안 한 질문있으면 제출 막기*/
    const firstUnanswered = questions.find(
      (q) => !answer[q.itemId] || answer[q.itemId].trim() === ""
    );

    if (firstUnanswered) {
      setFirstUnanswered(firstUnanswered.itemId);

      // 스크롤 이동
      const y = itemPositions.current[firstUnanswered.itemId];
      const offset = 80;
      if (y !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({
          y: y - offset > 0 ? y - offset : 0,
          animated: true,
        });
      }
      return;
    }

    try {
      console.log("보낼 answer 객체:", answer);

      // answer 객체 → DTO 배열 변환
      const answerArray = Object.entries(answer).map(
        ([itemId, selectValue]) => ({
          itemId: Number(itemId),
          selectValue,
        })
      );

      const payload = {
        userId: 1,
        answer: answerArray,
      };

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
      console.log(data.top3);

      // 결과 페이지로 이동
      router.push({
        pathname: "/pages/survey/result",
      });
    } catch (error) {
      console.error("네트워크 에러:", error);
      alert("서버 요청 실패");
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100" ref={scrollRef}>
      <View className="flex-1">
        {/* 배경 */}
        <BgGradient />

        {/* 헤더 */}
        <HeaderBar title="설문조사" />

        {/* 타이틀 */}
        <View className="bg-secondary rounded-xl px-4 py-2 self-start mt-2 left-5 flex-row items-center gap-1">
          <Images.IpaFace width={60} height={60} />
          <Text className="text-black text-base font-bold">
            <Text className="text-red-500 text-xl mb-1">
              ※ 하루에 한 번만 제출 가능합니다. {"\n"}
            </Text>
            오늘 하루 실천 기록은
            <Text className="text-red-500"> 오후에 작성</Text>
            하는 것이 {"\n"}가장 정확합니다. {"\n"}
          </Text>
        </View>

        {/* 질문 카드 */}
        {questions.map((q) => {
          const isUnanswered = firstUnanswered === q.itemId;

          return (
            <View
              key={q.itemId}
              onLayout={(e) => {
                itemPositions.current[q.itemId] = e.nativeEvent.layout.y;
              }}
              className={`w-11/12 p-5 rounded-lg shadow-md mb-5 self-center bg-white ${
                isUnanswered ? "border-2 border-red-500" : ""
              }`}
            >
              {/*질문 출력*/}
              <Text className="text-black text-lg font-sf-b mb-3">
                Q. {q.code}
              </Text>

              {/*보기 출력*/}
              {q.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  className="flex-row items-center mb-3"
                  onPress={() => {
                    setAnswer((prev) => ({ ...prev, [q.itemId]: opt.value }));
                    if (isUnanswered) {
                      setFirstUnanswered(null);
                    }
                  }}
                >
                  {/*커스텀 라디오 버튼 + 항목*/}
                  <View className="h-5 w-5 border-2 border-black rounded-full mr-3 items-center justify-center">
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
          );
        })}

        <MainButton
          label="제출하기"
          onPress={submitHandler}
          className="mt-5 mb-10"
        />
      </View>
    </ScrollView>
  );
}
