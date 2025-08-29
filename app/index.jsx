// app/index.jsx
import { useEffect } from "react";
import { View, Text, InteractionManager } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace("/(tabs)/home"); 
    });
    return () => task.cancel();
  }, []);

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <Text>Loading...</Text>
    </View>
  );
}
