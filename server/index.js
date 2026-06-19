// ─── Express API + static host ────────────────────────────────────────────────
// Serves the JSON API under /api and, in production, the built React app from
// /dist. Running this single process (one port) is all that's needed to share
// the app with friends through one ngrok tunnel.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

import {
  authUser, getUserById, getAllUsers,
  upsertReview, deleteReview,
  getReviewsByUser, getReviewsByMedia, getFeed,
} from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────
const wrap = fn => (req, res) => {
  try { fn(req, res); }
  catch (e) { console.error(e); res.status(500).json({ error: "server_error" }); }
};

// ─── Config (exposes the shared TMDB key so friends don't each need one) ───────
app.get("/api/config", (req, res) => {
  res.json({ tmdbKey: process.env.TMDB_API_KEY || null });
});

// ─── Auth (email-only: log in or register in one step) ─────────────────────────
app.post("/api/auth", wrap((req, res) => {
  const { email, displayName, isRtl } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "invalid_email" });
  }
  const user = authUser({ email, displayName, isRtl });
  res.json({ user });
}));

// ─── Users ──────────────────────────────────────────────────────────────────
app.get("/api/users", wrap((req, res) => {
  res.json({ users: getAllUsers() });
}));

app.get("/api/users/:id", wrap((req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({ user, reviews: getReviewsByUser(user.id) });
}));

// ─── Reviews ──────────────────────────────────────────────────────────────────
// All of MY reviews (used to hydrate the grid on login).
app.get("/api/reviews/mine/:userId", wrap((req, res) => {
  res.json({ reviews: getReviewsByUser(req.params.userId) });
}));

// Everyone's reviews for one title (shown in the detail modal).
app.get("/api/reviews/media", wrap((req, res) => {
  const { mediaId, mediaType } = req.query;
  if (!mediaId || !mediaType) return res.status(400).json({ error: "missing_params" });
  res.json({ reviews: getReviewsByMedia(Number(mediaId), String(mediaType)) });
}));

// Create / update my review for a title.
app.post("/api/reviews", wrap((req, res) => {
  const { userId, ...payload } = req.body || {};
  if (!userId || !getUserById(userId)) return res.status(401).json({ error: "unauthorized" });
  if (!payload.mediaId || !payload.mediaType || !payload.mediaTitle) {
    return res.status(400).json({ error: "missing_media" });
  }
  res.json({ review: upsertReview(userId, payload) });
}));

// Delete my review.
app.delete("/api/reviews/:id", wrap((req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  deleteReview(userId, req.params.id);
  res.json({ ok: true });
}));

// Community feed — recent activity across all users.
app.get("/api/feed", wrap((req, res) => {
  res.json({ feed: getFeed() });
}));

// ─── Serve built frontend (production / sharing) ───────────────────────────────
const DIST = join(__dirname, "..", "dist");
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback: anything not under /api returns index.html.
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(DIST, "index.html")));
}

app.listen(PORT, () => {
  console.log(`\n  عبودكا للافلام — server running`);
  console.log(`  → API:  http://localhost:${PORT}/api`);
  console.log(`  → App:  http://localhost:${PORT}${existsSync(DIST) ? "" : "  (run `npm run build` to serve the app here)"}`);
  console.log(`  → TMDB key: ${process.env.TMDB_API_KEY ? "loaded from .env" : "not set (users will be asked for one)"}\n`);
});
