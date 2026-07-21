import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner/Spinner";
import FaceCapture from "../components/FaceCapture";
import VoiceCapture from "../components/VoiceCapture";
import { useVoiceAuth } from "../components/voiceAuthAPI";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEYS = { TOKEN: "token", USER_ID: "userId", ROLE: "role" } as const;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { login } = useAuth();
  const [isActive, setIsActive] = useState(false);

  // Signup state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStage, setForgotStage] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const otpTimerRef = useRef<number | null>(null);

  // Face authentication state
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceMode, setFaceMode] = useState<'register' | 'login'>('login');
  const [processingFace, setProcessingFace] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  const [showFaceRegistrationOption, setShowFaceRegistrationOption] = useState(false);

  // Voice authentication state
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'register' | 'login'>('login');
  const [processingVoice, setProcessingVoice] = useState(false);
  const [pendingVoiceData, setPendingVoiceData] = useState<any>(null);
  const [voiceLoginUsername, setVoiceLoginUsername] = useState('');
  const [voiceLoginEncryption, setVoiceLoginEncryption] = useState('');
  const [showVoiceLoginModal, setShowVoiceLoginModal] = useState(false);

  // Voice auth hook
  const voiceAuth = useVoiceAuth();

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isStrongPassword = (p: string) => /(?=.*[A-Z])(?=.*\d).{6,}/.test(p);

  const resetSignupForm = () => {
    const form = document.querySelector('form[data-signup]') as HTMLFormElement;
    if (form) form.reset();
    setSignupEmail('');
    setSignupUsername('');
    setSignupPassword('');
    setSignupConfirm('');
    setEmailError('');
    setPasswordError('');
    setEmailValid(null);
    setPendingSignupData(null);
    setPendingVoiceData(null);
    setShowFaceRegistrationOption(false);
    setIsActive(false);
  };

  // Voice handlers
  const handleVoiceLogin = () => {
    setShowVoiceLoginModal(true);
  };

  const handleVoiceRegister = () => {
    const username = signupUsername.trim();

    if (!username || !signupEmail || !signupPassword || !signupConfirm) {
      showNotification("error", "Please fill in all fields first");
      return;
    }
    if (!isValidEmail(signupEmail)) {
      showNotification("error", "Please enter a valid email");
      return;
    }
    if (!isStrongPassword(signupPassword)) {
      showNotification("error", "Password needs uppercase, number, min 6 chars");
      return;
    }
    if (signupPassword !== signupConfirm) {
      showNotification("error", "Passwords do not match");
      return;
    }

    setPendingVoiceData({ username, email: signupEmail, password: signupPassword, encryptionPassword: signupPassword });
    setVoiceMode('register');
    setShowVoiceCapture(true);
  };

  const handleVoiceLoginSubmit = () => {
    if (!voiceLoginUsername.trim()) {
      showNotification('error', 'Please enter username');
      return;
    }
    if (!voiceLoginEncryption.trim()) {
      showNotification('error', 'Please enter encryption password');
      return;
    }
    
    setShowVoiceLoginModal(false);
    setVoiceMode('login');
    setShowVoiceCapture(true);
  };

  const handleVoiceCapture = async (audioBlob: Blob, passphrase?: string, encryptionPassword?: string) => {
    setShowVoiceCapture(false);
    setProcessingVoice(true);
    
    try {
      if (voiceMode === 'register') {
        if (!pendingVoiceData || !passphrase || !encryptionPassword) {
          showNotification('error', 'Missing registration data');
          return;
        }

        const registrationData = {
          username: pendingVoiceData.username,
          email: pendingVoiceData.email,
          password: pendingVoiceData.password,
          passphrase,
          encryptionPassword
        };

        const result = await voiceAuth.register(registrationData);
        
        if (result.success) {
          login(result.token!, result.userID!, result.username!, result.role || 'user');
          
          const redirectTo = result.role === 'admin' ? '/admin' : '/home';
          showNotification('success', `Welcome ${result.username}! Voice authentication set up successfully!`);
          navigate(redirectTo);
        } else {
          showNotification('error', result.message || 'Voice registration failed');
        }
      } else {
        const audioFile = voiceAuth.blobToFile(audioBlob);
        
        const loginData = {
          username: voiceLoginUsername,
          encryptionPassword: voiceLoginEncryption,
          audioFile
        };

        const result = await voiceAuth.login(loginData);
        
        if (result.success) {
          login(result.token!, result.userID!, result.username!, result.role || 'user', (result as any).avatar || '');
          
          const redirectTo = result.role === 'admin' ? '/admin' : '/home';
          showNotification('success', `Welcome back, ${result.username}! (Confidence: ${(result.confidence! * 100).toFixed(1)}%)`);
          navigate(redirectTo);
        } else {
          showNotification('error', result.message || 'Voice authentication failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Voice authentication error:', error);
      showNotification('error', 'Voice authentication failed');
    } finally {
      setProcessingVoice(false);
      setPendingVoiceData(null);
      setVoiceLoginUsername('');
      setVoiceLoginEncryption('');
    }
  };

  const handleCloseVoiceCapture = () => {
    setShowVoiceCapture(false);
    setProcessingVoice(false);
    setPendingVoiceData(null);
  };

  // Face handlers
  const handleFaceLogin = () => {
    setFaceMode('login');
    setShowFaceCapture(true);
    setProcessingFace(false);
  };

  const handleFaceRegister = () => {
    const form = document.querySelector('form[data-signup]') as HTMLFormElement;
    const username = (form?.elements.namedItem('username') as HTMLInputElement)?.value.trim();

    if (!username || !signupEmail || !signupPassword || !signupConfirm) {
      showNotification("error", "Please fill in all fields first");
      return;
    }
    if (!isValidEmail(signupEmail)) {
      showNotification("error", "Please enter a valid email");
      return;
    }
    if (!isStrongPassword(signupPassword)) {
      showNotification("error", "Password needs uppercase, number, min 6 chars");
      return;
    }
    if (signupPassword !== signupConfirm) {
      showNotification("error", "Passwords do not match");
      return;
    }

    setPendingSignupData({ username, email: signupEmail, password: signupPassword });
    handleCompleteSignup(true);
  };

  const handleCompleteSignup = async (withFace = false) => {
    if (!pendingSignupData) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(pendingSignupData),
      });
      
      if (res.ok) {
        if (withFace) {
          showNotification("success", "Account created! Now let's set up face authentication.");
          
          const loginRes = await fetch(`${API_BASE_URL}/api/v1/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
              email: pendingSignupData.email, 
              password: pendingSignupData.password 
            })
          });
          
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            login(loginData.token, loginData.userID, loginData.username, loginData.role || 'user', loginData.avatar || '');
            
            setFaceMode('register');
            setShowFaceCapture(true);
            setShowFaceRegistrationOption(false);
          } else {
            showNotification("error", "Account created but couldn't auto-login for face setup.");
            resetSignupForm();
          }
        } else {
          showNotification("success", "Account created! Please sign in.");
          resetSignupForm();
        }
      } else {
        showNotification("error", "Account already exists");
      }
    } catch {
      showNotification("error", "Error creating account");
    }
  };

  const handleFaceCapture = async (images: string[]) => {
    setShowFaceCapture(false);
    setProcessingFace(true);
    
    try {
      if (faceMode === 'login') {
        const res = await fetch(`${API_BASE_URL}/api/v1/face/login-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image: images[0] })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          login(data.token, data.user.id, data.user.username, data.user.role || 'user', data.user.avatar || '');
          
          const redirectTo = data.user.role === 'admin' ? '/admin' : '/home';
          showNotification('success', `Welcome back, ${data.user.username}!`);
          navigate(redirectTo);
        } else {
          showNotification('error', data.message || 'Face not recognized');
        }
      } else if (faceMode === 'register') {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) {
          showNotification('error', 'Authentication required for face registration');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/v1/face/register-face`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({ images })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          showNotification('success', 'Face registration successful!');
          const redirectTo = localStorage.getItem('role') === 'admin' ? '/admin' : '/home';
          navigate(redirectTo);
        } else {
          showNotification('error', data.message || 'Face registration failed');
          const redirectTo = localStorage.getItem('role') === 'admin' ? '/admin' : '/home';
          navigate(redirectTo);
        }
      }
    } catch (error) {
      console.error('Face authentication error:', error);
      if (faceMode === 'register') {
        showNotification('error', 'Face registration failed, but account was created successfully');
        const redirectTo = localStorage.getItem('role') === 'admin' ? '/admin' : '/home';
        navigate(redirectTo);
      } else {
        showNotification('error', 'Face authentication failed');
      }
    } finally {
      setProcessingFace(false);
      resetSignupForm();
    }
  };

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement)?.value.trim();

    if (!username || !signupEmail || !signupPassword || !signupConfirm) { showNotification("error", "Please fill in all fields"); return; }
    if (!isValidEmail(signupEmail)) { showNotification("error", "Please enter a valid email"); return; }
    if (!isStrongPassword(signupPassword)) { showNotification("error", "Password needs uppercase, number, min 6 chars"); return; }
    if (signupPassword !== signupConfirm) { showNotification("error", "Passwords do not match"); return; }

    setPendingSignupData({ username, email: signupEmail, password: signupPassword });
    setShowFaceRegistrationOption(true);
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;

    if (!email || !password) { showNotification('error', 'Please fill in all fields'); return; }
    if (!isValidEmail(email)) { showNotification('error', 'Please enter a valid email'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.userID, data.username, data.role || 'user', data.avatar || '');
        
        const redirectTo = data.role === 'admin' ? '/admin' : '/home';
        showNotification('success', 'Logged in successfully!');
        navigate(redirectTo);
      } else {
        showNotification('error', 'Invalid credentials');
      }
    } catch { showNotification('error', 'Login failed'); }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all";
  const btnClass = "w-full py-3 rounded-xl font-semibold text-sm uppercase tracking-widest transition-all duration-200 active:scale-95";

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4" style={{ perspective: '1500px' }}>
      {/* Main Container */}
      <div className="relative w-full max-w-3xl h-[520px] sm:h-[480px]" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Login Panel */}
        <div className={`absolute left-0 top-0 w-1/2 h-full bg-[#13131f] border border-white/5 rounded-l-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ zIndex: isActive ? 0 : 2 }}>
          <div className="w-full px-8 py-6">
            <h1 className="text-2xl font-bold text-white text-center mb-6">Log In</h1>
            <form onSubmit={handleSignIn} className="space-y-3">
              <input type="email" name="email" placeholder="Email" required className={inputClass} />
              <input type="password" name="password" placeholder="Password" required className={inputClass} />
              
              <button type="submit" className={`${btnClass} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25`}>
                Log In
              </button>
              
              <button type="button" onClick={handleVoiceLogin} className={`${btnClass} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2`}>
                Sign in with Voice
              </button>
              
              <button type="button" onClick={handleFaceLogin} className={`${btnClass} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2`}>
                Sign in with Face
              </button>
            </form>
          </div>
        </div>

        {/* Register Panel */}
        <div className={`absolute right-0 top-0 w-1/2 h-full bg-[#13131f] border border-white/5 rounded-r-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ zIndex: isActive ? 2 : 0 }}>
          <div className="w-full px-8 py-6">
            <h1 className="text-2xl font-bold text-white text-center mb-5">Sign Up</h1>
            <form onSubmit={handleSignUp} className="space-y-3" data-signup>
              <input type="text" name="username" placeholder="Username" required value={signupUsername} onChange={e => setSignupUsername(e.target.value)} className={inputClass} />
              <input type="email" placeholder="Email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} />
              <input type="password" placeholder="Password" required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} />
              <input type="password" placeholder="Confirm Password" required value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} className={inputClass} />
              
              <button type="submit" className={`${btnClass} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25`}>
                Register
              </button>
              
              <button type="button" onClick={handleVoiceRegister} className={`${btnClass} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2`}>
                Sign Up with Voice
              </button>
              
              <button type="button" onClick={handleFaceRegister} className={`${btnClass} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2`}>
                Sign Up with Face
              </button>
            </form>
          </div>
        </div>

        {/* Overlay panels for switching */}
        <div className="absolute right-0 top-0 w-1/2 h-full rounded-r-2xl flex items-center justify-center text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', zIndex: isActive ? 0 : 3, transform: isActive ? 'rotateY(-180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s ease-in-out', backfaceVisibility: 'hidden' }}>
          <div className="text-center px-8">
            <h2 className="text-2xl font-bold mb-2">Hello, Friend!</h2>
            <p className="text-white/70 text-sm mb-6">Enter your details and start your journey with us</p>
            <button onClick={() => setIsActive(true)} className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-violet-600 transition-all duration-200 active:scale-95">
              Register
            </button>
          </div>
        </div>

        <div className="absolute left-0 top-0 w-1/2 h-full rounded-l-2xl flex items-center justify-center text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', zIndex: isActive ? 3 : 0, transform: isActive ? 'rotateY(0deg)' : 'rotateY(180deg)', transition: 'transform 0.6s ease-in-out', backfaceVisibility: 'hidden' }}>
          <div className="text-center px-8">
            <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
            <p className="text-white/70 text-sm mb-6">To keep connected, please login with your personal info</p>
            <button onClick={() => setIsActive(false)} className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-indigo-600 transition-all duration-200 active:scale-95">
              Log In
            </button>
          </div>
        </div>
      </div>

      {/* Voice Login Modal */}
      {showVoiceLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Voice Login</h3>
              <button onClick={() => setShowVoiceLoginModal(false)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Username</label>
                <input type="text" value={voiceLoginUsername} onChange={(e) => setVoiceLoginUsername(e.target.value)} placeholder="Enter your username" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Encryption Password</label>
                <input type="password" value={voiceLoginEncryption} onChange={(e) => setVoiceLoginEncryption(e.target.value)} placeholder="Enter your encryption password" className={inputClass} />
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={handleVoiceLoginSubmit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold transition-all">
                  Continue to Voice Login
                </button>
                <button onClick={() => setShowVoiceLoginModal(false)} className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Capture Modal */}
      {showVoiceCapture && !processingVoice && (
        <VoiceCapture mode={voiceMode} onCapture={handleVoiceCapture} onClose={handleCloseVoiceCapture} encryptionPassword={voiceMode === 'register' ? pendingVoiceData?.encryptionPassword : undefined} />
      )}
      
      {/* Voice Processing Overlay */}
      {processingVoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-white font-semibold mb-1">
                {voiceMode === 'register' ? 'Setting Up Voice Authentication' : 'Authenticating Voice'}
              </h3>
              <p className="text-white/60 text-sm">
                {voiceMode === 'register' ? 'Please wait while we register your voice...' : 'Please wait while we verify your voice...'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Face Capture Modal */}
      {showFaceCapture && !processingFace && (
        <FaceCapture mode={faceMode} onCapture={handleFaceCapture} onClose={() => setShowFaceCapture(false)} requiredImages={faceMode === 'register' ? 5 : 1} />
      )}
      
      {/* Face Processing Overlay */}
      {processingFace && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-white font-semibold mb-1">
                {faceMode === 'register' ? 'Setting Up Face Authentication' : 'Authenticating Face'}
              </h3>
              <p className="text-white/60 text-sm">
                {faceMode === 'register' ? 'Please wait while we register your face...' : 'Please wait while we verify your identity...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Face Registration Option Modal */}
      {showFaceRegistrationOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Set Up Face Authentication</h3>
              <p className="text-white/70 text-sm mb-6">Would you like to set up face authentication for faster, more secure logins?</p>
            </div>
            
            <div className="space-y-3">
              <button onClick={() => handleCompleteSignup(true)} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2">
                Yes, Set Up Face Authentication
              </button>
              
              <button onClick={() => handleCompleteSignup(false)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold text-sm transition-all duration-200 active:scale-95">
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;