import Foundation
import React
import FoodLensCore
import UIKit

@objc(FoodLensModule)
class FoodLensModule: RCTEventEmitter {
  private var service = FoodLensCoreService(type: .foodlens) // or .caloai
  private var isRunning = false

  override init() {
    super.init()
    // 옵션도 여기서 설정 가능
    service.setLanguage(.ko)                // .device / .ko / .en / (.ja는 caloai만)
    service.setImageResizingType(.normal)   // .speed / .normal / .quality
    service.setNutritionRetrievalOption(.all)
  }

  @objc(predictBase64:resolver:rejecter:)
  func predictBase64(_ base64: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    if isRunning { reject("E_BUSY","FoodLens is running. Call later.", nil); return }
    isRunning = true
    defer { isRunning = false }

    let clean = base64.replacingOccurrences(of: "^data:image/[^;]+;base64,", with: "", options: .regularExpression)
    guard let data = Data(base64Encoded: clean, options: .ignoreUnknownCharacters),
          let image = UIImage(data: data) else {
      reject("E_BASE64","Invalid base64 image", nil); return
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

