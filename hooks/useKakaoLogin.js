import { useMemo, useRef } from "react";
import { Platform } from "react-native";
import { loginWithKakaoProfile } from "@auth/KakaoAuth";
import { loginWithKakaoOnServer } from "@services/authService";

export function useKakaoLogin() {
  const busy = useRef(false);

  const isReady = Platform.OS === "ios"; // iOS만 사용

  const loginWithKakao = useMemo(() => {
    return async () => {
      if (!isReady) throw new Error("iOS 디바이스에서만 지원됩니다.");
      if (busy.current) return; // 더블탭 방지
      busy.current = true;
      try {
        // 1) iOS 네이티브에서 프로필 받기
        const me = await loginWithKakaoProfile();

        // 2) 서버 로그인/회원가입 연동 (JWT 발급, 세션 생성 등)
        const user = await loginWithKakaoOnServer(me);

        return { me, user };
      } finally {
        busy.current = false;
      }
    };
  }, [isReady]);

  return { loginWithKakao, isReady };
}
