import { TouchableOpacity, Text } from "react-native";

export default function SurveyResultButton({ label, onPress, className }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-green px-4 py-2 rounded-md opacity-80 shadow ${className || ""}`}
    >
      <Text className="text-white text-base font-bold text-center">
        {label}
      </Text>
    </TouchableOpacity>
  );
}
