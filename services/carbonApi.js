// services/carbonApi.js
import { apiFetch } from "@services/authService";

export async function requestCarbon(payload, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await apiFetch("/diet/ingest/calc", {
      method: "POST",
      body: payload,
      signal: ctrl.signal,
    });

    const ct = res.headers.get("content-type") || "";
    let parsed = null;
    if (ct.includes("application/json")) {
      parsed = await res.json().catch(() => null);
    } else {
      const text = await res.text().catch(() => "");
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }

    if (!res.ok) {
      const msg = parsed?.message || parsed?.error || res.statusText;
      throw new Error(`식단 API ${res.status}: ${msg}`);
    }

    return parsed?.data ?? parsed;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("요청이 시간초과되었습니다.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
