import AppLogo from "../icons/AppLogo";
import NavFields from "./NavFields";
import TwitterIcon from "../icons/TwitterIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import NotionIcon from "../icons/NotionIcon";
import All from "../icons/All";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../NotificationUi/NotificationProvider";
import { useState, useMemo, useCallback, memo } from "react";

/* ---------- TYPES ---------- */

interface LocalContentItem {
  contentType: "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text";
  tag?: string | string[];
  tags?: string[];
  summary?: string;
  title: string;
  link: string;
}

type ContentType = "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text";

interface SideNavbarProps {
  data1: LocalContentItem[];
  setYTData: (data: LocalContentItem[]) => void;
  setNitionData: (data: LocalContentItem[]) => void;
  setTwitterData: (data: LocalContentItem[]) => void;
  setInstagramData: (data: LocalContentItem[]) => void;
  setTextData: (data: LocalContentItem[]) => void;
  setDataShow: (type: ContentType | "All") => void;
}

/* ---------- COMPONENT ---------- */

const SideNavbar = memo((props: SideNavbarProps) => {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  /* ---------- MEMOIZED FILTERED DATA ---------- */
  const youtubeData = useMemo(
    () => props.data1.filter(item => item.contentType === "Youtube"),
    [props.data1]
  );

  const notionData = useMemo(
    () => props.data1.filter(item => item.contentType === "Notion"),
    [props.data1]
  );

  const twitterData = useMemo(
    () => props.data1.filter(item => item.contentType === "Twitter"),
    [props.data1]
  );

  const instagramData = useMemo(
    () => props.data1.filter(item => item.contentType === "Instagram"),
    [props.data1]
  );

  const textData = useMemo(
    () => props.data1.filter(item => item.contentType === "Text"),
    [props.data1]
  );


  /* ---------- HANDLERS ---------- */
  const showYoutube = useCallback(() => {
    props.setYTData(youtubeData);
    props.setDataShow("Youtube");
  }, [youtubeData, props]);

  const showNotion = useCallback(() => {
    props.setNitionData(notionData);
    props.setDataShow("Notion");
  }, [notionData, props]);

  const showTwitter = useCallback(() => {
    props.setTwitterData(twitterData);
    props.setDataShow("Twitter");
  }, [twitterData, props]);

  const showInstagram = useCallback(() => {
    props.setInstagramData(instagramData);
    props.setDataShow("Instagram");
  }, [instagramData, props]);

  const showText = useCallback(() => {
    props.setTextData(textData);
    props.setDataShow("Text");
  }, [textData, props]);

  const showAll = useCallback(() => {
    props.setDataShow("All");
  }, [props]);

  const handleSignOut = useCallback(async () => {
    const confirmed = await showConfirm(
      "Sign Out",
      "Are you sure you want to sign out?",
      "warning"
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    showNotification("success", "Signed out successfully");
    navigate("/");
  }, [navigate, showConfirm, showNotification]);

  /* ---------- UI ---------- */
  return (
    <>
      {/* Hamburger button (always visible) */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        aria-expanded={isOpen}
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="pt-16 p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <AppLogo />
              </div>
              <div>
                <span className="text-xl font-bold">Second Brain</span>
                <p className="text-xs text-gray-500">Knowledge Management</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            <div onClick={showAll}>
              <NavFields textt="All Content" startIcon={<All />} />
            </div>
            <div onClick={showYoutube}>
              <NavFields textt="YouTube" startIcon={<YoutubeIcon />} />
            </div>
            <div onClick={showTwitter}>
              <NavFields textt="Twitter" startIcon={<TwitterIcon />} />
            </div>
            <div onClick={showInstagram}>
              <NavFields textt="Instagram" startIcon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm5 6.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm5.5-3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/></svg>} />
            </div>            <div onClick={showText}>
              <NavFields textt="Notes" startIcon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 3v2h10V6H7zm0 4v2h10v-2H7z"/></svg>} />
            </div>            <div onClick={showNotion}>
              <NavFields textt="Notion" startIcon={<NotionIcon />} />
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default SideNavbar;
