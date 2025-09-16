// components/LoadingScreen.jsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Animated } from "react-native";
import { Images } from "@constants/Images";

export default function LoadingScreen({ message = "로딩 중..." }) {
  const [showFirst, setShowFirst] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0)); // 시작은 투명

  useEffect(() => {
    // 1초마다 이미지 토글
    const interval = setInterval(() => {
      setShowFirst((prev) => !prev);
    }, 1000);

    // 0.5초 뒤에 서서히 나타남
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300, // 0.3초 동안 서서히 보이게
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className="flex-1 items-center justify-center bg-gray-100"
    >
      <ActivityIndicator size="large" color="#318643" />

      {showFirst ? (
        <Images.IpaWalk width={150} height={150} />
      ) : (
        <Images.ToriWalk width={150} height={150} />
      )}

      <Text className="mt-3 text-gray-700 font-sf-md">{message}</Text>
    </Animated.View>
  );
}
