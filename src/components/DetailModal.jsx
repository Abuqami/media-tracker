import { useState, useEffect, useCallback } from "react";
import {
  X, Star, Clock, Calendar, Users, PlayCircle, Heart,
  MessageSquare, Save, Trash2, Loader2, ExternalLink, Play,
} from "lucide-react";
import { TYPE_BADGE, STATUS_META, titleOf, yearOf, CARD_COLORS, ID_OFFSET, sourceOf } from "../lib/constants";
import { tmdbFetch, fetchWatchProviders, IMG } from "../lib/tmdb";
import { fetchAnilistDetails } from "../lib/anilist";
import { fetchJikanDetails } from "../lib/jikan";
import { fetchTvmazeDetails } from "../lib/tvmaze";
import { api } from "../lib/api";
import { Poster, Avatar, Name, StarRating } from "./common";
import StatusDropdown from "./StatusDropdown";

const IS_MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export default function DetailModal({ item, tmdbKey, myReview, currentUser, onSave, onDelete, onClose, onOpenProfile }) {
  const [details, setDetails]   = useState(null);
  const [cast, setCast]         = useState([]);
  const [loadingDet, setLoadDet]= useState(true);
  const [community, setCommunity] = useState([]);
  const [loadingCom, setLoadCom]= useState(true);
  const [backdropErr, setBackErr] = useState(false);

  // My editable review state
  const [status, setStatus]     = useState(myReview?.status || null);
  const [rating, setRating]     = useState(myReview?.rating || 0);
  const [comment, setComment]   = useState(myReview?.comment || "");
  const [favorite, setFavorite] = useState(!!myReview?.is_favorite);
  const [pSeason, setPSeason]   = useState(myReview?.progress_season ?? null);
  const [pEpisode, setPEpisode] = useState(myReview?.progress_episode ?? null);
  const [saving, setSaving]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Exact "where to watch" deep-links keyed by normalised service name (Watchmode).
  const [watchExact, setWatchExact] = useState({});

  const source   = sourceOf(item);
  const isAnime  = item.mediaType === "Anime";
  const isMovie  = item.mediaType === "Movie";
  const endpoint = isMovie ? `/movie/${item.id}` : `/tv/${item.id}`;
  const credPath = isMovie ? `/movie/${item.id}/credits` : `/tv/${item.id}/aggregate_credits`;
  const scoreLabel = { anilist: "AniList", mal: "MAL", tvmaze: "TVmaze", tmdb: "TMDB" }[source];

  // Fetch details + cast from whichever API this item came from.
  useEffect(() => {
    setLoadDet(true);
    let load;
    if (source === "anilist") {
      load = fetchAnilistDetails(item.id).then(d => { setDetails(d); setCast(d.cast || []); });
    } else if (source === "mal") {
      const malId = item.mal_id ?? (Number(item.id) - ID_OFFSET.mal);
      load = fetchJikanDetails(malId).then(d => { setDetails(d); setCast(d.cast || []); });
    } else if (source === "tvmaze") {
      const tvId = item.tvmaze_id ?? (Number(item.id) - ID_OFFSET.tvmaze);
      load = fetchTvmazeDetails(tvId).then(d => { setDetails(d); setCast(d.cast || []); });
    } else {
      const region = (navigator.language || "en-US").split("-")[1]?.toUpperCase() || "US";
      load = Promise.all([
        tmdbFetch(tmdbKey, endpoint),
        tmdbFetch(tmdbKey, credPath),
        fetchWatchProviders(tmdbKey, item.mediaType, item.id, region, titleOf(item)).catch(() => ({ providers: [], link: null })),
      ]).then(([det, cred, watch]) => {
        setDetails({ ...det, providers: watch.providers, watchLink: watch.link });
        setCast((cred.cast || []).slice(0, 10));
      });
    }
    load.catch(() => {}).finally(() => setLoadDet(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.mediaType]);

  // Fetch everyone's reviews for this title
  const loadCommunity = useCallback(() => {
    setLoadCom(true);
    api.getMediaReviews(item.id, item.mediaType)
      .then(({ reviews }) => setCommunity(reviews))
      .catch(() => setCommunity([]))
      .finally(() => setLoadCom(false));
  }, [item.id, item.mediaType]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  // Exact per-service deep-links (Watchmode). Only TMDB items carry a real TMDB
  // id; AniList/MAL/TVmaze ids would resolve to the wrong title, so skip them.
  useEffect(() => {
    setWatchExact({});
    if (source !== "tmdb") return;
    const region = (navigator.language || "en-US").split("-")[1]?.toUpperCase() || "US";
    api.getWatchSources(item.id, item.mediaType)
      .then(({ sources }) => {
        if (!sources?.length) return;
        const map = {};
        const add = s => {
          const k = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (k && !map[k]) map[k] = s.web_url;
        };
        sources.filter(s => s.region === region).forEach(add);  // prefer my region
        sources.forEach(add);                                   // then any region
        setWatchExact(map);
      })
      .catch(() => {});
  }, [item.id, item.mediaType, source]);

  // Best deep-link for a provider: exact title page if Watchmode has it, else
  // the service-search link TMDB gave us.
  const exactUrl = name => {
    const norm = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (watchExact[norm]) return watchExact[norm];
    const hit = Object.keys(watchExact).find(k => k.includes(norm) || norm.includes(k));
    return hit ? watchExact[hit] : null;
  };

  // On phones, nudge known services to open their installed app instead of the
  // browser. Best-effort: only services with a graceful app-link are rewritten
  // (Amazon's host falls back to a "get the app" page when it isn't installed).
  const finalUrl = (name, url) => {
    if (!IS_MOBILE || !url) return url;
    const n = (name || "").toLowerCase();
    if (/prime|amazon/.test(n)) {
      const gti = url.match(/primevideo\.com\/detail\/([^/?#]+)/)?.[1];
      if (gti) return `https://watch.amazon.com/detail?gti=${gti}`;
    }
    return url;   // Netflix / YouTube / etc. already open their app via the https link
  };

  // Esc to close + lock scroll
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item, {
        status, rating: rating || null, comment: comment.trim() || null, isFavorite: favorite,
        progressSeason: pSeason || null, progressEpisode: pEpisode || null,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      loadCommunity();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    setSaving(true);
    try {
      await onDelete(myReview.id, item);
      setStatus(null); setRating(0); setComment(""); setFavorite(false);
      setPSeason(null); setPEpisode(null);
      loadCommunity();
    } finally { setSaving(false); }
  };

  const fmtRuntime = m => m ? (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`) : null;
  const genres = details?.genres || [];
  const overview = item.overview || details?.overview || "";
  const runtime = details?.runtime;
  const seasons = details?.number_of_seasons;
  const episodes = details?.number_of_episodes;
  const tagline = details?.tagline;
  const providers = details?.providers || [];
  const watchLink = details?.watchLink || null;
  const color = CARD_COLORS[item.id % CARD_COLORS.length];
  const backdropSrc = item.backdrop_url || details?.backdrop_url
    || (item.backdrop_path ? `${IMG.backdrop}${item.backdrop_path}` : null);

  // Average community rating
  const rated = community.filter(r => r.rating);
  const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : null;
  const otherReviews = community.filter(r => r.user_id !== currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#0e0e16] border border-[#2a2a3a] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh]">
        <button onClick={onClose}
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1 scrollbar-hide">
          {/* Backdrop */}
          <div className="relative h-52 sm:h-72 shrink-0 overflow-hidden bg-[#1a1a24]">
            {backdropSrc && !backdropErr ? (
              <img src={backdropSrc} alt="" className="w-full h-full object-cover" onError={() => setBackErr(true)} />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${color}88, #0e0e16)` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e16] via-[#0e0e16]/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e16]/50 to-transparent" />
          </div>

          {/* Header */}
          <div className="flex gap-5 px-5 sm:px-7 -mt-24 relative z-10">
            <div className="shrink-0 w-28 sm:w-40 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 self-end">
              <Poster item={item} imgBase={IMG.posterLg} />
            </div>
            <div className="flex-1 min-w-0 pt-28 pb-2">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${TYPE_BADGE[item.mediaType]}`}>{item.mediaType}</span>
                {yearOf(item) && <span className="flex items-center gap-1 text-[#8b8ba8] text-xs"><Calendar className="w-3 h-3" />{yearOf(item)}</span>}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-1">{titleOf(item)}</h2>
              {tagline && <p className="text-[#8b8ba8] text-sm italic mb-2 line-clamp-2">"{tagline}"</p>}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-white text-sm">{item.vote_average ? item.vote_average.toFixed(1) : "—"}</span>
                  <span className="text-[#8b8ba8] text-xs">{scoreLabel}</span>
                </div>
                {avg && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold text-white text-sm">{avg}</span>
                    <span className="text-[#8b8ba8] text-xs">friends ({rated.length})</span>
                  </div>
                )}
                {runtime && <div className="flex items-center gap-1 text-[#8b8ba8] text-xs"><Clock className="w-3.5 h-3.5" />{fmtRuntime(runtime)}{isAnime ? "/ep" : ""}</div>}
                {seasons
                  ? <div className="flex items-center gap-1 text-[#8b8ba8] text-xs"><PlayCircle className="w-3.5 h-3.5" />{seasons} season{seasons > 1 ? "s" : ""}{episodes ? ` · ${episodes} eps` : ""}</div>
                  : episodes ? <div className="flex items-center gap-1 text-[#8b8ba8] text-xs"><PlayCircle className="w-3.5 h-3.5" />{episodes} ep{episodes > 1 ? "s" : ""}</div> : null}
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-7 pt-4 pb-6 space-y-6">
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map(g => <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-[#8b8ba8] font-medium">{g.name}</span>)}
              </div>
            )}

            {overview && (
              <div>
                <h3 className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-2">Overview</h3>
                <p className="text-[#c8c8e0] text-sm leading-relaxed" dir="auto">{overview}</p>
              </div>
            )}

            {/* ── Where to watch ── */}
            {(providers.length > 0 || watchLink) && (
              <div>
                <h3 className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-emerald-400" /> Where to watch
                </h3>
                {providers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {providers.map(p => (
                      // On mobile, navigate in the same tab so iOS/Android can hand
                      // off to the installed app (new-tab opens suppress that).
                      <a key={`${p.name}-${p.kind}`} href={finalUrl(p.name, exactUrl(p.name) || p.url)}
                        {...(IS_MOBILE ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 rounded-lg text-sm text-white status-transition cursor-pointer group">
                        {p.logoUrl
                          ? <img src={p.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover" />
                          : <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center"><PlayCircle className="w-3.5 h-3.5 text-white" /></span>}
                        <span className="font-medium">{p.name}</span>
                        {p.kind && p.kind !== "stream" && <span className="text-[10px] text-[#8b8ba8] uppercase">{p.kind}</span>}
                        <ExternalLink className="w-3 h-3 text-[#8b8ba8] group-hover:text-emerald-400" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <a href={watchLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 rounded-lg text-sm text-white status-transition cursor-pointer">
                    See streaming options <ExternalLink className="w-3 h-3 text-[#8b8ba8]" />
                  </a>
                )}
                {providers.length > 0 && watchLink && (
                  <a href={watchLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#8b8ba8] hover:text-emerald-400 mt-2 cursor-pointer">
                    More options <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* ── My review editor ── */}
            <div className="bg-[#15151f] border border-[#2a2a3a] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-purple-400" /> My Review</h3>
                <button onClick={() => setFavorite(f => !f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold status-transition cursor-pointer ring-1
                    ${favorite ? "bg-rose-500/15 text-rose-400 ring-rose-500/40" : "bg-white/5 text-[#8b8ba8] ring-white/10 hover:text-white"}`}>
                  <Heart className={`w-3.5 h-3.5 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} /> Favorite
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#8b8ba8] uppercase tracking-wider mb-1.5 block">Status</label>
                  <StatusDropdown status={status} onChange={setStatus} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#8b8ba8] uppercase tracking-wider mb-1.5 block">
                    My rating {rating ? <span className="text-amber-400">· {rating}/10</span> : ""}
                  </label>
                  <div className="py-1.5"><StarRating value={rating} onChange={setRating} size={18} /></div>
                </div>
              </div>

              {/* ── Episode progress (episodic titles only) ── */}
              {!isMovie && (
                <div>
                  <label className="text-[11px] font-semibold text-[#8b8ba8] uppercase tracking-wider mb-1.5 block">
                    Where I've reached
                    {(pSeason || pEpisode) && (
                      <span className="text-blue-400 normal-case tracking-normal">
                        {" · "}{pSeason ? `S${pSeason}` : ""}{pSeason && pEpisode ? " " : ""}{pEpisode ? `E${pEpisode}` : ""}
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {!isAnime && <Stepper label="Season" value={pSeason} onChange={setPSeason} max={seasons || undefined} />}
                    <Stepper label="Episode" value={pEpisode} onChange={setPEpisode} />
                    {(pSeason || pEpisode) && (
                      <button onClick={() => { setPSeason(null); setPEpisode(null); }}
                        className="text-xs text-[#8b8ba8] hover:text-rose-400 cursor-pointer self-end pb-1.5">Clear</button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-[#8b8ba8] uppercase tracking-wider mb-1.5 block">My thoughts</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} dir="auto" rows={3}
                  placeholder="What did you think? (visible to everyone)"
                  className="w-full px-3 py-2 bg-[#0e0e16] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#8b8ba8] focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none" />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savedFlash ? "Saved!" : "Save review"}
                </button>
                {myReview && (
                  <button onClick={handleDelete} disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-rose-500/10 text-[#8b8ba8] hover:text-rose-400 text-sm font-semibold rounded-lg cursor-pointer transition-colors">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
            </div>

            {/* ── Community reviews ── */}
            <div>
              <h3 className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> What others think {otherReviews.length > 0 && `(${otherReviews.length})`}
              </h3>
              {loadingCom ? (
                <p className="text-[#8b8ba8] text-sm">Loading…</p>
              ) : otherReviews.length === 0 ? (
                <p className="text-[#8b8ba8] text-sm">No one else has reviewed this yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {otherReviews.map(r => (
                    <ReviewItem key={r.id} review={r} onOpenProfile={onOpenProfile} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Cast ── */}
            {!loadingDet && cast.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Cast</h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {cast.map(m => {
                    const char = m.character || m.roles?.[0]?.character || "";
                    return (
                      <div key={m.id} className="shrink-0 w-[72px] text-center">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1a1a24] mx-auto mb-1.5 ring-1 ring-white/10">
                          {m.profile_url || m.profile_path
                            ? <img src={m.profile_url || `${IMG.profile}${m.profile_path}`} alt={m.name} loading="lazy" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-purple-700 to-rose-700">{(m.name || "?")[0]}</div>}
                        </div>
                        <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{m.name}</p>
                        {char && <p className="text-[#8b8ba8] text-[9px] line-clamp-1 mt-0.5">{char}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Season / episode stepper ─────────────────────────────────────────────────
function Stepper({ label, value, onChange, min = 1, max }) {
  const v = value ?? null;
  const clamp = n => (n < min ? null : (max ? Math.min(n, max) : n));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-[#8b8ba8] uppercase tracking-wider">{label}</span>
      <div className="flex items-center bg-[#0e0e16] border border-[#2a2a3a] rounded-lg overflow-hidden">
        <button onClick={() => onChange(clamp((v ?? min) - 1))}
          className="w-8 h-8 flex items-center justify-center text-[#8b8ba8] hover:text-white hover:bg-white/5 cursor-pointer transition-colors text-lg leading-none">−</button>
        <span className="w-9 text-center text-sm font-semibold text-white tabular-nums">{v ?? "—"}</span>
        <button onClick={() => onChange(clamp((v ?? min - 1) + 1))}
          className="w-8 h-8 flex items-center justify-center text-[#8b8ba8] hover:text-white hover:bg-white/5 cursor-pointer transition-colors text-lg leading-none">+</button>
      </div>
    </div>
  );
}

// ─── A single community review row ────────────────────────────────────────────
function ReviewItem({ review: r, onOpenProfile }) {
  const status = r.status ? STATUS_META[r.status] : null;
  return (
    <div className="bg-[#15151f] border border-[#2a2a3a] rounded-xl p-3">
      <div className="flex items-center gap-2.5 mb-2">
        <button onClick={() => onOpenProfile?.(r.user_id)} className="cursor-pointer">
          <Avatar user={r} size={32} />
        </button>
        <div className="min-w-0">
          <button onClick={() => onOpenProfile?.(r.user_id)} className="cursor-pointer hover:text-purple-300 transition-colors">
            <Name isRtl={!!r.is_rtl} className="text-sm font-semibold text-white">{r.display_name}</Name>
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            {r.rating ? (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" /> {r.rating}/10
              </span>
            ) : null}
            {r.is_favorite ? <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> : null}
            {status && <span className={`flex items-center gap-1 text-[10px] ${status.color}`}><status.Icon className="w-3 h-3" />{r.status}</span>}
          </div>
        </div>
      </div>
      {r.comment && <p className="text-[#c8c8e0] text-sm leading-relaxed" dir="auto">{r.comment}</p>}
    </div>
  );
}
