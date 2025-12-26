import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../components/NotificationUi/NotificationProvider";
import Spinner from "../components/Spinner/Spinner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5000";
const STORAGE_KEYS = {
  TOKEN: "token",
  USER_ID: "userId"
} as const;

const RegisterPage = ()=>{
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Signup inline validation state
  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [signupConfirm, setSignupConfirm] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [emailValid, setEmailValid] = React.useState<boolean | null>(null);

  const getFormData = (form: HTMLFormElement, fields: string[]) => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      const element = form.elements.namedItem(field) as HTMLInputElement;
      data[field] = element?.value || "";
    }
    return data;
  };

  // 🔧 Validation helpers
  const isValidEmail = (email: string) => {
    // Simple, practical email regex — sufficient for client-side validation
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const isStrongPassword = (password: string) => {
    // Require at least one uppercase letter and one digit, and minimum length 6
    return /(?=.*[A-Z])(?=.*\d).{6,}/.test(password);
  };

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const { username } = getFormData(form, [
    "username",
  ]);
  const email = signupEmail;
  const password = signupPassword;

  if (!username || !email || !password || !signupConfirm) {
    showNotification("error", "Please fill in all fields");
    return;
  }

  if (!isValidEmail(email)) {
    showNotification("error", "Please enter a valid email address");
    return;
  }

  if (!isStrongPassword(password)) {
    showNotification("error", "Password must have at least one uppercase letter, one number, and be at least 6 characters long");
    return;
  }

  if (password !== signupConfirm) {
    showNotification("error", "Passwords do not match");
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
      // clear controlled signup state
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirm('');
      setEmailError('');
      setPasswordError('');
      setEmailValid(null);
    } else {
      showNotification("error", "Account already exists");
    }
  } catch (err) {
    showNotification("error", "Error creating account");
  }
}


  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = React.useState(false);
  const [forgotStage, setForgotStage] = React.useState<'request'|'verify'|'reset'>('request');
  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotOtp, setForgotOtp] = React.useState('');
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');

  // Loading states for forgot-password flow
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [resettingPassword, setResettingPassword] = React.useState(false);

  // OTP timer and preview (dev)
  const [otpSecondsLeft, setOtpSecondsLeft] = React.useState(0);
  const otpTimerRef = React.useRef<number | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const clearOtpTimer = () => {
    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
      otpTimerRef.current = null;
    }
    setOtpSecondsLeft(0);
  };

  const startOtpTimer = (seconds = 120) => {
    clearOtpTimer();
    setOtpSecondsLeft(seconds);
    otpTimerRef.current = window.setInterval(() => {
      setOtpSecondsLeft(prev => {
        if (prev <= 1) {
          clearOtpTimer();
          setForgotStage('request');
          showNotification('error', 'OTP expired');
          return 0;
        }
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

  const sendForgotOtp = async () => {
    if (sendingOtp) return; // prevent double-clicks
    if (!forgotEmail) { showNotification('error', 'Please enter your email'); return; }
    if (!isValidEmail(forgotEmail)) { showNotification('error', 'Please enter a valid email address'); return; }

    setSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: forgotEmail })
      });
      if (res.ok) {
        const data = await res.json().catch(()=> ({}));
        if (data?.previewUrl) {
          // optional: show preview url to developer in notification
          setPreviewUrl(data.previewUrl);
          showNotification('success', 'OTP sent (preview URL provided)');
        } else {
          showNotification('success', 'OTP sent to your email');
        }
        setForgotStage('verify');
        startOtpTimer(120);
      } else {
        const data = await res.json();
        showNotification('error', data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      showNotification('error', 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyForgotOtp = async () => {
    if (verifyingOtp) return;
    if (!forgotOtp) { showNotification('error','Please enter the OTP'); return; }
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: forgotOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setResetToken(data?.resetToken || null);
        setForgotStage('reset');
        showNotification('success', 'OTP verified — you can now set a new password');
        clearOtpTimer();
      } else {
        showNotification('error', data?.message || 'Invalid OTP');
      }
    } catch (err) {
      showNotification('error', 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const submitResetPassword = async () => {
    if (resettingPassword) return;
    if (!newPassword || !confirmNewPassword) { showNotification('error', 'Please fill all fields'); return; }
    if (newPassword !== confirmNewPassword) { showNotification('error','Passwords do not match'); return; }
    if (!isStrongPassword(newPassword)) { showNotification('error','Password must have at least one uppercase letter, one number, and be at least 6 characters long'); return; }
    if (!resetToken) { showNotification('error','Missing reset token'); return; }

    setResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Password updated — you can sign in now');
        closeForgotModal();
      } else {
        showNotification('error', data?.message || 'Failed to update password');
      }
    } catch (err) {
      showNotification('error', 'Failed to update password');
    } finally {
      setResettingPassword(false);
    }
  };

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { email, password } = getFormData(form, ['email', 'password']);

    if (!email || !password) {
      showNotification('error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      showNotification('error', 'Please enter a valid email address');
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

                  <div>
                    <input 
                      type="email" 
                      placeholder="Email" 
                      required 
                      name="email" 
                      value={signupEmail}
                      onChange={(e)=>{
                        const v = e.target.value;
                        setSignupEmail(v);
                        if (!v) { setEmailValid(null); setEmailError(''); return; }
                        if (!isValidEmail(v)) { setEmailValid(false); setEmailError('Please enter a valid email address'); }
                        else { setEmailValid(true); setEmailError(''); }
                      }}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />
                    {emailError ? (
                      <p className="text-sm text-red-300 mt-1">{emailError}</p>
                    ) : emailValid ? (
                      <p className="text-sm text-green-300 mt-1">Email looks good</p>
                    ) : null}
                  </div>

                  <div>
                    <input 
                      type="password" 
                      placeholder="Password" 
                      required 
                      name="password" 
                      value={signupPassword}
                      onChange={(e)=>{
                        const v = e.target.value;
                        setSignupPassword(v);
                        if (!v) { setPasswordError(''); }
                        else if (!isStrongPassword(v)) { setPasswordError('Password must have at least one uppercase letter, one number, and be at least 6 characters long'); }
                        else { setPasswordError(''); }
                      }}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />
                    {passwordError ? <p className="text-sm text-red-300 mt-1">{passwordError}</p> : null}
                  </div>

                  <div>
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      name="confirmPassword"
                      value={signupConfirm}
                      onChange={(e)=>{
                        const v = e.target.value;
                        setSignupConfirm(v);
                      }}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    />

                  </div>

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

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setShowForgotModal(true); setForgotStage('request'); }} className="text-sm text-blue-600 hover:underline">Forgot password?</button>
                </div>

                <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                  Sign In
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-gray-600">New to Second Brain? Create an account on the left!</p>
              </div>

              {/* Forgot Password Modal */}
              {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Reset password</h3>
                      <button onClick={closeForgotModal} className="text-gray-600">×</button>
                    </div>

                    {forgotStage === 'request' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Enter your account email and we'll send you a one-time code.</p>
                        <input type="email" placeholder="Email" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
                        <div className="flex gap-2">
                          <button
                            onClick={sendForgotOtp}
                            disabled={sendingOtp}
                            aria-busy={sendingOtp}
                            className={`flex-1 px-4 py-2 rounded-lg text-white ${sendingOtp ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                          >
                            {sendingOtp ? (
                              <>
                                <Spinner size="sm" className="mr-2 text-white" />
                                Sending...
                              </>
                            ) : (
                              'Send OTP'
                            )}
                          </button>
                          <button onClick={closeForgotModal} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Cancel</button>
                        </div>
                      </div>
                    )}

                    {forgotStage === 'verify' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">We sent a code to <strong>{forgotEmail}</strong>. Enter it below to continue.</p>
                        <div className="text-sm text-gray-600">
                          {otpSecondsLeft > 0 ? (
                            <span>Expires in {Math.floor(otpSecondsLeft/60).toString().padStart(2,'0')}:{(otpSecondsLeft%60).toString().padStart(2,'0')}</span>
                          ) : (
                            <span className="text-red-500">OTP expired</span>
                          )}
                          {previewUrl && (
                            <div className="mt-2">
                              <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Preview email (dev)</a>
                            </div>
                          )}
                        </div>
                        <input type="text" placeholder="Enter OTP" value={forgotOtp} onChange={(e)=>setForgotOtp(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
                        <div className="flex gap-2">
                          <button
                            onClick={verifyForgotOtp}
                            disabled={verifyingOtp}
                            aria-busy={verifyingOtp}
                            className={`flex-1 px-4 py-2 rounded-lg text-white ${verifyingOtp ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                          >
                            {verifyingOtp ? (
                              <>
                                <Spinner size="sm" className="mr-2 text-white" />
                                Verifying...
                              </>
                            ) : (
                              'Verify'
                            )}
                          </button>
                          <button onClick={() => { setForgotStage('request'); setForgotOtp(''); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Back</button>
                        </div>
                      </div>
                    )}

                    {forgotStage === 'reset' && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Set a new password for <strong>{forgotEmail}</strong>.</p>
                        <input type="password" placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
                        <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e)=>setConfirmNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300" />
                        <div className="flex gap-2">
                          <button
                            onClick={submitResetPassword}
                            disabled={resettingPassword}
                            aria-busy={resettingPassword}
                            className={`flex-1 px-4 py-2 rounded-lg text-white ${resettingPassword ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                          >
                            {resettingPassword ? (
                              <>
                                <Spinner size="sm" className="mr-2 text-white" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </button>
                          <button onClick={closeForgotModal} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Cancel</button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage;
