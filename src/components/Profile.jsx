import { useState, useEffect } from "react";
import {
  ArrowLeft, Heart, Star, CheckCircle2, Eye, BookmarkPlus,
  MessageSquare, Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { STATUS_META, titleOf, yearOf } from "../lib/constants";
import { Avatar, Name, Poster, EmptyState } from "./common";

// Build a minimal "item" the detail modal can open from a saved review row.
const reviewToItem = r => ({
  id: r.media_id, mediaType: r.media_type,
  title: r.media_title, media_poster: r.media_poster, media_year: r.media_year,
});

export default function Profile({ userId, currentUser, onBack, onSelectMedia }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMe = userId === currentUser.id;

  useEffect(() => {
    setLoading(true);
    api.getUser(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>;
  }
  if (!data?.user) {
    return <EmptyState message="This profile could not be found." />;
  }

  const { user, reviews } = data;
  const favorites = reviews.filter(r => r.is_favorite);
  const reviewed  = reviews.filter(r => r.comment || r.rating);
  const count = s => reviews.filter(r => r.status === s).length;

  const stats = [
    { label: "Watched",  val: count("Watched"),            Icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Watching", val: count("Currently Watching"), Icon: Eye,          color: "text-blue-400"    },
    { label: "Planned",  val: count("Plan to Watch"),      Icon: BookmarkPlus, color: "text-amber-400"   },
    { label: "Favorites",val: favorites.length,            Icon: Heart,        color: "text-rose-400"    },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[#8b8ba8] hover:text-white text-sm mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 sm:gap-5 mb-8">
        <Avatar user={user} size={72} />
        <div className="min-w-0">
          <Name isRtl={!!user.is_rtl} className="text-2xl sm:text-3xl font-bold text-white">{user.display_name}</Name>
          {isMe && <p className="text-[#8b8ba8] text-sm mt-0.5">{user.email}</p>}
          <p className="text-[#8b8ba8] text-xs mt-1">{reviews.length} title{reviews.length !== 1 ? "s" : ""} tracked</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {stats.map(({ label, val, Icon, color }) => (
          <div key={label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-2xl font-bold text-white">{val}</p>
            <p className="text-[#8b8ba8] text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Favorites */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-400" /> Favorites</h2>
        {favorites.length === 0 ? (
          <p className="text-[#8b8ba8] text-sm">{isMe ? "Mark titles as favorite to show them here." : "No favorites yet."}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {favorites.map(r => (
              <button key={r.id} onClick={() => onSelectMedia(reviewToItem(r))} className="cursor-pointer group text-left">
                <div className="rounded-lg overflow-hidden ring-1 ring-[#2a2a3a] group-hover:ring-purple-500/40 transition-all">
                  <Poster item={reviewToItem(r)} />
                </div>
                <p className="text-white text-xs font-medium line-clamp-2 mt-1.5">{titleOf(r)}</p>
                {r.rating ? <p className="text-amber-400 text-[11px] flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-amber-400" />{r.rating}/10</p> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-400" /> Reviews & ratings</h2>
        {reviewed.length === 0 ? (
          <p className="text-[#8b8ba8] text-sm">{isMe ? "Rate or comment on titles to build your review history." : "No written reviews yet."}</p>
        ) : (
          <div className="space-y-3">
            {reviewed.map(r => {
              const status = r.status ? STATUS_META[r.status] : null;
              return (
                <div key={r.id} className="flex gap-3 bg-[#111118] border border-[#2a2a3a] rounded-xl p-3">
                  <button onClick={() => onSelectMedia(reviewToItem(r))} className="shrink-0 w-14 cursor-pointer">
                    <div className="rounded-lg overflow-hidden ring-1 ring-[#2a2a3a]"><Poster item={reviewToItem(r)} /></div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onSelectMedia(reviewToItem(r))} className="cursor-pointer text-left">
                      <h3 className="text-white text-sm font-semibold hover:text-purple-300 transition-colors line-clamp-1">{titleOf(r)}</h3>
                    </button>
                    <div className="flex items-center gap-2.5 my-1 flex-wrap">
                      {yearOf(r) && <span className="text-[11px] text-[#8b8ba8]">{yearOf(r)}</span>}
                      {r.rating ? <span className="flex items-center gap-1 text-xs text-amber-400"><Star className="w-3 h-3 fill-amber-400" />{r.rating}/10</span> : null}
                      {r.is_favorite ? <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> : null}
                      {status && <span className={`flex items-center gap-1 text-[10px] ${status.color}`}><status.Icon className="w-3 h-3" />{r.status}</span>}
                    </div>
                    {r.comment && <p className="text-[#c8c8e0] text-sm leading-relaxed" dir="auto">{r.comment}</p>}
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
