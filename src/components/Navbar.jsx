import { Clapperboard, Search, X, RefreshCw, LogOut, Users, Clapperboard as Browse } from "lucide-react";
import { useAuth } from "../auth";
import { Avatar, Name } from "./common";

const NAV = [
  { key: "browse",    label: "Browse",    Icon: Browse },
  { key: "community", label: "Community", Icon: Users },
];

export default function Navbar({ page, onNavigate, search, onSearch, onRefresh }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[#2a2a3a] bg-[#0a0a0f]/90 backdrop-blur-xl safe-top">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">

        {/* Brand */}
        <button onClick={() => onNavigate({ page: "browse" })} className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base text-white hidden sm:block" dir="rtl">عبودكا للافلام</span>
        </button>

        {/* Primary nav */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => onNavigate({ page: key })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold status-transition cursor-pointer
                ${page === key ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40" : "text-[#8b8ba8] hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {/* Search (browse only) */}
        {page === "browse" && (
          <div className="flex-1 max-w-sm ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8ba8] pointer-events-none" />
            <input type="text" placeholder="Search titles…" value={search} onChange={e => onSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl text-sm text-white placeholder-[#8b8ba8] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all" />
            {search && (
              <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b8ba8] hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className={`flex items-center gap-2 sm:gap-3 ${page === "browse" ? "" : "ml-auto"}`}>
          {page === "browse" && onRefresh && (
            <button onClick={onRefresh} title="Reload library" className="text-[#8b8ba8] hover:text-white transition-colors cursor-pointer shrink-0">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* My profile */}
          <button onClick={() => onNavigate({ page: "profile", userId: user.id })}
            className="flex items-center gap-2 cursor-pointer group shrink-0">
            <Avatar user={user} size={32} />
            <Name isRtl={!!user.is_rtl} className="text-sm font-semibold text-white max-w-[100px] truncate hidden md:inline-block group-hover:text-purple-300 transition-colors">
              {user.display_name}
            </Name>
          </button>

          <button onClick={logout} title="Sign out" className="text-[#8b8ba8] hover:text-rose-400 transition-colors cursor-pointer shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
