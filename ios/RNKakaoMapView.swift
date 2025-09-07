// RNKakaoMapView.swift
import UIKit
import React
import KakaoMapsSDK
import CoreLocation

// React Native에서 사용할 iOS 네이티브 뷰
// KakaoMaps 엔진을 넣고, 위치/카메라/POI(마커)와 이벤트 브릿지를 담당
final class RNKakaoMapView: UIView, MapControllerDelegate {

  // JS -> Native
  // 값이 변경되면 didSet에서 카메라 업데이트 예약
  @objc var centerLatitude: NSNumber = 37.5665 { didSet { queueCameraUpdate() } }
  @objc var centerLongitude: NSNumber = 126.9780 { didSet { queueCameraUpdate() } }
  @objc var zoomLevel: NSNumber = 8 { didSet { queueCameraUpdate() } }
  
  // Native -> JS
  @objc var onRegionChange: RCTBubblingEventBlock?  // 카메라 이동/변경 시 전달(버블링)
  @objc var onMapReady: RCTDirectEventBlock?  // 맵 준비 완료 시 단발 이벤트
  @objc var onError: RCTDirectEventBlock?  // 오류 발생 시 단발 이벤트
  
  // shouldCreate: 0/1로 맵 생성 트리거 (엔진+사이즈 준비 완료 이후에만 생성)
  @objc var shouldCreate: NSNumber = 0 { didSet { tryCreateMap() } }

  // 이동 거리 트래킹
  @objc var onDistanceChange: RCTDirectEventBlock?   // 누적/단계 거리 RN으로 알림(선택)
  private var totalDistance: CLLocationDistance = 0  // 누적 이동 거리(m)
  private var lastEmitTime: TimeInterval = 0         // 이벤트 전송 스로틀링 기준 시각
  private let emitInterval: TimeInterval = 1.0       // 최소 1초 간격으로 전송
  private let minStepMeters: CLLocationDistance = 0.5  // 1m 미만 이동은 노이즈로 무시

  
  // 내부 상태
  private static var didInitSDK = false  // KakaoMaps SDK 1회 초기화 가드
  private var controller: KMController?  // KakaoMaps 컨트롤러(엔진/뷰 제어)
  private var engineReady = false  // prepareEngine 성공 여부
  private var mapCreated = false  // addView(mapview) 호출 여부
  private var firstLayout = true  // 첫 레이아웃 플래그
  private var lastSize: CGSize = .zero  // 최근 컨테이너 사이즈
  private let container = KMViewContainer(frame: .zero)  // KMSDK가 요구하는 컨테이너
 
  // KakaoMap 뷰 핸들러: "mapview"로 추가된 뷰를 가져옴
  private var mapView: KakaoMap? { controller?.getView("mapview") as? KakaoMap }

  // 위치/POI 관련
  private let locationManager = CLLocationManager()  // CoreLocation 매니저
  private var lastLocation: CLLocation?  // 직전 위치(거리 계산용)
  
  private var didCenterOnUser = false  // 최초 사용자 위치로 센터링했는지
  private var isFollowingUser = true  // 사용자 위치 추적 모드 on/off

  
  // 사용자 마커 레이어/스타일 설정 값
  private let userLayerID  = "UserLayer"
  private let userStyleID  = "PerLevelStyle"  // 스타일 ID
  private let userPoiRank: Int = 100  // 렌더 우선순위
  private var userPoi: Poi?  // 사용자 마커 객체
  private var userStyleAdded = false  // 스타일 등록 여부
  
  // 레이어/스타일 준비 재시도 로직 상태
  private var layerSetupInProgress = false
  private var layerSetupAttempts = 0
  private let layerSetupMaxAttempts = 50

  // 레이어 준비/재시도 상태
  private var userLayerReady = false
  private var userLayerRetrying = false

  // 카메라 이동 예약(외부 prop 변경 시 축적했다가 조건 충족 시 반영)
  private var pendingCamera: (lat: Double, lon: Double, zoom: Int)?

  
  // 초기화: SDK 1회 초기화 + 기본 셋업
  override init(frame: CGRect) { super.init(frame: frame); Self.initSDKOnce(); setup() }
  required init?(coder: NSCoder) { super.init(coder: coder); Self.initSDKOnce(); setup() }

  //  KakaoMaps SDK를 앱 전체에서 1회만 초기화
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

