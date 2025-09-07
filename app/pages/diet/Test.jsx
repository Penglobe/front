import React, { useState } from "react";
import { View, Text } from "react-native";
import { requireNativeComponent, UIManager } from "react-native";
import { cssInterop } from "nativewind";

const NAME = "RNKakaoMapView";

// iOS 네이티브 모듈이 실제로 등록되어 있는지 확인
const hasView = !!UIManager.getViewManagerConfig?.(NAME);

// 네이티브 뷰 참조 (존재하지 않으면 null)
const NativeKakaoMapView = hasView ? requireNativeComponent(NAME) : null;

// className -> style 매핑
if (NativeKakaoMapView) {
  cssInterop(NativeKakaoMapView, { className: "style" });
}

export default function MapWithMyLocation() {
  // 레이아웃 사이즈 -> 엔진 준비 조건
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Kakao map 엔진/뷰 실제 생성 트리거
  const [shouldCreate, setShouldCreate] = useState(false);
  // 네이티브에서 올라오는 누적 이동 거리(m)
  const [distance, setDistance] = useState(0);

  // 네이티브 뷰가 로드되지 않았을 때
  if (!hasView || !NativeKakaoMapView) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>네이티브 뷰가 로드되지 않았어요.</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-[#111111]"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
        // 최초 레이아웃이 결정된 뒤 실제 맵 생성하도록
        setShouldCreate(true);
      }}
    >

      <NativeKakaoMapView
        className="w-full h-[860px]"
        // 엔진 준비 조건: 레이아웃 사이즈가 0보다 클 때만 생성
        shouldCreate={shouldCreate && size.w > 0 && size.h > 0}
        // 네이티브에서 계산해 준 이동 거리(step: 방금 이동, total: 누적) 이벤트 수신
        onDistanceChange={(event) => {
          const { step, total } = event.nativeEvent;
          console.log("🚶 step:", step, "total:", total);
          setDistance(total);
        }}
        // 초기 카메라 기본값 
        centerLatitude={37.5665}
        centerLongitude={126.9780}
        zoomLevel={15}
        // 맵 준비 완료
        onMapReady={() => console.log("map ready!!!!!!")}
        // 카메라/영역 변경
        onRegionChange={(e) => console.log("region:", e.nativeEvent)}
        // 네이티브 에러 전달
        onError={(e) => console.error("Error native:", e.nativeEvent)}
      />

      {/* 누적 이동 거리 */}
      <View className="absolute bottom-5 left-5">
        <Text className="text-green text-lg">
          누적 거리: {distance.toFixed(1)} m
        </Text>
      </View>
    </View>
  );
}
