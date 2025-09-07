// RNKakaoMapViewManager.swift
import Foundation
import React

// 클래스 이름을 React Native 브릿지에 노출
// JavaScript 단에서 requireNativeComponent("RNKakaoMapView") 같은 방식으로 접근 가능하도록 함
@objc(RNKakaoMapViewManager)
class RNKakaoMapViewManager: RCTViewManager {   // JS에서 호출하는 React 컴포넌트와 iOS 네이티브 UI(View) 사이의 브릿지를 담당
  override static func requiresMainQueueSetup() -> Bool { true }  // 뷰 매니저가 메인 스레드(UI 스레드)에서 초기화돼야 하는지 여부를 지정

  override func view() -> UIView! {  // 실제로 사용할 뷰 객체(RNKakaoMapView)를 반환
    NSLog("🧩 RNKakaoMapViewManager.view() called") // 생성 확인 로그
    return RNKakaoMapView()
  }

  override func constantsToExport() -> [AnyHashable : Any]! {  // JS로 전달할 초기 상수들을 정의
    return ["__managerLoaded": true]  // JS 단에서 "네이티브 매니저가 잘 로드되었는지" 확인할 수 있는 체크용
  }
}

