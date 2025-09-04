// 로그인, 토큰 관리d
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "@env";

// ====== 설정 ======
const BASE_URL = SERVER_URL; // 예: http://10.0.2.2:8080 (Android 에뮬레이터)
const K_AT = "accessToken";
const K_RT = "refreshToken";

// ====== 토큰 저장/조회/삭제 ======
export const setTokens = async ({ accessToken, refreshToken }) => {
  if (accessToken) await SecureStore.setItemAsync(K_AT, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(K_RT, refreshToken);
};

export const getAccessToken = () => SecureStore.getItemAsync(K_AT);
export const getRefreshToken = () => SecureStore.getItemAsync(K_RT);

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(K_AT);
  await SecureStore.deleteItemAsync(K_RT);
};

// ====== 전역 로그아웃 핸들러 주입 (레이아웃에서 set) ======
let onLogout;
export function setLogoutHandler(fn) {
  onLogout = fn;
}

// ====== 리프레시 토큰으로 액세스 토큰 재발급 ======
async function refreshAccessToken() {
  const rt = await getRefreshToken();
  if (!rt) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 서버 규약에 맞게 전달 (여기선 X-Refresh-Token 사용)
      "X-Refresh-Token": rt,
    },
  });

  if (!res.ok) return null;

  const json = await res.json();
  // 서버 응답 형태 유연 처리
  const payload = json?.data ?? json;
  const newAT =
    payload?.accessToken ||
    payload?.token ||
    payload?.jwt ||
    payload?.access_token;
  const newRT = payload?.refreshToken || payload?.refresh_token || null;

  if (!newAT) return null;

  await setTokens({ accessToken: newAT, refreshToken: newRT });
  return newAT;
}

// ====== 공통 fetch: 401 시 리프레시 1회 시도 후 재요청 ======
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const at = await getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status !== 401) return res;

  // 401 → 조용히 재발급 시도
  const newAT = await refreshAccessToken();
  if (!newAT) {
    await clearTokens();
    if (typeof onLogout === "function") onLogout(); // 예: router.replace("/")
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
  }

  // 새 토큰으로 1회 재시도
  const retryRes = await fetch(url, {
    ...options,
    headers: { ...headers, Authorization: `Bearer ${newAT}` },
  });

  if (retryRes.status === 401) {
    await clearTokens();
    if (typeof onLogout === "function") onLogout();
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
  }

  return retryRes;
}

// ====== Auth API ======
export async function login(email, password) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "로그인 실패");

  // 서버 래퍼 대응
  const payload = json?.data ?? json;

  // 유연한 키 추출
  const accessToken =
    payload?.accessToken ||
    payload?.token ||
    payload?.jwt ||
    payload?.access_token;
  const refreshToken = payload?.refreshToken || payload?.refresh_token || null;

  if (!accessToken) {
    // 한 번 콘솔로 실제 응답 구조를 확인해보면 디버깅 빨라짐
    // console.log("login raw:", JSON.stringify(json));
    throw new Error("서버 응답에 accessToken/token이 없습니다.");
  }

  await setTokens({ accessToken, refreshToken });

  // 사용자 정보 리턴(없으면 기본값)
  return (
    payload?.user || {
      userId: payload?.userId,
      profileCompleted: payload?.profileCompleted,
    }
  );
}

export async function logout() {
  await clearTokens();
}

// 내 정보 조회 (보호 API 예시)
export async function me() {
  const res = await apiFetch("/users/me");
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "내 정보 조회 실패");
  return json?.data ?? json;
}

// 회원가입
export async function signupLocal(payload) {
  const res = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message || "회원가입 실패");
  }

  if (json?.success === false) {
    throw new Error(json?.message || "회원가입 실패");
  }

  // 성공: message 포함해서 리턴
  return {
    message: json?.message || "회원가입 완료",
    data: json?.data ?? null,
  };
}
