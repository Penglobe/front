// RNKakaoMapView.swift
import UIKit
import React
import KakaoMapsSDK
import CoreLocation

final class RNKakaoMapView: UIView, MapControllerDelegate {

  // MARK: RN props
  @objc var centerLatitude: NSNumber = 37.5665 { didSet { queueCameraUpdate() } }
  @objc var centerLongitude: NSNumber = 126.9780 { didSet { queueCameraUpdate() } }
  @objc var zoomLevel: NSNumber = 8 { didSet { queueCameraUpdate() } }
  @objc var onRegionChange: RCTBubblingEventBlock?
  @objc var onMapReady: RCTDirectEventBlock?
  @objc var onError: RCTDirectEventBlock?
  @objc var shouldCreate: NSNumber = 0 { didSet { tryCreateMap() } }

  // MARK: internals
  private static var didInitSDK = false
  private var controller: KMController?
  private var engineReady = false
  private var mapCreated = false
  private var firstLayout = true
  private var lastSize: CGSize = .zero
  private let container = KMViewContainer(frame: .zero)

  // Kakao Map object helper
  private var mapView: KakaoMap? { controller?.getView("mapview") as? KakaoMap }

  // MARK: location & POI
  private let locationManager = CLLocationManager()
  private var lastLocation: CLLocation?

  private let userLayerID  = "UserLayer"
  private let userStyleID  = "PerLevelStyle"  // 샘플처럼 스타일 ID 고정
  private let userPoiRank: Int = 100
  private var userPoi: Poi?
  private var userStyleAdded = false   // 스타일 중복 추가 방지

  // 카메라 대기
  private var pendingCamera: (lat: Double, lon: Double, zoom: Int)?

  override init(frame: CGRect) { super.init(frame: frame); Self.initSDKOnce(); setup() }
  required init?(coder: NSCoder) { super.init(coder: coder); Self.initSDKOnce(); setup() }

  private static func initSDKOnce() {
    guard !didInitSDK else { return }
    if let key = Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String, !key.isEmpty {
      SDKInitializer.InitSDK(appKey: key)
      didInitSDK = true
      NSLog("✅ KakaoMaps SDK initialized with key (length=%d)", key.count)
    } else {
      NSLog("❌ KAKAO_APP_KEY missing in Info.plist")
    }
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

    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
    NSLog("🛠️ RNKakaoMapView setup complete")
  }

  // 엔진 준비
  private func tryPrepareEngine() {
    guard !engineReady, lastSize.width > 0, lastSize.height > 0, let c = controller else { return }
    let ok = c.prepareEngine()
    engineReady = ok
    NSLog("⚙️ prepareEngine -> \(ok) (size=\(lastSize.width)x\(lastSize.height))")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    container.frame = bounds
    if bounds.width > 0, bounds.height > 0 {
      lastSize = bounds.size
      tryPrepareEngine()
      tryCreateMap()
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let c = controller else { return }
    if window != nil {
      DispatchQueue.main.async {
        self.tryPrepareEngine()
        c.activateEngine()
        self.tryCreateMap()
        NSLog("🟢 Engine activated")
      }
    } else {
      c.pauseEngine()
      NSLog("🟡 Engine paused")
    }
  }

  // MARK: Kakao delegate
  func addViews() { tryCreateMap() }

  func containerDidResized(_ size: CGSize) {
    lastSize = size
    if let map = mapView, size.width > 0, size.height > 0 {
      map.viewRect = CGRect(origin: .zero, size: size)
      NSLog("📐 map.viewRect updated -> \(size.width)x\(size.height)")
    }
    tryPrepareEngine()
    tryCreateMap()

    if firstLayout {
      firstLayout = false
      DispatchQueue.main.async { [weak self] in self?.applyCameraIfReady() }
    }
  }

  private func tryCreateMap() {
    guard !mapCreated, engineReady, shouldCreate.boolValue, lastSize.width > 0, lastSize.height > 0 else { return }

    let pos = MapPoint(longitude: centerLongitude.doubleValue, latitude: centerLatitude.doubleValue)
    let info = MapviewInfo(viewName: "mapview", defaultPosition: pos, defaultLevel: zoomLevel.intValue)

    controller?.addView(info, viewSize: lastSize, timeout: 3000)
    mapCreated = true
    NSLog("🗺️ addView(mapview) size=\(lastSize.width)x\(lastSize.height), level=\(zoomLevel.intValue) -> mapCreated=true")

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if let map = self.mapView {
        map.viewRect = CGRect(origin: .zero, size: self.lastSize)
      }
      self.ensureUserLayerAndStyle() // ✅ 스타일/레이어 준비
      self.applyCameraIfReady()
      self.onMapReady?([:])
      NSLog("✅ onMapReady fired")

      // 위치 권한 요청 & 업데이트 시작
      self.requestLocationIfNeeded()
    }
  }

