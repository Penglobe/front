// app/(tabs)/home/index.jsx
import { View, StyleSheet, Button } from "react-native";
import BgHome1 from "../../../assets/images/bg/bg-home-1.svg";
import Ipa from "../../../assets/images/character/ipa.svg";
import Tori from "../../../assets/images/character/tori.svg";
import Snow from "../../../assets/icons/snow.svg";
import Ice from "../../../assets/icons/ice.svg";
import { Text } from "react-native";

export default function Home() {
  return (
      <View className="flex-1">
        {/* 배경 */}
        <BgHome1
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* 출석, 얼음 */}
        <View className="mt-[60px] justify-between flex-row ml-5 mr-5 ">
          <View className="w-[100px] h-[40px] flex-row bg-[#065A93]/100 rounded-[32px] items-center justify-center">
          <Snow width={24} height={24} />
          <Text className="text-white font-medium text-[16px] mt-1">20일</Text>
          </View>
          <View className="w-[100px] h-[40px] bg-[#318643]/100 rounded-[32px] flex-row items-center justify-center">
          <Ice width={24} height={24} />
          <Text className="text-white font-medium text-[16px] mt-1">20</Text>
          </View>
        </View>

        {/* 탄소 절감량 */}
        <View className="mt-[22px] ml-5 mr-5">
          <View className="h-[110px] bg-white/70 rounded-[10px] gap-4 items-left justify-center">
          <Text className="ml-8 text-black font-semibold text-[18px] mt-1">총 탄소 절감량</Text>
          <Text className="ml-8 text-bold font-bold text-[18px] mt-1">2.3 kg(kgCo2eq 기준)</Text>
          </View>
        </View>

        {/* 토리 */}
        <View className="mt-[90px] ml-20 items-center ml-5">
          <Tori />
        </View>

        {/* 이파 */}
        <View className="mt-[-60px] items-left ml-5">
          <Ipa />
        </View>

        {/* 퀴즈 */}
        <View className="mt-[70px] items-center justify-center">
          <View className="w-[160px] h-[50px] bg-[#F9C332]/100 rounded-[32px] items-center justify-center">
          <Text className="text-white font-medium text-[16px] mt-1">오늘의 퀴즈</Text>
          </View>
        </View>
      </View>
  );
}
