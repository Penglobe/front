// services/transportService.js
import axios from "axios";
import { SERVER_URL } from "@env";

const BASE_URL = `${SERVER_URL}/transport`;

/* ===================== 🚗 이동 관련 ===================== */
// 이동 시작
export async function startTransport(userId, mode) {
  const res = await axios.post(`${BASE_URL}/start`, null, {
    params: { userId, mode },
  });
  return res.data.data;
}

// 이동 종료
export async function stopTransport(transportId, distanceM, pathGeojson) {
  const res = await axios.post(
    `${BASE_URL}/${transportId}/stop`,
    pathGeojson || null,
    {
      params: { distanceM },
      headers: { "Content-Type": "application/json" },
    }
  );
  console.log("🚀 stopTransport response:", res.data);
  return res.data.data;
}

/* ===================== ⭐ 북마크 관련 ===================== */
// 북마크 등록
export async function createBookmark(userId, dto) {
  const res = await axios.post(`${BASE_URL}/bookmarks`, dto, {
    params: { userId },
  });
  return res.data.data;
}

// 북마크 목록 조회
export async function listBookmarks(userId) {
  const res = await axios.get(`${BASE_URL}/bookmarks`, {
    params: { userId },
  });
  return res.data.data;
}

// 북마크 수정
export async function updateBookmark(bookmarkId, dto) {
  const res = await axios.put(`${BASE_URL}/bookmarks/${bookmarkId}`, dto);
  return res.data.data;
}

// 북마크 삭제
export async function deleteBookmark(bookmarkId) {
  const res = await axios.delete(`${BASE_URL}/bookmarks/${bookmarkId}`);
  return res.data.data;
}

/* ===================== 🗺️ 카카오 API 프록시 ===================== */
export async function searchAddress(query) {
  const res = await axios.get(`${SERVER_URL}/api/kakao/search`, {
    params: { query },
  });
  return res.data.data; // ApiResponse.data
}
