import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  BackHandler,
} from "react-native";
import BgGradient from "@components/BgGradient";
import HeaderBar from "@components/HeaderBar";
import MainButton from "@components/MainButton";
import { router } from "expo-router";
import { useCallback, useState, useRef } from "react";
import { useLocalSearchParams } from "expo-router/build/hooks";
import { Images } from "@constants/Images";
import Co2Chart from "@pages/survey/Co2Chart";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5"; // ✅ 벡터 아이콘 추가

export default function SurveyResult() {
  const { userId, resultData } = useLocalSearchParams();
  const [showInfo, setShowInfo] = useState(false);
  const navigation = useNavigation();
  const navigatingRef = useRef(false);

  let data = null;
  try {
    data = resultData ? JSON.parse(decodeURIComponent(resultData)) : null;
  } catch (e) {
    console.error("resultData 파싱 실패:", e);
  }

  // ✅ iOS 제스처 & 헤더 기본 back(pop) 가로채서 홈으로 replace
  useFocusEffect(
    useCallback(() => {
      const sub = navigation.addListener("beforeRemove", (e) => {
        if (navigatingRef.current) return;
        e.preventDefault();
        navigatingRef.current = true;
        router.replace("/home");
      });
      return sub; // cleanup
    }, [navigation, router])
  );

  // ✅ 안드로이드 하드웨어 뒤로가기 → 홈으로 replace
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (navigatingRef.current) return true; // 이미 처리 중
        navigatingRef.current = true;
        router.replace("/home");
        return true; // 이벤트 소비
      });
      return () => sub.remove();
    }, [router])
  );

  return (
    <View className="flex-1">
      {/* 배경 */}
      <BgGradient />

      {/* 헤더 */}
      <HeaderBar title="빙하 리포트" />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="px-pageX flex-row items-center mb-llg mt-llg">
          <Images.ToriFace width={40} height={40} />
          <Text className="text-xl font-sf-md text-green-700 ml-sm">
            오늘의 설문 결과를 확인해볼까요?
          </Text>
        </View>

        <View className="px-pageX">
          {data ? (
            <>
              <View className="bg-white rounded-2xl shadow-md px-xl py-llg mb-llg">
                <Text className="text-h4">
                  오늘의 탄소{" "}
                  <Text className="text-red text-h3 font-bold">절감량</Text>
                </Text>
                <View className="items-end">
                  <Text className="text-h1 font-sf-b text-[#318643] mt-xs">
                    {data.totalCo2} kg CO₂
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-2xl px-xl py-llg mb-llg">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-sf-md text-h4">
                    오늘의 탄소 절감 상위 TOP3
                  </Text>
                  {/* 안내 아이콘 */}
                  <TouchableOpacity onPress={() => setShowInfo(true)}>
                    <Text className="text-gray-400 text-2xl">ⓘ</Text>
                  </TouchableOpacity>
                </View>
                {data.top3.map((item, index) => (
                  <View key={index}>
                    <Text className="font-sf-b text-lg text-[#318643] mt-xs">
                      {index + 1}. {item.code}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="bg-white rounded-2xl px-xl py-llg mb-md">
                <Co2Chart />
              </View>

              {/* ✅ 피드백 카드 개선 */}
              <View className="bg-white rounded-2xl px-xl py-llg mb-llg">
                <Text className="font-sf-md text-h3 pb-sm">
                  피드백 <Icon name="leaf" size={15} color="#318643" />
                </Text>

                <View className="flex-row items-center py-lg border-t border-gray-200">
                  <Text className="ml-sm font-sf-b text-body text-[#318643] flex-1">
                    {data.feedback}
                  </Text>
                </View>

                <Text className="font-sf-md text-sm text-gray-600">
                  ※ AI 기반 환경 피드백입니다.
                </Text>
              </View>
            </>
          ) : (
            <Text>결과를 불러오는 중...</Text>
          )}

          <MainButton
            label="홈으로"
            className="mt-5 mb-10"
            onPress={() => router.push("/(tabs)/home")}
          />
        </View>
      </ScrollView>

      {/* ✅ 모달 (팝업) */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-llg w-4/5 max-w-md">
            <Text className="text-lg font-sf-b mb-sm">계산 기준</Text>
            <Text className="text-base text-gray-700 leading-1">
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
