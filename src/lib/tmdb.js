// ─── TMDB (The Movie Database) helpers ────────────────────────────────────────
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

// Loads 500+ titles (US + Japanese movies, TV, and anime) with progress callback.
export async function loadLibrary(key, onProgress) {
  let done = 0;
  const totalPages = 10 + 8 + 6 + 6;

  const track = async (path, params, pages, type) => {
    const jobs = Array.from({ length: pages }, async (_, i) => {
      const d = await tmdbFetch(key, path, { ...params, page: i + 1 });
      done++;
      onProgress?.(Math.round((done / totalPages) * 100));
      return d.results.map(r => ({ ...r, mediaType: type }));
    });
    return (await Promise.all(jobs)).flat();
  };

  const [movies, tv, anime, jpMovies] = await Promise.all([
    track("/discover/movie", { sort_by: "popularity.desc", "vote_count.gte": 150 }, 10, "Movie"),
    track("/discover/tv",    { sort_by: "popularity.desc", "vote_count.gte": 80, without_genres: "16" }, 8, "TV"),
    track("/discover/tv",    { sort_by: "popularity.desc", with_genres: "16", with_original_language: "ja" }, 6, "Anime"),
    track("/discover/movie", { sort_by: "popularity.desc", with_original_language: "ja", "vote_count.gte": 30 }, 6, "Movie"),
  ]);

  const seen = new Set();
  return [...movies, ...tv, ...anime, ...jpMovies].filter(item => {
    const uid = `${item.id}-${item.mediaType}`;
    if (seen.has(uid)) return false;
    seen.add(uid);
    return true;
  });
}
