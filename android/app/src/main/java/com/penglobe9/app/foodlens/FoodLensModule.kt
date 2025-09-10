package com.penglobe9.app.foodlens

import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

private const val TAG = "FoodLensBridge"

class FoodLensModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var sdkDetected: Boolean = false
  private var sdkInfo: String = "N/A"

  init {
    reactContext.addActivityEventListener(this)
    detectSdkOnce()
  }

  override fun getName() = "FoodLensModule"

  // === SDK 감지(리플렉션) : AAR이 실제로 들어왔는지 확인 ===
  private fun detectSdkOnce() {
    if (sdkDetected) return
    try {
      // 👉 실제 패키지/클래스명은 AAR 확인 후 교체
      // 후보 예시:
      // "com.doinglab.foodlens.core.FoodLensCore"
      // "com.doinglab.foodlens.ui.FoodLensCameraActivity"
      val core = Class.forName("com.doinglab.foodlens.core.FoodLensCore")
      sdkDetected = true
      sdkInfo = core.name
      Log.i(TAG, "✅ FoodLens SDK detected: $sdkInfo")
      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "FoodLens SDK detected: $sdkInfo")
      })
    } catch (t: Throwable) {
      Log.w(TAG, "⚠️ FoodLens SDK NOT detected yet. (${t.javaClass.simpleName}: ${t.message})")
      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "warn")
        putString("message", "FoodLens SDK NOT detected yet. Install/Gradle sync required.")
      })
    }
  }

  // === JS로 이벤트 보내기 (로그 브리지) ===
  private fun sendEvent(event: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  // === 1) 초기화 ===
  @ReactMethod
  fun initialize(apiKey: String, endpoint: String?, promise: Promise) {
    try {
      Log.i(TAG, "initialize() called. apiKey.length=${apiKey.length}, endpoint=$endpoint, sdkDetected=$sdkDetected")
      // TODO: 실제 SDK 초기화로 교체
      // val core = Class.forName("com.doinglab.foodlens.core.FoodLensCore")
      // core.getMethod("initialize", Context::class.java, String::class.java, String::class.java)
      //     .invoke(null, reactContext, apiKey, endpoint ?: DEFAULT)

      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "initialize() ok. (dummy for now)")
      })
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "initialize() failed", t)
      promise.reject("INIT_FAIL", t)
    }
  }

  // === 2) 옵션 설정 (영양정보 범위 등) ===
  @ReactMethod
  fun setNutritionRetrieveOption(option: String, promise: Promise) {
    try {
      Log.i(TAG, "setNutritionRetrieveOption(option=$option)")
      // TODO: 실제 SDK enum으로 매핑
      // val enumClz = Class.forName("com.doinglab.foodlens.core.NutritionRetrieveOption")
      // val sdkOpt = java.lang.Enum.valueOf(enumClz as Class<out Enum<*>>, option)
      // val core = Class.forName("com.doinglab.foodlens.core.FoodLensCore")
      // core.getMethod("setNutritionRetrieveOption", enumClz).invoke(null, sdkOpt)

      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "setNutritionRetrieveOption($option) ok. (dummy)")
      })
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "setNutritionRetrieveOption() failed", t)
      promise.reject("OPTION_FAIL", t)
    }
  }

  // === 3) Base64 이미지 인식 ===
  @ReactMethod
  fun recognizeBase64(base64Image: String, promise: Promise) {
    try {
      Log.i(TAG, "recognizeBase64() called. inputLength=${base64Image.length}, sdkDetected=$sdkDetected")

      val bytes = Base64.decode(base64Image, Base64.DEFAULT)
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      // TODO: 실제 SDK 호출로 교체 (콜백/동기 방식에 맞춰 변환)
      // val core = Class.forName("com.doinglab.foodlens.core.FoodLensCore")
      // val method = core.getMethod("recognize", Bitmap::class.java, CallbackType::class.java)
      // method.invoke(null, bitmap, callback)

      // 더미 응답 (에뮬레이터에서 로그/파이프라인 테스트용)
      val result = Arguments.createMap().apply {
        putString("status", "OK(DUMMY)")
        putString("rawJson", """{"items":[],"note":"replace with real SDK result"}""")
        putBoolean("sdkDetected", sdkDetected)
        putString("sdkInfo", sdkInfo)
      }
      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "recognizeBase64() ok. returning dummy result.")
      })
      promise.resolve(result)
    } catch (t: Throwable) {
      Log.e(TAG, "recognizeBase64() failed", t)
      promise.reject("RECOGNIZE_FAIL", t)
    }
  }

  // (선택) SDK 카메라 UI 띄우기 (후에 실제 액티비티로 교체)
  @ReactMethod
  fun startCameraUI(promise: Promise) {
    val activity: Activity = currentActivity ?: run {
      promise.reject("NO_ACTIVITY", "No current activity")
      return
    }
    try {
      Log.i(TAG, "startCameraUI() called.")
      // TODO: val intent = Intent(activity, FoodLensCameraActivity::class.java)
      // activity.startActivityForResult(intent, 1010)
      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "startCameraUI() dummy no-op.")
      })
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "startCameraUI() failed", t)
      promise.reject("START_UI_FAIL", t)
    }
  }

  // === ActivityEventListener ===
  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    // TODO: 카메라 UI 결과 파싱 시 사용
    Log.d(TAG, "onActivityResult(requestCode=$requestCode, resultCode=$resultCode, data=$data)")
  }
  override fun onNewIntent(intent: Intent?) { /* no-op */ }
}
