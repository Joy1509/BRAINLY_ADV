import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5000";
const STORAGE_KEYS = {
  TOKEN: "token",
  USER_ID: "userId"
} as const;

const RegisterPage = ()=>{
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const getFormData = (form: HTMLFormElement, fields: string[]) => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      const element = form.elements.namedItem(field) as HTMLInputElement;
      data[field] = element?.value || "";
    }
    return data;
  };

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const { username, email, password } = getFormData(form, [
    "username",
    "email",
    "password",
  ]);

  if (!username || !email || !password) {
    showNotification("error", "Please fill in all fields");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });

    if (res.ok) {
      showNotification("success", "Account created successfully!");
      form.reset(); // ✅ moved here (only on success)
    } else {
      showNotification("error", "Account already exists");
    }
  } catch (err) {
    showNotification("error", "Error creating account");
  }
}


  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { email, password } = getFormData(form, ['email', 'password']);

    if (!email || !password) {
      showNotification('error', 'Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      
      const backendData = await res.json();
      if (res.ok) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, backendData.token);
        localStorage.setItem(STORAGE_KEYS.USER_ID, backendData.userID);
        showNotification('success', 'Logged in successfully!');
        navigate("/home"); 
      } else {
        showNotification('error', 'Invalid credentials');
      }
    } catch (err) {
      showNotification('error', 'Login failed');
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Sign Up Section */}
          <div className="lg:w-1/2 p-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Welcome to</h1>
                <h2 className="text-3xl font-bold text-blue-200">Second Brain</h2>
                <p className="text-blue-100 mt-4">Organize your thoughts, links, and ideas in one place</p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Create your account</h3>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Username" 
                    required 
                    name="username" 
                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    required 
                    name="email" 
                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    name="password" 
                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                  <button className="w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg">
                    Create Account
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Login Section */}
          <div className="lg:w-1/2 p-8">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">SB</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Welcome Back</h3>
                <p className="text-gray-600 mt-2">Sign in to your account</p>
              </div>
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <input 
                    type="email" 
                    placeholder="Email" 
                    required 
                    name="email" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    name="password" 
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  />
                </div>
                <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                  Sign In
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600">New to Second Brain? Create an account on the left!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage;
