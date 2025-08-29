// app/(tabs)/_layout.jsx
import { Tabs } from "expo-router";
import TabBar from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // 탭바를 화면 위에 겹쳐 놓기
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0, 
        },

        // 기본 배경 없애기
        tabBarBackground: () => null,
      }}

      // 탭바 연결
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home/index" options={{ title: "Home" }} />
      <Tabs.Screen name="ranking/index" options={{ title: "Ranking" }} />
      <Tabs.Screen name="store/index" options={{ title: "Store" }} />
      <Tabs.Screen name="mypage/index" options={{ title: "Mypage" }} />
      <Tabs.Screen name="calculator/index" options={{ title: "Calc" }} />
    </Tabs>
  );
}
