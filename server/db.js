// ─── SQLite database layer ────────────────────────────────────────────────────
// A single file-based database (media-tracker.db) that lives on your computer.
// No separate database server needs to run — better-sqlite3 reads/writes the file.

import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "media-tracker.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // better concurrency + durability

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    display_name  TEXT NOT NULL,
    is_rtl        INTEGER NOT NULL DEFAULT 0,
    avatar_color  TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    media_id      INTEGER NOT NULL,
    media_type    TEXT NOT NULL,
    media_title   TEXT NOT NULL,
    media_poster  TEXT,
    media_year    TEXT,
    rating        INTEGER,
    comment       TEXT,
    status        TEXT,
    is_favorite   INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    UNIQUE(user_id, media_id, media_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_media ON reviews(media_id, media_type);
  CREATE INDEX IF NOT EXISTS idx_reviews_user  ON reviews(user_id);
`);

const AVATAR_COLORS = [
  "#a855f7", "#e11d48", "#0891b2", "#16a34a", "#d97706",
  "#7c3aed", "#db2777", "#2563eb", "#059669", "#dc2626",
];

// ─── User queries ───────────────────────────────────────────────────────────
const _userByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const _userById    = db.prepare("SELECT * FROM users WHERE id = ?");
const _insertUser  = db.prepare(`
  INSERT INTO users (id, email, display_name, is_rtl, avatar_color, created_at)
  VALUES (@id, @email, @display_name, @is_rtl, @avatar_color, @created_at)
`);
const _updateUser  = db.prepare(`
  UPDATE users SET display_name = @display_name, is_rtl = @is_rtl WHERE id = @id
`);
const _allUsers    = db.prepare("SELECT * FROM users ORDER BY created_at DESC");

// Log in or register in one step (email-only auth).
export function authUser({ email, displayName, isRtl }) {
  const normEmail = String(email).trim().toLowerCase();
  const name = String(displayName || "").trim() || normEmail.split("@")[0];
  const rtl = isRtl ? 1 : 0;

  const existing = _userByEmail.get(normEmail);
  if (existing) {
    // Update name / RTL preference on each login if changed.
    if (existing.display_name !== name || existing.is_rtl !== rtl) {
      _updateUser.run({ id: existing.id, display_name: name, is_rtl: rtl });
      return _userById.get(existing.id);
    }
    return existing;
  }

  const user = {
    id: randomUUID(),
    email: normEmail,
    display_name: name,
    is_rtl: rtl,
    avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    created_at: Date.now(),
  };
  _insertUser.run(user);
  return user;
}

export function getUserById(id) {
  return _userById.get(id);
}

export function getAllUsers() {
  return _allUsers.all();
}

// ─── Review queries ─────────────────────────────────────────────────────────
const _reviewByUserMedia = db.prepare(
  "SELECT * FROM reviews WHERE user_id = ? AND media_id = ? AND media_type = ?"
);
const _insertReview = db.prepare(`
  INSERT INTO reviews
    (id, user_id, media_id, media_type, media_title, media_poster, media_year,
     rating, comment, status, is_favorite, created_at, updated_at)
  VALUES
    (@id, @user_id, @media_id, @media_type, @media_title, @media_poster, @media_year,
     @rating, @comment, @status, @is_favorite, @created_at, @updated_at)
`);
const _updateReview = db.prepare(`
  UPDATE reviews SET
    media_title = @media_title, media_poster = @media_poster, media_year = @media_year,
    rating = @rating, comment = @comment, status = @status,
    is_favorite = @is_favorite, updated_at = @updated_at
  WHERE id = @id
`);
const _deleteReview = db.prepare("DELETE FROM reviews WHERE id = ? AND user_id = ?");

const _reviewsByUser = db.prepare(`
  SELECT r.*, u.display_name, u.avatar_color, u.is_rtl
  FROM reviews r JOIN users u ON u.id = r.user_id
  WHERE r.user_id = ?
  ORDER BY r.updated_at DESC
`);
const _reviewsByMedia = db.prepare(`
  SELECT r.*, u.display_name, u.avatar_color, u.is_rtl
  FROM reviews r JOIN users u ON u.id = r.user_id
  WHERE r.media_id = ? AND r.media_type = ?
  ORDER BY r.updated_at DESC
`);
const _feed = db.prepare(`
  SELECT r.*, u.display_name, u.avatar_color, u.is_rtl
  FROM reviews r JOIN users u ON u.id = r.user_id
  WHERE r.comment IS NOT NULL AND r.comment != ''
     OR r.rating IS NOT NULL
     OR r.is_favorite = 1
  ORDER BY r.updated_at DESC
  LIMIT 60
`);

// Create or update the current user's review for a given title.
export function upsertReview(userId, payload) {
  const now = Date.now();
  const existing = _reviewByUserMedia.get(userId, payload.mediaId, payload.mediaType);

  const row = {
    user_id: userId,
    media_id: payload.mediaId,
    media_type: payload.mediaType,
    media_title: payload.mediaTitle,
    media_poster: payload.mediaPoster ?? null,
    media_year: payload.mediaYear ?? null,
    rating: payload.rating ?? null,
    comment: payload.comment ?? null,
    status: payload.status ?? null,
    is_favorite: payload.isFavorite ? 1 : 0,
    updated_at: now,
  };

  if (existing) {
    _updateReview.run({ ...row, id: existing.id });
    return _reviewByUserMedia.get(userId, payload.mediaId, payload.mediaType);
  }
  const id = randomUUID();
  _insertReview.run({ ...row, id, created_at: now });
  return _reviewByUserMedia.get(userId, payload.mediaId, payload.mediaType);
}

export function deleteReview(userId, reviewId) {
  return _deleteReview.run(reviewId, userId);
}

export function getReviewsByUser(userId)   { return _reviewsByUser.all(userId); }
export function getReviewsByMedia(id, type){ return _reviewsByMedia.all(id, type); }
export function getFeed()                  { return _feed.all(); }

export default db;
