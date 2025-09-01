import colors from "@constants/Colors.cjs";
import { StyleSheet, View } from "react-native";
const { Colors } = colors;

export default function BgBlack() {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: Colors.bgblack,
         }
      ]}
    />
  );
}