// components/BgBlack.jsx
import { StyleSheet, View, Pressable } from "react-native";
import colors from "@constants/Colors.cjs";
const { Colors } = colors;

export default function BgBlack({ opacity = 0.6, onPress, children }) {
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]}>
      <Pressable
        onPress={onPress}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.bgblack, opacity }]}
      />
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}
