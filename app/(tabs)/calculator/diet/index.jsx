// app/(tabs)/home/index.jsx
import { View, Text, Pressable } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";

export default function Diet() {
  return (
    <View className="flex-1">
      <HeaderBar title="식단 측정" />
      <View className="flex-1">
      <BgGradient />
      <View className="flex-1 px-pageX pt-[38px] gap-[20px]">
      <Text className="font-sf-sb text-black text-[26px] leading-[34px]">식사 사진을 올리면, {"\n"}이번 한 끼로 얼마나 탄소를 {"\n"}아꼈는지 알려드려요</Text>
      <Pressable className="w-[100%] h-[180px] bg-green/40 rounded-[20px] items-center justify-center flex-row">

      </Pressable>
      </View>
      </View>
    </View>
  );
}
