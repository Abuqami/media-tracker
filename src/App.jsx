import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, ListFilter, Loader2 } from "lucide-react";
import { useAuth } from "./auth";
import { api } from "./lib/api";
import { loadLibrary } from "./lib/tmdb";
import {
  VIEWS, FILTERS, PER_PAGE, STATUSES,
  uidOf, titleOf, yearOf,
} from "./lib/constants";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import MediaCard from "./components/MediaCard";
import DetailModal from "./components/DetailModal";
import Profile from "./components/Profile";
import Community from "./components/Community";
import TmdbKeySetup from "./components/TmdbKeySetup";
import { EmptyState } from "./components/common";

export default function App() {
  const { user } = useAuth();

  // ── TMDB key ──
  const [tmdbKey, setTmdbKey]   = useState("");
  const [needKey, setNeedKey]   = useState(false);
  const [keyError, setKeyError] = useState("");

  // ── Library ──
  const [media, setMedia]       = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── My reviews (keyed by uid) ──
  const [myReviews, setMyReviews] = useState({});

  // ── Navigation & filters ──
  const [nav, setNav]           = useState({ page: "browse", userId: null });
  const [search, setSearch]     = useState("");
  const [typeFilter, setType]   = useState("All");
  const [listView, setListView] = useState("All Titles");
  const [pageNum, setPageNum]   = useState(1);
  const [selected, setSelected] = useState(null);

  // Resolve the TMDB key once a user is logged in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { tmdbKey: serverKey } = await api.getConfig();
        if (cancelled) return;
        const stored = localStorage.getItem("tmdb_key");
        if (serverKey)      setTmdbKey(serverKey);
        else if (stored)    setTmdbKey(stored);
        else                setNeedKey(true);
      } catch {
        const stored = localStorage.getItem("tmdb_key");
        if (stored) setTmdbKey(stored); else setNeedKey(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Load my reviews when logged in.
  useEffect(() => {
    if (!user) return;
    api.getMyReviews(user.id)
      .then(({ reviews }) => {
        const map = {};
        reviews.forEach(r => { map[`${r.media_id}-${r.media_type}`] = r; });
        setMyReviews(map);
      })
      .catch(() => {});
  }, [user]);

  // Load the media library once we have a key.
  const fetchLibrary = useCallback(async (key) => {
    setLibLoading(true);
    setProgress(0);
    try {
      const all = await loadLibrary(key, setProgress);
      setMedia(all);
    } catch (e) {
      if (e.message === "invalid_key") {
        localStorage.removeItem("tmdb_key");
        setTmdbKey("");
        setNeedKey(true);
        setKeyError("That API key was rejected. Please try another.");
      }
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load the library when the key becomes available.
    if (tmdbKey) fetchLibrary(tmdbKey);
  }, [tmdbKey, fetchLibrary]);

  // Filter changes reset pagination to page 1 (done in the handlers below).
  const changeSearch   = useCallback(v => { setSearch(v);   setPageNum(1); }, []);
  const changeType     = useCallback(v => { setType(v);     setPageNum(1); }, []);
  const changeListView = useCallback(v => { setListView(v); setPageNum(1); }, []);

  // ── Review mutations ──
  const saveReview = useCallback(async (item, fields) => {
    const uid = uidOf(item);
    const existing = myReviews[uid] || {};
    const merged = {
      status:     fields.status     !== undefined ? fields.status     : (existing.status ?? null),
      rating:     fields.rating     !== undefined ? fields.rating     : (existing.rating ?? null),
      comment:    fields.comment    !== undefined ? fields.comment    : (existing.comment ?? null),
      isFavorite: fields.isFavorite !== undefined ? fields.isFavorite : !!existing.is_favorite,
    };

    // Nothing left to track → remove the review entirely.
    const empty = !merged.status && !merged.rating && !merged.comment && !merged.isFavorite;
    if (empty && existing.id) {
      await api.deleteReview(existing.id, user.id);
      setMyReviews(prev => { const n = { ...prev }; delete n[uid]; return n; });
      return;
    }

    const { review } = await api.saveReview({
      userId: user.id,
      mediaId: item.id ?? item.media_id,
      mediaType: item.mediaType ?? item.media_type,
      mediaTitle: titleOf(item),
      mediaPoster: item.poster_path ?? item.media_poster ?? null,
      mediaYear: yearOf(item) || null,
      ...merged,
    });
    setMyReviews(prev => ({ ...prev, [uid]: review }));
  }, [myReviews, user]);

  const deleteReview = useCallback(async (reviewId, item) => {
    await api.deleteReview(reviewId, user.id);
    setMyReviews(prev => { const n = { ...prev }; delete n[uidOf(item)]; return n; });
  }, [user]);

  // ── Derived browse list ──
  const filtered = useMemo(() => media.filter(item => {
    if (typeFilter !== "All" && item.mediaType !== typeFilter) return false;
    if (search && !titleOf(item).toLowerCase().includes(search.toLowerCase())) return false;
    if (listView !== "All Titles" && myReviews[uidOf(item)]?.status !== listView) return false;
    return true;
  }), [media, typeFilter, search, listView, myReviews]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible    = filtered.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);

  const viewCounts = useMemo(() => {
    const c = { "All Titles": media.length };
    STATUSES.forEach(s => { c[s] = Object.values(myReviews).filter(r => r.status === s).length; });
    return c;
  }, [media, myReviews]);

  const goTo = useCallback((target) => {
    setSelected(null);
    setNav(target);
    window.scrollTo({ top: 0 });
  }, []);

  // ── Gates ──
  if (!user)      return <Login />;
  if (needKey)    return <TmdbKeySetup error={keyError} onSubmit={k => { localStorage.setItem("tmdb_key", k); setNeedKey(false); setKeyError(""); setTmdbKey(k); }} />;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {selected && (
        <DetailModal
          item={selected}
          tmdbKey={tmdbKey}
          myReview={myReviews[uidOf(selected)]}
          currentUser={user}
          onSave={saveReview}
          onDelete={deleteReview}
          onClose={() => setSelected(null)}
          onOpenProfile={(uid) => goTo({ page: "profile", userId: uid })}
        />
      )}

      <Navbar
        page={nav.page}
        onNavigate={goTo}
        search={search}
        onSearch={changeSearch}
        onRefresh={() => fetchLibrary(tmdbKey)}
      />

      {/* ── Community ── */}
      {nav.page === "community" && (
        <main className="flex-1">
          <Community
            currentUser={user}
            onOpenProfile={(uid) => goTo({ page: "profile", userId: uid })}
            onSelectMedia={(item) => setSelected(item)}
          />
        </main>
      )}

      {/* ── Profile ── */}
      {nav.page === "profile" && (
        <main className="flex-1">
          <Profile
            userId={nav.userId}
            currentUser={user}
            onBack={() => goTo({ page: "browse" })}
            onSelectMedia={(item) => setSelected(item)}
          />
        </main>
      )}

      {/* ── Browse ── */}
      {nav.page === "browse" && (
        <>
          {/* Hero / filter bar */}
          <div className="relative overflow-hidden border-b border-[#2a2a3a]">
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(225,29,72,0.05) 0%, transparent 60%)" }} />
            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Collection</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {listView === "All Titles" ? "Discover & Track" : listView}
                  </h1>
                  <p className="text-[#8b8ba8] text-sm mt-0.5">
                    {libLoading ? "Loading…" : `${filtered.length.toLocaleString()} title${filtered.length !== 1 ? "s" : ""}`}
                    {typeFilter !== "All" ? ` · ${typeFilter}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#111118] border border-[#2a2a3a] p-1 rounded-xl self-start sm:self-auto">
                  <ListFilter className="w-4 h-4 text-[#8b8ba8] ml-1.5 mr-0.5 shrink-0" />
                  {FILTERS.map(f => (
                    <button key={f} onClick={() => changeType(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold status-transition cursor-pointer
                        ${typeFilter === f ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25" : "text-[#8b8ba8] hover:text-white hover:bg-white/5"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* List view tabs */}
              <div className="flex items-center gap-1 mt-4 overflow-x-auto scrollbar-hide">
                {VIEWS.map(v => (
                  <button key={v} onClick={() => changeListView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap status-transition cursor-pointer
                      ${listView === v ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40" : "text-[#8b8ba8] hover:text-white hover:bg-white/5"}`}>
                    {v}
                    {v !== "All Titles" && viewCounts[v] > 0 && (
                      <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{viewCounts[v]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-8">
            {libLoading ? (
              <LibraryLoading progress={progress} />
            ) : visible.length === 0 ? (
              <EmptyState message={
                search ? `No results for "${search}".`
                  : listView !== "All Titles" ? `Nothing in "${listView}" yet.`
                  : "No titles match your filters."
              } />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                  {visible.map(item => (
                    <MediaCard
                      key={uidOf(item)}
                      item={item}
                      review={myReviews[uidOf(item)]}
                      onStatusChange={(it, status) => saveReview(it, { status })}
                      onSelect={setSelected}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination page={pageNum} totalPages={totalPages}
                    onChange={p => { setPageNum(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
                )}
                <p className="text-center text-[#8b8ba8] text-xs mt-2">
                  Showing {((pageNum - 1) * PER_PAGE) + 1}–{Math.min(pageNum * PER_PAGE, filtered.length)} of {filtered.length.toLocaleString()}
                </p>
              </>
            )}
          </main>
        </>
      )}

      <footer className="border-t border-[#2a2a3a] py-5 text-center space-y-1">
        <p className="text-white text-sm font-semibold" dir="rtl">عبودكا للافلام</p>
        <p className="text-[#8b8ba8] text-xs">Powered by TMDB · {media.length.toLocaleString()} titles</p>
      </footer>
    </div>
  );
}

// ─── Library loading state ────────────────────────────────────────────────────
function LibraryLoading({ progress }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
      <p className="text-white text-sm font-semibold mb-3">Loading your media universe…</p>
      <div className="w-56 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-600 to-rose-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[#8b8ba8] text-xs mt-3">{progress}%</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function PageBtn({ children, action, disabled, active }) {
  return (
    <button onClick={action} disabled={disabled}
      className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold flex items-center justify-center status-transition
        ${active ? "bg-purple-600 text-white cursor-pointer" : ""}
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
        ${!active && !disabled ? "text-[#8b8ba8] hover:text-white hover:bg-white/5 cursor-pointer" : ""}`}>
      {children}
    </button>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 pt-6 pb-2">
      <PageBtn action={() => onChange(page - 1)} disabled={page === 1}>‹</PageBtn>
      {start > 1 && <><PageBtn action={() => onChange(1)}>1</PageBtn>{start > 2 && <span className="text-[#8b8ba8] text-xs px-1">…</span>}</>}
      {pages.map(p => <PageBtn key={p} action={() => onChange(p)} active={p === page}>{p}</PageBtn>)}
      {end < totalPages && <>{end < totalPages - 1 && <span className="text-[#8b8ba8] text-xs px-1">…</span>}<PageBtn action={() => onChange(totalPages)}>{totalPages}</PageBtn></>}
      <PageBtn action={() => onChange(page + 1)} disabled={page === totalPages}>›</PageBtn>
    </div>
  );
}