  // 뷰/컨트롤러/위치 매니저 등 기본 세팅
  private func setup() {
    // KakaoMaps 엔진이 그려질 컨테이너를 자기 뷰에 꽉 채움
    addSubview(container)
    container.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      container.topAnchor.constraint(equalTo: topAnchor),
      container.bottomAnchor.constraint(equalTo: bottomAnchor),
      container.leadingAnchor.constraint(equalTo: leadingAnchor),
      container.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
    
    // KMController 생성 및 델리게이트 설정
    let ctrl = KMController(viewContainer: container)
    ctrl.delegate = self
    controller = ctrl

    // CoreLocation 기본 설정(정확도/이동 임계치 등)
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
    locationManager.distanceFilter = 1   // 1m 이상 움직였을 때만 업데이트 콜백
    NSLog("🛠️ RNKakaoMapView setup complete")
  }

  // 엔진 준비
  // 사이즈(가로/세로)가 0이 아니고 아직 준비되지 않았다면 엔진 준비 시도
  private func tryPrepareEngine() {
    guard !engineReady, lastSize.width > 0, lastSize.height > 0, let c = controller else { return }
    let ok = c.prepareEngine()
    engineReady = ok
    NSLog("⚙️ prepareEngine -> \(ok) (size=\(lastSize.width)x\(lastSize.height))")
  }

  // 레이아웃 변경 시(사이즈 확정 시) 컨테이너 크기 갱신 → 엔진 준비 → 맵 생성 시도
  override func layoutSubviews() {
    super.layoutSubviews()
    container.frame = bounds
    if bounds.width > 0, bounds.height > 0 {
      lastSize = bounds.size
      tryPrepareEngine()
      tryCreateMap()
    }
  }

