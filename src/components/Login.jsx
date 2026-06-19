import { useState } from "react";
import { Clapperboard, Mail, User, ArrowRight, Languages } from "lucide-react";
import { useAuth } from "../auth";
import { containsArabic } from "../lib/constants";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  const isArabicName = containsArabic(name);

  const submit = async e => {
    e.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Please enter a valid email address."); return; }
    if (!name.trim()) { setErr("Please enter a display name."); return; }
    setBusy(true);
    try {
      await login({ email: email.trim(), displayName: name.trim() });
    } catch {
      setErr("Could not sign in. Make sure the server is running and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(168,85,247,0.10) 0%, transparent 60%)" }} />

      <div className="relative w-full max-w-md bg-[#111118] border border-[#2a2a3a] rounded-2xl p-8 shadow-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center shadow-lg shadow-purple-600/30 mb-4">
            <Clapperboard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl" dir="rtl">عبودكا للافلام</h1>
          <p className="text-[#8b8ba8] text-sm mt-1">Track films & anime · share with friends</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8ba8] pointer-events-none" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="w-full pl-9 pr-3 py-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl text-white text-sm placeholder-[#8b8ba8] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="text-xs font-semibold text-[#8b8ba8] uppercase tracking-widest mb-1.5 block">Display name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8ba8] pointer-events-none" />
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name (English or عربي)" dir="auto"
                className="w-full pl-9 pr-3 py-3 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl text-white text-sm placeholder-[#8b8ba8] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>
            {isArabicName && (
              <p className="flex items-center gap-1.5 text-purple-400 text-xs mt-1.5">
                <Languages className="w-3.5 h-3.5" /> Arabic detected — your name will display right-to-left.
              </p>
            )}
          </div>

          {err && <p className="text-rose-400 text-xs">{err}</p>}

          <button type="submit" disabled={busy}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2">
            {busy ? "Signing in…" : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-[#8b8ba8] text-xs mt-5 leading-relaxed">
          No password needed. Your email simply loads your profile and lists.
        </p>
      </div>
    </div>
  );
}
