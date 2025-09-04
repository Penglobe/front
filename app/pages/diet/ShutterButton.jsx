import { Pressable, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import React from "react";

export function ShutterButton({ onPress, disabled, loading }) {
  const pressScale = useSharedValue(1);
  const ringScale = useSharedValue(1);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  React.useEffect(() => {
    if (loading) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 450 }),
          withTiming(1.0, { duration: 450 })
        ),
        -1,
        false
      );
    } else {
      ringScale.value = withTiming(1, { duration: 200 });
    }
  }, [loading]);

  const onPressIn = async () => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pressScale.value = withTiming(0.96, { duration: 90 });
  };

  const onPressOut = () => {
    pressScale.value = withTiming(1, { duration: 120 });
  };

  return (
    <View className="items-center mb-16">
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Animated.View
          style={[wrapStyle, { overflow: "visible" }]}
          className={`w-[80px] h-[80px] bg-transparent items-center justify-center ${disabled ? "opacity-60" : ""}`}
        >
          {/* 바깥 흰색 링 */}
          <Animated.View
            style={ringStyle}
            className="w-[82px] h-[82px] rounded-full border-4 border-white bg-green/85 items-center justify-center"
          >
            {/* 안쪽 원 */}
            <View
              className={`w-[66px] h-[66px] rounded-full ${
                loading ? "bg-green-400" : "bg-white"
              }`}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