  // 윈도우에 붙고/떨어질 때 엔진 활성/일시중지 관리(수명주기 대응)
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
      c.pauseEngine()  // 백그라운드 유사
      NSLog("🟡 Engine paused")
    }
  }

  // Kakao Maps 델리게이트: 뷰 추가 타이밍 콜백
  func addViews() { tryCreateMap() }

  // 컨테이너 사이즈 변경 콜백(엔진에서 알려줌)
  func containerDidResized(_ size: CGSize) {
    lastSize = size
    
    // 맵 뷰의 렌더링 영역 갱신
    if let map = mapView, size.width > 0, size.height > 0 {
      map.viewRect = CGRect(origin: .zero, size: size)
      NSLog("📐 map.viewRect updated -> \(size.width)x\(size.height)")
    }
    tryPrepareEngine()
    tryCreateMap()

    // 최초 레이아웃 이후 대기 중 카메라 적용
    if firstLayout {
      firstLayout = false
      DispatchQueue.main.async { [weak self] in self?.applyCameraIfReady() }
    }
  }
  
  // map 생성
  // 조건: (1) 아직 생성 안 됨 (2) 엔진 준비됨 (3) shouldCreate==true (4) 사이즈 OK
  private func tryCreateMap() {
    guard !mapCreated, engineReady, shouldCreate.boolValue, lastSize.width > 0, lastSize.height > 0 else { return }

    // 초기 카메라 위치/레벨 지정
    let pos = MapPoint(longitude: centerLongitude.doubleValue, latitude: centerLatitude.doubleValue)
    let info = MapviewInfo(viewName: "mapview", defaultPosition: pos, defaultLevel: zoomLevel.intValue)

    // mapview 추가(실제 카카오맵 생성)
    controller?.addView(info, viewSize: lastSize, timeout: 3000)
    mapCreated = true
    NSLog("🗺️ addView(mapview) size=\(lastSize.width)x\(lastSize.height), level=\(zoomLevel.intValue) -> mapCreated=true")

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if let map = self.mapView {
        map.viewRect = CGRect(origin: .zero, size: self.lastSize)  // 렌더링 영역 보장
      }
      self.ensureUserLayerAndStyle()  // 유저 레이어/스타일 1차 보장
      self.applyCameraIfReady()  // 대기 중 카메라가 있으면 적용
      self.onMapReady?([:])  // RN에 "준비 완료" 알림
      NSLog("✅ onMapReady fired")

      // 레이어/스타일이 진짜 준비될 때까지 짧은 간격으로 재시도
      // 준비되면 자동으로 위치 권한/업데이트 시작
      self.ensureUserLayerAndStyleWithRetry()

    }
  }

  // 카메라 제어
  // 외부 prop 변경으로 들어온 카메라 업데이트는 "추적 모드"일 때 무시
  private func queueCameraUpdate() {
    if isFollowingUser { return }  // 사용자 추적 중에는 외부 카메라 이동을 막음
    pendingCamera = (centerLatitude.doubleValue, centerLongitude.doubleValue, zoomLevel.intValue)
    NSLog("🎥 queueCameraUpdate lat=\(centerLatitude.doubleValue), lon=\(centerLongitude.doubleValue), zoom=\(zoomLevel.intValue)")
    applyCameraIfReady()
  }

  // 맵 준비/뷰 사이즈가 갖춰졌을 때 실제 카메라 이동 수행
  private func applyCameraIfReady() {
    guard let map = mapView, map.viewRect.width > 0, map.viewRect.height > 0 else { return }

    // pendingCamera가 있으면 우선 사용, 없으면 현재 props 사용
    let lat = pendingCamera?.lat ?? centerLatitude.doubleValue
    let lon = pendingCamera?.lon ?? centerLongitude.doubleValue
    let zoom = pendingCamera?.zoom ?? zoomLevel.intValue
    pendingCamera = nil

    // 카메라 이동
    let target = MapPoint(longitude: lon, latitude: lat)
    let cu = CameraUpdate.make(target: target, zoomLevel: zoom, mapView: map)
    map.moveCamera(cu)
    NSLog("🎯 moveCamera -> lat=\(lat), lon=\(lon), zoom=\(zoom)")

    // RN에 현재 카메라 상태 알림
    onRegionChange?(["latitude": lat, "longitude": lon, "zoomLevel": zoom])
  }
  
  // 사용자 좌표 기준으로 카메라 이동(추적 모드에서 사용)
  private func moveCamera(to coord: CLLocationCoordinate2D, zoom: Int) {
    guard let map = mapView else { return }
    let target = MapPoint(longitude: coord.longitude, latitude: coord.latitude)
    let cu = CameraUpdate.make(target: target, zoomLevel: zoom, mapView: map)
    map.moveCamera(cu)
    NSLog("🎥 moveCamera(to user) -> lat=\(coord.latitude), lon=\(coord.longitude), zoom=\(zoom)")
  }
  
  // 유저 레이어/스타일 준비 재시도 루프
  private func ensureUserLayerAndStyleWithRetry() {
    guard !layerSetupInProgress else { return }
    layerSetupInProgress = true
    layerSetupAttempts = 0
    attemptLayerSetup()
  }

  private func attemptLayerSetup() {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()

    // 1) 레이어가 없으면 추가 시도
    if manager.getLabelLayer(layerID: userLayerID) == nil {
      let opt = LabelLayerOptions(
        layerID: userLayerID,
        competitionType: .none,
        competitionUnit: .poi,
        orderType: .rank,
        zOrder: 999
      )
      _ = manager.addLabelLayer(option: opt)
      NSLog("📚 (retry) trying to add LabelLayer: \(userLayerID)")
    }

    // 2) 레이어 준비 여부 갱신
    userLayerReady = (manager.getLabelLayer(layerID: userLayerID) != nil)

    // 3) 스타일이 없으면 등록 시도
    if userLayerReady && !userStyleAdded {
      createPoiStyle(styleID: userStyleID, iconName: "marker_normal")
      userStyleAdded = true
      NSLog("🎨 (retry) PoiStyle added: \(userStyleID)")
    }

    // 4) 레이어+스타일 모두 준비되면 위치 업데이트 시작
    if userLayerReady && userStyleAdded {
      layerSetupInProgress = false
      NSLog("✅ layer/style ready -> starting location updates")
      requestLocationIfNeeded()
      return
    }

    // 5) 준비 안 됐으면 0.1초 뒤 재시도, 최대 layerSetupMaxAttempts회
    layerSetupAttempts += 1
    if layerSetupAttempts < layerSetupMaxAttempts {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
        self?.attemptLayerSetup()
      }
    } else {
      layerSetupInProgress = false
      NSLog("❌ layer/style not ready after retries; giving up")
    }
  }


  // 유저 레이어/스타일 1회 보장(즉시 시도)
  private func ensureUserLayerAndStyle() {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()

    // 1) 사용자 레이어 없으면 생성
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

    // 레이어 준비 표시
    userLayerReady = (manager.getLabelLayer(layerID: userLayerID) != nil)

    // 2) 스타일 없으면 등록
    if !userStyleAdded {
      createPoiStyle(styleID: userStyleID, iconName: "marker_normal")
      userStyleAdded = true
      NSLog("🎨 PoiStyle added: \(userStyleID)")
    } else {
      NSLog("🎨 PoiStyle already added: \(userStyleID)")
    }
  }
  
  // 이미지 포맷 보정: PDF/SVG 등 벡터 → RGBA8 비트맵으로 강제
  private func forceRGBAImage(_ image: UIImage) -> UIImage? {
    // 메인 스레드에서 보장
    if !Thread.isMainThread {
      return DispatchQueue.main.sync { self.forceRGBAImage(image) }
    }
    let width = Int(image.size.width * image.scale)
    let height = Int(image.size.height * image.scale)
    let bitsPerComponent = 8
    let bytesPerRow = width * 4
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

    //  RGBA8 컨텍스트로 강제 드로잉
    guard let ctx = CGContext(data: nil, width: width, height: height,
                              bitsPerComponent: bitsPerComponent, bytesPerRow: bytesPerRow,
                              space: colorSpace, bitmapInfo: bitmapInfo) else { return nil }

    if let cg = image.cgImage {
      ctx.interpolationQuality = .high
      ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    } else {
      // cgImage가 없으면 UIKit로 래스터화
      UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
      image.draw(in: CGRect(origin: .zero, size: image.size))
      let raster = UIGraphicsGetImageFromCurrentImageContext()
      UIGraphicsEndImageContext()
      return raster
    }

    guard let newCG = ctx.makeImage() else { return nil }
    return UIImage(cgImage: newCG, scale: image.scale, orientation: image.imageOrientation)
  }


  // 에셋 이름으로 이미지를 불러오고 반드시 PNG 비트맵으로 보장
  private func loadBitmapPNG(named: String) -> UIImage? {
    // 우선순위: 정확한 이름 → .png 확장 시도
    let base = UIImage(named: named) ?? UIImage(named: "\(named).png")
    guard let img = base else {
      NSLog("🚫 loadBitmapPNG: not found -> \(named)")
      return nil
    }

    // 1) RGBA8 강제 변환 시도
    if let rgba = forceRGBAImage(img) {
      NSLog("🧱 loadBitmapPNG: RGBA8 enforced -> \(named) size=\(rgba.size)")
      return rgba
    }

    // 2) pngData()로 강제 PNG화 후 재로딩(fallback)
    if let data = img.pngData(), let raster = UIImage(data: data) {
      NSLog("🧱 loadBitmapPNG: ensured PNG bitmap (fallback) -> \(named) size=\(raster.size)")
      return raster
    }
    
    // 마지막 수단: 원본 그대로 반환
    NSLog("🧱 loadBitmapPNG: fallback original -> \(named) size=\(img.size)")
    return img
  }

  // 사용자 마커용 PoiStyle 등록 (아이콘 + 텍스트)
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
    
    // 아이콘 없으면 점 이미지로 대체
    let symbol = iconImage ?? makeDotImage(diameter: 24, fill: .systemBlue, border: .white, borderWidth: 3)
    let iconStyle = PoiIconStyle(symbol: symbol, anchorPoint: CGPoint(x: 0.5, y: 1.0), badges: [])

    // 2) 텍스트 라인 스타일
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

    // 3) PerLevel 스타일 묶어서 등록
    let perLevelStyle = PerLevelPoiStyle(iconStyle: iconStyle, textStyle: textStyle, level: 0)
    let poiStyle = PoiStyle(styleID: styleID, styles: [perLevelStyle])
    manager.addPoiStyle(poiStyle)
    NSLog("🎨 createPoiStyle: registered styleID=\(styleID)")
  }

  // 사용자 위치 POI(마커) 갱신
  private func updateUserPoi(at coord: CLLocationCoordinate2D) {
    guard let map = mapView else { return }
    let manager = map.getLabelManager()

    // 레이어가 아직 없으면 즉석 생성 시도(또는 짧게 재시도)
    var layer = manager.getLabelLayer(layerID: userLayerID)
    if layer == nil {
      NSLog("⚠️ updateUserPoi: layer not found -> creating...")
      ensureUserLayerAndStyle()
      layer = manager.getLabelLayer(layerID: userLayerID)
      if layer == nil {
        
        // 0.2초 지연 후 1회 재시도
        if !userLayerRetrying {
          userLayerRetrying = true
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.userLayerRetrying = false
            if let self = self { self.updateUserPoi(at: coord) }
          }
        } else {
          NSLog("❌ updateUserPoi: layer still not found after retry")
        }
        return
      }
    }

    let pos = MapPoint(longitude: coord.longitude, latitude: coord.latitude)

    // 기존 마커가 있으면 부드럽게 이동, 없으면 새로 생성
    if let p = userPoi {
      p.moveAt(pos, duration: UInt(300))  // 300ms 애니메이션(타입: UInt)
      NSLog("📍 userPoi moved -> \(coord.latitude), \(coord.longitude)")
    } else {
      let opt = PoiOptions(styleID: userStyleID)
      opt.rank = userPoiRank
      if let p = layer!.addPoi(option: opt, at: pos) {
        p.clickable = false
        p.show()
        userPoi = p
        NSLog("📍 userPoi created -> \(coord.latitude), \(coord.longitude) (rank=\(userPoiRank))")
      } else {
        NSLog("❌ userPoi create failed")
      }
    }
  }

  // 아이콘 대체용 점 이미지(디버그/폴백)
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

  // 위치 권한/업데이트 제어
  private func requestLocationIfNeeded() {
    switch locationManager.authorizationStatus {
      case .notDetermined:
      //  최초: 권한 요청
        locationManager.requestWhenInUseAuthorization()
        NSLog("📡 requestWhenInUseAuthorization")
      case .authorizedWhenInUse, .authorizedAlways:
      // 승인 시: 위치 업데이트 시작
        locationManager.startUpdatingLocation()
        NSLog("📡 startUpdatingLocation")
      case .denied, .restricted:
      // 거부/제한: RN에 에러 알림
        onError?(["where":"location","message":"Location denied or restricted"])
        NSLog("🚫 Location denied/restricted")
      @unknown default:
        break
    }
  }
}

