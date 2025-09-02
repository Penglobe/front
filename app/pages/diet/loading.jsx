// app/(tabs)/home/index.jsx
import { View, Text, ActivityIndicator } from "react-native";
import MainButton from "@components/MainButton";
import { useRouter } from "expo-router";
import { Images } from "@constants/Images";

export default function Loading() {
  const router = useRouter();
  return (
    <View className="flex-1 justify-center items-center gap-8">
      <Images.Ipa2 />
      <ActivityIndicator size="large" color="#318643" />
      <Text className="font-sb-md text-black text-[18px] text-center leading-[32px]">
        아낀 탄소 배출량 계산 중입니다. {"\n"}잠시만 기다려주세요.
      </Text>
      <MainButton label="다음" onPress={() => router.push("/pages/diet/dietResult")} />
    </View>
  );
}
