import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";
import Spinner from "../components/Spinner/Spinner";
import FaceCapture from "../components/FaceCapture";
import VoiceCapture from "../components/VoiceCapture";
import { useVoiceAuth } from "../components/voiceAuthAPI";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEYS = { TOKEN: "token", USER_ID: "userId" } as const;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isActive, setIsActive] = useState(false);

  // Signup state
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
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'register' | 'login'>('login');
  const [processingVoice, setProcessingVoice] = useState(false);
  const [pendingVoiceData, setPendingVoiceData] = useState<any>(null);
  const [showVoiceRegistrationOption, setShowVoiceRegistrationOption] = useState(false);
  const [voicePassphrase, setVoicePassphrase] = useState('');
  const [voiceEncryptionPassword, setVoiceEncryptionPassword] = useState('');
  const [voiceLoginUsername, setVoiceLoginUsername] = useState('');
  const [voiceLoginEncryption, setVoiceLoginEncryption] = useState('');
  const [showVoiceLoginModal, setShowVoiceLoginModal] = useState(false);

  // Voice auth hook
  const voiceAuth = useVoiceAuth();

  const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);
  const isStrongPassword = (p: string) => /(?=.*[A-Z])(?=.*\d).{6,}/.test(p);

  const clearOtpTimer = () => {
    if (otpTimerRef.current) { clearInterval(otpTimerRef.current); otpTimerRef.current = null; }
    setOtpSecondsLeft(0);
  };

  const startOtpTimer = (seconds = 120) => {
    clearOtpTimer();
    setOtpSecondsLeft(seconds);
    otpTimerRef.current = window.setInterval(() => {
      setOtpSecondsLeft(prev => {
        if (prev <= 1) { clearOtpTimer(); setForgotStage('request'); showNotification('error', 'OTP expired'); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const closeForgotModal = () => {
    clearOtpTimer();
    setShowForgotModal(false);
    setForgotStage('request');
    setForgotEmail('');
    setForgotOtp('');
    setPreviewUrl(null);
  };

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement)?.value.trim();

    if (!username || !signupEmail || !signupPassword || !signupConfirm) { showNotification("error", "Please fill in all fields"); return; }
    if (!isValidEmail(signupEmail)) { showNotification("error", "Please enter a valid email"); return; }
    if (!isStrongPassword(signupPassword)) { showNotification("error", "Password needs uppercase, number, min 6 chars"); return; }
    if (signupPassword !== signupConfirm) { showNotification("error", "Passwords do not match"); return; }

    // Store signup data and show both face and voice registration options
    setPendingSignupData({ username, email: signupEmail, password: signupPassword });
    setShowFaceRegistrationOption(true);
  }

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
          // Get user data to register face
          const userData = await res.json();
          showNotification("success", "Account created! Now let's set up face authentication.");
          
          // Auto-login the user temporarily to register face
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
            // Temporarily store token for face registration
            localStorage.setItem(STORAGE_KEYS.TOKEN, loginData.token);
            localStorage.setItem(STORAGE_KEYS.USER_ID, loginData.userID);
            
            // Show face capture for registration
            setFaceMode('register');
            setShowFaceCapture(true);
            setShowFaceRegistrationOption(false);
          } else {
            showNotification("error", "Account created but couldn't auto-login for face setup. Please login manually.");
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

  const resetSignupForm = () => {
    const form = document.querySelector('form[data-signup]') as HTMLFormElement;
    if (form) form.reset();
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirm('');
    setEmailError('');
    setPasswordError('');
    setEmailValid(null);
    setPendingSignupData(null);
    setPendingVoiceData(null);
    setShowFaceRegistrationOption(false);
    setShowVoiceRegistrationOption(false);
    setIsActive(false);
  };

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
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(STORAGE_KEYS.USER_ID, data.userID);
        if (data.username) localStorage.setItem('username', data.username);
        showNotification('success', 'Logged in successfully!');
        navigate("/home");
      } else {
        showNotification('error', 'Invalid credentials');
      }
    } catch { showNotification('error', 'Login failed'); }
  }

  const sendForgotOtp = async () => {
    if (sendingOtp || !forgotEmail) { showNotification('error', 'Please enter your email'); return; }
    if (!isValidEmail(forgotEmail)) { showNotification('error', 'Please enter a valid email'); return; }
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/forgot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email: forgotEmail })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.previewUrl) setPreviewUrl(data.previewUrl);
        showNotification('success', 'OTP sent to your email');
        setForgotStage('verify'); startOtpTimer(120);
      } else {
        const data = await res.json();
        showNotification('error', data?.message || 'Failed to send OTP');
      }
    } catch { showNotification('error', 'Failed to send OTP'); }
    finally { setSendingOtp(false); }
  };

  const verifyForgotOtp = async () => {
    if (verifyingOtp || !forgotOtp) { showNotification('error', 'Please enter the OTP'); return; }
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ otp: forgotOtp })
      });
      const data = await res.json();
      if (res.ok) { setResetToken(data?.resetToken || null); setForgotStage('reset'); clearOtpTimer(); showNotification('success', 'OTP verified'); }
      else showNotification('error', data?.message || 'Invalid OTP');
    } catch { showNotification('error', 'OTP verification failed'); }
    finally { setVerifyingOtp(false); }
  };

  const submitResetPassword = async () => {
    if (resettingPassword) return;
    if (!newPassword || !confirmNewPassword) { showNotification('error', 'Please fill all fields'); return; }
    if (newPassword !== confirmNewPassword) { showNotification('error', 'Passwords do not match'); return; }
    if (!isStrongPassword(newPassword)) { showNotification('error', 'Password needs uppercase, number, min 6 chars'); return; }
    if (!resetToken) { showNotification('error', 'Missing reset token'); return; }
    setResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await res.json();
      if (res.ok) { showNotification('success', 'Password updated!'); closeForgotModal(); }
      else showNotification('error', data?.message || 'Failed to update password');
    } catch { showNotification('error', 'Failed to update password'); }
    finally { setResettingPassword(false); }
  };

  // Face authentication handlers
  const handleFaceLogin = () => {
    setFaceMode('login');
    setShowFaceCapture(true);
    setProcessingFace(false); // Ensure processing state is reset
  };

  const handleFaceRegister = () => {
    // Validate form first
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

    // Store signup data and proceed with face registration
    setPendingSignupData({ username, email: signupEmail, password: signupPassword });
    handleCompleteSignup(true);
  };

  // Voice authentication handlers
  const handleVoiceLogin = () => {
    setShowVoiceLoginModal(true);
  };

  const handleVoiceRegister = () => {
    // Validate form first
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

    // Store signup data and show voice registration
    setPendingVoiceData({ username, email: signupEmail, password: signupPassword });
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
        // Voice registration
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
          localStorage.setItem('token', result.token!);
          localStorage.setItem('userId', result.userID!);
          if (result.username) localStorage.setItem('username', result.username);
          
          showNotification('success', `Welcome ${result.username}! Voice authentication set up successfully!`);
          navigate('/home');
        } else {
          showNotification('error', result.message || 'Voice registration failed');
        }
      } else {
        // Voice login
        const audioFile = voiceAuth.blobToFile(audioBlob);
        
        const loginData = {
          username: voiceLoginUsername,
          encryptionPassword: voiceLoginEncryption,
          audioFile
        };

        const result = await voiceAuth.login(loginData);
        
        if (result.success) {
          localStorage.setItem('token', result.token!);
          localStorage.setItem('userId', result.userID!);
          if (result.username) localStorage.setItem('username', result.username);
          
          showNotification('success', `Welcome back, ${result.username}! (Confidence: ${(result.confidence! * 100).toFixed(1)}%)`);
          navigate('/home');
        } else {
          showNotification('error', result.message || 'Voice authentication failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Voice authentication error:', error);
      if (voiceMode === 'register') {
        showNotification('error', 'Voice registration failed, but you can try again');
      } else {
        showNotification('error', 'Voice authentication failed');
      }
    } finally {
      setProcessingVoice(false);
      setPendingVoiceData(null);
      setVoiceLoginUsername('');
      setVoiceLoginEncryption('');
    }
  };

  const handleFaceCapture = async (images: string[]) => {
    // Close face capture modal first to prevent flickering
    setShowFaceCapture(false);
    setProcessingFace(true);
    
    try {
      if (faceMode === 'login') {
        // Face login
        const res = await fetch(`${API_BASE_URL}/api/v1/face/login-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image: images[0] })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
          localStorage.setItem(STORAGE_KEYS.USER_ID, data.user.id);
          if (data.user.username) localStorage.setItem('username', data.user.username);
          
          showNotification('success', `Welcome back, ${data.user.username}!`);
          navigate('/home');
        } else {
          showNotification('error', data.message || 'Face not recognized');
        }
      } else if (faceMode === 'register') {
        // Face registration during signup
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
          showNotification('success', 'Face registration successful! You can now login with your face.');
          navigate('/home'); // Go to home after successful registration
        } else {
          showNotification('error', data.message || 'Face registration failed');
          // Still allow them to continue without face auth
          navigate('/home');
        }
      }
    } catch (error) {
      console.error('Face authentication error:', error);
      if (faceMode === 'register') {
        showNotification('error', 'Face registration failed, but account was created successfully');
        navigate('/home'); // Still proceed to home
      } else {
        showNotification('error', 'Face authentication failed');
      }
    } finally {
      setProcessingFace(false);
      resetSignupForm();
    }
  };

  const handleCloseFaceCapture = () => {
    setShowFaceCapture(false);
    setProcessingFace(false);
  };
    // Close face capture modal first to prevent flickering
    setShowFaceCapture(false);
    setProcessingFace(true);
    
    try {
      if (faceMode === 'login') {
        // Face login
        const res = await fetch(`${API_BASE_URL}/api/v1/face/login-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image: images[0] })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
          localStorage.setItem(STORAGE_KEYS.USER_ID, data.user.id);
          if (data.user.username) localStorage.setItem('username', data.user.username);
          
          showNotification('success', `Welcome back, ${data.user.username}! 🎉`);
          navigate('/home');
        } else {
          showNotification('error', data.message || 'Face not recognized');
        }
      } else if (faceMode === 'register') {
        // Face registration during signup
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
          showNotification('success', 'Face registration successful! 🎉 You can now login with your face.');
          navigate('/home'); // Go to home after successful registration
        } else {
          showNotification('error', data.message || 'Face registration failed');
          // Still allow them to continue without face auth
          navigate('/home');
        }
      }
    } catch (error) {
      console.error('Face authentication error:', error);
      if (faceMode === 'register') {
        showNotification('error', 'Face registration failed, but account was created successfully');
        navigate('/home'); // Still proceed to home
      } else {
        showNotification('error', 'Face authentication failed');
      }
    } finally {
      setProcessingFace(false);
      resetSignupForm();
    }
  };

  const handleCloseFaceCapture = () => {
    setShowFaceCapture(false);
    setProcessingFace(false);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all";
  const btnClass = "w-full py-3 rounded-xl font-semibold text-sm uppercase tracking-widest transition-all duration-200 active:scale-95";

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4" style={{ perspective: '1500px' }}>

      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div
        className="relative w-full max-w-3xl h-[520px] sm:h-[480px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Login Panel (left) */}
        <div
          className={`absolute left-0 top-0 w-1/2 h-full bg-[#13131f] border border-white/5 rounded-l-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ zIndex: isActive ? 0 : 2 }}
        >
          <div className="w-full px-8 py-6">
            <h1 className="text-2xl font-bold text-white text-center mb-6">Log In</h1>
            <form onSubmit={handleSignIn} className="space-y-3">
              <input type="email" name="email" placeholder="Email" required className={inputClass} />
              <input type="password" name="password" placeholder="Password" required className={inputClass} />
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className={`${btnClass} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25`}>
                Log In
              </button>
              
              {/* Voice Login Button */}
              <button 
                type="button" 
                onClick={handleVoiceLogin}
                className={`${btnClass} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Sign in with Voice
              </button>
              
              {/* Face Login Button */}
              <button 
                type="button" 
                onClick={handleFaceLogin}
                className={`${btnClass} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Sign in with Face
              </button>
            </form>

            {/* OAuth Buttons */}
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">or continue with</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="flex gap-2">
                <a
                  href="http://localhost:5000/api/v1/auth/google"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </a>
                <a
                  href="http://localhost:5000/api/v1/auth/github"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Register Panel (right) */}
        <div
          className={`absolute right-0 top-0 w-1/2 h-full bg-[#13131f] border border-white/5 rounded-r-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ zIndex: isActive ? 2 : 0 }}
        >
          <div className="w-full px-8 py-6">
            <h1 className="text-2xl font-bold text-white text-center mb-5">Sign Up</h1>
            <form onSubmit={handleSignUp} className="space-y-3" data-signup>
              <input type="text" name="username" placeholder="Username" required className={inputClass} />
              <div>
                <input
                  type="email" placeholder="Email" required value={signupEmail}
                  onChange={e => { const v = e.target.value; setSignupEmail(v); if (!v) { setEmailValid(null); setEmailError(''); return; } if (!isValidEmail(v)) { setEmailValid(false); setEmailError('Invalid email'); } else { setEmailValid(true); setEmailError(''); } }}
                  className={`${inputClass} ${emailError ? 'border-red-500/50' : emailValid ? 'border-green-500/50' : ''}`}
                />
                {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
              </div>
              <div>
                <input
                  type="password" placeholder="Password" required value={signupPassword}
                  onChange={e => { const v = e.target.value; setSignupPassword(v); setPasswordError(!v ? '' : !isStrongPassword(v) ? 'Needs uppercase, number, 6+ chars' : ''); }}
                  className={`${inputClass} ${passwordError ? 'border-red-500/50' : ''}`}
                />
                {passwordError && <p className="text-xs text-red-400 mt-1">{passwordError}</p>}
              </div>
              <input type="password" placeholder="Confirm Password" required value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} className={inputClass} />
              
              <button type="submit" className={`${btnClass} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25`}>
                Register
              </button>
              
              {/* Voice Registration Button */}
              <button 
                type="button" 
                onClick={handleVoiceRegister}
                className={`${btnClass} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Sign Up with Voice
              </button>
              
              {/* Sign Up with Face Button */}
              <button 
                type="button" 
                onClick={handleFaceRegister}
                className={`${btnClass} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Sign Up with Face
              </button>
            </form>

            {/* OAuth Buttons */}
            <div className="mt-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">or sign up with</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="flex gap-2">
                <a href="http://localhost:5000/api/v1/auth/google" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </a>
                <a href="http://localhost:5000/api/v1/auth/github" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Front overlay panel — shows when NOT active (shows "Hello, friend" → click to register) */}
        <div
          className="absolute right-0 top-0 w-1/2 h-full rounded-r-2xl flex items-center justify-center text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            zIndex: isActive ? 0 : 3,
            transformOrigin: 'left center',
            animation: isActive ? 'rotFront 0.6s ease-in-out forwards' : undefined,
            transform: isActive ? 'rotateY(-180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s ease-in-out',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="text-center px-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Hello, Friend!</h2>
            <p className="text-white/70 text-sm mb-6">Enter your details and start your journey with us</p>
            <button
              onClick={() => setIsActive(true)}
              className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-violet-600 transition-all duration-200 active:scale-95"
            >
              Register
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Back overlay panel — shows when active (shows "Welcome Back!" → click to login) */}
        <div
          className="absolute left-0 top-0 w-1/2 h-full rounded-l-2xl flex items-center justify-center text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            zIndex: isActive ? 3 : 0,
            transform: isActive ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: 'transform 0.6s ease-in-out',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="text-center px-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
            <p className="text-white/70 text-sm mb-6">To keep connected, please login with your personal info</p>
            <button
              onClick={() => setIsActive(false)}
              className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-indigo-600 transition-all duration-200 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Log In
            </button>
          </div>
        </div>
      </div>

      {/* Branding below */}
      <div className="fixed bottom-6 text-center">
        <p className="text-white/20 text-xs">© 2026 Second Brain</p>
      </div>

      {/* Voice Login Modal */}
      {showVoiceLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Voice Login
              </h3>
              <button 
                onClick={() => setShowVoiceLoginModal(false)} 
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Username</label>
                <input
                  type="text"
                  value={voiceLoginUsername}
                  onChange={(e) => setVoiceLoginUsername(e.target.value)}
                  placeholder="Enter your username"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Encryption Password</label>
                <input
                  type="password"
                  value={voiceLoginEncryption}
                  onChange={(e) => setVoiceLoginEncryption(e.target.value)}
                  placeholder="Enter your encryption password"
                  className={inputClass}
                />
                <p className="text-xs text-white/50 mt-1">
                  This is the password you set during voice registration
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleVoiceLoginSubmit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold transition-all"
                >
                  Continue to Voice Login
                </button>
                <button
                  onClick={() => setShowVoiceLoginModal(false)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-orange-300">
                  <p className="font-medium mb-1">Voice Login Requirements:</p>
                  <ul className="space-y-0.5 text-orange-300/80">
                    <li>• Speak your registered passphrase clearly</li>
                    <li>• Use the same encryption password</li>
                    <li>• Ensure quiet environment</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Face Registration Option Modal */}
      {showFaceRegistrationOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">✨ Set Up Face Authentication</h3>
              <p className="text-white/70 text-sm mb-6">
                Would you like to set up face authentication for faster, more secure logins?
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleCompleteSignup(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Yes, Set Up Face Authentication
              </button>
              
              <button
                onClick={() => handleCompleteSignup(false)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold text-sm transition-all duration-200 active:scale-95"
              >
                Skip for Now
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-emerald-300">
                  <p className="font-medium mb-1">Benefits:</p>
                  <ul className="space-y-0.5 text-emerald-300/80">
                    <li>• Lightning-fast login</li>
                    <li>• Enhanced security</li>
                    <li>• No passwords to remember</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">Reset Password</h3>
              <button onClick={closeForgotModal} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotStage === 'request' && (
              <div className="space-y-4">
                <p className="text-sm text-white/50">Enter your email and we'll send you a one-time code.</p>
                <input type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className={inputClass} />
                <div className="flex gap-2">
                  <button onClick={sendForgotOtp} disabled={sendingOtp} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${sendingOtp ? 'bg-violet-500/30 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'}`}>
                    {sendingOtp ? <><Spinner size="sm" className="mr-2 inline" />Sending...</> : 'Send OTP'}
                  </button>
                  <button onClick={closeForgotModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Cancel</button>
                </div>
              </div>
            )}

            {forgotStage === 'verify' && (
              <div className="space-y-4">
                <p className="text-sm text-white/50">Code sent to <span className="text-violet-400">{forgotEmail}</span></p>
                <p className="text-xs text-white/30">{otpSecondsLeft > 0 ? `Expires in ${Math.floor(otpSecondsLeft / 60).toString().padStart(2, '0')}:${(otpSecondsLeft % 60).toString().padStart(2, '0')}` : <span className="text-red-400">OTP expired</span>}</p>
                {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:underline">Preview email (dev)</a>}
                <input type="text" placeholder="Enter OTP" value={forgotOtp} onChange={e => setForgotOtp(e.target.value)} className={inputClass} />
                <div className="flex gap-2">
                  <button onClick={verifyForgotOtp} disabled={verifyingOtp} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${verifyingOtp ? 'bg-violet-500/30 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`}>
                    {verifyingOtp ? <><Spinner size="sm" className="mr-2 inline" />Verifying...</> : 'Verify'}
                  </button>
                  <button onClick={() => { setForgotStage('request'); setForgotOtp(''); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Back</button>
                </div>
              </div>
            )}

            {forgotStage === 'reset' && (
              <div className="space-y-4">
                <p className="text-sm text-white/50">Set a new password for <span className="text-violet-400">{forgotEmail}</span></p>
                <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
                <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={inputClass} />
                <div className="flex gap-2">
                  <button onClick={submitResetPassword} disabled={resettingPassword} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${resettingPassword ? 'bg-violet-500/30 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`}>
                    {resettingPassword ? <><Spinner size="sm" className="mr-2 inline" />Saving...</> : 'Save Password'}
                  </button>
                  <button onClick={closeForgotModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Voice Capture Modal */}
      {showVoiceCapture && !processingVoice && (
        <VoiceCapture
          mode={voiceMode}
          onCapture={handleVoiceCapture}
          onClose={handleCloseVoiceCapture}
          passphrase={voiceMode === 'register' ? undefined : voicePassphrase}
        />
      )}
      
      {/* Voice Processing Overlay */}
      {processingVoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-white font-semibold mb-1">
                {voiceMode === 'register' ? '🎤 Setting Up Voice Authentication' : '🔊 Authenticating Voice'}
              </h3>
              <p className="text-white/60 text-sm">
                {voiceMode === 'register' 
                  ? 'Please wait while we register your voice...' 
                  : 'Please wait while we verify your voice...'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Face Capture Modal */}
      {showFaceCapture && !processingFace && (
        <FaceCapture
          mode={faceMode}
          onCapture={handleFaceCapture}
          onClose={handleCloseFaceCapture}
          requiredImages={faceMode === 'register' ? 5 : 1}
        />
      )}
      
      {/* Processing Overlay */}
      {processingFace && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-white font-semibold mb-1">
                {faceMode === 'register' ? '📸 Setting Up Face Authentication' : '🔍 Authenticating Face'}
              </h3>
              <p className="text-white/60 text-sm">
                {faceMode === 'register' 
                  ? 'Please wait while we register your face...' 
                  : 'Please wait while we verify your identity...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
