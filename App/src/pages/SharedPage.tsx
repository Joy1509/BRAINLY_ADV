import { useLocation } from "react-router-dom";
import Card from "../components/CardUi/Card";
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
  const location = useLocation();
  const [sharedData, setSharedData] = useState<SharedContent[]>([]);

  useEffect(() => {
    // 1️⃣ Try to get data from navigation state
    if (location.state && (location.state as any).shared) {
      setSharedData((location.state as any).shared);
      return;
    }

    // 2️⃣ Fallback: get data from URL query params
    const queryParams = new URLSearchParams(location.search);
    const dataParam = queryParams.get("data");

    if (dataParam) {
      try {
        const decodedData: SharedContent[] = JSON.parse(
          decodeURIComponent(dataParam)
        );
        setSharedData(decodedData);
      } catch (error) {
        console.error("Failed to parse shared data", error);
      }
    }
  }, [location.search, location.state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Shared Knowledge Collection
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Curated content from Second Brain</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {sharedData.length} items shared
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sharedData.length > 0 ? (
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
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Content Found</h3>
            <p className="text-gray-500 text-center max-w-md">The shared link doesn't contain any content or may have expired.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedPage;
