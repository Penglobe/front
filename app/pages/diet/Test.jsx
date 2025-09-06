import React, { useState } from "react";
import { View, Text } from "react-native";
import { requireNativeComponent, UIManager } from "react-native";

const NAME = "RNKakaoMapView";
const hasView = !!UIManager.getViewManagerConfig?.(NAME);
const RNKakaoMapView = hasView ? requireNativeComponent(NAME) : null;

export default function MapWithMyLocation() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [shouldCreate, setShouldCreate] = useState(false);

  if (!hasView || !RNKakaoMapView) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>네이티브 뷰가 로드되지 않았어요.</Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#111" }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
        setShouldCreate(true);
      }}
    >
      <RNKakaoMapView
        style={{ width: "100%", height: 360 }}
        shouldCreate={shouldCreate && size.w > 0 && size.h > 0}
        // 초기 중심만 대충 넣고, 이후엔 네이티브가 현재 위치로 이동/마커 표시
        centerLatitude={37.5665}
        centerLongitude={126.9780}
        zoomLevel={15}
        onMapReady={() => console.log("✅ map ready")}
        onRegionChange={(e) => console.log("region:", e.nativeEvent)}
        onError={(e) => console.error("❌ native:", e.nativeEvent)}
      />
    </View>
  );
}
