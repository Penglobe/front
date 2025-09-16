import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import BgGradient from "@components/BgGradient";
import { useEffect, useRef, useState } from "react";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";
import { useAuth } from "@hooks/useAuth";
import { apiFetch } from "@services/authService";
import CustomAlert from "@components/CustomAlert";

export default function Survey() {
  const router = useRouter(); // 페이지 이동용
  const [questions, setQuestions] = useState([]); // 질문 데이터
  const [answer, setAnswer] = useState({}); // 사용자가 선택한 답변 저장
  const [firstUnanswered, setFirstUnanswered] = useState(null); // 제출 시 답 안 한 문항 id
  const { user } = useAuth(); // 로그인 사용자 정보
  const [loading, setLoading] = useState(true); // 질문 가져오는 중

  // 🔔 CustomAlert 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // 스크롤뷰 관련
  const scrollRef = useRef(null);
  const itemPositions = useRef({}); // 문항 id -> 화면 y좌표 저장

  /*질문 불러오기*/
  useEffect(() => {
    async function fetchQuestion() {
      try {
        const res = await apiFetch("/surveys/today");
        const result = await res.json();

        if (result.submitted) {
          // 이미 설문을 제출한 경우 → 바로 결과 페이지로 이동
          const response = await apiFetch(`/surveys/submit/${user.userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.userId, answer: [] }), // 빈 답변
          });
          const userData = await response.json();

          // 결과 데이터를 문자열로 변환 (URL 인코딩)
          const resultDataStr = encodeURIComponent(
            JSON.stringify(userData.data)
          );

          // 결과 페이지로 이동
          router.push({
            pathname: "/pages/survey/result",
            params: {
              userId: user.userId,
              resultData: resultDataStr,
            },
          });
          return;
        }

        // 제출 안 했으면 질문 데이터 설정
        const data = Array.isArray(result.questions) ? result.questions : [];
        setQuestions(data);
        setLoading(false);
      } catch (error) {
        console.error("질문 불러오기 실패:", error);
        setAlertTitle("오류");
        setAlertMessage("질문 불러오기 실패");
        setAlertVisible(true);
        setLoading(false);
      }
    }

    fetchQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //렌더링;
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <BgGradient />
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  /*제출하기*/
  const submitHandler = async () => {
    // 답변하지 않은 질문이 있는지 확인
    const firstUnanswered = questions.find(
      (q) => !answer[q.itemId] || answer[q.itemId].trim() === ""
    );

    if (firstUnanswered) {
      // 첫 번째 미응답 문항 저장 → 스크롤 이동
      setFirstUnanswered(firstUnanswered.itemId);

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
      // answer 객체 → DTO 배열 변환
      const answerArray = Object.entries(answer).map(
        ([itemId, selectValue]) => ({
          itemId: Number(itemId),
          selectValue,
        })
      );

      const payload = {
        userId: user.userId,
        answer: answerArray,
      };

      const response = await apiFetch(`/surveys/submit/${payload.userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("서버 에러:", text);
        setAlertTitle("오류");
        setAlertMessage("서버 요청 실패: " + response.status);
        setAlertVisible(true);
        return;
      }

      // 서버 응답 데이터
      const data = await response.json();
      // 결과 페이지로 이동
      const resultDataStr = encodeURIComponent(JSON.stringify(data.data));

      router.push({
        pathname: "/pages/survey/result",
        params: {
          userId: payload.userId,
          resultData: resultDataStr,
        },
      });
    } catch (error) {
      console.error("네트워크 에러:", error);
      setAlertTitle("오류");
      setAlertMessage("서버 요청 실패");
      setAlertVisible(true);
    }
  };

  return (
    <>
      <ScrollView className="flex-1 bg-gray-100" ref={scrollRef}>
        {/* 배경 */}
        <BgGradient />

        {/* 헤더 */}
        <HeaderBar title="빙하 리포트" />

        <View className="px-pageX">
          <View>
            {/* 타이틀 */}
            <View className="px-pageX bg-secondary rounded-xl px-pageX self-start flex-row items-center gap-lg">
              <Text className="text-black text-xl font-bold">
                <Text className="text-red-500 text-lg">
                  {"\n\n"}내 탄소와 자원 사용을 돌아보고, {"\n"}조금씩 더 좋은
                  습관을 만들어봐요.
                  {"\n"}
                </Text>
                <View>
                  <Text className="text-sm">
                    ※ 하루에 한 번만 가능합니다. {"\n"}
                  </Text>
                </View>
              </Text>
              <Images.survey_ipa width={80} height={130} />
            </View>

            {/* 질문 카드 */}
            {Array.isArray(questions) &&
              questions.map((q) => {
                const isUnanswered = firstUnanswered === q.itemId;

                return (
                  <View
                    key={q.itemId}
                    onLayout={(e) => {
                      itemPositions.current[q.itemId] = e.nativeEvent.layout.y;
                    }}
                    className={`p-llg rounded-lg shadow-md mb-lg bg-white px-pageX ${
                      isUnanswered ? "border-2 border-red-500" : ""
                    }`}
                  >
                    {/*질문 출력*/}
                    <Text className="text-black text-lg font-sf-b mb-md">
                      Q. {q.code}
                    </Text>

                    {/*보기 출력*/}
                    {Array.isArray(q.options) &&
                      q.options.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          className="flex-row items-center mb-md"
                          onPress={() => {
                            setAnswer((prev) => ({
                              ...prev,
                              [q.itemId]: opt.value,
                            }));
                            if (isUnanswered) {
                              setFirstUnanswered(null);
                            }
                          }}
                        >
                          {/*커스텀 라디오 버튼 + 항목*/}
                          <View className="h-5 w-5 border-2 border-black rounded-full mr-md items-center justify-center">
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
        </View>
      </ScrollView>

      {/* ✅ CustomAlert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
      />
    </>
  );
}
