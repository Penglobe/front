// RNKakaoMapViewManager.m  (파일명은 달라도 OK)
#import <React/RCTViewManager.h>
#import <React/RCTComponent.h> // RCTBubblingEventBlock 타입 위해

@interface RCT_EXTERN_MODULE(RNKakaoMapViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(centerLatitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(centerLongitude, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(zoomLevel, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onRegionChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMapReady, RCTBubblingEventBlock)
@end

