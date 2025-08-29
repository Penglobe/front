// components/TabBar.jsx
import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TabbarBg from "../assets/nav/tabbar-bg.svg";

import Home from "../assets/nav/home.svg";
import HomeSelected from "../assets/nav/home-selected.svg";
import Ranking from "../assets/nav/ranking.svg";
import RankingSelected from "../assets/nav/ranking-selected.svg";
import Store from "../assets/nav/store.svg";
import StoreSelected from "../assets/nav/store-selected.svg";
import Mypage from "../assets/nav/mypage.svg";
import MypageSelected from "../assets/nav/mypage-selected.svg";
import CalcSelected from "../assets/nav/calculator-selected.svg";
import Calc from "../assets/nav/calculator.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_HEIGHT = 90;
const isRoute = (n, b) => n === b || n === `${b}/index`;

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const OFFSET = 34;
  const SIZE = 30;
  const center = state.routes.find((r) => isRoute(r.name, "calculator"));
  const isCalculatorFocused = isRoute(state.routes[state.index]?.name, "calculator");


  const Icon = (name, focused) => {
    if (isRoute(name, "home"))    return focused ? <HomeSelected width={SIZE} height={SIZE}/> : <Home width={SIZE} height={SIZE}/>;
    if (isRoute(name, "ranking")) return focused ? <RankingSelected width={SIZE} height={SIZE}/> : <Ranking width={SIZE} height={SIZE}/>;
    if (isRoute(name, "store"))   return focused ? <StoreSelected width={SIZE} height={SIZE}/> : <Store width={SIZE} height={SIZE}/>;
    if (isRoute(name, "mypage"))  return focused ? <MypageSelected width={SIZE} height={SIZE}/> : <Mypage width={SIZE} height={SIZE}/>;
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
        onPress={() => navigation.navigate(route.name)}
        activeOpacity={0.85}
        className="items-center justify-center"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View className="items-center justify-center">
          {Icon(route.name, focused, 22)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = (routes) => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {routes.map((r, i) => (
        <View key={r?.key ?? `${i}`} style={{ marginRight: i < routes.length - 1 ? 40 : 0 }}>
          {r && renderItem(r)}
        </View>
      ))}
    </View>
  );

  return (
    <View>
<View
  className="absolute left-4 right-4 items-center"
  style={{ bottom: OFFSET+24, height: 70, zIndex: 0 }}
>
  <TabbarBg width="100%" height={BAR_HEIGHT} />
</View>
  <View
    className="absolute gap-28 flex-row justify-center w-full px-4"
    style={{ bottom: OFFSET+4, height: BAR_HEIGHT }}
  >
    {renderGroup(leftRoutes)}
    {renderGroup(rightRoutes)}
  </View>
<View
  style={{
    position: "absolute",
    left: 0,
    right: 0,
    bottom: OFFSET + 60,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  }}
>
  {center && (
    <TouchableOpacity
      onPress={() => navigation.navigate(center.name)}
      activeOpacity={0.85}
      className="w-[60px] h-[60px] rounded-full items-center justify-center"
      style={{ backgroundColor: "white" }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isCalculatorFocused }}
      accessibilityLabel="계산기"
    >
      {isCalculatorFocused ? (
        <CalcSelected width={36} height={36} />
      ) : (
        <Calc width={36} height={36} />
      )}
    </TouchableOpacity>
  )}
</View>

  </View>
  );
}
