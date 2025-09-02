// components/HeaderBar.jsx
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Images } from "@constants/Images";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HeaderBar({ title = "제목", showBack = true, rightComponent = null }) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="bg-white" style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 2, 
        elevation: 4, 
      }}
    
    >
      <View className="w-full flex-row items-center justify-between px-4 h-[58px]">
        {showBack ? (
          <Pressable onPress={() => router.back()} className="p-2">
            <Images.Back width={24} height={24} />
          </Pressable>
        ) : (
          <View className="w-[40px]" />
        )}

        <Text className="text-black font-sf-b text-[18px]">{title}</Text>

        <View className="w-[40px] items-end">{rightComponent}</View>
      </View>
    </SafeAreaView>
  );
}
