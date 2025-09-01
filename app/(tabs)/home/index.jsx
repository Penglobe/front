// app/(tabs)/home/index.jsx
import { View, StyleSheet, Button, Pressable } from "react-native";
import { Images } from "@constants/Images";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,                                        
} from "react-native-reanimated";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  // Y축 이동값 (0 기준)
    const translateY = useSharedValue(0);
  
    useEffect(() => {
      // -10 내려갔다가 10으로
      translateY.value = withRepeat(
        withSequence(
          withTiming(-10, {
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(10, {
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
          })
        ),
        -1, // -1 = 무한 반복
        true // reverse 효과
      );
    }, []);
  
 const animatedStyle = useAnimatedStyle(() => {
    // 떠오를 때 그림자/높이 살짝 증폭
    const elev = interpolate(translateY.value, [-8, 0], [6, 4]);
    const radius = interpolate(translateY.value, [-8, 0], [8, 4]);
    return {
      transform: [{ translateY: translateY.value }],
      shadowRadius: radius,   // iOS
      elevation: elev,        // Android
    };
  });

  return (
      <View className="flex-1">
        {/* 배경 */}
        <Images.BgHome1
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
            <Images.Snow width={30} height={30} />
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
            <Images.Ice width={30} height={30} />
            <Text className="text-white font-sf-md text-[16px]">200</Text>
          </View>
        </View>

        {/* 탄소 절감량 */}
        <View className="mt-[22px] px-pageX">
          <Pressable 
      onPress={() => router.push('pages/home/mission')}
      className="px-[24px] py-[24px] bg-white/100 rounded-[10px] gap-[8px] items-start shadow-md"
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, 
        shadowRadius: 4,   //Blur : 4
        elevation: 4,  //Spread=2 정도
      }}
    >
          <Text className="text-black font-sf-md text-[18px]">총 탄소 절감량</Text>
          <Text className="font-grotesk-b text-[24px] text-green">535
            <Text className="text-black"> kg</Text>
            <Text className="text-[14px] font-sf-md text-black"> (kgCo2eq 기준)</Text>
          </Text>
          </Pressable>
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
  <Animated.View className="mt-auto items-center mb-[180px]" style={animatedStyle}>
    <Pressable 
      onPress={() => router.push('pages/home/quiz')}
      className="flex-row items-center justify-center rounded-[32px] px-6 py-3.5 gap-2 bg-yellow active:bg-amber-300"
      style={{
        shadowColor: "#F9C332",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, 
        shadowRadius: 4,   //Blur : 4
        elevation: 4,  //Spread=2 정도
      }}
    >
      <Images.Quiz width={24} height={24} />
      <Text className="text-white font-sf-b text-[16px]">오늘의 퀴즈</Text>
      </Pressable>
    </Animated.View>
  </View>
  );
}
