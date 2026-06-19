// ─── Jikan (MyAnimeList) anime source ─────────────────────────────────────────
// Free public API for MyAnimeList, no key. A second anime source merged with
// AniList for more breadth. `sfw=true` keeps hentai out (belt-and-braces with a
// rating check). Jikan rate-limits ~3 req/s, so pages are paced.

import { ID_OFFSET } from "./constants";

const JIKAN = "https://api.jikan.moe/v4";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stripHtml = (s = "") => s.replace(/<[^>]+>/g, "").trim();

async function jget(path) {
  const res = await fetch(`${JIKAN}${path}`);
  if (!res.ok) throw new Error("jikan_error");
  return res.json();
}

function normalize(a) {
  const year = a.year || (a.aired?.from ? Number(a.aired.from.slice(0, 4)) : null);
  const title = a.title_english || a.title || "Untitled";
  return {
    id: ID_OFFSET.mal + a.mal_id,           // offset so it never clashes with AniList ids
    mal_id: a.mal_id,
    source: "mal",
    mediaType: "Anime",
    title,
    name: title,
    poster_url: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    backdrop_url: null,
    vote_average: a.score || null,
    overview: stripHtml(a.synopsis || ""),
    first_air_date: year ? `${year}-01-01` : "",
  };
}

// Most popular SFW anime from MyAnimeList.
export async function loadJikanAnime(pages = 6, onTick) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    try {
      const d = await jget(`/top/anime?sfw=true&filter=bypopularity&page=${p}`);
      out.push(...(d.data || [])
        .filter(a => a.rating !== "Rx - Hentai")
        .map(normalize));
    } catch {
      /* skip a failed page rather than fail the whole library */
    }
    onTick?.();
    await sleep(400);                        // stay under Jikan's rate limit
  }
  return out;
}

const titleCase = s => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

// Full details for the modal: genres + episodes + characters-as-cast.
export async function fetchJikanDetails(malId) {
  const [full, chars] = await Promise.all([
    jget(`/anime/${malId}/full`),
    jget(`/anime/${malId}/characters`).catch(() => ({ data: [] })),
  ]);
  const a = full.data;
  const dur = a.duration?.match(/(\d+)\s*min/);
  return {
    genres: [...(a.genres || []), ...(a.themes || [])].map(g => ({ id: g.mal_id, name: g.name })),
    overview: stripHtml(a.synopsis || ""),
    runtime: dur ? Number(dur[1]) : null,    // minutes per episode
    number_of_episodes: a.episodes || null,
    number_of_seasons: null,
    tagline: null,
    backdrop_url: null,
    // MyAnimeList tracks legal streaming destinations (Crunchyroll, etc.).
    providers: (a.streaming || [])
      .filter(s => s.url)
      .map(s => ({ name: s.name, url: s.url, logoUrl: null, kind: "stream" })),
    cast: (chars.data || []).slice(0, 12).map(c => ({
      id: c.character?.mal_id,
      name: c.character?.name || "?",
      character: titleCase(c.role || ""),
      profile_url: c.character?.images?.jpg?.image_url || null,
    })),
  };
}
