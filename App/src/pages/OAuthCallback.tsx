import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const error = searchParams.get("error");

    if (error || !token || !userId) {
      showNotification("error", "OAuth login failed. Please try again.");
      navigate("/");
      return;
    }

    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    showNotification("success", "Logged in successfully!");
    navigate("/home");
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
        <p className="text-white/50 text-sm">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
