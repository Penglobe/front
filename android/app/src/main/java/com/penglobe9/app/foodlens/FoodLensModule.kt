package com.penglobe9.app.foodlens

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.doinglab.foodlens.core.FoodLensCore
import com.doinglab.foodlens.core.NutritionRetrieveOption
import com.doinglab.foodlens.ui.FoodLensCameraActivity

private const val TAG = "FoodLensBridge"
private const val REQ_CAMERA = 1010

class FoodLensModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = "FoodLensModule"

  private fun sendEvent(event: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  // === 1) SDK 초기화 ===
  @ReactMethod
  fun initialize(apiKey: String, endpoint: String?, promise: Promise) {
    try {
      FoodLensCore.initialize(
        reactContext,
        apiKey,
        endpoint ?: "https://api.foodlens.com"
      )
      promise.resolve(true)
      sendEvent("FoodLensLog", Arguments.createMap().apply {
        putString("level", "info")
        putString("message", "FoodLens SDK initialized")
      })
    } catch (t: Throwable) {
      Log.e(TAG, "initialize() failed", t)
      promise.reject("INIT_FAIL", t)
    }
  }

  // === 2) 옵션 설정 ===
  @ReactMethod
  fun setNutritionRetrieveOption(option: String, promise: Promise) {
    try {
      val opt = when (option) {
        "ALL_NUTRITION" -> NutritionRetrieveOption.ALL_NUTRITION
        "TOP1_NUTRITION_ONLY" -> NutritionRetrieveOption.TOP1_NUTRITION_ONLY
        "NO_NUTRITION" -> NutritionRetrieveOption.NO_NUTRITION
        else -> NutritionRetrieveOption.ALL_NUTRITION
      }
      FoodLensCore.setNutritionRetrieveOption(opt)
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("OPTION_FAIL", t)
    }
  }

  // === 3) 카메라 UI 실행 ===
  @ReactMethod
  fun startCameraUI(promise: Promise) {
    val activity: Activity = currentActivity ?: run {
      promise.reject("NO_ACTIVITY", "No current activity")
      return
    }
    try {
      Log.i(TAG, "startCameraUI() called.")
      val intent = Intent(activity, FoodLensCameraActivity::class.java)
      activity.startActivityForResult(intent, REQ_CAMERA)
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "startCameraUI() failed", t)
      promise.reject("START_UI_FAIL", t)
    }
  }

  // === 4) 카메라 결과 받기 ===
  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQ_CAMERA && resultCode == Activity.RESULT_OK && data != null) {
      val jsonStr = data.getStringExtra("result") ?: "{}"   // SDK가 반환하는 키 확인 필요
      val result = Arguments.createMap().apply {
        putString("rawJson", jsonStr)
      }
      sendEvent("FoodLensResult", result)
    }
  }

  override fun onNewIntent(intent: Intent?) {}
}
