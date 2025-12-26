import ButtonUi from "../components/ButtonUi/Button";
import SideNavbar from "../components/SideNavbarUi/SideNavbar";
import ShareIcon from "../components/icons/ShareIcon";
import PlusIcon from "../components/icons/PlusIcon";
import {useEffect ,useState } from "react";
import Modal from "../components/ModalUi/Modal";
import Card from "../components/CardUi/Card";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";

interface LocalContentItem {
  contentType: "Youtube" | "Twitter" | "Notion";
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
  const [reloadData, setReloadData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data1, setData] = useState<LocalContentItem[]>([]);
  const [ytData, setYTData] = useState<LocalContentItem[]>([]);
  const [notionData, setNitionData] = useState<LocalContentItem[]>([]);
  const [twitterData, setTwitterData] = useState<LocalContentItem[]>([]);
  const [dataShow, setDataShow] = useState("All");

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

      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5000";
      
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
      case "Notion": return "Documents & Notes";
      case "Twitter": return "Social Posts";
      default: return "All Content";
    }
  };

  const getDisplaySubtitle = () => {
    const count = dataShow === "All" ? data1.length : 
                 dataShow === "Youtube" ? ytData.length : 
                 dataShow === "Twitter" ? twitterData.length : notionData.length;
    return `${count} items in your collection`;
  };

  const renderContent = () => {
    const loadingSpinner = (color: string) => (
      <div className="flex items-center justify-center w-full h-64 col-span-full">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${color}`}></div>
        <span className="ml-3 text-xl font-semibold text-gray-600">Loading...</span>
      </div>
    );

    const emptyState = (icon: string, title: string, subtitle: string) => (
      <div className="flex flex-col items-center justify-center w-full h-64 text-center col-span-full">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">{icon}</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4">{subtitle}</p>
        {dataShow === "All" && (
          <button 
            onClick={() => setModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Your First Item
          </button>
        )}
      </div>
    );

    const renderCards = (data: LocalContentItem[]) => 
      data.map((item: any, idx: number) => (
        <Card 
          key={`${item.title}-${item.link}-${idx}`}
          icon={item.contentType} 
          tag={(item as any).tags || (item as any).tag} 
          summary={(item as any).summary}
          title={item.title} 
          link={item.link} 
          reload={() => setReloadData(!reloadData)}
        />
      ));

    if (loading) {
      const colors = {
        All: "border-blue-500",
        Youtube: "border-red-500", 
        Twitter: "border-blue-400",
        Notion: "border-gray-500"
      };
      return loadingSpinner(colors[dataShow as keyof typeof colors] || "border-blue-500");
    }

    switch(dataShow) {
      case "All":
        return data1.length > 0 ? renderCards(data1) : emptyState("📚", "No content yet", "Start building your second brain by adding some content!");
      case "Youtube":
        return ytData.length > 0 ? renderCards(ytData) : emptyState("🎥", "No YouTube content", "Add some YouTube videos to get started!");
      case "Twitter":
        return twitterData.length > 0 ? renderCards(twitterData) : emptyState("🐦", "No Twitter content", "Save some interesting tweets!");
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

      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5000";
      
      const res = await fetch(`${API_BASE_URL}/api/v1/content`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
      });
      const jsonData = await res.json();
      
      if (res.ok) {
        const encodedData = encodeURIComponent(JSON.stringify(jsonData.data));
        const shareLink = `http://localhost:5173/share/${userId}?data=${encodedData}`;
       
        navigator.clipboard.writeText(shareLink)
        .then(() => {
          showNotification('success', 'Shareable link copied to clipboard!');
        })
        .catch((err) => {
          console.error("Failed to copy link: ", err);
          showNotification('error', 'Failed to copy link to clipboard');
        });
      } else {
        showNotification('error', 'Something went wrong while sharing');
      }
      }catch(err){
        showNotification('error', 'Error while sharing content');
      }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideNavbar setYTData={setYTData} setNitionData={setNitionData} data1={data1} setDataShow={setDataShow} setTwitterData={setTwitterData}/>
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="ml-12 lg:ml-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {getDisplayTitle()}
                </h1>
                <p className="text-sm text-gray-600 mt-1">{getDisplaySubtitle()}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div onClick={share} className="w-full sm:w-auto">
                  <ButtonUi variant="secondary" size="lg" startIcon={<ShareIcon/>}>Share</ButtonUi>
                </div>
                <div className="w-full sm:w-auto">
                  <ButtonUi 
                    variant="primary" 
                    size="lg" 
                    startIcon={<PlusIcon/>} 
                    onClick={()=> setModal(!modal)}
                  >
                    Add Content
                  </ButtonUi>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      
      {modal && <Modal onClick={()=> setModal(!modal)} setModal={setModal} setReloadData={()=> setReloadData(!reloadData)}/>}
    </div> 
  )
}

export default HomePage;