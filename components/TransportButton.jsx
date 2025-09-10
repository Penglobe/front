import { Pressable, Text, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ✅ iOS shadow 스타일 강제 (Android도 동일 적용)
const shadowStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 0, // Android에서 기본 elevation 제거
};

export default function TransportButton({
  label,
  icon,
  selected = false,
  onPress,
  disabled = false,
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`w-full flex-row items-center px-4 py-6 rounded-2xl mb-3 border
        ${!selected ? "bg-white" : ""}
        ${disabled ? "opacity-70" : ""}
      `}
      style={{
        backgroundColor: selected ? "rgba(49,134,67,0.2)" : "white",
        borderColor: "#8EA96D",
        ...shadowStyle, // ✅ 플랫폼 구분 없이 동일 shadow
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={"#111827"} // ✅ 아이콘은 항상 진회색
        style={{ marginRight: 12 }}
      />
      <Text className="text-[18px] text-black font-sf-md">{label}</Text>
    </Pressable>
  );
}
