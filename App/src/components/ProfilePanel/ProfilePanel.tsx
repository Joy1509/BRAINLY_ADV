import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../NotificationUi/NotificationProvider";

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

const CONTENT_META: Record<string, { icon: string; color: string; bg: string; bar: string }> = {
  Youtube:   { icon: "🎥", color: "text-red-400",   bg: "dark:bg-red-500/10 bg-red-50 dark:border-red-500/20 border-red-200",     bar: "from-red-500 to-red-400" },
  Twitter:   { icon: "🐦", color: "text-sky-400",   bg: "dark:bg-sky-500/10 bg-sky-50 dark:border-sky-500/20 border-sky-200",     bar: "from-sky-500 to-sky-400" },
  Instagram: { icon: "📸", color: "text-pink-400",  bg: "dark:bg-pink-500/10 bg-pink-50 dark:border-pink-500/20 border-pink-200", bar: "from-pink-500 to-pink-400" },
  Notion:    { icon: "📝", color: "dark:text-white/70 text-gray-600", bg: "dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200", bar: "from-gray-400 to-gray-300" },
  Text:      { icon: "✏️", color: "text-amber-400", bg: "dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/20 border-amber-200", bar: "from-amber-500 to-amber-400" },
};

const TAG_COLORS = [
  "dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/20 bg-violet-100 text-violet-700 border-violet-200",
  "dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/20 bg-sky-100 text-sky-700 border-sky-200",
  "dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20 bg-emerald-100 text-emerald-700 border-emerald-200",
  "dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/20 bg-pink-100 text-pink-700 border-pink-200",
  "dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20 bg-amber-100 text-amber-700 border-amber-200",
];

interface Props { onClose: () => void; }

const ProfilePanel = ({ onClose }: Props) => {
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
    showNotification("success", "Signed out successfully");
    navigate("/");
  };

  const initials = profile?.username?.slice(0, 2).toUpperCase() || "??";
  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const totalStats = Object.values(profile?.stats || {}).reduce((a, b) => a + b, 0);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .profile-panel { animation: slideIn 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="profile-panel fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 dark:bg-[#13131f] bg-white dark:border-l dark:border-white/5 border-l border-gray-200 flex flex-col shadow-2xl">

        {/* ── BANNER + AVATAR ── */}
        <div className="relative flex-shrink-0">
          <div className="h-32 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
            {/* decorative blobs */}
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 right-8 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl" />
            <div className="absolute top-4 right-1/3 w-16 h-16 bg-violet-300/10 rounded-full blur-lg" />
            {/* close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/25 rounded-lg text-white transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Avatar sits half-over the banner */}
          <div className="absolute left-6 bottom-0 translate-y-1/2">
            {profile?.avatar ? (
              <img
                src={profile.avatar} alt={profile.username}
                className="w-20 h-20 rounded-2xl border-4 dark:border-[#13131f] border-white object-cover shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 dark:border-[#13131f] border-white bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>
            )}
          </div>

          {/* Provider badge */}
          {profile?.provider && profile.provider !== "local" && (
            <div className="absolute right-4 bottom-0 translate-y-1/2 px-2.5 py-1 dark:bg-white/10 bg-gray-100 dark:text-white/60 text-gray-500 text-xs rounded-full border dark:border-white/10 border-gray-200 capitalize">
              via {profile.provider}
            </div>
          )}
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            </div>
          ) : profile ? (
            <div className="px-6 pt-14 pb-6 space-y-6">

              {/* Name / email / joined */}
              <div>
                <h2 className="text-xl font-bold dark:text-white text-gray-900">{profile.username}</h2>
                <p className="text-sm dark:text-white/40 text-gray-400 mt-0.5">{profile.email}</p>
                {memberSince && (
                  <p className="text-xs dark:text-white/25 text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Member since {memberSince}
                  </p>
                )}
              </div>

              {/* Hero stat */}
              <div className="relative overflow-hidden dark:bg-gradient-to-br dark:from-violet-500/10 dark:to-indigo-500/5 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-5 dark:border dark:border-violet-500/20 border border-violet-100">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full blur-xl" />
                <p className="text-xs dark:text-white/40 text-gray-500 uppercase tracking-wider mb-1">Total Saved Items</p>
                <p className="text-5xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent leading-none">{profile.totalItems}</p>
                <p className="text-xs dark:text-white/30 text-gray-400 mt-2">across all categories</p>
              </div>

              {/* Content breakdown */}
              {totalStats > 0 && (
                <div>
                  <p className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Content Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(profile.stats).map(([type, count]) => {
                      const meta = CONTENT_META[type] || { icon: "📄", color: "text-gray-400", bg: "dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200", bar: "from-gray-400 to-gray-300" };
                      const pct = Math.round((count / totalStats) * 100);
                      return (
                        <div key={type} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${meta.bg}`}>
                          <span className="text-base">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-semibold ${meta.color}`}>{type}</span>
                              <span className="text-xs dark:text-white/40 text-gray-500">{count}</span>
                            </div>
                            <div className="h-1.5 dark:bg-white/5 bg-black/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${meta.bar} rounded-full`}
                                style={{ width: `${pct}%`, transition: "width 0.8s ease" }}
                              />
                            </div>
                          </div>
                          <span className="text-xs dark:text-white/25 text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top tags */}
              {profile.topTags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold dark:text-white/40 text-gray-400 uppercase tracking-wider mb-3">Top Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.topTags.map((tag, i) => (
                      <span key={tag} className={`px-3 py-1 text-xs font-medium rounded-full border ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="dark:text-white/30 text-gray-400 text-sm">Failed to load profile</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 p-4 dark:border-t dark:border-white/5 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl dark:bg-red-500/10 dark:hover:bg-red-500/15 dark:border-red-500/20 dark:text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-medium transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfilePanel;
