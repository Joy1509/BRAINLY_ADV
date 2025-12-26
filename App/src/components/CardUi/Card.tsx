import DocumentIcon from "../icons/DocumentIcon";
import NotionIcon from "../icons/NotionIcon";
import DeleteIcon from "../icons/DeleteIcon";
import Tags from "./Tags";
import DetailModal from "./DetailModal";
import { format } from "date-fns";
import { JSX, useEffect, useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import TwitterIcon from "../icons/TwitterIcon";
import { useNotification } from "../NotificationUi/NotificationProvider";

interface CardProps {
  icon: "Youtube" | "Twitter" | "Notion" | "Instagram";
  tag: string | string[];
  title: string;
  link: string;
  reload?: () => void;
  isShared?: boolean;
}

const Card = memo((props: CardProps) => {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();

  const date = useMemo(() => format(new Date(), "dd MMM yyyy"), []);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // ✅ Memoized helper
  const getYoutubeId = useCallback((url: string): string | null => {
    const regular = url.split("v=");
    if (regular.length > 1) return regular[1].split("&")[0];

    const short = url.split("youtu.be/");
    if (short.length > 1) return short[1].split("?")[0];

    return null;
  }, []);

  // ✅ Run effect ONLY for Youtube
  useEffect(() => {
    if (props.icon !== "Youtube") return;

    const videoId = getYoutubeId(props.link);
    setThumbnail(
      videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
    );
  }, [props.icon, props.link, getYoutubeId]);

  // ✅ Memoized JSX
  const [showDetail, setShowDetail] = useState(false);

  const contentPreview: JSX.Element = useMemo(() => {
    if (props.icon === "Youtube") {
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          {thumbnail ? (
            <a href={props.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full" onClick={(e)=>e.stopPropagation()}>
              <img
                src={thumbnail}
                alt={props.title}
                className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
              />
            </a>
          ) : (
            <div className="w-full h-full bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-500 text-4xl">📺</span>
            </div>
          )}
        </div>
      );
    }

    if (props.icon === "Twitter") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <a href={props.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
              <TwitterIcon />
            </div>
          </a>
        </div>
      );
    }

    if (props.icon === "Instagram") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <a href={props.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full">
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center hover:bg-pink-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current text-pink-600" viewBox="0 0 24 24"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm5 4.25A4.75 4.75 0 1 1 7.25 11 4.75 4.75 0 0 1 12 6.25zm5.4-.9a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
            </div>
          </a>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <a href={props.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full h-full" onClick={(e)=>e.stopPropagation()}>
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <NotionIcon />
          </div>
        </a>
      </div>
    );
  }, [props.icon, props.link, props.title, thumbnail]);

  // ✅ Memoized handler
  const deleteHandle = useCallback(async () => {
    const confirmed = await showConfirm(
      "Delete Content",
      `Are you sure you want to delete "${props.title}"? This action cannot be undone.`,
      "danger"
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("error", "Please log in first");
        navigate("/");
        return;
      }

      const res = await fetch(`http://localhost:5000/api/v1/delete/${props.title}`, {
        method: "DELETE",
        headers: { token },
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      showNotification("success", "Content deleted successfully");
      props.reload?.();
    } catch {
      showNotification("error", "Failed to delete content");
    }
  }, [navigate, props.title, props.reload, showConfirm, showNotification]);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div role="button" tabIndex={0} onClick={() => setShowDetail(true)} onKeyDown={(e)=> { if(e.key === 'Enter') setShowDetail(true)}} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden h-80 cursor-pointer">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 w-6 h-6 text-blue-600">
              <DocumentIcon />
            </div>
            <h3 className="font-medium text-gray-800 truncate text-sm">{props.title}</h3>
          </div>
          {!props.isShared && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteHandle(); }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all ml-2"
            >
              <DeleteIcon />
            </button>
          )}
        </div>

        <div className="h-40 bg-gray-50">{contentPreview}</div>

        <div className="p-4 bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {Array.isArray(props.tag) ? (
                props.tag.slice(0, 2).map((t, idx) => (
                  <Tags key={idx} tagType={t} />
                ))
              ) : (
                <Tags tagType={props.tag} />
              )}
              {Array.isArray(props.tag) && props.tag.length > 2 && (
                <span className="text-xs text-gray-500 px-2 py-1">+{props.tag.length - 2}</span>
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{date}</span>
          </div>
        </div>
      </div>

      {showDetail && (
        <div>
          {/* Lazy load detail modal */}
          <DetailModal
            title={props.title}
            link={props.link}
            tags={Array.isArray(props.tag) ? props.tag : [props.tag as string]}
            summary={props.summary}
            onClose={() => setShowDetail(false)}
          />
        </div>
      )}
    </div>
  );
});

export default Card;
