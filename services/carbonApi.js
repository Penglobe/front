export async function requestCarbon(payload) {
  const url = `${process.env.SERVER_URL}/diet/${userId}`;
  console.log("📤 요청 URL:", url);
  console.log("📤 요청 Payload:", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // 응답 실패
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Carbon API ${res.status}: ${text || res.statusText}`);
  }

  // 응답 성공
  return res.json();
}
