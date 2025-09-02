// components/TabBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { Images } from "@constants/Images";
import BgBlack from "@components/BgBlack";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import colors from "@constants/Colors.cjs";
const { Gradients } = colors;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_HEIGHT = 90;
const isRoute = (n, b) => n === b || n === `${b}/index`;

export default function TabBar({ state, descriptors, navigation }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const OFFSET = 30;
  const SIZE = 30;
  const center = state.routes.find((r) => isRoute(r.name, "calculator"));
  const currentRoute = state.routes[state.index]?.name;  //현재 탭 
  const isCalculatorFocused = currentRoute?.startsWith("calculator"); // calculator 및 하위 경로 전부 true

  const Icon = (name, focused) => {
    if (open) {  
      if (isRoute(name, "home"))    return <Images.Home width={SIZE} height={SIZE} />;
      if (isRoute(name, "ranking")) return <Images.Ranking width={SIZE} height={SIZE} />;
      if (isRoute(name, "store"))   return <Images.Store width={SIZE} height={SIZE} />;
      if (isRoute(name, "mypage"))  return <Images.Mypage width={SIZE} height={SIZE} />;
      return null;
    }

    if (isRoute(name, "home"))    return focused ? <Images.HomeSelected width={SIZE} height={SIZE}/> : <Images.Home width={SIZE} height={SIZE}/>;
    if (isRoute(name, "ranking")) return focused ? <Images.RankingSelected width={SIZE} height={SIZE}/> : <Images.Ranking width={SIZE} height={SIZE}/>;
    if (isRoute(name, "store"))   return focused ? <Images.StoreSelected width={SIZE} height={SIZE}/> : <Images.Store width={SIZE} height={SIZE}/>;
    if (isRoute(name, "mypage"))  return focused ? <Images.MypageSelected width={SIZE} height={SIZE}/> : <Images.Mypage width={SIZE} height={SIZE}/>;
    return null;
  };

  const findBy = (b) => state.routes.find((r) => isRoute(r.name, b));
  const leftRoutes  = [findBy("home"), findBy("ranking")].filter(Boolean);
  const rightRoutes = [findBy("store"), findBy("mypage")].filter(Boolean);

  function CalculatorButton({ onPress, spinActive, children }) {
  const rotate = useRef(new Animated.Value(0)).current;

  // animation
  useEffect(() => {
      rotate.setValue(0);
      const loop = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 3000, // 3초에 한 바퀴
          useNativeDriver: true,
        })
      );
      loop.start();
    return () => loop?.stop();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],  //rotate = 0 → "0deg"
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="w-[60px] h-[60px] rounded-full items-center justify-center bg-white"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="tab"
      accessibilityLabel="계산기"
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={80} height={80} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="calcRing" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={Gradients.background[0]} />
              <Stop offset="100%" stopColor={Gradients.background[1]} />
            </LinearGradient>
          </Defs>
          <Circle
            cx="50"  // 원 중심의 x좌표
            cy="50"  // 원 중심의 y좌표
            r="45"  // 반지름(px 단위)
            stroke="url(#calcRing)"
            strokeWidth="8"  // 두께
            fill="transparent"
            strokeDasharray="282"    // 둘레 길이 
            strokeDashoffset="75"    // 일부만 보이게
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {children}
    </TouchableOpacity>
  );
}
  const renderItem = (route) => {
    const { options } = descriptors[route.key];
    const idx = state.routes.findIndex((x) => x.name === route.name);
    const focused = state.index === idx;
    const label = options.tabBarLabel ?? options.title ?? route.name;
    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => {
        navigation.navigate(route.name);  // 항상 전환 (비활성화 X)
        if (open) setOpen(false);   // 다른 nav 누르면 닫힘
      }}
        activeOpacity={0.85}
        className={`items-center justify-center ${open ? "opacity-40" : ""}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View className="items-center justify-center">
          {Icon(route.name, focused, 22)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = (routes) => (
    <View className="flex-row items-center">
      {routes.map((r, i) => (
        <View key={r?.key ?? `${i}`} style={{ marginRight: i < routes.length - 1 ? 40 : 0 }}>
          {r && renderItem(r)}
        </View>
      ))}
    </View>
  );

  return (
<View
  pointerEvents="box-none"
  style={[StyleSheet.absoluteFillObject]}
>
     {open && (
    <BgBlack
      opacity={0.6}
      bottomGap={BAR_HEIGHT + OFFSET} // 바텀바 높이만큼 비워줌
      onPress={() => setOpen(false)}
    />
  )}
   <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
<View
  className="absolute left-4 right-4 items-center"
  style={{ bottom: OFFSET+24, height: 70 }}
>
  <Images.TabbarBg width="100%" height={BAR_HEIGHT} />
</View>
  <View
    className="absolute gap-28 flex-row justify-center w-full px-4"
    style={{ bottom: OFFSET+4, height: BAR_HEIGHT }}
  >
    {renderGroup(leftRoutes)}
    {renderGroup(rightRoutes)}
  </View>
<View
  className="absolute left-0 right-0 items-center justify-center z-[1]"
  style={{ bottom: OFFSET + 60 }}
>
  {center && (
  <CalculatorButton
  onPress={() => setOpen((v) => !v)}
  spinActive={!open}
  >
    {isCalculatorFocused || open ? (
      <Images.CalcSelected width={36} height={36} />
    ) : (
    <Images.Calc width={36} height={36} />
    )}
    </CalculatorButton>
  )}
</View>

{open && (
  <View
    className="absolute self-center flex-row gap-6 z-[9]"
    style={{ bottom: OFFSET + 120 }}
  >
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/transport"); }}
      className="w-[70px] h-[70px] rounded-full border-2 border-white bg-green items-center justify-center"
    >
      <Images.NavTransport width={SIZE} height={SIZE} />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/diet"); }}
      className="w-[70px] h-[70px] rounded-full border-2 border-white bg-green items-center justify-center"
      style={{ transform: [{ translateY: -50 }] }}
    >
      <Images.NavDiet width={SIZE} height={SIZE} />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/survey"); }}
      className="w-[70px] h-[70px] rounded-full border-2 border-white bg-green items-center justify-center"
    >
      <Images.NavSurvey width={SIZE} height={SIZE} />
    </TouchableOpacity>
  </View>
  
)}
</View>
  </View>
)
}
