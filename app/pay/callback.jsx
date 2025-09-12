// app/pay/callback.tsx
import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

export default function PayCallback() {
  const router = useRouter();
  useEffect(() => {
    // 딥링크 수신 후 바로 닫거나 원하는 화면으로 이동
    router.replace("/pages/point/pointHistory"); // 또는 router.replace("/points/history")
  }, []);
  return <View style={{ flex: 1, backgroundColor: "white" }} />;
}
