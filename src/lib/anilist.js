// ─── AniList (anime source) ───────────────────────────────────────────────────
// Free public GraphQL API, no key required. Far bigger anime catalog than TMDB,
// and `isAdult: false` filters hentai at the source — which TMDB can't do well.
// Items are normalised into the same shape the rest of the app already uses, with
// two extra fields (poster_url / backdrop_url) because AniList serves full image
// URLs rather than TMDB-style paths.

const ANILIST_API = "https://graphql.anilist.co";

async function gql(query, variables) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("anilist_error");
  const json = await res.json();
  if (json.errors) throw new Error("anilist_error");
  return json.data;
}

// AniList descriptions come back with light HTML — flatten it to plain text.
const stripHtml = (s = "") =>
  s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();

const pickTitle = t => t?.english || t?.romaji || t?.native || "Untitled";

// Map an AniList media node onto the app's TMDB-ish item shape.
function normalize(m) {
  const title = pickTitle(m.title);
  const year = m.seasonYear || m.startDate?.year || null;
  return {
    id: m.id,
    source: "anilist",
    mediaType: "Anime",
    title,
    name: title,
    poster_url: m.coverImage?.extraLarge || m.coverImage?.large || null,
    backdrop_url: m.bannerImage || null,
    vote_average: m.averageScore ? m.averageScore / 10 : null, // 0–100 → 0–10
    overview: stripHtml(m.description),
    first_air_date: year ? `${year}-01-01` : "",
  };
}

const LIST_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      averageScore
      seasonYear
      startDate { year }
    }
  }
}`;

// Load the most popular non-adult anime. Pages are fetched sequentially so we
// stay friendly with AniList's burst rate limit; onTick fires once per page.
export async function loadAnilistAnime(pages = 5, onTick) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    try {
      const data = await gql(LIST_QUERY, { page: p });
      out.push(...(data.Page.media || []).map(normalize));
    } catch {
      /* skip a failed page rather than blow up the whole library */
    }
    onTick?.();
  }
  return out;
}

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    averageScore
    seasonYear
    startDate { year }
    episodes
    duration
    format
    genres
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges { role node { id name { full } image { large } } }
    }
  }
}`;

const titleCase = s => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

// Full details for the modal: genres, episode count, and characters-as-cast.
export async function fetchAnilistDetails(id) {
  const data = await gql(DETAIL_QUERY, { id: Number(id) });
  const m = data.Media;
  return {
    ...normalize(m),
    genres: (m.genres || []).map((g, i) => ({ id: i, name: g })),
    runtime: m.duration || null,           // minutes per episode
    number_of_episodes: m.episodes || null,
    format: m.format || null,
    cast: (m.characters?.edges || []).map(e => ({
      id: e.node.id,
      name: e.node.name?.full || "?",
      character: titleCase(e.role),         // MAIN / SUPPORTING
      profile_url: e.node.image?.large || null,
    })),
  };
}
