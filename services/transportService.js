// services/transportService.js
import { apiFetch } from "@services/authService";

/* ===================== 🚗 이동 관련 ===================== */
// 이동 시작
export async function startTransport(mode) {
  console.log("🚀 startTransport 호출 mode:", mode, typeof mode);
  const res = await apiFetch(`/transport/start?mode=${mode}`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "이동 시작 실패");
  return json?.data ?? null;
}

// 이동 종료
export async function stopTransport(transportId, distanceM, pathGeojson) {
  const res = await apiFetch(
    `/transport/${transportId}/stop?distanceM=${distanceM}`,
    {
      method: "POST",
      body: pathGeojson || null,
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "이동 종료 실패");
  return json?.data ?? null;
}

/* ===================== ⭐ 북마크 관련 ===================== */
// 북마크 등록
export async function createBookmark(dto) {
  const res = await apiFetch(`/transport/bookmarks`, {
    method: "POST",
    body: dto,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "북마크 등록 실패");
  return json?.data ?? null;
}

// 북마크 목록 조회
export async function listBookmarks() {
  const res = await apiFetch(`/transport/bookmarks`, { method: "GET" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "북마크 조회 실패");
  return json?.data ?? [];
}

// 북마크 수정
export async function updateBookmark(bookmarkId, dto) {
  const res = await apiFetch(`/transport/bookmarks/${bookmarkId}`, {
    method: "PUT",
    body: dto,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "북마크 수정 실패");
  return json?.data ?? null;
}

// 북마크 삭제
export async function deleteBookmark(bookmarkId) {
  const res = await apiFetch(`/transport/bookmarks/${bookmarkId}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "북마크 삭제 실패");
  return json?.data ?? null;
}

/* ===================== 🗺️ 카카오 API 프록시 ===================== */
export async function searchAddress(query) {
  const res = await apiFetch(
    `/api/kakao/search?query=${encodeURIComponent(query)}`,
    {
      method: "GET",
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "주소 검색 실패");
  return json?.data ?? [];
}
