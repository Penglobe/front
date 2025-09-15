// app/_layout.jsx

if (__DEV__ && !global.__FETCH_WRAPPED__) {
  const _fetch = global.fetch;
  global.fetch = async (...args) => {
    try {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input?.url;
      const method = init?.method || "GET";
      console.log("[FETCH]", method, url);
    } catch {}
    return _fetch(...args);
  };
  global.__FETCH_WRAPPED__ = true;
}

import "../styles/global.css";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { useFonts } from "expo-font";
import Fonts from "@constants/Fonts.cjs";
import { useCallback, useEffect } from "react";
import { setLogoutHandler } from "@services/authService";
import { AuthProvider } from "@hooks/useAuth";
import * as WebBrowser from "expo-web-browser";

// ✅ 앱 시작 시 딱 1번만
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const router = useRouter();

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

  // 🔐 전역 로그아웃 핸들러 등록
  useEffect(() => {
    setLogoutHandler(() => {
      router.replace("/"); // 로그인 화면(index.jsx)으로 이동
    });
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </AuthProvider>
  );
}
