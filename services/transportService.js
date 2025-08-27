import { SERVER_URL } from "@env";

export const transportService = {
  start: (userId, mode) =>
    fetch(`${SERVER_URL}/transport/start?userId=${userId}&mode=${mode}`, {
      method: "POST",
    }),

  stop: (id, distance) =>
    fetch(`${SERVER_URL}/transport/${id}/stop?distanceM=${distance}`, {
      method: "POST",
    }),

  getBookmarks: (userId) =>
    fetch(`${SERVER_URL}/transport/bookmarks?userId=${userId}`),

  createBookmark: (userId, dto) =>
    fetch(`${SERVER_URL}/transport/bookmarks?userId=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    }),

  updateBookmark: (id, dto) =>
    fetch(`${SERVER_URL}/transport/bookmarks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    }),

  deleteBookmark: (id) =>
    fetch(`${SERVER_URL}/transport/bookmarks/${id}`, { method: "DELETE" }),
};
