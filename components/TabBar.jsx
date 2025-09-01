// components/TabBar.jsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Images } from "@constants/Images";
import BgBlack from "@components/BgBlack";
import { useRouter } from "expo-router";

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
style={[StyleSheet.absoluteFillObject, { zIndex: 100 }]}
>
      {open && <BgBlack/>}
<View
  className="absolute left-4 right-4 items-center"
  style={{ bottom: OFFSET+24, height: 70, zIndex: 0 }}
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
    <TouchableOpacity
      onPress={() => setOpen((v) => !v)}   //업데이트 함수, v는 현재 open 값
      activeOpacity={0.85}
      className="w-[60px] h-[60px] rounded-full bg-white items-center justify-center"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isCalculatorFocused }}
      accessibilityLabel="계산기"
    >
      {isCalculatorFocused || open ? (
        <Images.CalcSelected width={36} height={36} />
      ) : (
        <Images.Calc width={36} height={36} />
      )}
    </TouchableOpacity>
  )}
</View>

{open && (
  <View
    className="absolute self-center flex-row gap-6 z-[9]"
    style={{ bottom: OFFSET + 140 }}
  >
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/transport"); }}
      className="w-[60px] h-[60px] rounded-full bg-green items-center justify-center"
    >
      <Text className="text-white font-bold">환경 걸음</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/diet"); }}
      className="w-[60px] h-[60px] rounded-full bg-green items-center justify-center"
    >
      <Text className="text-white font-bold">식단</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { setOpen(false); router.push("/(tabs)/calculator/survey"); }}
      className="w-[60px] h-[60px] rounded-full bg-green items-center justify-center"
    >
      <Text className="text-white font-bold">설문조사</Text>
    </TouchableOpacity>
  </View>
)}

</View>
)
}
