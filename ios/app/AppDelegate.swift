import Expo
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser
import React
import ReactAppDependencyProvider
import UIKit

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Kakao SDK 1회 초기화
  private static var didInitSDK = false
  private static func initSDKOnce() {
    guard !didInitSDK else { return }
    if let key = Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String,
      !key.isEmpty
    {
      KakaoSDK.initSDK(appKey: key)
      didInitSDK = true
      NSLog("✅ Kakao SDK initialized (key length=%d)", key.count)
    } else {
      NSLog("❌ KAKAO_APP_KEY missing in Info.plist")
    }
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // 1) Kakao SDK 먼저
    AppDelegate.initSDKOnce()

    // 2) RN Factory 구성
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    // 3) 윈도우 + RN 시작
    #if os(iOS) || os(tvOS)
      window = UIWindow(frame: UIScreen.main.bounds)
      factory.startReactNative(
        withModuleName: "main",
        in: window,
        launchOptions: launchOptions
      )
    #endif

    // ExpoAppDelegate 기본 처리
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // MARK: - URL 스킴 (Kakao/Linking)
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    NSLog("🌐 open url: %@", url.absoluteString)
    if AuthApi.isKakaoTalkLoginUrl(url) {
      NSLog("➡️ Kakao handleOpenUrl")
      return AuthController.handleOpenUrl(url: url)
    }
    return super.application(app, open: url, options: options)
      || RCTLinkingManager.application(app, open: url, options: options)
  }

  // MARK: - Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let rnHandled = RCTLinkingManager.application(
      application, continue: userActivity, restorationHandler: restorationHandler
    )
    let expoHandled = super.application(
      application, continue: userActivity, restorationHandler: restorationHandler
    )
    return expoHandled || rnHandled
  }
}

// MARK: - 번들 URL 결정 (Debug=DevClient/Metro, Release=내장 번들)
class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // ✅ Dev Client/Expo Launcher가 지정해 준 URL이 있으면 그걸 최우선 사용
    if let fromBridge = bridge.bundleURL {
      return fromBridge
    }
    return bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      // ✅ 최신 시그니처: fallbackExtension (이전 fallbackResource는 에러)
      // Dev Client URL이 없을 때만 로컬 Metro로 폴백
      return RCTBundleURLProvider.sharedSettings()
        .jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry", fallbackExtension: nil)
    #else
      // ✅ Release: 내장 main.jsbundle
      if let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
        return embedded
      }
      // 안전망 (일반적으론 사용 안 함)
      return RCTBundleURLProvider.sharedSettings()
        .jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry", fallbackExtension: "jsbundle")
    #endif
  }
}
