#import <React/RCTViewManager.h>
#import <React/RCTComponent.h> // 이벤트 타입 선언용

@interface RCT_EXTERN_MODULE(RNKakaoMapViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(centerLatitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(centerLongitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(zoomLevel, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(shouldCreate, NSNumber)                // ← 추가!

RCT_EXPORT_VIEW_PROPERTY(onRegionChange, RCTBubblingEventBlock) // bubbling
RCT_EXPORT_VIEW_PROPERTY(onMapReady,   RCTDirectEventBlock)     // direct
RCT_EXPORT_VIEW_PROPERTY(onError,      RCTDirectEventBlock)     // direct
@end

