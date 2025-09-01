// app/_layout.jsx
import "../styles/global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useFonts } from "expo-font";
import Fonts from "@constants/Fonts.cjs";
import { useCallback } from "react";


export default function RootLayout() {

  const [fontsLoaded, fontError] = useFonts({
    SFPro: Fonts.SFPro.regular,
    "SFPro-Medium": Fonts.SFPro.medium,
    "SFPro-Semibold": Fonts.SFPro.semibold,
    "SFPro-Bold": Fonts.SFPro.bold,

    SpaceGrotesk: Fonts.SpaceGrotesk.regular,
    "SpaceGrotesk-Medium": Fonts.SpaceGrotesk.medium,
    "SpaceGrotesk-Bold": Fonts.SpaceGrotesk.bold,
    "SpaceGrotesk-Light": Fonts.SpaceGrotesk.light,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
