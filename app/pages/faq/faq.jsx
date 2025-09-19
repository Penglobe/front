import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    question: "Q. 얼음은 어떻게 모으나요?",
    answer:
      "A. 얼음은 친환경 활동을 통해 모을 수 있고 출석 체크를 통해 랜덤한 얼음을 받을 수 있습니다. 펭걸음, 빙하 식탁, 빙하 리포트, 펭퀴즈 등 다양한 활동에 참여하고 얼음 거래소에서 사용 가능한 얼음을 적립해보세요.",
  },
  {
    question: "Q. 랭킹은 어떻게 산정되나요?",
    answer:
      "A. 랭킹은 주간, 전체, 지역별로 나뉩니다. 각 랭킹은 탄소 절감량을 기준으로 주간 랭킹은 매주, 그외 랭킹은 누적으로 산정됩니다.",
  },
  {
    question: "Q. 랭킹은 언제 갱신되나요?",
    answer:
      "A. 주간, 전체 랭킹은 실시간으로 갱신되며, 지역 랭킹은 매일 자정에 갱신됩니다.",
  },
  {
    question: "Q. 출석 체크는 어떻게 하나요?",
    answer:
      "A. 하루에 한 번 이상 친환경 활동(펭걸음, 빙하 식탁, 빙하 리포트)을 기록하면 자동으로 출석 처리되고 내 정보 캘린더에서 출석 현황을 확인할 수 있습니다.",
  },
  {
    question: "Q. 각 친환경 활동의 탄소 절감량의 기준은 뭔가요?",
    answer:
      "A. 펭걸음은 자동차가 1km 주행시 배출하는 CO₂ 양(약 0.2kg)을 기준으로 도보·자전거는 100%, 대중교통은 50%로 산정됩니다. \n\n 빙하 식탁은 식사 1끼당 약 1.5kg의 CO₂ 배출을 기준으로 식당, 배달로 식사시 유통과 조리에 추가적인 탄소 배출이 발생하므로 가중치를 더해 산정됩니다.\n\n 빙하 리포트는 각 질문들을 탄소중립 실천포털과 GS칼텍스 미디어허브의 자료를 기준으로 산정됩니다.",
  },
  {
    question: "Q. 배경화면은 어떻게 바꾸나요?",
    answer:
      "A. 배경화면은 절감하신 총 탄소량에 따라 자동으로 변경됩니다. 50kg, 150kg, 300kg을 달성할 때마다 새로운 배경화면으로 변경됩니다. 탄소 절감 목표를 달성하고 이파와 토리가 함께 하게 해주세요!",
  },
];

const FaqItem = ({ item, isOpen, onPress }) => {
  return (
    <View className="mb-sm bg-white rounded-lg">
      <TouchableOpacity
        onPress={onPress}
        className="flex-row justify-between items-center p-md"
      >
        <Text className="font-sf text-bodySm flex-1">{item.question}</Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color="gray"
        />
      </TouchableOpacity>
      {isOpen && (
        <View className="p-md bg-gray/50">
          <Text className="font-sf text-bodySm">{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <View className="flex-1">
      <BgGradient />
      <HeaderBar title="도움말" />
      <ScrollView className="flex-1 p-md px-pageX">
        {FAQ_DATA.map((item, index) => (
          <FaqItem
            key={index}
            item={item}
            isOpen={openIndex === index}
            onPress={() => handleToggle(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
