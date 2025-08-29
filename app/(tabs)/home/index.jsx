// app/(tabs)/home/index.jsx
import { View, StyleSheet, Button, Pressable } from "react-native";
import BgHome1 from "../../../assets/images/bg/bg-home-1.svg";
import Ipa from "../../../assets/images/character/ipa.svg";
import Tori from "../../../assets/images/character/tori.svg";
import Snow from "../../../assets/icons/snow.svg";
import Ice from "../../../assets/icons/ice.svg";
import Quiz from "../../../assets/icons/quiz.svg";
import { Text } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();
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

        <View className="mt-[66px] px-pageX flex-row justify-between">
          {/* 출석 */}
          <View className="flex-row items-center justify-between bg-blue rounded-[32px] px-4 py-2 w-[100px] h-[40px] shadow-md"
            style={{
              shadowColor: "#065A93",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,  //100%
              shadowRadius: 2,   //Blur : 2
              elevation: 4,  //Spread=2 정도
            }}
          >
            <Snow width={30} height={30} />
            <Text className="text-white font-sf-md text-[16px]">20일</Text>
          </View>

          {/* 얼음 */}
          <View className="flex-row items-center justify-between bg-green rounded-[32px] px-4 py-2 w-[100px] h-[40px] shadow-md"
            style={{
              shadowColor: "#318643",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,  //100%
              shadowRadius: 2,   //Blur : 2
              elevation: 4,  //Spread=2 정도
            }}
          >
            <Ice width={30} height={30} />
            <Text className="text-white font-sf-md text-[16px]">200</Text>
          </View>
        </View>

        {/* 탄소 절감량 */}
        <View className="mt-[22px] px-pageX">
          <View className="px-[24px] py-[24px] bg-white/100 rounded-[10px] gap-[8px] items-start shadow-md"
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,  //25%
              shadowRadius: 4,   //Blur : 4
              elevation: 4,  //Spread=2 정도
            }}  
          >
          <Text className="text-black font-sf-md text-[18px]">총 탄소 절감량</Text>
          <Text className="font-grotesk-b text-[24px] text-green">535
            <Text className="text-black"> kg</Text>
            <Text className="text-[14px] font-sf-md text-black"> (kgCo2eq 기준)</Text>
          </Text>
          </View>
        </View>

        {/* 토리 */}
        {/* <View className="mt-[46px] ml-20 items-center ml-5">
          <Tori />
        </View> */}

        {/* 이파 */}
        {/* <View className="mt-[-60px] items-left ml-5">
          <Ipa />
        </View> */}
        

        {/* 퀴즈 */}
  <View className="mt-auto items-center mb-[180px]">
    <Pressable 
      onPress={() => router.push('/(tabs)/home/quiz')}
      className="flex-row items-center justify-center rounded-[32px] bg-yellow px-6 py-3.5 gap-2"
      style={{
        shadowColor: "#F9C332",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,  //100%
        shadowRadius: 4,   //Blur : 4
        elevation: 4,  //Spread=2 정도
      }}
    >
      <Quiz width={24} height={24} />
      <Text className="text-white font-sf-b text-[16px]">오늘의 퀴즈</Text>
      </Pressable>
    </View>
  </View>
  );
}
