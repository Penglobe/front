import { NativeModules, Platform } from "react-native";

const { KakaoAuthModule } = NativeModules || {};

// Swift 모듈에서 내려주는 결과 반환구조
function ensureLinked() {
  if (Platform.OS !== "ios") {
    throw new Error("카카오 iOS 로그인은 iOS에서만 지원됩니다.");
  }
  if (
    !KakaoAuthModule ||
    typeof KakaoAuthModule.loginWithProfile !== "function"
  ) {
    throw new Error(
      "[KakaoAuth] 네이티브 모듈을 찾을 수 없습니다. 빌드 후 앱을 재실행 해주세요."
    );
  }
}

/** 카카오 로그인 + 프로필(닉네임/이미지/이메일) 조회 */
export async function loginWithKakaoProfile() {
  ensureLinked();
  return KakaoAuthModule.loginWithProfile(); // { id, nickname, email, profileImageUrl, thumbnailImageUrl }
}
