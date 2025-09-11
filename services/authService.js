// 로그인, 토큰 관리
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ====== 설정 ======

const { SERVER_URL } = Constants.expoConfig.extra;
const BASE_URL = `${SERVER_URL}`;

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
      // 서버 규약에 맞게 전달
      "X-Refresh-Token": rt,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
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

  const baseHeaders = options.headers || {};
  const bodyInput = options.body;

  const hasHeader = (name) =>
    Object.keys(baseHeaders).some(
      (k) => k.toLowerCase() === name.toLowerCase()
    );

  // FormData 판별 (RN 호환)
  const isFormData =
    (typeof FormData !== "undefined" && bodyInput instanceof FormData) ||
    (bodyInput &&
      typeof bodyInput === "object" &&
      typeof bodyInput.append === "function");

  const isBlob = typeof Blob !== "undefined" && bodyInput instanceof Blob;
  const isAB =
    typeof ArrayBuffer !== "undefined" && bodyInput instanceof ArrayBuffer;
  const isStringBody = typeof bodyInput === "string";

  // JSON 바디 자동 stringify (FormData/Blob/ArrayBuffer/문자열은 건드리지 않음)
  let body = bodyInput;
  if (
    !isFormData &&
    !isBlob &&
    !isAB &&
    bodyInput != null &&
    typeof bodyInput === "object" &&
    !isStringBody
  ) {
    body = JSON.stringify(bodyInput);
  }

  // 헤더 구성
  const headers = {
    ...baseHeaders,
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
    ...(!isFormData && !hasHeader("content-type")
      ? { "Content-Type": "application/json; charset=utf-8" }
      : {}),
    ...(!hasHeader("accept") ? { Accept: "application/json" } : {}),
  };

  let res = await fetch(url, { ...options, headers, body });
  if (res.status !== 401) return res;

  // 401 → 조용히 재발급 시도
  const newAT = await refreshAccessToken();
  if (!newAT) {
    await clearTokens();
    if (typeof onLogout === "function") onLogout();
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
  }

  // 새 토큰으로 1회 재시도
  const retryHeaders = { ...headers, Authorization: `Bearer ${newAT}` };
  const retryRes = await fetch(url, {
    ...options,
    headers: retryHeaders,
    body,
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
    body: { email, password }, // 객체로 보내면 apiFetch가 자동 stringify
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "로그인 실패");

  const payload = json?.data ?? json;

  const accessToken =
    payload?.accessToken ||
    payload?.token ||
    payload?.jwt ||
    payload?.access_token;
  const refreshToken = payload?.refreshToken || payload?.refresh_token || null;

  if (!accessToken)
    throw new Error("서버 응답에 accessToken/token이 없습니다.");

  await setTokens({ accessToken, refreshToken });

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

export async function me() {
  const res = await apiFetch("/users/me", { method: "GET" });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || "me 조회 실패");
  return json?.data ?? json;
}

export async function signupLocal(payload) {
  const res = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload), // 객체 → 자동 stringify
  });

  const json = await res.json();

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "회원가입 실패");
  }

  return {
    message: json?.message || "회원가입 완료",
    data: json?.data ?? null,
  };
}

// 카카오 로그인/회원가입
export async function loginWithKakaoOnServer(me) {
  // RN 네이티브 모듈에서 받은 카카오 accessToken 사용
  const payload = { accessToken: me?.accessToken };

  const res = await fetch(`${BASE_URL}/auth/kakao`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "카카오 서버 로그인 실패");
  }

  const data = json?.data ?? json;

  // 서버가 발급한 JWT 토큰 추출
  const accessToken =
    data?.accessToken || data?.token || data?.jwt || data?.access_token;
  const refreshToken = data?.refreshToken || data?.refresh_token || null;

  if (accessToken) {
    await setTokens({ accessToken, refreshToken });
  }

  // 서버가 내려주는 user 객체 반환
  return data?.user ?? null;
}
