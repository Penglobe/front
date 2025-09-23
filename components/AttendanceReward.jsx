import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Images } from "@constants/Images";

function Particle({ p, progress, offsetY = 0 }) {
  const derived = useDerivedValue(() => progress.value);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(p.angle) * p.distance * derived.value;
    const y = Math.sin(p.angle) * p.distance * derived.value + offsetY;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: 1 - derived.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: p.color,
          position: "absolute",
        },
        style,
      ]}
    />
  );
}

function RollingRandomNumber({ target, spins = 15, baseDelay = 40, onFinish }) {
  const [displayValue, setDisplayValue] = useState(0);
  const progress = useSharedValue(0);
  const prevValue = React.useRef(null); 

  useEffect(() => {
    if (!target) return;

    let currentSpin = 0;

    const spinStep = () => {
      currentSpin++;

      if (currentSpin >= spins) {
        const finalValue = Math.floor(target / 10) * 10;
        setDisplayValue(finalValue);
        onFinish?.(); 
        return;
      }

      const pool = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      let value;
      do {
        value = pool[Math.floor(Math.random() * pool.length)];
      } while (value === prevValue.current);

      prevValue.current = value; 

      progress.value = 0;
      progress.value = withTiming(1, { duration: 100 }, () => {
        runOnJS(setDisplayValue)(value);
      });

        const t = currentSpin / spins;
        const delay = baseDelay + Math.pow(t, 2) * 600;
      setTimeout(spinStep, delay);
    };

    spinStep();
  }, [target]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1.2, 1]) }],
    opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
  }));

  return (
    <Animated.Text
      style={[
        animatedStyle,
        { color: "#318643", fontWeight: "bold", fontSize: 48 },
      ]}
    >
      {displayValue.toLocaleString("ko-KR")}
    </Animated.Text>
  );
}


export default function AttendanceReward({
  previewPoints,
  loadingPreview = false,
  onReveal,
}) {
  const [revealed, setRevealed] = useState(false);
  const hasPreview = useMemo(
    () => Number.isFinite(Number(previewPoints)),
    [previewPoints]
  );

  const chestScale = useSharedValue(0.9);
  const chestOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const revealProgress = useSharedValue(0);

  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const angle = Math.random() * 2 * Math.PI;
        const distance = 120 + Math.random() * 100;
        const color = ["#ffcc00", "#ff6666", "#66ccff", "#66ff99"][i % 4];
        return { id: i, angle, distance, color };
      }),
    []
  );
  const [boom, setBoom] = useState(false);
  const particleProgress = useSharedValue(0);

  const handleBoom = () => {
    setBoom(true);
    particleProgress.value = 0;
    particleProgress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.exp),
    });
  };

  useEffect(() => {
    chestScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600 }),
        withTiming(0.95, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (revealed && hasPreview) {
      glowOpacity.value = withTiming(0, { duration: 140 });
      revealProgress.value = withSequence(
        withDelay(80, withTiming(0.6, { duration: 180 })),
        withSpring(1, { damping: 10, stiffness: 160 })
      );
    }
  }, [revealed, hasPreview]);

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestScale.value }],
    opacity: chestOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      revealProgress.value,
      [0, 1],
      [0.85, 1],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale }], opacity: revealProgress.value };
  });

  const handlePress = async () => {
    if (revealed) return;
    if (onReveal) await onReveal();
    setRevealed(true);
  };

  return (
    <View className="items-center">
      {!revealed && (
        <Pressable
          onPress={loadingPreview ? undefined : handlePress}
          android_ripple={{ color: "#ffffff20" }}
          hitSlop={12}
        >
          <Animated.View
            style={chestStyle}
            className="items-center justify-center mb-xs"
          >
            {loadingPreview ? (
              <View className="items-center">
                <ActivityIndicator color="#92400e" />
                <Text className="text-amber-900 font-sf-b mt-2">
                  보상 확인 중...
                </Text>
              </View>
            ) : (
              <Images.Box width={180} height={180} />
            )}
          </Animated.View>
        </Pressable>
      )}

      {revealed && (
        <>
          <Animated.View
            style={cardStyle}
            className="w-64 h-56 bg-white items-center justify-center px-xs mb-xs"
          >
            {hasPreview ? (
              <View className="flex-row items-center">
                <RollingRandomNumber
                  target={Number(previewPoints)}
                  onFinish={handleBoom} 
                />
                <Images.Ice width={150} height={150} />
              </View>
            ) : (
              <View className="items-center">
                <ActivityIndicator />
                <Text className="text-gray-600 mt-xxs">
                  보상 정보를 불러오는 중...
                </Text>
              </View>
            )}
          </Animated.View>

          {boom &&
            particles.map((p) => (
              <Particle
                key={p.id}
                p={p}
                progress={particleProgress}
                offsetY={0}
              />
            ))}
        </>
      )}
    </View>
  );
}
