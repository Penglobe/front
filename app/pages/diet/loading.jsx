// app/(tabs)/home/index.jsx
import { View, Text, ActivityIndicator, Button } from "react-native";
import MainButton from "@components/MainButton";
import Modal from "@components/Modal";
import { useRouter } from "expo-router";
import { Images } from "@constants/Images";
import { useState } from "react";

export default function Loading() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center gap-8">
      <Modal visible={open} onClose={() => setOpen(false)}>
        <Text className="text-black text-[18px] font-sf-md mb-4">모달 제목</Text>
        <Images.Ipa2 />
        <MainButton label="포인트 받기" />
      </Modal>

      <Images.Ipa2 />
      <ActivityIndicator size="large" color="#318643" />
      <Text className="font-sb-md text-black text-[18px] text-center leading-[32px]">
        아낀 탄소 배출량 계산 중입니다. {"\n"}잠시만 기다려주세요.
      </Text>
      <MainButton label="다음" onPress={() => setOpen(true)} />
    </View>
  );
}
