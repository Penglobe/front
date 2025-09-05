// RNKakaoMapViewManager.swift
import Foundation
import React

@objc(RNKakaoMapViewManager)
class RNKakaoMapViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { RNKakaoMapView() }
}

