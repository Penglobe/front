import FoodLensCore
import Foundation
import React
import UIKit

@objc(FoodLensModule)
class FoodLensModule: RCTEventEmitter {
  private var service = FoodLensCoreService(type: .foodlens)
  private var isRunning = false

  override init() {
    super.init()
    service.setLanguage(.ko)
    service.setImageResizingType(.normal)
    service.setNutritionRetrievalOption(.all)
  }

  @objc(predictBase64:resolver:rejecter:)
  func predictBase64(
    _ base64: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {

    if isRunning {
      reject("E_BUSY", "FoodLens is running. Call later.", nil)
      return
    }
    isRunning = true
    defer { isRunning = false }

    let clean = base64.replacingOccurrences(
      of: "^data:image/[^;]+;base64,", with: "", options: .regularExpression)
    guard let data = Data(base64Encoded: clean, options: .ignoreUnknownCharacters),
      let image = UIImage(data: data)
    else {
      reject("E_BASE64", "Invalid base64 image", nil)
      return
    }

    Task {
      let result = await service.predict(image: image, userId: "penglobe-user")
      switch result {
      case .success(let response):
        let json = response.toJSONString() ?? "{}"
        self.sendEvent(withName: "FoodLensResult", body: ["rawJson": json])
        resolve(json)
      case .failure(let error):
        reject("E_PREDICT", error.localizedDescription, error)
      }
    }
  }

  override func supportedEvents() -> [String]! { ["FoodLensResult"] }
}
