// 로그인, 토큰 관리
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// ====== 설정 ======
const { SERVER_URL } = Constants.expoConfig?.extra ?? {};
// 끝 슬래시 제거 + 방어
const BASE_URL = String(SERVER_URL || "").replace(/\/+$/, "");

const K_AT = "accessToken";
const K_RT = "refreshToken";

// ====== 토큰 저장/조회/삭제 ======
export const setTokens = async ({ accessToken, refreshToken }) => {
  if (accessToken) await SecureStore.setItemAsync(K_AT, accessToken);
  if (typeof refreshToken === "string") {
    await SecureStore.setItemAsync(K_RT, refreshToken);
  }
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

// ====== 리프레시 토큰으로 액세스 토큰 재발급 (단일비행) ======
let refreshInFlight = null; // Promise | null
async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const rt = await getRefreshToken();
      if (!rt) return null;

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "X-Refresh-Token": rt, // 서버 규약
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}), // 일부 프록시/서버에서 빈 바디 필요할 수 있어 안전하게 추가
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
    } catch {
      return null;
    } finally {
      refreshInFlight = null; // 항상 해제
    }
  })();

  return refreshInFlight;
}

// ====== 공통 fetch: 401 시 리프레시 1회 시도 후 재요청 ======
export async function apiFetch(path, options = {}) {
  if (!BASE_URL && !String(path).startsWith("http")) {
    throw new Error("SERVER_URL이 설정되지 않았습니다.");
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const at = await getAccessToken();

  const baseHeaders = options.headers || {};
  const method = (options.method || "GET").toUpperCase();
  const bodyInput = options.body;

  const hasHeader = (name) =>
    Object.keys(baseHeaders).some(
      (k) => k.toLowerCase() === name.toLowerCase()
    );

  // 바디 유형 판별
  const isFormData =
    (typeof FormData !== "undefined" && bodyInput instanceof FormData) ||
    (bodyInput &&
      typeof bodyInput === "object" &&
      typeof bodyInput.append === "function");

  const isBlob = typeof Blob !== "undefined" && bodyInput instanceof Blob;
  const isAB =
    typeof ArrayBuffer !== "undefined" && bodyInput instanceof ArrayBuffer;
  const isStringBody = typeof bodyInput === "string";

  // JSON 바디 자동 stringify (FormData/Blob/ArrayBuffer/문자열은 그대로)
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

  // GET/HEAD 또는 FormData면 Content-Type 자동 세팅 금지
  const shouldSetCT = !isFormData && !(method === "GET" || method === "HEAD");

  // 헤더 구성
  const headers = {
    ...baseHeaders,
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
    ...(shouldSetCT && !hasHeader("content-type")
      ? { "Content-Type": "application/json; charset=utf-8" }
      : {}),
    ...(!hasHeader("accept") ? { Accept: "application/json" } : {}),
  };

  // === 최초 요청 ===
  let res = await fetch(url, { ...options, headers, body });
  if (res.status !== 401) return res;

  // === 401 처리: 단일비행 리프레시 ===
  const newAT = await refreshAccessToken();
  if (!newAT) {
    await clearTokens();
    if (typeof onLogout === "function") onLogout();
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
  }

  // FormData는 재시도 시 복제(스트림 재사용 방지)
  const cloneFormData = (fd) => {
    const c = new FormData();
    if (Array.isArray(fd?._parts)) {
      fd._parts.forEach(([k, v]) => c.append(k, v));
    } else {
      // 표준 브라우저/Expo 환경
      // eslint-disable-next-line no-unused-vars
      for (const [k, v] of fd) c.append(k, v);
    }
    return c;
  };
  const retryBody = isFormData ? cloneFormData(bodyInput) : body;

  // 새 토큰으로 1회 재시도
  const retryHeaders = { ...headers, Authorization: `Bearer ${newAT}` };
  const retryRes = await fetch(url, {
    ...options,
    headers: retryHeaders,
    body: retryBody,
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

  const json = await res.json().catch(() => null);
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
      type: payload?.type,
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
    body: payload, // ✅ 객체로 전달 (위에서 자동 stringify)
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "회원가입 실패");
  }

  return {
    message: json?.message || "회원가입 완료",
    data: json?.data ?? null,
  };
}
