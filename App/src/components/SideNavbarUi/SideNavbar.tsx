import AppLogo from "../icons/AppLogo";
import NavFields from "./NavFields";
import TwitterIcon from "../icons/TwitterIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import NotionIcon from "../icons/NotionIcon";
import InstagramIcon from "../icons/InstagramIcon";
import DocumentIcon from "../icons/DocumentIcon";
import All from "../icons/All";
import { useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../NotificationUi/NotificationProvider";

/* ---------- TYPES ---------- */

interface LocalContentItem {
  contentType: "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text" | "Voice";
  tag?: string | string[];
  tags?: string[];
  summary?: string;
  title: string;
  link: string;
}

type ContentType = "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text" | "Voice";

interface SideNavbarProps {
  data1: LocalContentItem[];
  setYTData: (data: LocalContentItem[]) => void;
  setNitionData: (data: LocalContentItem[]) => void;
  setTwitterData: (data: LocalContentItem[]) => void;
  setInstagramData: (data: LocalContentItem[]) => void;
  setTextData: (data: LocalContentItem[]) => void;
  setVoiceData: (data: LocalContentItem[]) => void;
  setDataShow: (type: ContentType | "All") => void;
}

const MicNavIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
  </svg>
);

/* ---------- COMPONENT ---------- */

const SideNavbar = memo((props: SideNavbarProps) => {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  /* ---------- MEMOIZED FILTERED DATA ---------- */
  const youtubeData = useMemo(() => props.data1.filter(item => item.contentType === "Youtube"), [props.data1]);
  const notionData = useMemo(() => props.data1.filter(item => item.contentType === "Notion"), [props.data1]);
  const twitterData = useMemo(() => props.data1.filter(item => item.contentType === "Twitter"), [props.data1]);
  const instagramData = useMemo(() => props.data1.filter(item => item.contentType === "Instagram"), [props.data1]);
  const textData = useMemo(() => props.data1.filter(item => item.contentType === "Text"), [props.data1]);
  const voiceData = useMemo(() => props.data1.filter(item => item.contentType === "Voice"), [props.data1]);

  /* ---------- HANDLERS ---------- */
  const showYoutube = useCallback(() => { props.setYTData(youtubeData); props.setDataShow("Youtube"); }, [youtubeData, props]);
  const showNotion = useCallback(() => { props.setNitionData(notionData); props.setDataShow("Notion"); }, [notionData, props]);
  const showTwitter = useCallback(() => { props.setTwitterData(twitterData); props.setDataShow("Twitter"); }, [twitterData, props]);
  const showInstagram = useCallback(() => { props.setInstagramData(instagramData); props.setDataShow("Instagram"); }, [instagramData, props]);
  const showText = useCallback(() => { props.setTextData(textData); props.setDataShow("Text"); }, [textData, props]);
  const showVoice = useCallback(() => { props.setVoiceData(voiceData); props.setDataShow("Voice"); }, [voiceData, props]);
  const showAll = useCallback(() => { props.setDataShow("All"); }, [props]);

  const handleSignOut = useCallback(async () => {
    const confirmed = await showConfirm("Sign Out", "Are you sure you want to sign out?", "warning");
    if (!confirmed) return;
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    showNotification("success", "Signed out successfully");
    navigate("/");
  }, [navigate, showConfirm, showNotification]);

  /* ---------- UI ---------- */
  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed top-4 left-4 z-50 p-2 dark:bg-[#1a1a2e] bg-white rounded-xl dark:border-white/10 border-gray-200 border shadow-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-all"
        aria-expanded={isOpen}
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5 dark:text-white text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-40 w-64 h-screen dark:bg-[#13131f] bg-white dark:border-white/5 border-gray-200 border-r transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="pt-12 dark:border-white/5 border-gray-100 border-b">
            <div className="flex items-center ml-9 gap-10">
              <img src="/Brainly.png" alt="Second Brain" className="pt-4 pr-2 w-16 h-16 object-contain -mr-2 mb-4" />
              <div className="-ml-8">
                <span className="text-base font-bold dark:text-white text-gray-900">Second Brain</span>
                <p className="text-xs dark:text-white/40 text-gray-400">Knowledge Hub</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 pr-3 pb-3 pl-3 pt-1 space-y-1 overflow-y-auto">
            {[
              { label: 'All Content', icon: <All />, action: showAll },
              { label: 'YouTube', icon: <YoutubeIcon />, action: showYoutube },
              { label: 'Twitter', icon: <TwitterIcon />, action: showTwitter },
              { label: 'Instagram', icon: <InstagramIcon width="20px" height="20px" />, action: showInstagram },
              { label: 'Notes', icon: <DocumentIcon width="20px" height="20px" />, action: showText },
              { label: 'Notion', icon: <NotionIcon />, action: showNotion },
              { label: 'Voice', icon: <MicNavIcon />, action: showVoice },
            ].map(({ label, icon, action }) => (
              <div key={label} onClick={() => { action(); setIsOpen(false); }}>
                <NavFields textt={label} startIcon={icon} />
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 dark:border-white/5 border-gray-100 border-t space-y-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl dark:bg-red-500/10 dark:hover:bg-red-500/15 dark:border-red-500/20 dark:text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-medium transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
            <p className="text-xs dark:text-white/20 text-gray-400 text-center">Second Brain © 2025</p>
          </div>
        </div>
      </div>
    </>
  );
});

export default SideNavbar;
