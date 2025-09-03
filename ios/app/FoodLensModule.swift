import FoodLensCore
// ios/MyApp/FoodLensModule.swift
import Foundation
import UIKit

@objc(FoodLensModule)
class FoodLensModule: NSObject {
  private let service: FoodLensCoreService = {
    let s = FoodLensCoreService(type: .foodlens)
    s.setLanguage(.ko)  // 언어: 한국어
    s.setImageResizingType(.normal)  // 성능: normal (속도/정확도 밸런스)
    s.setNutritionRetrieveOption(.no)  // 영양정보
    return s
  }()

  @objc static func requiresMainQueueSetup() -> Bool { false }
}

extension FoodLensModule: RCTBridgeModule {
  static func moduleName() -> String! { "FoodLensModule" }

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
        let json = response.toJSONString() ?? "{}"
        resolve(json)  // JSON 문자열 전달
      case .failure(let error):
        reject("E_PREDICT", "FoodLens predict failed", error)
      }
    }
  }

  /// 음식 상세 조회: foodId로 정보 받기
  @objc func foodInfo(
    _ foodId: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      let result = await service.foodInfo(foodId: foodId as String)
      switch result {
      case .success(let response):
        resolve(response.toJSONString() ?? "{}")
      case .failure(let error):
        reject("E_FOODINFO", "FoodLens foodInfo failed", error)
      }
    }
  }

  /// (옵션) 음식 이름 검색
  @objc func searchFoodByName(
    _ name: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      let result = await service.searchFoodbyName(name as String)
      switch result {
      case .success(let response):
        resolve(response.toJSONString() ?? "{}")
      case .failure(let error):
        reject("E_SEARCH", "FoodLens searchFoodByName failed", error)
      }
    }
  }
}