// MARK: - CLLocationManagerDelegate
extension RNKakaoMapView: CLLocationManagerDelegate {
  // 권한 상태 변경 시마다 적절한 액션 재시도
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    requestLocationIfNeeded()
  }

  // 위치가 업데이트될 때마다 호출
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else { return }

    // 이동 거리 누적
    if let last = lastLocation {
      let step = loc.distance(from: last)  // m 단위 거리
      if step >= minStepMeters {
        totalDistance += step
        let now = Date().timeIntervalSince1970
        // 스로틀링(emitInterval=1s) 충족 시 RN으로 이벤트 전송
        if now - lastEmitTime >= emitInterval {
          lastEmitTime = now
          NSLog("🚶 step=%.2f m, total=%.2f m", step, totalDistance)
          onDistanceChange?(["step": step, "total": totalDistance])  // RN으로 전송(선택)
        }
      }
    }
    lastLocation = loc
    // 이동 거리 누적 끝

    // 현재 위치 마커 갱신
    updateUserPoi(at: loc.coordinate)

    // 맵이 만들어졌고 아직 최초 센터링을 안했다면 1회 강제 센터링
    if mapCreated && !didCenterOnUser {
      didCenterOnUser = true
      isFollowingUser = true
      // 외부 zoomLevel보다 최소 16은 보장(가까이 보기)
      moveCamera(to: loc.coordinate, zoom: max(zoomLevel.intValue, 16))
    } else if isFollowingUser {
      // 추적 모드면 매 업데이트마다 사용자 위치로 이동
      moveCamera(to: loc.coordinate, zoom: max(zoomLevel.intValue, 16))
    }
  }

  //  RN에서 호출할 수 있는 보조 메서드
  @objc func resetDistance() {
    totalDistance = 0
    lastEmitTime = 0
    NSLog("🔄 distance reset")
    onDistanceChange?(["step": 0, "total": 0])
  }

  @objc func setFollowing(_ follow: Bool) {
    isFollowingUser = follow
    if follow { didCenterOnUser = false } // 다음 위치 콜백에서 재센터링
  }

}

