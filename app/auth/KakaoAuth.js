// services/kakaoAuth.js
import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

const MODULE_NAME = "KakaoAuthModule";
const native = NativeModules?.[MODULE_NAME];

function ensureLinked() {
  if (Platform.OS !== "ios") {
    const err = new Error("카카오 iOS 로그인은 iOS에서만 지원됩니다.");
    err.code = "E_UNSUPPORTED_PLATFORM";
    throw err;
  }
  if (Constants?.appOwnership === "expo") {
    const err = new Error(
      "[KakaoAuth] Expo Go에서는 사용할 수 없습니다. `expo run:ios`로 Dev Client 빌드 후 실행하세요."
    );
    err.code = "E_EXPO_GO";
    throw err;
  }
  if (!native || typeof native.loginWithProfile !== "function") {
    const err = new Error(
      "[KakaoAuth] 네이티브 모듈을 찾을 수 없습니다. iOS 빌드 후 앱을 재실행 해주세요.\n" +
        "- Xcode/`npx expo run:ios`로 빌드\n" +
        "- 번들 아이디/브리징 이름(" +
        MODULE_NAME +
        ") 확인"
    );
    err.code = "E_MODULE_NOT_LINKED";
    throw err;
  }
  return native;
}

function withTimeout(promise, ms = 15000) {
  let timer;
  return new Promise((resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          Object.assign(new Error("로그인 응답 지연(E_TIMEOUT)"), {
            code: "E_TIMEOUT",
          })
        ),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function loginWithKakaoProfile(options = {}) {
  const mod = ensureLinked();
  try {
    const res = await withTimeout(
      mod.loginWithProfile(),
      options.timeoutMs || 15000
    );
    return {
      id: res?.id != null ? String(res.id) : "",
      nickname: res?.nickname ?? "",
      email: res?.email ?? null,
      profileImageUrl: res?.profileImageUrl ?? null,
      thumbnailImageUrl: res?.thumbnailImageUrl ?? null,
    };
  } catch (e) {
    const err = new Error(
      e?.message || "카카오 로그인 중 알 수 없는 오류가 발생했습니다."
    );
    err.code = e?.code || e?.domain || "E_UNKNOWN";
    throw err;
  }
}

export function isKakaoNativeAvailable() {
  try {
    ensureLinked();
    return true;
  } catch {
    return false;
  }
}

/** ✅ default export (객체로) */
export default {
  loginWithKakaoProfile,
  isKakaoNativeAvailable,
};
