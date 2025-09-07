#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KakaoAuthModule, NSObject)
RCT_EXTERN_METHOD(loginWithProfile:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
+ (BOOL)requiresMainQueueSetup { return YES; }
@end

