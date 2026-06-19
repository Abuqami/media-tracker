import { useState, useEffect } from "react";
import { Users, Star, Heart, Loader2, Activity } from "lucide-react";
import { api } from "../lib/api";
import { STATUS_META, titleOf } from "../lib/constants";
import { Avatar, Name, Poster, EmptyState } from "./common";

const reviewToItem = r => ({
  id: r.media_id, mediaType: r.media_type,
  title: r.media_title, media_poster: r.media_poster, media_year: r.media_year,
});

const timeAgo = ms => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
};

export default function Community({ currentUser, onOpenProfile, onSelectMedia }) {
  const [users, setUsers]   = useState([]);
  const [feed, setFeed]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getUsers(), api.getFeed()])
      .then(([u, f]) => { setUsers(u.users); setFeed(f.feed); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>;
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Community</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">Members & activity</h1>

      {/* Members */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-[#8b8ba8] uppercase tracking-widest mb-3">Members ({users.length})</h2>
        <div className="flex flex-wrap gap-3">
          {users.map(u => (
            <button key={u.id} onClick={() => onOpenProfile(u.id)}
              className="flex items-center gap-2.5 bg-[#111118] border border-[#2a2a3a] hover:border-purple-500/40 rounded-xl px-3 py-2.5 cursor-pointer transition-all">
              <Avatar user={u} size={36} />
              <div className="text-left">
                <Name isRtl={!!u.is_rtl} className="text-sm font-semibold text-white block leading-tight">{u.display_name}</Name>
                {u.id === currentUser.id && <span className="text-[10px] text-purple-400">You</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Activity feed */}
      <section>
        <h2 className="text-sm font-semibold text-[#8b8ba8] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Recent activity
        </h2>
        {feed.length === 0 ? (
          <EmptyState message="No activity yet. Rate or review a title to get things started!" />
        ) : (
          <div className="space-y-3">
            {feed.map(r => {
              const status = r.status ? STATUS_META[r.status] : null;
              return (
                <div key={r.id} className="flex gap-3 bg-[#111118] border border-[#2a2a3a] rounded-xl p-3">
                  <button onClick={() => onSelectMedia(reviewToItem(r))} className="shrink-0 w-12 cursor-pointer">
                    <div className="rounded-lg overflow-hidden ring-1 ring-[#2a2a3a]"><Poster item={reviewToItem(r)} /></div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button onClick={() => onOpenProfile(r.user_id)} className="flex items-center gap-1.5 cursor-pointer group">
                        <Avatar user={r} size={22} />
                        <Name isRtl={!!r.is_rtl} className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">{r.display_name}</Name>
                      </button>
                      <span className="text-[#8b8ba8] text-xs">· {timeAgo(r.updated_at)}</span>
                    </div>
                    <button onClick={() => onSelectMedia(reviewToItem(r))} className="cursor-pointer text-left">
                      <p className="text-[#c8c8e0] text-sm">
                        <span className="text-[#8b8ba8]">on </span>
                        <span className="font-semibold text-white hover:text-purple-300 transition-colors">{titleOf(r)}</span>
                      </p>
                    </button>
                    <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                      {r.rating ? <span className="flex items-center gap-1 text-xs text-amber-400"><Star className="w-3 h-3 fill-amber-400" />{r.rating}/10</span> : null}
                      {r.is_favorite ? <span className="flex items-center gap-1 text-xs text-rose-400"><Heart className="w-3 h-3 fill-rose-500 text-rose-500" />Favorite</span> : null}
                      {status && <span className={`flex items-center gap-1 text-[10px] ${status.color}`}><status.Icon className="w-3 h-3" />{r.status}</span>}
                    </div>
                    {r.comment && <p className="text-[#c8c8e0] text-sm leading-relaxed mt-1.5" dir="auto">{r.comment}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
