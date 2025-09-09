// @components/AttendanceReward.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  withRepeat,
} from "react-native-reanimated";
import { Images } from "@constants/Images";

/** 개별 파티클 */
function Particle({ p, progress, offsetY = 0 }) {
  const style = useAnimatedStyle(() => {
    const x = Math.cos(p.angle) * p.distance * progress.value;
    const y = Math.sin(p.angle) * p.distance * progress.value + offsetY;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: 1 - progress.value,
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

/** 상자 터치 → 보상 포인트 "공개만" (지급은 부모 버튼에서) */
export default function AttendanceReward({
  previewPoints, // number | null (미리보기 포인트)
  loadingPreview = false, // 미리보기 로딩 중
  onReveal, // 상자 터치 시 호출 (부모가 /attendance/preview 요청)
}) {
  const [revealed, setRevealed] = useState(false);
  const hasPreview = useMemo(
    () => Number.isFinite(Number(previewPoints)),
    [previewPoints]
  );

  // 애니메이션 값들
  const chestScale = useSharedValue(0.9);
  const chestOpacity = useSharedValue(1); // ✅ 처음부터 보이게
  const glowOpacity = useSharedValue(0);
  const revealProgress = useSharedValue(0); // 0~1

  // 폭죽 터지는 효과용
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const angle = Math.random() * 2 * Math.PI; // 0~360도
        const distance = 120 + Math.random() * 80; // 튀는 거리
        const color = ["#ffcc00", "#ff6666", "#66ccff", "#66ff99"][i % 4];
        return { id: i, angle, distance, color };
      }),
    []
  );
  const [boom, setBoom] = useState(false);
  const particleProgress = useSharedValue(0);

  useEffect(() => {
    if (boom) {
      particleProgress.value = 0;
      particleProgress.value = withTiming(1, { duration: 800 });
    }
  }, [boom]);

  // Idle 상태: 상자 두근두근
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

  // 공개 시 카드 등장 + 폭죽
  useEffect(() => {
    if (revealed && hasPreview) {
      glowOpacity.value = withTiming(0, { duration: 140 });
      revealProgress.value = withSequence(
        withDelay(60, withTiming(0.6, { duration: 160 })),
        withSpring(1, { damping: 10, stiffness: 160 })
      );

      // 🎆 폭죽 시작
      setBoom(true);
      particleProgress.value = 0;
      particleProgress.value = withTiming(1, { duration: 800 });
    }
  }, [revealed, hasPreview]);

  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestScale.value }],
    opacity: chestOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * (revealed ? 0 : 1),
    transform: [{ scale: 1.03 }],
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
      {/* 공개 전: 상자 */}
      {!revealed && (
        <Pressable
          onPress={loadingPreview ? undefined : handlePress}
          android_ripple={{ color: "#ffffff20" }}
          hitSlop={12}
        >
          <Animated.View
            style={chestStyle}
            className="items-center justify-center"
          >
            {loadingPreview ? (
              <View className="items-center">
                <ActivityIndicator color="#92400e" />
                <Text className="text-amber-900 font-sf-b mt-2">
                  보상 확인 중...
                </Text>
              </View>
            ) : (
              <Text className="text-[200px]">🎁</Text>
            )}
          </Animated.View>
        </Pressable>
      )}

      {/* 공개 후: 포인트 카드 */}
      {revealed && (
        <>
          <Animated.View
            style={cardStyle}
            className="w-64 h-56 bg-white items-center justify-center px-5 py-6 mb-4 mt-4"
          >
            {hasPreview ? (
              <>
                <View className="flex-row items-center">
                  <Text className="text-emerald-600 font-sf-b text-[90px]">
                    {Number(previewPoints).toLocaleString("ko-KR")}
                  </Text>
                  <Images.Ice width={150} height={150} />
                </View>
              </>
            ) : (
              <View className="items-center">
                <ActivityIndicator />
                <Text className="text-gray-600 mt-2">
                  보상 정보를 불러오는 중...
                </Text>
              </View>
            )}
          </Animated.View>

          {/* 🎆 폭죽 파티클 */}
          {boom &&
            particles.map((p) => (
              <Particle
                key={p.id}
                p={p}
                progress={particleProgress}
                offsetY={100}
              />
            ))}
        </>
      )}
    </View>
  );
}