  // MARK: 카메라
  private func queueCameraUpdate() {
    pendingCamera = (centerLatitude.doubleValue, centerLongitude.doubleValue, zoomLevel.intValue)
    NSLog("🎥 queueCameraUpdate lat=\(centerLatitude.doubleValue), lon=\(centerLongitude.doubleValue), zoom=\(zoomLevel.intValue)")
    applyCameraIfReady()
  }

  private func applyCameraIfReady() {
    guard let map = mapView, map.viewRect.width > 0, map.viewRect.height > 0 else { return }

    let lat = pendingCamera?.lat ?? centerLatitude.doubleValue
    let lon = pendingCamera?.lon ?? centerLongitude.doubleValue
    let zoom = pendingCamera?.zoom ?? zoomLevel.intValue
    pendingCamera = nil

    let target = MapPoint(longitude: lon, latitude: lat)
    let cu = CameraUpdate.make(target: target, zoomLevel: zoom, mapView: map)
    map.moveCamera(cu)   // duration 없는 버전 사용 (SDK 시그니처 맞춤)
    NSLog("🎯 moveCamera -> lat=\(lat), lon=\(lon), zoom=\(zoom)")

    onRegionChange?(["latitude": lat, "longitude": lon, "zoomLevel": zoom])
  }

  // MARK: POI 스타일 & 레이어
  private func ensureUserLayerAndStyle() {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()

    // 1) 사용자 레이어
    if manager.getLabelLayer(layerID: userLayerID) == nil {
      let opt = LabelLayerOptions(
        layerID: userLayerID,
        competitionType: .none,
        competitionUnit: .poi,
        orderType: .rank,
        zOrder: 999
      )
      _ = manager.addLabelLayer(option: opt)
      NSLog("📚 LabelLayer added: \(userLayerID)")
    } else {
      NSLog("📚 LabelLayer exists: \(userLayerID)")
    }

    // 2) 샘플처럼 PerLevel 스타일 등록 (아이콘 + 텍스트 스타일)
    if !userStyleAdded {
      createPoiStyle(styleID: userStyleID, iconName: "marker_normal") // ← PNG 자원명(확장자 없이)
      userStyleAdded = true
      NSLog("🎨 PoiStyle added: \(userStyleID)")
    } else {
      NSLog("🎨 PoiStyle already added: \(userStyleID)")
    }
  }

  /// 이름으로 에셋을 불러와서 확실한 PNG 비트맵 UIImage로 변환 (PDF/SVG 벡터 방지)
  private func loadBitmapPNG(named: String) -> UIImage? {
    let base = UIImage(named: named) ?? UIImage(named: "\(named).png")
    guard let img = base else {
      NSLog("🚫 loadBitmapPNG: not found -> \(named)")
      return nil
    }

    // 벡터인 경우 수동 래스터라이즈
    if img.cgImage == nil {
      let size = img.size
      UIGraphicsBeginImageContextWithOptions(size, false, 0)
      img.draw(in: CGRect(origin: .zero, size: size))
      let raster = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()
      if let ras = raster {
        NSLog("🧱 loadBitmapPNG: rasterized vector -> \(named) size=\(ras.size)")
      }
      return raster
    }

    // PNG 데이터로 재생성하여 비트맵 보장
    if let data = img.pngData(), let raster = UIImage(data: data) {
      NSLog("🧱 loadBitmapPNG: ensured PNG bitmap -> \(named) size=\(raster.size)")
      return raster
    }

    NSLog("🧱 loadBitmapPNG: fallback original -> \(named) size=\(img.size)")
    return img
  }

