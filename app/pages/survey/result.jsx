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
import { router, Stack } from "expo-router";
import { useCallback, useState, useRef } from "react";
import { useLocalSearchParams } from "expo-router/build/hooks";
import { Images } from "@constants/Images";
import Co2Chart from "@pages/survey/Co2Chart";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

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
      <Stack.Screen
        options={{ gestureEnabled: false, headerBackVisible: false }}
      />
      {/* 배경 */}
      <BgGradient />

      {/* 헤더 */}
      <HeaderBar title="빙하 리포트" />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="px-pageX gap-4">
          <View className="flex-row items-center mt-llg">
            <Images.ToriFace width={40} height={40} />
            <Text className="text-xl font-sf-md text-green-700 ml-sm">
              오늘의 리포트 결과를 확인해볼까요?
            </Text>
          </View>

          {data ? (
            <>
              <View className="bg-white rounded-2xl shadow-md px-xl py-llg">
                <Text className="text-h4">
                  오늘의 탄소{" "}
                  <Text className="text-red text-h3 font-bold">절감량</Text>
                </Text>
                <View className="items-end">
                  <Text className="text-h1 font-sf-b text-green mt-xs">
                    {data.totalCo2} kg CO₂
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-2xl px-xl py-llg">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-sf-md text-h4">
                    오늘의 탄소 절감 상위 TOP3
                  </Text>
                  {/* 안내 아이콘 */}
                  <TouchableOpacity onPress={() => setShowInfo(true)}>
                    <Images.Information width={28} height={28} />
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
              <View className="bg-white rounded-2xl px-xl py-llg">
                <Co2Chart />
              </View>

              {/* ✅ 피드백 카드 개선 */}
              <View className="bg-white rounded-2xl p-llg">
                <View className="flex-row items-center py-sm bg-green/20 rounded-md">
                  <Images.Leaf width={30} height={30} />
                  <Text className="font-sf-md text-h3">피드백</Text>
                </View>

                <View className="flex-row items-center py-lg">
                  <Text className="px-sm font-sf-b text-body text-green flex-1">
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
        <View className="flex-1 justify-center items-center bg-bgblack opacitiy-0.6">
          <View className="bg-white rounded-2xl p-llg w-4/5 max-w-md">
            <Text className="text-lg font-sf-b mb-sm">계산 기준</Text>
            <Text className="text-base text-gray-700 leading-5">
              【탄소 절감 기준】{"\n\n"}• 재활용 분리배출{"\n"}- 모두 잘함: 50g
              {"\n"}- 일부만 함: 20g{"\n"}- 못함: 0g{"\n\n"}• 일회용품 사용
              {"\n"}- 0회: 240g{"\n"}- 1~2회: 120g{"\n"}- 3회 이상: 0g{"\n\n"}•
              음식물 쓰레기{"\n"}- 남김 없음: 2g{"\n"}- 남김 있음: 0g{"\n\n"}•
              종이 타월 사용{"\n"}- 0장: 150g{"\n"}- 1~2장: 50g{"\n"}- 3장 이상:
              0g{"\n\n"}• 전자기기 전원 관리{"\n"}- 모두 끔: 50g{"\n"}- 일부만
              끔: 30g{"\n"}- 끄지 않음: 0g{"\n\n"}※ 계산 기준: 탄소중립
              실천포털, GS칼텍스 미디어허브 자료 참고
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
