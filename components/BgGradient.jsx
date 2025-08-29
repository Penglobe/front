import { LinearGradient } from "expo-linear-gradient";
import colors from "@constants/Colors.cjs";
import { StyleSheet } from "react-native";
const { Gradients } = colors;
;

export default function BgGradient() {
  return (
    <LinearGradient
      colors={Gradients.background}  
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
    >
    </LinearGradient>
  );
}
