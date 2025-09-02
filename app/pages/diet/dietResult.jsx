// app/(tabs)/home/index.jsx
import { View, Text } from "react-native";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";
import { useRouter } from "expo-router";
import { Images } from "@constants/Images";

export default function DietResult() {
  const router = useRouter();

  return (
    <View className="flex-1">
    <HeaderBar title="식단 측정 결과" />
      <View className="flex-1">
      <BgGradient />
      <View className="flex-1 px-pageX pt-[18px] gap-[12px]">
        <View className="w-[100%] h-[auto] bg-white rounded-[12px] px-[18px] py-[12px] gap-[6px]">
        <Text className="font-sb-md text-black text-[12px]">식사 날짜</Text>
        <Text className="font-grotesk-md text-black text-[18px]">2025. 09. 02</Text>
        </View>

        <View className="w-[100%] h-[40%] bg-white rounded-[12px] items-center justify-center">
          <Text className="font-grotesk-md text-black text-[18px]">사진</Text>
        </View>

        <View className="w-[100%] h-[auto] bg-white rounded-[12px] px-[18px] py-[20px] gap-[8px] border-green border-2">
         <Text className="font-grotesk-b text-[28px] text-green">
            535
            <Text className="text-[18px] font-sf-md text-green"> kg
              {" "}
              (CO
              <Text className="text-[10px]">2</Text> 기준)
            </Text>
          </Text>
          <Text className="font-sf-md text-black text-[16px]">한 끼 식사로 20.3 kg CO2 를 절약했어요!</Text>
        </View>

        <View className="w-[100%] h-[auto] ml-1 items-center flex-row gap-2">
          <Images.IpaFace width={28} height={29}/>
          <Text className="font-sf-md text-[16px]">보통 한 끼 식사에서 약 12kg CO2가 배출돼요!</Text>
        </View>

        <MainButton className="mt-16" label="포인트 받기" onPress={() => router.push("/home")}/>

        </View>
        </View>
    </View>
  );
}
