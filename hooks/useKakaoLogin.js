import React, { useCallback, useRef, useState } from "react";
import * as AuthSession from "expo-auth-session";
import { apiFetch, setTokens } from "@services/authService";
import {
  EXPO_PUBLIC_KAKAO_REST_KEY,
  EXPO_PUBLIC_KAKAO_CLIENT_SECRET,
  EXPO_PUBLIC_OWNER,
  EXPO_PUBLIC_SLUG,
} from "@env";

const KAKAO_CLIENT_ID = EXPO_PUBLIC_KAKAO_REST_KEY || "";
const owner = EXPO_PUBLIC_OWNER || "anonymous";
const slug = EXPO_PUBLIC_SLUG || "app";

// ✅ 하드코딩이 아니라 환경변수로 동적 구성 (TS/JS 공용, 타입 단언 X)
const PROXY_REDIRECT_URI = `https://auth.expo.io/@${owner}/${slug}`;
console.log("KAKAO PROXY_REDIRECT_URI =", PROXY_REDIRECT_URI);
const discovery = {
  authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
  tokenEndpoint: "https://kauth.kakao.com/oauth/token",
};

export function useKakaoLogin() {
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: KAKAO_CLIENT_ID,
      responseType: AuthSession.ResponseType.Code,
      redirectUri: PROXY_REDIRECT_URI, // ① 요청에 사용
      usePKCE: false,
    },
    discovery
  );

  const [isReady, setIsReady] = useState(false);
  React.useEffect(() => setIsReady(!!request), [request]);

  const callingRef = useRef(false);

  const loginWithKakao = useCallback(async () => {
    if (!request) throw new Error("Auth request가 아직 준비되지 않았습니다.");
    if (callingRef.current) return;
    callingRef.current = true;
    try {
      // ② 프롬프트도 프록시 사용 (ephemeral 세션 사용 금지)
      const res = await promptAsync({ useProxy: true });

      if (res.type !== "success" || !res.params?.code) {
        throw new Error("카카오 로그인 취소 또는 실패");
      }
      const code = res.params.code;

      // ③ 토큰 교환 redirect_uri도 ‘같은 문자열’
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: PROXY_REDIRECT_URI,
        code,
      });
      if (EXPO_PUBLIC_KAKAO_CLIENT_SECRET) {
        body.append("client_secret", EXPO_PUBLIC_KAKAO_CLIENT_SECRET);
      }

      const tokenRes = await fetch(discovery.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: body.toString(),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson?.access_token) {
        throw new Error(
          tokenJson?.error_description || "카카오 토큰 교환 실패"
        );
      }

      const r = await apiFetch("/auth/kakao", {
        method: "POST",
        body: JSON.stringify({ accessToken: tokenJson.access_token }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message || "카카오 로그인 실패");

      const payload = json?.data ?? json;
      const accessToken =
        payload?.accessToken ||
        payload?.token ||
        payload?.jwt ||
        payload?.access_token;
      const refreshToken =
        payload?.refreshToken || payload?.refresh_token || null;

      if (!accessToken) throw new Error("서버 응답에 accessToken 없음");

      await setTokens({ accessToken, refreshToken });
      return {
        userId: payload?.userId,
        profileCompleted: !!payload?.profileCompleted,
      };
    } finally {
      callingRef.current = false;
    }
  }, [request, promptAsync]);

  // 필요하면 확인 로그
  // console.log("KAKAO REDIRECT_URI =", PROXY_REDIRECT_URI);

  return { loginWithKakao, isReady };
}
