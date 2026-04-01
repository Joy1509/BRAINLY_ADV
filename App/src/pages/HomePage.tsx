import ButtonUi from "../components/ButtonUi/Button";
import SideNavbar from "../components/SideNavbarUi/SideNavbar";
import ShareIcon from "../components/icons/ShareIcon";
import PlusIcon from "../components/icons/PlusIcon";
import {useEffect ,useState } from "react";
import Modal from "../components/ModalUi/Modal";
import Card from "../components/CardUi/Card";
import ShareModal from "../components/ShareModal/ShareModal";
import ThemeToggle from "../components/ThemeToggle/ThemeToggle";
import AnimatedNavbar from "../components/AnimatedNavbar/AnimatedNavbar";
import ChatBot from "../components/ChatBot/ChatBot";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";

interface LocalContentItem {
  contentType: "Youtube" | "Twitter" | "Notion" | "Instagram" | "Text";
  tag?: string | string[];
  tags?: string[];
  summary?: string;
  title: string;
  link: string;
}

const HomePage = ()=>{
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [modal,setModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [reloadData, setReloadData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data1, setData] = useState<LocalContentItem[]>([]);
  const [ytData, setYTData] = useState<LocalContentItem[]>([]);
  const [notionData, setNitionData] = useState<LocalContentItem[]>([]);
  const [twitterData, setTwitterData] = useState<LocalContentItem[]>([]);
  const [instagramData, setInstagramData] = useState<LocalContentItem[]>([]);
  const [textData, setTextData] = useState<LocalContentItem[]>([]);
  const [dataShow, setDataShow] = useState("All");
  const initial = (localStorage.getItem('username') || 'U').charAt(0).toUpperCase();

  useEffect(()=>{
    fetchingData();
  },[reloadData])

  async function fetchingData(){
    try{
      setLoading(true);
      const token = localStorage.getItem("token");
      if(!token){
        showNotification('error', 'Please log in first');
        navigate("/"); 
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const res = await fetch(`${API_BASE_URL}/api/v1/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const jsonData = await res.json();
      setData(jsonData.data || []);
      }catch(err){
        showNotification('error', 'Error loading content');
      }finally {
        setLoading(false);
      }
  }

  const getDisplayTitle = () => {
    switch(dataShow) {
      case "Youtube": return "YouTube Videos";
      case "Notion": return "Notion";
      case "Twitter": return "Social Posts";
      case "Instagram": return "Instagram";
      case "Text": return "Notes & Text";
      default: return "All Content";
    }
  };

  const getDisplaySubtitle = () => {
    const count = dataShow === "All" ? data1.length : 
                 dataShow === "Youtube" ? ytData.length : 
                 dataShow === "Twitter" ? twitterData.length : 
                 dataShow === "Instagram" ? instagramData.length : 
                 dataShow === "Text" ? textData.length : notionData.length;
    return `${count} items in your collection`;
  };

  const renderContent = () => {
    const loadingSpinner = (color: string) => (
      <div className="flex items-center justify-center w-full h-64 col-span-full">
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${color}`}></div>
        <span className="ml-3 text-base font-medium dark:text-white/40 text-gray-400">Loading...</span>
      </div>
    );

    const emptyState = (icon: string, title: string, subtitle: string) => (
      <div className="flex flex-col items-center justify-center w-full h-64 text-center col-span-full">
        <div className="w-20 h-20 dark:bg-white/5 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 dark:border-white/10 border border-gray-200">
          <span className="text-4xl">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold dark:text-white/70 text-gray-700 mb-2">{title}</h3>
        <p className="dark:text-white/30 text-gray-400 text-sm mb-5">{subtitle}</p>
        {dataShow === "All" && (
          <button
            onClick={() => setModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all"
          >
            Add Your First Item
          </button>
        )}
      </div>
    );

    const renderCards = (data: LocalContentItem[]) => 
      data.map((item: any, idx: number) => (
        <Card 
          key={`${item.title}-${item.link || item._id}-${idx}`}
          icon={item.contentType} 
          tag={(item as any).tags || (item as any).tag} 
          summary={(item as any).summary || (item as any).text}
          title={item.title} 
          link={item.link}
          id={item._id}
          createdAt={item.createdAt}
          reload={() => setReloadData(!reloadData)}
        />
      ));

    if (loading) {
      const colors = {
        All: "border-violet-500",
        Youtube: "border-red-500",
        Twitter: "border-sky-400",
        Notion: "border-white/40"
      };
      return loadingSpinner(colors[dataShow as keyof typeof colors] || "border-violet-500");
    }

    switch(dataShow) {
      case "All":
        return data1.length > 0 ? renderCards(data1) : emptyState("📚", "No content yet", "Start building your second brain by adding some content!");
      case "Youtube":
        return ytData.length > 0 ? renderCards(ytData) : emptyState("🎥", "No YouTube content", "Add some YouTube videos to get started!");
      case "Twitter":
        return twitterData.length > 0 ? renderCards(twitterData) : emptyState("🐦", "No Twitter content", "Save some interesting tweets!");
      case "Instagram":
        return instagramData.length > 0 ? renderCards(instagramData) : emptyState("📸", "No Instagram content", "Save Instagram posts & reels to your brain!");
      case "Text":
        return textData.length > 0 ? renderCards(textData) : emptyState("📝", "No notes yet", "Add some typed notes or quick thoughts!");
      default:
        return notionData.length > 0 ? renderCards(notionData) : emptyState("📝", "No documents", "Add some documents to organize your thoughts!");
    }
  };

  async function share(){
    try{
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if(!token || !userId){
        showNotification('error', 'Please log in first');
        navigate("/"); 
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const res = await fetch(`${API_BASE_URL}/api/v1/create-share`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
      });
      const jsonData = await res.json();
      
      if (res.ok) {
        setShareUrl(jsonData.shareUrl);
        setShareModal(true);
      } else {
        showNotification('error', 'Something went wrong while sharing');
      }
      }catch(err){
        showNotification('error', 'Error while sharing content');
      }
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f1a] dark:bg-[#0f0f1a] bg-gray-50">
      <SideNavbar
        setYTData={setYTData}
        setNitionData={setNitionData}
        data1={data1}
        setDataShow={setDataShow}
        setTwitterData={setTwitterData}
        setInstagramData={setInstagramData}
        setTextData={setTextData}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative dark:bg-[#13131f]/80 bg-white/80 backdrop-blur-xl dark:border-white/5 border-gray-200 border-b flex-shrink-0 sticky top-0 z-30">
          {/* Animals behind content */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <AnimatedNavbar />
          </div>
          <div className="relative z-10 px-4 sm:px-8 py-2">
            <div className="relative flex items-center">
              {/* Logo left */}
              <div className="flex items-center ml-10 mb-1">
                <img src="/Brainly.png" alt="Second Brain" onClick={() => navigate('/home')} className="w-14 h-14 object-contain hover:scale-110 transition-transform duration-200 translate-y-1 cursor-pointer" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 text-center">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {getDisplayTitle()}
                </h1>
                <p className="text-xs dark:text-white/40 text-gray-400 mt-0.5">{getDisplaySubtitle()}</p>
              </div>
              <div className="ml-auto flex gap-2 items-center">
                <ThemeToggle />
                <button
                  onClick={share}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white/70 dark:hover:text-white bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 hover:text-gray-900 text-sm font-medium transition-all duration-200"
                >
                  <ShareIcon /><span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={() => setModal(!modal)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/25 transition-all duration-200"
                >
                  <PlusIcon /><span className="hidden sm:inline">Add Content</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/25 hover:scale-105 transition-all duration-200"
                  title="Profile"
                >
                  {initial}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <Modal
          onClick={() => setModal(!modal)}
          setModal={setModal}
          setReloadData={() => setReloadData(!reloadData)}
        />
      )}

      {shareModal && (
        <ShareModal
          shareUrl={shareUrl}
          onClose={() => setShareModal(false)}
        />
      )}

      <ChatBot />
    </div>
  )
}

export default HomePage;