  /// 샘플과 동일 컨셉: 아이콘 + 텍스트 라인들로 PoiStyle 등록
  private func createPoiStyle(styleID: String, iconName: String) {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()

    // 1) 아이콘 준비 (비트맵 보장)
    let iconImage = loadBitmapPNG(named: iconName)
    if let test = iconImage {
      NSLog("🖼️ icon loaded '\(iconName)': size=\(test.size), hasCGImage=\(test.cgImage != nil)")
    } else {
      NSLog("🖼️ icon '\(iconName)' not found, will fallback to dot")
    }

    let symbol = iconImage ?? makeDotImage(diameter: 24, fill: .systemBlue, border: .white, borderWidth: 3)
    let iconStyle = PoiIconStyle(symbol: symbol, anchorPoint: CGPoint(x: 0.5, y: 1.0), badges: [])

    // 2) 텍스트 스타일 -> PoiTextLineStyle 로 포장
    let line1 = PoiTextLineStyle(
      textStyle: TextStyle(
        fontSize: 15,
        fontColor: .white,
        strokeThickness: 2,
        strokeColor: UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1.0)
      )
    )
    let line2 = PoiTextLineStyle(
      textStyle: TextStyle(
        fontSize: 12,
        fontColor: UIColor(red: 0.8, green: 0.1, blue: 0.1, alpha: 1.0),
        strokeThickness: 1,
        strokeColor: UIColor(red: 0.9, green: 0.1, blue: 0.1, alpha: 1.0)
      )
    )

    let textStyle = PoiTextStyle(textLineStyles: [line1, line2])

    // 3) PerLevel 스타일 생성
    let perLevelStyle = PerLevelPoiStyle(iconStyle: iconStyle, textStyle: textStyle, level: 0)
    let poiStyle = PoiStyle(styleID: styleID, styles: [perLevelStyle])
    manager.addPoiStyle(poiStyle)
    NSLog("🎨 createPoiStyle: registered styleID=\(styleID)")
  }

  // MARK: 사용자 현재 위치 POI 갱신
  private func updateUserPoi(at coord: CLLocationCoordinate2D) {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()
    guard let layer = manager.getLabelLayer(layerID: userLayerID) else {
      NSLog("⚠️ updateUserPoi: layer not found")
      return
    }

    let pos = MapPoint(longitude: coord.longitude, latitude: coord.latitude)

    if let p = userPoi {
      p.moveAt(pos, duration: UInt(300))
      NSLog("📍 userPoi moved -> \(coord.latitude), \(coord.longitude)")
    } else {
      let opt = PoiOptions(styleID: userStyleID)
      opt.rank = userPoiRank
      if let p = layer.addPoi(option: opt, at: pos) {
        p.clickable = false
        p.show()
        userPoi = p
        NSLog("📍 userPoi created -> \(coord.latitude), \(coord.longitude) (rank=\(userPoiRank))")
      } else {
        NSLog("❌ userPoi create failed")
      }
    }
  }

  // 임시: 아이콘 PNG가 없을 때 쓰는 점 이미지
  private func makeDotImage(diameter: CGFloat, fill: UIColor, border: UIColor, borderWidth: CGFloat) -> UIImage {
    let size = CGSize(width: diameter, height: diameter)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    let ctx = UIGraphicsGetCurrentContext()!
    let rect = CGRect(origin: .zero, size: size)
    ctx.setFillColor(fill.cgColor)
    ctx.fillEllipse(in: rect)
    if borderWidth > 0 {
      ctx.setStrokeColor(border.cgColor)
      ctx.setLineWidth(borderWidth)
      ctx.strokeEllipse(in: rect.insetBy(dx: borderWidth/2, dy: borderWidth/2))
    }
    let img = UIGraphicsGetImageFromCurrentImageContext()!
    UIGraphicsEndImageContext()
    return img
  }

  // MARK: 위치 권한/업데이트
  private func requestLocationIfNeeded() {
    switch locationManager.authorizationStatus {
      case .notDetermined:
        locationManager.requestWhenInUseAuthorization()
        NSLog("📡 requestWhenInUseAuthorization")
      case .authorizedWhenInUse, .authorizedAlways:
        locationManager.startUpdatingLocation()
        NSLog("📡 startUpdatingLocation")
      case .denied, .restricted:
        onError?(["where":"location","message":"Location denied or restricted"])
        NSLog("🚫 Location denied/restricted")
      @unknown default:
        break
    }
  }
}

// MARK: - CLLocationManagerDelegate
extension RNKakaoMapView: CLLocationManagerDelegate {
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    requestLocationIfNeeded()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else { return }
    lastLocation = loc

    // 현재 위치 마커 갱신
    updateUserPoi(at: loc.coordinate)

    // 첫 업데이트에 카메라 맞추기
    if mapCreated && firstLayout == false {
      let lat = loc.coordinate.latitude
      let lon = loc.coordinate.longitude
      pendingCamera = (lat, lon, max(zoomLevel.intValue, 15))
      NSLog("🧭 first camera align to user location lat=\(lat), lon=\(lon)")
      applyCameraIfReady()
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    onError?(["where":"location","message": error.localizedDescription])
    NSLog("❌ location error: \(error.localizedDescription)")
  }
}

