// app/(tabs)/home/index.jsx
import React from "react";
import HeaderBar from "@components/HeaderBar";
import BgGradient from "@components/BgGradient";
import MainButton from "@components/MainButton";   
import { Images } from "@constants/Images";
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ResultStore } from "@utils/storage";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function extractFoods(result) {
  const candidates = result?.foods || result?.items || result?.candidates || result?.results || [];
  return Array.isArray(candidates)
    ? candidates.map((it, idx) => ({
        id: it.id ?? idx,
        name: it.name ?? it.title ?? it.displayName ?? "이름 없음",
        amount: it.amount ?? it.weight ?? it.gram ?? it.size ?? null,
        probability: it.probability ?? it.score ?? null,
      }))
    : [];
}

export default function DietResult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const result = ResultStore.data;
  const photoUri = ResultStore.photoUri;
  
    const foods = extractFoods(result);
  const [showRaw, setShowRaw] = React.useState(false);

  return (
    <View className="flex-1">
    <HeaderBar title="식단 측정 결과" />
      <View className="flex-1">
      <BgGradient />
       <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          
        >
          <View className="flex-1 px-pageX gap-4">
          <View className="pt-[18px]">
        <Text className="font-sb-md text-black text-[12px]">식사 날짜</Text>
        <Text className="font-grotesk-md text-black text-[18px]">2025. 09. 02</Text>
        </View>

        {photoUri && (
        <View style={{ height: 320, borderRadius: 12, overflow: "hidden" }}>
          <ExpoImage source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        </View>
      )}

     <View className="w-full bg-white rounded-[12px] px-[16px] py-[14px]">
              <Text className="font-sf-b text-[16px] mb-2">인식 결과</Text>

              {foods.length > 0 ? (
                foods.map((f) => (
                  <View
                    key={f.id}
                    className="bg-white rounded-[10px] px-[12px] py-[10px] mb-[8px] border border-[#eee]"
                    style={{
                      shadowColor: "#000",
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <Text className="font-sf-b">{f.name}</Text>
                    {f.amount != null && <Text>양: {f.amount}</Text>}
                    {f.probability != null && (
                      <Text>신뢰도: {Math.round(f.probability * 100)}%</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text>후보가 없습니다.</Text>
              )}

              {/* 원본 JSON 토글 */}
              <Pressable
                onPress={() => setShowRaw((v) => !v)}
                className="mt-3 self-start px-3 py-2 rounded-[8px] bg-zinc-100 active:bg-zinc-200"
              >
                <Text className="font-sf-md">{showRaw ? "원본 JSON 숨기기" : "원본 JSON 보기"}</Text>
              </Pressable>
              {showRaw && (
                <View className="mt-2">
                  <Text
                    style={{
                      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
                      fontSize: 12,
                      lineHeight: 16,
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </Text>
                </View>
              )}
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
        </ScrollView>
        </View>
    </View>
  );
}
