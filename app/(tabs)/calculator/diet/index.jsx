// app/(tabs)/home/index.jsx
import { View, Text, Pressable } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import { Images } from "@constants/Images";
import { useRouter } from "expo-router";

export default function Diet() {
  const router = useRouter();

  return (
    <View className="flex-1">
      <HeaderBar title="식단 측정" />
      <View className="flex-1">
      <BgGradient />
      <View className="flex-1 px-pageX pt-[38px] gap-[20px]">
      <Text className="font-sf-b text-green text-[24px] leading-[34px]">식사 사진을 올리면, {"\n"}이번 한 끼로 얼마나 탄소를 {"\n"}아꼈는지 알려드려요</Text>
      <Pressable 
      onPress={() => router.push("/pages/diet/loading")}
      className="w-[100%] h-[180px] bg-green/40 rounded-[20px] items-center justify-center gap-2 active:bg-green/60">
      <Images.Camera width={36} height={36} />
      <Text className="font-sf-b text-green text-[16px]">사진 추가</Text>
      </Pressable>
      </View>
      <View className="items-center justify-center pb-40">
      <Images.IpaTori1 width={300} height={260}/>
      </View>
      </View>
    </View>
  );
}
