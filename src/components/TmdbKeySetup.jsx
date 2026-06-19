import { useState } from "react";
import { Key, ExternalLink, Clapperboard } from "lucide-react";

// Shown only when the server has no shared TMDB key configured in .env.
export default function TmdbKeySetup({ onSubmit, error }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState(error || "");

  const submit = e => {
    e.preventDefault();
    if (!key.trim()) { setErr("Please enter your API key."); return; }
    onSubmit(key.trim());
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.08) 0%, transparent 60%)" }} />
      <div className="relative w-full max-w-md bg-[#111118] border border-[#2a2a3a] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center shadow-lg">
            <Clapperboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl" dir="rtl">عبودكا للافلام</h1>
            <p className="text-[#8b8ba8] text-xs">One-time setup</p>
          </div>
        </div>

        <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-purple-300 text-sm font-semibold">Free TMDB API key needed</span>
          </div>
          <p className="text-[#8b8ba8] text-xs leading-relaxed">
            Tip: add <code className="text-purple-300">TMDB_API_KEY</code> to the server's <code className="text-purple-300">.env</code> file
            and your friends won't have to do this step.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="text" value={key} onChange={e => { setKey(e.target.value); setErr(""); }}
            placeholder="Paste your TMDB API key (v3)…"
            className="w-full px-4 py-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl text-white text-sm placeholder-[#8b8ba8] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all" />
          {err && <p className="text-rose-400 text-xs">{err}</p>}
          <button type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-600/20">
            Continue
          </button>
        </form>

        <p className="text-center text-[#8b8ba8] text-xs mt-5">
          Get a free key at{" "}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer"
            className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1">
            themoviedb.org <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
