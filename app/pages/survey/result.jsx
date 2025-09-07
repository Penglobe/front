import { View, Text, TouchableOpacity, Modal } from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { router, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useSearchParams } from "expo-router/build/hooks";
import { Images } from "@constants/Images";

export default function SurveyResult() {
  const { userId, resultData } = useLocalSearchParams();
  const [showInfo, setShowInfo] = useState(false);
  //console.log("결과페이지 도착");
  //console.log("userId", userId);

  let data = null;
  try {
    data = resultData ? JSON.parse(decodeURIComponent(resultData)) : null;
  } catch (e) {
    console.error("resultData 파싱 실패:", e);
  }
  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />

      {/* 헤더 */}
      <HeaderBar title="설문조사" />

      <View className="px-pageX flex-row items-center mb-2 mt-5">
        <Images.ToriFace width={40} height={40} />
        <Text className="text-2xl font-sf-b text-green-700 ml-2">
          오늘의 설문 결과를 확인해볼까요?
        </Text>
      </View>

      {/* 안내 문구 */}
      <Text className="px-pageX text-sm mb-3">
        {"  "}※ 여러 번 설문에 참여해도 표시되는 결과는 최초 제출 기준입니다.
      </Text>

      <View className="px-pageX">
        {data ? (
          <>
            <View className="bg-white rounded-2xl shadow-md px-6 py-5 mb-5">
              <Text className="font-sf-md text-lg">오늘의 탄소 절감량</Text>
              <View className="items-end">
                <Text className="text-3xl font-sf-b text-[#318643] mt-1">
                  {data.totalCo2} kg CO₂
                </Text>
              </View>
              <Text className="text-sm mt-3 text-gray-600">
                ※ 사용자가 실제로 줄인 이산화탄소 양을 의미하며, {"\n"}배출량이
                아닌 절감된 양입니다.
              </Text>
            </View>

            <View className="bg-white rounded-2xl px-6 py-5 mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-sf-md text-lg">
                  오늘의 탄소 절감 상위 TOP3
                </Text>
                {/* 안내 아이콘 */}
                <TouchableOpacity onPress={() => setShowInfo(true)}>
                  <Text className="text-gray-400 text-2xl">ⓘ</Text>
                </TouchableOpacity>
              </View>
              {data.top3.map((item, index) => (
                <View key={index}>
                  <Text className="font-sf-b text-lg text-[#318643] mt-1">
                    {index + 1}. {item.code}
                  </Text>
                </View>
              ))}
            </View>

            <View className="bg-white rounded-2xl px-6 py-5 mb-5">
              <Text>피드백</Text>
            </View>

            <View className="bg-white rounded-2xl px-6 py-5 mb-10">
              <Text>차트</Text>
            </View>
          </>
        ) : (
          <Text>결과를 불러오는 중...</Text>
        )}

        <MainButton
          label="홈으로"
          className="mt-5"
          onPress={() => router.push("/(tabs)/home")}
        />
      </View>

      {/* ✅ 모달 (팝업) */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-5 w-4/5 max-w-md">
            <Text className="text-base font-sf-b mb-2">계산 기준</Text>
            <Text className="text-sm text-gray-700 leading-1">
              • 재활용 분리배출:{"\n"}
              모두 잘함 50g / 일부 20g / 못함 0g{"\n"}• 일회용품 사용:{"\n"}
              0회 240g / 1~2회 120g / 3회 이상 0g{"\n"}• 음식물 쓰레기:{"\n"}
              남김 없음 2g / 남김 있음 0g{"\n"}•종이 타월 사용:{"\n"}
              0장 150g / 1~2장 50g / 3장 이상 0g{"\n"}•전자기기 전원 관리:
              {"\n"}
              모두 끔 50g / 일부만 30g / 끄지 않음 0g {"\n\n"}※ 계산 기준:
              탄소중립 실천포털, GS칼텍스 미디어허브 자료를 참고하였습니다.
            </Text>
            <TouchableOpacity
              className="mt-4 self-end"
              onPress={() => setShowInfo(false)}
            >
              <Text className="text-[#318643] font-sf-md">닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
