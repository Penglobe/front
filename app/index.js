//첫 화면, 아마 로그인(공통 시작점)
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../styles/global.css"; //tailwind
import Transport from "@tabs/calculator/transport/Transport";

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="p-4">
        <Text className="text-red-600 font-bold text-3xl">
          Creating app with expo
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Transport />
      </View>
    </SafeAreaView>
  );
};

export default App;
