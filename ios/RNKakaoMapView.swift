// RNKakaoMapView.swift
import UIKit
import React
import KakaoMapsSDK

final class RNKakaoMapView: UIView, MapControllerDelegate {

  // MARK: - Props from RN
  @objc var centerLatitude: NSNumber = 37.5665 { didSet { applyCameraIfReady() } }
  @objc var centerLongitude: NSNumber = 126.9780 { didSet { applyCameraIfReady() } }
  @objc var zoomLevel: NSNumber = 8 { didSet { applyCameraIfReady() } }
  @objc var onRegionChange: RCTBubblingEventBlock?
  @objc var onMapReady: RCTBubblingEventBlock?

  // MARK: - Internals
  private var controller: KMController?
  private var firstLayout = true
  private let container = KMViewContainer(frame: .zero)

  // MARK: - Init
  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }
  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    addSubview(container)
    container.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      container.topAnchor.constraint(equalTo: topAnchor),
      container.bottomAnchor.constraint(equalTo: bottomAnchor),
      container.leadingAnchor.constraint(equalTo: leadingAnchor),
      container.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])

    let ctrl = KMController(viewContainer: container)
    ctrl.delegate = self
    controller = ctrl
    let ok = ctrl.prepareEngine()
    NSLog("🟡 prepareEngine = \(ok)")
  }

  // 레이아웃 보장
  override func layoutSubviews() {
    super.layoutSubviews()
    container.frame = bounds
  }

  // 엔진 라이프사이클
  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let c = controller else { return }
    if window != nil {
      DispatchQueue.main.async {
        NSLog("🟢 activateEngine")
        c.activateEngine()
      }
    } else {
      NSLog("🟠 pauseEngine")
      c.pauseEngine()
    }
  }

  deinit {
    NSLog("🔴 resetEngine")
    controller?.resetEngine()
  }

  // MARK: - MapControllerDelegate
  func addViews() {
    NSLog("✅ addViews()")
    let pos = MapPoint(longitude: centerLongitude.doubleValue,
                       latitude: centerLatitude.doubleValue)
    let info = MapviewInfo(viewName: "mapview",
                           defaultPosition: pos,
                           defaultLevel: zoomLevel.intValue)
    controller?.addView(info)
  }

  func containerDidResized(_ size: CGSize) {
    NSLog("📐 containerDidResized: w=%.1f h=%.1f", size.width, size.height)
    guard size.width > 0, size.height > 0,
          let map = controller?.getView("mapview") as? KakaoMap else { return }

    map.viewRect = CGRect(origin: .zero, size: size)

    if firstLayout {
      firstLayout = false
      DispatchQueue.main.async { [weak self] in
        self?.applyCameraIfReady()
        self?.onMapReady?([:])
      }
    }
  }

  // MARK: - Camera
  private func applyCameraIfReady() {
    guard let map = controller?.getView("mapview") as? KakaoMap else {
      NSLog("⏳ map 아직 없음"); return
    }
    guard map.viewRect.width > 0, map.viewRect.height > 0 else {
      NSLog("⏳ viewRect=0"); return
    }
    let target = MapPoint(longitude: centerLongitude.doubleValue,
                          latitude: centerLatitude.doubleValue)
    let cu = CameraUpdate.make(target: target, zoomLevel: zoomLevel.intValue, mapView: map)
    NSLog("🎥 moveCamera -> (lon: %.6f, lat: %.6f) zoom %d",
          centerLongitude.doubleValue, centerLatitude.doubleValue, zoomLevel.intValue)
    map.moveCamera(cu)
    onRegionChange?([
      "latitude": centerLatitude.doubleValue,
      "longitude": centerLongitude.doubleValue,
      "zoomLevel": zoomLevel.intValue
    ])
  }
}

