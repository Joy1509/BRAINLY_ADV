import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";
import { useAuth } from "../context/AuthContext";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role") || 'user';
    const error = searchParams.get("error");

    if (error || !token || !userId) {
      showNotification("error", "OAuth login failed. Please try again.");
      navigate("/");
      return;
    }

    // Get username from localStorage or use default
    const username = localStorage.getItem("username") || "User";
    
    const avatar = searchParams.get("avatar") || '';
    
    login(token, userId, username, role, avatar);
    
    const redirectTo = role === 'admin' ? '/admin' : '/home';
    showNotification("success", "Logged in successfully!");
    navigate(redirectTo);
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
