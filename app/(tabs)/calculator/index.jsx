// app/(tabs)/home/index.jsx
import { router, useRouter } from "expo-router";
import { View, Text, Pressable } from "react-native";

export default function Calculator() {
   const router = useRouter();
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
      <Text>Calculator</Text>
        <View className="mt-auto items-center mb-[180px]">
          <Pressable 
            onPress={() => router.push('/(tabs)/calculator/transport')}
            className="flex-row items-center justify-center rounded-[32px] bg-yellow px-6 py-3.5 gap-2"
            style={{
              shadowColor: "#F9C332",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,  //100%
              shadowRadius: 4,   //Blur : 4
              elevation: 4,  //Spread=2 정도
            }}
          >
            <Text className="text-white font-sf-b text-[16px]">오늘의 퀴즈</Text>
            </Pressable>
          </View>
    </View>
  );
}
