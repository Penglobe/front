// app/(tabs)/home/index.jsx
import { View, Text } from "react-native";
import {Calendar} from 'react-native-calendars';

export default function Mypage() {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
      <Calendar />
      <Text>Mypage</Text>
    </View>
  );
}
