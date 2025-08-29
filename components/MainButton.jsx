import { useRouter } from "expo-router";
import { Text, View, StyleSheet, Pressable } from "react-native";

export default function MainButton({
  // 기본값 설정
  label = "뒤로가기",
  children,
  onPress,
  className = "",
  style,
  disabled = false,
}) {
  const router = useRouter();
  const handlePress = onPress ?? (() => router.back());

  return (
  <View className="w-full items-center">
    <Pressable 
      disabled={disabled}
      onPress={handlePress}
      className={`w-full py-[20px] items-center justify-center rounded-[18px] bg-green active:bg-emerald-700 ${disabled ? "opacity-60" : ""} ${className}`}
      style={[
        {
        shadowColor: "#318643",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, 
        shadowRadius: 2,   //Blur : 4
        elevation: 4,  //Spread=2 정도
      },
    style,
    ]}
    >
      {children ?? (
        <Text className="text-white font-sf-md text-[16px]">{label}</Text>
      )}
      </Pressable>
    </View>
          
        );
      }