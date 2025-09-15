package com.penglobe9.app.foodlens

import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.doinglab.foodlens.sdk.core.*
import com.doinglab.foodlens.sdk.core.model.result.RecognitionResult
import com.doinglab.foodlens.sdk.core.type.FoodLensType
import com.doinglab.foodlens.sdk.core.type.LanguageConfig
import com.doinglab.foodlens.sdk.core.type.ImageResizeOption
import com.doinglab.foodlens.sdk.core.type.NutritionRetrieveOption
import com.doinglab.foodlens.sdk.core.error.BaseError

private const val TAG = "FoodLensBridge"

class FoodLensModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  // ✅ Core SDK 서비스 인스턴스 (lazy 생성)
  private val foodLensCoreService: FoodLensCoreService by lazy {
    FoodLensCore.createFoodLensService(reactContext, FoodLensType.FoodLens).apply {
      // 기본 옵션 세팅
      setLanguage(LanguageConfig.KO) // 언어 (KO/EN/JA)
      setImageResizeOption(ImageResizeOption.NORMAL) // 속도/품질 균형
      setNutritionRetrieveOption(NutritionRetrieveOption.ALL_NUTRITION) // 모든 영양소 반환
    }
  }

  override fun getName() = "FoodLensModule"

  // === JS → Native 이벤트 전달 함수 ===
  private fun sendEvent(event: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  // === 옵션 변경 ===
  @ReactMethod
  fun setNutritionRetrieveOption(option: String, promise: Promise) {
    try {
      val opt = when (option) {
        "ALL_NUTRITION" -> NutritionRetrieveOption.ALL_NUTRITION
        "TOP1_NUTRITION_ONLY" -> NutritionRetrieveOption.TOP1_NUTRITION_ONLY
        "NO_NUTRITION" -> NutritionRetrieveOption.NO_NUTRITION
        else -> NutritionRetrieveOption.ALL_NUTRITION
      }
      foodLensCoreService.setNutritionRetrieveOption(opt)
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("OPTION_FAIL", t)
    }
  }

  // === 이미지 예측 (base64) ===
  @ReactMethod
  fun predict(base64: String, promise: Promise) {
    try {
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      foodLensCoreService.predict(bytes, object : RecognitionResultHandler {
        override fun onSuccess(result: RecognitionResult?) {
          val json = result?.toJSONString() ?: "{}"
          val map = Arguments.createMap().apply {
            putString("rawJson", json)
          }
          sendEvent("FoodLensResult", map)  // JS 이벤트
          promise.resolve(json)             // Promise 리턴
        }

        override fun onError(error: BaseError?) {
          val msg = error?.getMessage() ?: "Unknown error"
          Log.e(TAG, "predict() failed: $msg")
          val map = Arguments.createMap().apply {
            putString("message", msg)
          }
          sendEvent("FoodLensError", map)
          promise.reject("PREDICT_FAIL", msg)
        }
      })
    } catch (t: Throwable) {
      Log.e(TAG, "predict() exception", t)
      promise.reject("PREDICT_FAIL", t)
    }
  }
}
