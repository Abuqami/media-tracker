// ─── TVmaze (extra TV shows) ──────────────────────────────────────────────────
// Free public API, no key. Adds well-known TV that the TMDB pull ranks low or
// misses. TVmaze has no "popular" endpoint, so we scan index pages and keep the
// highest-`weight` shows (its popularity proxy) that have a poster.

import { ID_OFFSET } from "./constants";

const TVMAZE = "https://api.tvmaze.com";
const stripHtml = (s = "") => s.replace(/<[^>]+>/g, "").trim();

async function tget(path) {
  const res = await fetch(`${TVMAZE}${path}`);
  if (!res.ok) throw new Error("tvmaze_error");
  return res.json();
}

function normalize(s) {
  return {
    id: ID_OFFSET.tvmaze + s.id,            // offset so it never clashes with TMDB tv ids
    tvmaze_id: s.id,
    source: "tvmaze",
    mediaType: "TV",
    title: s.name,
    name: s.name,
    poster_url: s.image?.original || s.image?.medium || null,
    backdrop_url: null,
    vote_average: s.rating?.average || null,
    overview: stripHtml(s.summary || ""),
    first_air_date: s.premiered || "",
  };
}

export async function loadTvmazeShows(pages = 8, onTick, minWeight = 88) {
  const jobs = Array.from({ length: pages }, async (_, i) => {
    try { return await tget(`/shows?page=${i}`); }
    catch { return []; }
    finally { onTick?.(); }
  });
  const all = (await Promise.all(jobs)).flat();
  return all
    .filter(s => (s.weight ?? 0) >= minWeight && s.image)
    .map(normalize);
}

// Full details for the modal, with embedded cast.
export async function fetchTvmazeDetails(tvmazeId) {
  const s = await tget(`/shows/${tvmazeId}?embed=cast`);
  // Where it airs / streams — only useful if there's a link to send people to.
  const channel = s.webChannel?.name || s.network?.name;
  const providers = s.officialSite
    ? [{ name: channel || "Official site", url: s.officialSite, logoUrl: null, kind: "stream" }]
    : [];
  return {
    genres: (s.genres || []).map((g, i) => ({ id: i, name: g })),
    overview: stripHtml(s.summary || ""),
    runtime: s.averageRuntime || s.runtime || null,
    number_of_episodes: null,
    number_of_seasons: null,
    tagline: null,
    backdrop_url: null,
    providers,
    cast: (s._embedded?.cast || []).slice(0, 12).map(c => ({
      id: c.person?.id,
      name: c.person?.name || "?",
      character: c.character?.name || "",
      profile_url: c.person?.image?.medium || c.character?.image?.medium || null,
    })),
  };
}
