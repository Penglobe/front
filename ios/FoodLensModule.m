// FoodLensModuleBridge.m
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface RCT_EXTERN_MODULE(FoodLensModule, RCTEventEmitter)
RCT_EXTERN_METHOD(predictBase64:(NSString *)base64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end

