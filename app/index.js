//첫 화면, 아마 로그인(공통 시작점)
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../styles/global.css"; //tailwind

const App = () => {
  return (
    <SafeAreaView>
      <Text className="text-red-600 font-bold text-3xl ">
        Creating app with expo
      </Text>
    </SafeAreaView>
  );
};

export default App;
