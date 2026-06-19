import { useState } from "react";
import { BookmarkPlus, ChevronDown, Check, X } from "lucide-react";
import { STATUSES, STATUS_META } from "../lib/constants";

// Dropdown to set "Plan to Watch / Currently Watching / Watched" (or clear it).
export default function StatusDropdown({ status, onChange, stopProp = false }) {
  const [open, setOpen] = useState(false);
  const meta = status ? STATUS_META[status] : null;

  const guard = e => { if (stopProp) e.stopPropagation(); };

  return (
    <div className="relative" onClick={guard}>
      <button
        onClick={e => { guard(e); setOpen(o => !o); }}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold ring-1 status-transition cursor-pointer
          ${meta ? `${meta.bg} ${meta.color} ${meta.ring}` : "bg-white/5 hover:bg-white/10 text-[#8b8ba8] ring-white/10"}`}
      >
        {meta
          ? <><meta.Icon className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{status}</span></>
          : <><BookmarkPlus className="w-3.5 h-3.5 shrink-0" /><span>Add to List</span></>}
        <ChevronDown className={`w-3 h-3 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { guard(e); setOpen(false); }} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl shadow-2xl z-50 overflow-hidden">
            {STATUSES.map(s => {
              const m = STATUS_META[s];
              const active = s === status;
              return (
                <button key={s}
                  onClick={e => { guard(e); onChange(s); setOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium status-transition cursor-pointer
                    ${active ? `${m.color} bg-white/5` : "text-[#8b8ba8] hover:text-white hover:bg-white/5"}`}>
                  <m.Icon className={`w-3.5 h-3.5 ${active ? m.color : ""}`} />
                  {s}
                  {active && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
            {status && (
              <button
                onClick={e => { guard(e); onChange(null); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium text-[#8b8ba8] hover:text-rose-400 hover:bg-rose-400/5 status-transition border-t border-[#2a2a3a] cursor-pointer">
                <X className="w-3.5 h-3.5" /> Remove from List
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
