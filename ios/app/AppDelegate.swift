import Expo
import React
import ReactAppDependencyProvider
import KakaoSDKCommon
import KakaoSDKAuth
import KakaoSDKUser
// FoodLensCore 임포트는 필요 없지만 해도 무방
import FoodLensCore

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private static var didInitKakao = false
  private static func initKakaoIfNeeded() {
    guard !didInitKakao else { return }
    if let key = Bundle.main.object(forInfoDictionaryKey: "KAKAO_APP_KEY") as? String, !key.isEmpty {
      KakaoSDK.initSDK(appKey: key)
      didInitKakao = true
      NSLog("✅ Kakao SDK initialized (key length=%d)", key.count)
    } else {
      NSLog("❌ KAKAO_APP_KEY missing in Info.plist")
    }
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // 1) Kakao 등 서드파티
    AppDelegate.initKakaoIfNeeded()

    // 2) RN/Expo 부팅
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    #if os(iOS) || os(tvOS)
      window = UIWindow(frame: UIScreen.main.bounds)
      factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
    #endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking (카카오/딥링크)
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if AuthApi.isKakaoTalkLoginUrl(url) {
      return AuthController.handleOpenUrl(url: url)
    }
    return super.application(app, open: url, options: options)
      || RCTLinkingManager.application(app, open: url, options: options)
  }

  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(
      application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? { bridge.bundleURL ?? bundleURL() }
  override func bundleURL() -> URL? {
    #if DEBUG
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
    #else
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

