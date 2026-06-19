// ─── Backend API client ───────────────────────────────────────────────────────
// All requests are relative ("/api/..."). In dev, Vite proxies these to the
// Express server on :3001; in production the same server serves the app, so the
// path resolves directly.

async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = {};
    try { detail = await res.json(); } catch { /* ignore */ }
    throw new Error(detail.error || `request_failed_${res.status}`);
  }
  return res.json();
}

export const api = {
  getConfig:      ()                 => req("/config"),
  login:          (body)             => req("/auth", { method: "POST", body: JSON.stringify(body) }),
  getUsers:       ()                 => req("/users"),
  getUser:        (id)               => req(`/users/${id}`),
  getMyReviews:   (userId)           => req(`/reviews/mine/${userId}`),
  getMediaReviews:(mediaId, type)    => req(`/reviews/media?mediaId=${mediaId}&mediaType=${encodeURIComponent(type)}`),
  saveReview:     (body)             => req("/reviews", { method: "POST", body: JSON.stringify(body) }),
  deleteReview:   (id, userId)       => req(`/reviews/${id}`, { method: "DELETE", body: JSON.stringify({ userId }) }),
  getFeed:        ()                 => req("/feed"),
};
