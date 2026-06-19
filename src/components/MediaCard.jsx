import { Star, Heart } from "lucide-react";
import { TYPE_BADGE, titleOf, yearOf } from "../lib/constants";
import { Poster } from "./common";
import StatusDropdown from "./StatusDropdown";

export default function MediaCard({ item, review, onStatusChange, onSelect }) {
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
  const status = review?.status || null;
  const fav    = !!review?.is_favorite;

  return (
    <div
      onClick={() => onSelect(item)}
      className="card-hover bg-[#111118] border border-[#2a2a3a] rounded-xl overflow-visible flex flex-col relative cursor-pointer group"
    >
      {/* TMDB rating */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        <span className="text-xs font-bold text-white">{rating}</span>
      </div>

      {/* Favorite heart */}
      {fav && (
        <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </div>
      )}

      {/* Hover hint */}
      <div className="absolute inset-x-0 top-0 z-10 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pt-2 pointer-events-none">
        <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">View details</span>
      </div>

      <div className="rounded-t-xl overflow-hidden">
        <Poster item={item} />
      </div>

      <div className="p-3 flex flex-col gap-2.5 flex-1">
        <div>
          <h3 className="font-semibold text-sm text-[#f1f0ff] leading-snug line-clamp-2 mb-1.5">{titleOf(item)}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${TYPE_BADGE[item.mediaType]}`}>
              {item.mediaType}
            </span>
            {yearOf(item) && <span className="text-[11px] text-[#8b8ba8]">{yearOf(item)}</span>}
          </div>
        </div>

        <StatusDropdown status={status} onChange={s => onStatusChange(item, s)} stopProp />
      </div>
    </div>
  );
}
