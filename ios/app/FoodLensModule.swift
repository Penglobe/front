import Foundation
import React  // RN 브릿지 import
import UIKit
import ios_foodlenscoresdk

@objc(FoodLensModule)
class FoodLensModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! { "FoodLensModule" }
  @objc static func requiresMainQueueSetup() -> Bool { false }

  private let service: FoodLensCoreService = {
    let s = FoodLensCoreService(type: .foodlens)
    s.setLanguage(.ko)  // 한국어
    s.setImageResizingType(.normal)  // 속도/정확도 밸런스
    s.setNutritionRetrievalOption(.no)  // 영양정보 제외
    return s
  }()

  /// base64 이미지를 받아 FoodLens 예측 → JSON 문자열 반환
  @objc func predictBase64(
    _ base64: NSString,
    userId: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = Data(base64Encoded: base64 as String, options: .ignoreUnknownCharacters),
      let image = UIImage(data: data)
    else {
      reject("E_DECODE", "Invalid base64 image", nil)
      return
    }

    Task {
      let result = await service.predict(image: image, userId: userId as String)
      switch result {
      case .success(let response):
        if let jsonData = try? JSONEncoder().encode(response),
          let jsonString = String(data: jsonData, encoding: .utf8)
        {
          resolve(jsonString)
        } else {
          resolve("{}")
        }
      case .failure(let error):
        reject("E_PREDICT", "FoodLens predict failed", error)
      }
    }
  }
}
