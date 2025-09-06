// RNKakaoMapViewManager.swift
import Foundation
import React

@objc(RNKakaoMapViewManager)
class RNKakaoMapViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    NSLog("🧩 RNKakaoMapViewManager.view() called") // 생성 확인 로그
    return RNKakaoMapView()
  }

  // 선택: JS에서 매니저 로딩 확인용
  override func constantsToExport() -> [AnyHashable : Any]! {
    return ["__managerLoaded": true]
  }
}

