import { useParams } from "react-router-dom";
import Card from "../components/CardUi/Card";
import ThemeToggle from "../components/ThemeToggle/ThemeToggle";
import { useEffect, useState } from "react";


interface SharedContent {
  contentType: "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text";
  tag?: string | string[];
  tags?: string[];
  summary?: string;
  title: string;
  link: string;
}

const SharedPage = () => {
  const { id: shareId } = useParams();
  const [sharedData, setSharedData] = useState<SharedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchSharedContent();
    }
  }, [shareId]);

  const fetchSharedContent = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_BASE_URL}/api/v1/shared/${shareId}`);
      
      if (res.ok) {
        const data = await res.json();
        setSharedData(data.data || []);
      } else if (res.status === 404) {
        setExpired(true);
      }
    } catch (error) {
      console.error('Error fetching shared content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0f0f1a] bg-gray-50">
      {/* Header */}
      <div className="dark:bg-[#13131f]/80 bg-white/80 backdrop-blur-xl dark:border-white/5 border-gray-200 border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/Brainly.png" alt="Second Brain" className="w-10 h-10 object-contain" />
              <span className="text-sm font-semibold dark:text-white/60 text-gray-500">Second Brain</span>
            </div>
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Shared Knowledge Collection
              </h1>
              <div className="mt-1 inline-flex items-center px-3 py-1 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20 bg-violet-100 text-violet-700 border border-violet-200 rounded-full text-xs font-medium">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {sharedData.length} items shared
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 dark:border-violet-500 border-violet-500"></div>
          </div>
        ) : expired ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 dark:bg-red-500/10 bg-red-50 rounded-2xl flex items-center justify-center mb-4 dark:border-red-500/20 border border-red-200">
              <span className="text-4xl">⏰</span>
            </div>
            <h3 className="text-lg font-semibold dark:text-white/70 text-gray-700 mb-2">Link Expired</h3>
            <p className="dark:text-white/30 text-gray-400 text-sm text-center max-w-md">This shared link is no longer valid. Shared links expire after <span className="dark:text-white/50 text-gray-600 font-medium">1 hour</span>. Ask the owner to generate a new one.</p>
          </div>
        ) : sharedData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {sharedData.map((item: any) => (
              <Card
                key={item.link}
                icon={item.contentType}
                tag={(item as any).tags || (item as any).tag}
                summary={(item as any).summary}
                title={item.title}
                link={item.link}
                isShared={true}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 dark:bg-white/5 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 dark:border-white/10 border border-gray-200">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-lg font-semibold dark:text-white/70 text-gray-700 mb-2">No Content Found</h3>
            <p className="dark:text-white/30 text-gray-400 text-sm text-center max-w-md">The shared link doesn't contain any content or may have expired.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedPage;
