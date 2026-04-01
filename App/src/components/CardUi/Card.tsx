import DocumentIcon from "../icons/DocumentIcon";
import NotionIcon from "../icons/NotionIcon";
import DeleteIcon from "../icons/DeleteIcon";
import InstagramIcon from "../icons/InstagramIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import Tags from "./Tags";
import DetailModal from "./DetailModal";
import { format } from "date-fns";
import { JSX, useEffect, useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import TwitterIcon from "../icons/TwitterIcon";
import { useNotification } from "../NotificationUi/NotificationProvider";

interface CardProps {
  icon: "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text" | "Voice";
  tag: string | string[];
  summary?: string;
  title: string;
  link: string;
  id?: string;
  audioUrl?: string;
  audioDuration?: number;
  createdAt?: string;
  reload?: () => void;
  isShared?: boolean;
}

const Card = memo((props: CardProps) => {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();

  const date = useMemo(() => {
    if (props.createdAt) return format(new Date(props.createdAt), "dd MMM yyyy");
    if (props.id && props.id.length === 24) {
      const timestamp = parseInt(props.id.substring(0, 8), 16) * 1000;
      return format(new Date(timestamp), "dd MMM yyyy");
    }
    return format(new Date(), "dd MMM yyyy");
  }, [props.createdAt, props.id]);

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const getYoutubeId = useCallback((url: string): string | null => {
    const regular = url.split("v=");
    if (regular.length > 1) return regular[1].split("&")[0];
    const short = url.split("youtu.be/");
    if (short.length > 1) return short[1].split("?")[0];
    return null;
  }, []);

  useEffect(() => {
    if (props.icon !== "Youtube") return;
    const videoId = getYoutubeId(props.link);
    setThumbnail(videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
  }, [props.icon, props.link, getYoutubeId]);

  const headerIcon = useMemo(() => {
    switch (props.icon) {
      case "Youtube": return <YoutubeIcon />;
      case "Twitter": return <TwitterIcon />;
      case "Instagram": return <InstagramIcon />;
      case "Notion": return <NotionIcon />;
      case "Voice": return <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /></svg>;
      default: return <DocumentIcon />;
    }
  }, [props.icon]);

  const iconColors: Record<string, string> = {
    Youtube: 'text-red-400',
    Twitter: 'text-sky-400',
    Instagram: 'text-pink-400',
    Notion: 'dark:text-white/70 text-gray-500',
    Text: 'text-amber-400',
    Voice: 'text-violet-400'
  };

  const previewBg: Record<string, string> = {
    Youtube: 'dark:bg-red-500/5 bg-red-50',
    Twitter: 'dark:bg-sky-500/5 bg-sky-50',
    Instagram: 'dark:bg-pink-500/5 bg-pink-50',
    Notion: 'dark:bg-white/3 bg-gray-50',
    Text: 'dark:bg-amber-500/5 bg-amber-50',
    Voice: 'dark:bg-violet-500/5 bg-violet-50'
  };

  const contentPreview: JSX.Element = useMemo(() => {
    if (props.icon === "Youtube") {
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          {thumbnail ? (
            <img src={thumbnail} alt={props.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full dark:bg-red-500/10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-500 text-4xl">📺</span>
            </div>
          )}
        </div>
      );
    }
    if (props.icon === "Twitter") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 dark:bg-sky-500/10 bg-sky-100 rounded-full flex items-center justify-center">
            <TwitterIcon />
          </div>
        </div>
      );
    }
    if (props.icon === "Instagram") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 dark:bg-pink-500/10 bg-pink-100 rounded-full flex items-center justify-center">
            <InstagramIcon />
          </div>
        </div>
      );
    }
    if (props.icon === "Text") {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full h-full dark:bg-amber-500/10 bg-amber-50 rounded-lg p-3 flex items-start">
            <p className="text-sm dark:text-amber-200/70 text-amber-800 line-clamp-4">{props.summary}</p>
          </div>
        </div>
      );
    }
    if (props.icon === "Voice") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-14 h-14 dark:bg-violet-500/15 bg-violet-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-20 h-20 dark:bg-white/5 bg-gray-100 rounded-full flex items-center justify-center">
          <NotionIcon />
        </div>
      </div>
    );
  }, [props.icon, props.link, props.title, thumbnail, props.summary]);

  const deleteHandle = useCallback(async () => {
    const confirmed = await showConfirm("Delete Content", `Are you sure you want to delete "${props.title}"?`, "danger");
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) { showNotification("error", "Please log in first"); navigate("/"); return; }
      const res = await fetch(`http://localhost:5000/api/v1/delete/${props.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      showNotification("success", "Content deleted successfully");
      props.reload?.();
    } catch {
      showNotification("error", "Failed to delete content");
    }
  }, [navigate, props.title, props.id, props.reload, showConfirm, showNotification]);

  return (
    <div className="w-full">
      <div
        role="button" tabIndex={0}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setShowDetail(true); }}
        className="group relative dark:bg-[#1a1a2e] bg-white dark:hover:bg-[#1e1e35] hover:bg-gray-50 dark:border-white/5 border-gray-200 dark:hover:border-violet-500/30 hover:border-violet-300 border rounded-2xl overflow-hidden h-72 cursor-pointer transition-all duration-300 dark:hover:shadow-xl dark:hover:shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 dark:border-white/5 border-gray-100 border-b">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`flex-shrink-0 w-5 h-5 ${iconColors[props.icon] || 'dark:text-white/50 text-gray-400'}`}>
              {headerIcon}
            </div>
            <h3 className="font-medium dark:text-white/80 text-gray-800 truncate text-sm">{props.title}</h3>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {props.icon !== 'Text' && props.link && (
              <a
                href={props.link} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 dark:text-white/30 text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 dark:hover:bg-violet-500/10 hover:bg-violet-50 rounded-lg transition-all"
                title="Open link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {!props.isShared && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteHandle(); }}
                className="p-1.5 dark:text-white/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 rounded-lg transition-all"
              >
                <DeleteIcon />
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className={`h-36 ${previewBg[props.icon] || 'dark:bg-white/3 bg-gray-50'}`}>{contentPreview}</div>

        {/* Footer */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {Array.isArray(props.tag) ? (
                props.tag.slice(0, 2).map((t, idx) => <Tags key={idx} tagType={t} />)
              ) : (
                <Tags tagType={props.tag} />
              )}
              {Array.isArray(props.tag) && props.tag.length > 2 && (
                <span className="text-xs dark:text-white/30 text-gray-400 px-2 py-0.5">+{props.tag.length - 2}</span>
              )}
            </div>
            <span className="text-xs dark:text-white/25 text-gray-400 flex-shrink-0">{date}</span>
          </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none dark:bg-gradient-to-t dark:from-violet-500/5 dark:to-transparent bg-gradient-to-t from-violet-50/50 to-transparent" />
      </div>

      {showDetail && (
        <DetailModal
          title={props.title} link={props.link}
          tags={Array.isArray(props.tag) ? props.tag : [props.tag as string]}
          summary={props.summary} icon={props.icon}
          audioUrl={props.audioUrl}
          isShared={props.isShared}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
});

export default Card;
