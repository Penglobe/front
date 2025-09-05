import React, { useEffect, useState } from "react";
import { requireNativeComponent, UIManager, View, Text } from "react-native";

const NAME = "RNKakaoMapView";
const hasView = !!UIManager.getViewManagerConfig?.(NAME);
const RNKakaoMapView = hasView ? requireNativeComponent(NAME) : null;

export default function Test() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    console.log("has view?", hasView);
  }, []);

  return (
    <View
      style={{ flex: 1, backgroundColor: "#fafafa" }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}
    >
      <Text style={{ position: "absolute", top: 8, left: 8, zIndex: 999 }}>
        branch: {hasView ? "native" : "fallback"} ({size.w}×{size.h})
      </Text>

      {!hasView ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ textAlign: "center" }}>
            네이티브 뷰 미등록: {NAME}{"\n"}(오타/빌드 누락/Expo Go 여부)
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
  <RNKakaoMapView
  style={{ width: "100%", height: 360 }}
  onMapReady={() => console.log("✅ map ready")}
/>

        </View>
      )}
    </View>
  );
}
