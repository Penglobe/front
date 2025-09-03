import Foundation
import UIKit
import FoodLensCore
import React

@objc(FoodLensModule)
class FoodLensModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  // 1) 토큰 설정 함수 추가
  private func configureFoodLens(_ s: FoodLensCoreService) throws {
    let app = (Bundle.main.object(forInfoDictionaryKey: "FoodLensAppToken") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    let company = (Bundle.main.object(forInfoDictionaryKey: "FoodLensCompanyToken") as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines)

    guard let appToken = app, let companyToken = company,
          !appToken.isEmpty, !companyToken.isEmpty else {
      throw NSError(domain: "FoodLensConfig", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Missing FoodLensAppToken/CompanyToken in Info.plist"])
    }

    // SDK가 내부에서 Info.plist를 읽으므로 여기서는 로그만
    NSLog("[FoodLens] tokens loaded (app ****%@, company ****%@)",
          String(appToken.suffix(4)), String(companyToken.suffix(4)))
  }
  

  // 2) service를 lazy로 바꾸고, 생성 시 토큰 주입
  private lazy var service: FoodLensCoreService = {
    let s = FoodLensCoreService(type: .foodlens)  // 필요하면 .sandbox/.staging
    s.setLanguage(.ko)
    s.setImageResizingType(.normal)
    s.setNutritionRetrievalOption(.no)
    do { try configureFoodLens(s) }                // ← 여기서 토큰 주입
    catch { NSLog("[FoodLens] configure error: \(error.localizedDescription)") }
    return s
  }()

  // 3) 나머지는 그대로
  @objc(predictBase64:userId:resolver:rejecter:)
  func predictBase64(
    _ base64: NSString,
    userId: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let data = Data(base64Encoded: base64 as String, options: .ignoreUnknownCharacters),
      let image = UIImage(data: data)
    else {
      reject("E_DECODE", "Invalid base64 image", nil)
      return
    }

    Task.detached {
      let result = await self.service.predict(image: image, userId: userId as String)
      DispatchQueue.main.async {
        switch result {
        case .success(let response):
          do {
            let json = try JSONEncoder().encode(response)
            resolve(String(data: json, encoding: .utf8) ?? "{}")
          } catch {
            reject("E_ENCODE", "JSON encode failed: \(error.localizedDescription)", error)
          }
        case .failure(let err):
          let ns = err as NSError
          NSLog("[FoodLens] predict failed domain=\(ns.domain) code=\(ns.code) desc=\(ns.localizedDescription) userInfo=\(ns.userInfo)")
          reject("\(ns.domain)#\(ns.code)", ns.localizedDescription, err)
        }
      }
    }
  }
}

