// ─── TMDB (The Movie Database) helpers ────────────────────────────────────────
import { loadAnilistAnime } from "./anilist";
import { loadJikanAnime } from "./jikan";
import { loadTvmazeShows } from "./tvmaze";
import { titleKey } from "./constants";

const TMDB_BASE = "https://api.themoviedb.org/3";

export const IMG = {
  poster:    "https://image.tmdb.org/t/p/w342",
  posterLg:  "https://image.tmdb.org/t/p/w500",
  profile:   "https://image.tmdb.org/t/p/w185",
  backdrop:  "https://image.tmdb.org/t/p/w1280",
};

export async function tmdbFetch(key, path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 401 ? "invalid_key" : "api_error");
  return res.json();
}

// Loads the library from four sources with a progress callback:
//   movies & TV → TMDB (deep pull)   ·   anime → AniList + MyAnimeList
//   extra TV    → TVmaze
// Everything is normalised to one item shape, then de-duped by id and by title
// (so the same show from two sources collapses to one).
export async function loadLibrary(key, onProgress) {
  let done = 0;
  const ANILIST_PAGES = 6, JIKAN_PAGES = 6, TVMAZE_PAGES = 8;
  const safe = { include_adult: false };       // ask TMDB to omit adult titles

  // Each TMDB job = one discover/list endpoint pulled across N pages.
  const tmdbJobs = [
    { path: "/discover/movie",     params: { ...safe, sort_by: "popularity.desc", "vote_count.gte": 150 }, pages: 18, type: "Movie" },
    { path: "/movie/top_rated",    params: {},                                                              pages: 8,  type: "Movie" },
    { path: "/trending/movie/week",params: {},                                                              pages: 2,  type: "Movie" },
    { path: "/discover/movie",     params: { ...safe, sort_by: "popularity.desc", with_original_language: "ja", "vote_count.gte": 30 }, pages: 8, type: "Movie" },
    { path: "/discover/tv",        params: { ...safe, sort_by: "popularity.desc", "vote_count.gte": 80, without_genres: "16" }, pages: 14, type: "TV" },
    { path: "/tv/top_rated",       params: {},                                                              pages: 8,  type: "TV" },
    { path: "/trending/tv/week",   params: {},                                                              pages: 2,  type: "TV" },
  ];
  const tmdbPages  = tmdbJobs.reduce((n, j) => n + j.pages, 0);
  const totalPages = tmdbPages + ANILIST_PAGES + JIKAN_PAGES + TVMAZE_PAGES;
  const tick = () => onProgress?.(Math.round((++done / totalPages) * 100));

  const runJob = ({ path, params, pages, type }) =>
    Promise.all(Array.from({ length: pages }, async (_, i) => {
      try {
        const d = await tmdbFetch(key, path, { ...params, page: i + 1 });
        let results = (d.results || []).map(r => ({ ...r, mediaType: type, source: "tmdb" }));
        // top_rated/trending can't exclude animation, so strip anime out of TV
        // here — anime is owned by AniList/MyAnimeList.
        if (type === "TV") results = results.filter(r => !(r.genre_ids || []).includes(16));
        return results;
      } catch (e) {
        if (e.message === "invalid_key") throw e;   // let the app re-prompt for a key
        return [];
      } finally { tick(); }
    })).then(r => r.flat());

  const [tmdb, anilist, mal, tvmaze] = await Promise.all([
    Promise.all(tmdbJobs.map(runJob)).then(r => r.flat()),
    loadAnilistAnime(ANILIST_PAGES, tick),
    loadJikanAnime(JIKAN_PAGES, tick),
    loadTvmazeShows(TVMAZE_PAGES, tick),
  ]);

  // Priority order: the first source to claim a title/id wins (TMDB & AniList
  // are richest, so they come first).
  const combined = [...tmdb, ...anilist, ...mal, ...tvmaze];

  const seenId = new Set(), seenTitle = new Set();
  return combined.filter(item => {
    if (item.adult || isAdultTitle(item)) return false;
    const uid = `${item.id}-${item.mediaType}`;
    const tkey = titleKey(item);
    if (seenId.has(uid) || seenTitle.has(tkey)) return false;
    seenId.add(uid); seenTitle.add(tkey);
    return true;
  });
}

// TMDB's `include_adult` flag misses some erotic/hentai anime, so we also block
// titles whose name contains common adult markers. Cheap, and easy to extend.
const ADULT_PATTERNS = [
  /\bhentai\b/i, /\becchi\b/i, /\bporn\b/i, /\bxxx\b/i, /\berotic\b/i,
  /\b18\s*\+|\br-?18\b/i, /\buncensored\b/i, /\bahegao\b/i, /\byaoi\b/i, /\byuri hentai\b/i,
];
function isAdultTitle(item) {
  const text = `${item.title || ""} ${item.name || ""} ${item.original_title || ""} ${item.original_name || ""}`;
  return ADULT_PATTERNS.some(re => re.test(text));
}
