import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // ✅ 아이콘 (expo vector icons)

export default function TransportButton({
  label,
  icon,
  selected = false,
  onPress,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className={`w-full flex-row items-center px-4 py-6 rounded-2xl mb-3 border
        ${!selected ? "bg-white" : ""}
        ${disabled ? "opacity-70" : ""}
      `}
      style={{
        backgroundColor: selected ? "rgba(49,134,67,0.2)" : "white", // ✅ #318643 with 20% opacity
        borderColor: "#8EA96D", // ✅ 항상 검은색 테두리
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={"#111827"} // ✅ 아이콘은 항상 진회색
        style={{ marginRight: 12 }}
      />
      <Text className="font-sf-md text-[18px] text-black">{label}</Text>
    </TouchableOpacity>
  );
}
