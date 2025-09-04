import { View, Modal as RNModal } from "react-native";
import BgBlack from "@components/BgBlack";

export default function Modal({ visible, children }) {
  return (
    <RNModal visible={visible} transparent animationType="fade">
      <BgBlack />

      <View
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[16px] p-6"
        style={{ zIndex: 100 }}
      >
        {children}
      </View>
    </RNModal>
  );
}
