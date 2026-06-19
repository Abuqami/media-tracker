import { BookmarkPlus, Eye, CheckCircle2 } from "lucide-react";

export const STATUSES = ["Plan to Watch", "Currently Watching", "Watched"];
export const VIEWS    = ["All Titles", "Plan to Watch", "Currently Watching", "Watched"];
export const FILTERS  = ["All", "Movie", "TV", "Anime"];
export const PER_PAGE = 120;

export const CARD_COLORS = [
  "#c2410c", "#b45309", "#0f766e", "#1d4ed8", "#7c3aed",
  "#15803d", "#b91c1c", "#a16207", "#0369a1", "#be185d",
  "#0e7490", "#4338ca", "#065f46", "#9333ea", "#b45309",
];

export const STATUS_META = {
  "Plan to Watch":      { Icon: BookmarkPlus, color: "text-amber-400",   bg: "bg-amber-400/10   hover:bg-amber-400/20",   ring: "ring-amber-400/40",   dot: "bg-amber-400"   },
  "Currently Watching": { Icon: Eye,          color: "text-blue-400",    bg: "bg-blue-400/10    hover:bg-blue-400/20",    ring: "ring-blue-400/40",    dot: "bg-blue-400"    },
  "Watched":            { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 hover:bg-emerald-400/20", ring: "ring-emerald-400/40", dot: "bg-emerald-400" },
};

export const TYPE_BADGE = {
  Movie: "bg-rose-700/80 text-rose-100",
  TV:    "bg-blue-700/80 text-blue-100",
  Anime: "bg-purple-700/80 text-purple-100",
};

// ─── Small helpers ──────────────────────────────────────────────────────────
// True if the text contains Arabic characters → used to switch names to RTL.
export const containsArabic = (text = "") => /[؀-ۿݐ-ݿ]/.test(text);

export const uidOf   = item => `${item.id ?? item.media_id}-${item.mediaType ?? item.media_type}`;
export const titleOf = item => item.title || item.name || item.media_title || "Untitled";
export const yearOf  = item => (item.release_date || item.first_air_date || item.media_year || "").slice(0, 4);

// ─── Multi-source helpers ─────────────────────────────────────────────────────
// Titles come from several APIs (TMDB, AniList, MyAnimeList, TVmaze). We keep
// them in one numeric id space by offsetting the secondary anime/TV sources, so
// uids stay unique AND a saved item's source can be recovered from its id alone.
export const ID_OFFSET = { mal: 100_000_000, tvmaze: 200_000_000 };

export function sourceOf(item) {
  if (item.source) return item.source;
  const id   = Number(item.id ?? item.media_id);
  const type = item.mediaType ?? item.media_type;
  if (type === "Anime") return id >= ID_OFFSET.mal ? "mal" : "anilist";
  if (type === "TV" && id >= ID_OFFSET.tvmaze) return "tvmaze";
  return "tmdb";
}

// Build the minimal "item" the detail modal can open from a saved review row.
export const reviewToItem = r => ({
  id: r.media_id, mediaType: r.media_type, source: sourceOf(r),
  title: r.media_title, media_poster: r.media_poster, media_year: r.media_year,
});

// Normalised key used to drop the same show when it appears in two sources.
export const titleKey = item =>
  `${item.mediaType ?? item.media_type}::${titleOf(item).toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
