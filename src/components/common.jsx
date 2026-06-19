import { useState } from "react";
import { Film, Tv, Sparkles, Star, Clapperboard } from "lucide-react";
import { CARD_COLORS, containsArabic, titleOf } from "../lib/constants";
import { IMG } from "../lib/tmdb";

const TYPE_ICON = { Movie: Film, TV: Tv, Anime: Sparkles };

// ─── Poster with graceful fallback ────────────────────────────────────────────
export function Poster({ item, imgBase = IMG.poster, rounded = "" }) {
  const [failed, setFailed] = useState(false);
  const Icon  = TYPE_ICON[item.mediaType || item.media_type] || Film;
  const color = CARD_COLORS[(item.id ?? item.media_id ?? 0) % CARD_COLORS.length];
  // poster_url is a full URL (AniList); poster_path is a live TMDB item;
  // media_poster is what was saved on a review (a TMDB path, or an AniList URL).
  const asImg = v => (v?.startsWith("http") ? v : `${IMG.poster}${v}`);
  const poster = item.poster_url
    ? item.poster_url
    : item.poster_path
      ? `${imgBase}${item.poster_path}`
      : item.media_poster
        ? asImg(item.media_poster)
        : null;

  if (poster && !failed) {
    return (
      <div className={`relative w-full aspect-[2/3] overflow-hidden bg-[#1a1a24] ${rounded}`}>
        <img src={poster} alt={titleOf(item)} loading="lazy"
          className="w-full h-full object-cover" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className={`relative w-full aspect-[2/3] flex items-center justify-center ${rounded}`}
      style={{ background: `linear-gradient(135deg, ${color}cc, ${color}44, #0a0a0f)` }}>
      <Icon className="w-14 h-14 opacity-25 text-white" strokeWidth={1} />
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      <p className="absolute bottom-3 inset-x-3 text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow">
        {titleOf(item)}
      </p>
    </div>
  );
}

// ─── Name that auto-flips to RTL for Arabic ───────────────────────────────────
export function Name({ children, isRtl, className = "" }) {
  const rtl = isRtl ?? containsArabic(children);
  return (
    <span dir={rtl ? "rtl" : "ltr"} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}

// ─── User avatar (initial on a colored disc) ──────────────────────────────────
export function Avatar({ user, size = 40 }) {
  const name = user.display_name || user.email || "?";
  const initial = (containsArabic(name) ? name.trim()[0] : name.trim()[0]?.toUpperCase()) || "?";
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-1 ring-white/10"
      style={{ width: size, height: size, backgroundColor: user.avatar_color || "#a855f7", fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

// ─── Star rating: read-only display, or interactive 1–10 picker ───────────────
export function StarRating({ value = 0, onChange, size = 16, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n === value ? 0 : n)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= active ? "text-amber-400 fill-amber-400" : "text-[#3a3a4a]"}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ message, icon: Icon = Clapperboard }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1a24] border border-[#2a2a3a] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#8b8ba8]" />
      </div>
      <p className="text-[#8b8ba8] text-sm max-w-xs">{message}</p>
    </div>
  );
}
