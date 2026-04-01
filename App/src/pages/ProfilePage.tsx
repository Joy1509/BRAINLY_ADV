import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";
import ThemeToggle from "../components/ThemeToggle/ThemeToggle";

interface ProfileData {
  username: string;
  email: string;
  avatar: string;
  provider: string;
  memberSince: string | null;
  totalItems: number;
  stats: Record<string, number>;
  topTags: string[];
}

const CONTENT_META: Record<string, { icon: string; color: string; bar: string; bg: string }> = {
  Youtube:   { icon: "🎥", color: "text-red-400",   bar: "from-red-500 to-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  Twitter:   { icon: "🐦", color: "text-sky-400",   bar: "from-sky-500 to-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
  Instagram: { icon: "📸", color: "text-pink-400",  bar: "from-pink-500 to-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  Notion:    { icon: "📝", color: "text-white/70",  bar: "from-gray-400 to-gray-300",   bg: "bg-white/5 border-white/10" },
  Text:      { icon: "✏️", color: "text-amber-400", bar: "from-amber-500 to-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

const TAG_COLORS = [
  "bg-violet-500/15 text-violet-300 border-violet-500/20",
  "bg-sky-500/15 text-sky-300 border-sky-500/20",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  "bg-pink-500/15 text-pink-300 border-pink-500/20",
  "bg-amber-500/15 text-amber-300 border-amber-500/20",
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE_URL}/api/v1/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (res.ok) setProfile(await res.json());
      } catch {
        showNotification("error", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignOut = async () => {
    const confirmed = await showConfirm("Sign Out", "Are you sure you want to sign out?", "warning");
    if (!confirmed) return;
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    showNotification("success", "Signed out successfully");
    navigate("/");
  };

  const initials = profile?.username?.slice(0, 2).toUpperCase() || "??";
  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const totalStats = Object.values(profile?.stats || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen dark:bg-[#0f0f1a] bg-gray-50">
      {/* Navbar */}
      <div className="sticky top-0 z-30 dark:bg-[#13131f]/80 bg-white/80 backdrop-blur-xl dark:border-white/5 border-gray-200 border-b px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/home")} className="flex items-center gap-2 group">
          <img src="/Brainly.png" alt="Second Brain" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-200" />
          <span className="text-sm font-semibold dark:text-white/70 text-gray-600 group-hover:text-violet-500 transition-colors">Second Brain</span>
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white/70 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 text-sm font-medium transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
        </div>
      ) : profile ? (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

          {/* ── HERO CARD ── */}
          <div className="relative rounded-3xl overflow-hidden dark:border dark:border-white/5 border border-gray-200 shadow-2xl">
            {/* Banner */}
            <div className="h-40 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 right-12 w-36 h-36 bg-indigo-400/20 rounded-full blur-2xl" />
              <div className="absolute top-6 right-1/3 w-20 h-20 bg-violet-300/10 rounded-full blur-xl" />
              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                  style={{ top: `${20 + i * 12}%`, left: `${10 + i * 15}%`, animationDelay: `${i * 0.4}s` }} />
              ))}
            </div>

            {/* Avatar + info */}
            <div className="dark:bg-[#13131f] bg-white px-8 pb-8">
              <div className="flex items-end justify-between -mt-10 mb-5">
                <div className="relative">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username}
                      className="w-24 h-24 rounded-2xl border-4 dark:border-[#13131f] border-white object-cover shadow-xl" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-4 dark:border-[#13131f] border-white bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl">
                      <span className="text-3xl font-black text-white">{initials}</span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 dark:border-[#13131f] border-white" />
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-red-500/10 dark:hover:bg-red-500/15 dark:border-red-500/20 dark:text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-medium transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>

              <h1 className="text-2xl font-black dark:text-white text-gray-900">{profile.username}</h1>
              <p className="dark:text-white/40 text-gray-500 text-sm mt-0.5">{profile.email}</p>
              <div className="flex items-center gap-4 mt-3">
                {memberSince && (
                  <span className="flex items-center gap-1.5 text-xs dark:text-white/30 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Member since {memberSince}
                  </span>
                )}
                {profile.provider && profile.provider !== "local" && (
                  <span className="px-2.5 py-0.5 dark:bg-white/5 bg-gray-100 dark:text-white/40 text-gray-500 text-xs rounded-full dark:border dark:border-white/10 border border-gray-200 capitalize">
                    via {profile.provider}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── STATS ROW ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Items", value: profile.totalItems, icon: "🧠", color: "from-violet-500/20 to-indigo-500/10 border-violet-500/20" },
              { label: "Categories", value: Object.keys(profile.stats).length, icon: "📂", color: "from-sky-500/20 to-blue-500/10 border-sky-500/20" },
              { label: "Top Tags", value: profile.topTags.length, icon: "🏷️", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20" },
              { label: "Most Saved", value: Object.entries(profile.stats).sort((a,b) => b[1]-a[1])[0]?.[0] || "—", icon: "⭐", color: "from-amber-500/20 to-yellow-500/10 border-amber-500/20" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br dark:border border ${color} dark:bg-transparent bg-white shadow-sm`}>
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-2xl font-black dark:text-white text-gray-900">{value}</p>
                <p className="text-xs dark:text-white/30 text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── CONTENT BREAKDOWN ── */}
          {totalStats > 0 && (
            <div className="dark:bg-[#13131f] bg-white rounded-3xl p-6 dark:border dark:border-white/5 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold dark:text-white text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full" />
                Content Breakdown
              </h2>
              <div className="space-y-3">
                {Object.entries(profile.stats).sort((a,b) => b[1]-a[1]).map(([type, count]) => {
                  const meta = CONTENT_META[type] || { icon: "📄", color: "text-gray-400", bar: "from-gray-400 to-gray-300", bg: "bg-white/5 border-white/10" };
                  const pct = Math.round((count / totalStats) * 100);
                  return (
                    <div key={type} className={`flex items-center gap-4 px-4 py-3 rounded-2xl border dark:${meta.bg} bg-gray-50`}>
                      <span className="text-xl">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${meta.color}`}>{type}</span>
                          <span className="text-xs dark:text-white/40 text-gray-500 font-medium">{count} items · {pct}%</span>
                        </div>
                        <div className="h-2 dark:bg-white/5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${meta.bar} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TOP TAGS ── */}
          {profile.topTags.length > 0 && (
            <div className="dark:bg-[#13131f] bg-white rounded-3xl p-6 dark:border dark:border-white/5 border border-gray-200 shadow-sm">
              <h2 className="text-base font-bold dark:text-white text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                Top Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.topTags.map((tag, i) => (
                  <span key={tag} className={`px-4 py-1.5 text-sm font-medium rounded-full border ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[80vh]">
          <p className="dark:text-white/30 text-gray-400">Failed to load profile</p>
        </div>
      )}
    </div>
  );
}
