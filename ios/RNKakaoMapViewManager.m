#import <React/RCTViewManager.h>
#import <React/RCTComponent.h> // 이벤트 타입 선언용

@interface RCT_EXTERN_MODULE(RNKakaoMapViewManager, RCTViewManager)  // Swift에서 만든 RNKakaoMapViewManager를 JS에 노출

// RCTBubblingEventBlock : 사용자 액션 이벤트
// RCTDirectEventBlock : 단발성 이벤트(준비 완료, 에러 등)에 사용

RCT_EXPORT_VIEW_PROPERTY(centerLatitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(centerLongitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(zoomLevel, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(shouldCreate, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onRegionChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMapReady,   RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError,      RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDistanceChange, RCTDirectEventBlock)

@end

