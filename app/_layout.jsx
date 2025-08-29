// app/_layout.jsx
import { Slot, Stack } from "expo-router";
import { View } from "react-native";
import "../styles/global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import Fonts from "../constants/Fonts.cjs";

export default function RootLayout() {
  const [loaded] = useFonts({
    SFPro: Fonts.SFPro.regular,
    "SFPro-Medium": Fonts.SFPro.medium,
    "SFPro-Semibold": Fonts.SFPro.semibold,
    "SFPro-Bold": Fonts.SFPro.bold,

    SpaceGrotesk: Fonts.SpaceGrotesk.regular,
    "SpaceGrotesk-Medium": Fonts.SpaceGrotesk.medium,
    "SpaceGrotesk-Bold": Fonts.SpaceGrotesk.bold,
    "SpaceGrotesk-Light": Fonts.SpaceGrotesk.light,
  });

  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}
