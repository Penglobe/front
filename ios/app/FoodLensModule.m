// ios/MyApp/FoodLensModule.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (FoodLensModule, NSObject)

// RN이 메인큐에서 초기화가 필요한지 (아님)
+ (BOOL)requiresMainQueueSetup {
  return NO;
}

// Promise 기반 메서드 3개
RCT_EXTERN_METHOD(predictBase64
                  : (NSString *)base64 userId
                  : (NSString *)userId resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(foodInfo
                  : (NSString *)foodId resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(searchFoodByName
                  : (NSString *)name resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
