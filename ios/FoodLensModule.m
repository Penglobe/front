#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FoodLensModule, NSObject)
RCT_EXTERN_METHOD(predictBase64:(NSString *)base64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end

