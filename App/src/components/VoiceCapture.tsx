import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from './NotificationUi/NotificationProvider';

interface VoiceCaptureProps {
  mode: 'register' | 'login';
  onCapture: (audioBlob: Blob, passphrase?: string, encryptionPassword?: string) => void;
  onClose: () => void;
  passphrase?: string;
  encryptionPassword?: string;
}

const VoiceCapture: React.FC<VoiceCaptureProps> = ({ 
  mode, 
  onCapture, 
  onClose, 
  passphrase: initialPassphrase,
  encryptionPassword: initialEncryptionPassword
}) => {
  const { showNotification } = useNotification();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxSteps] = useState(mode === 'register' ? 3 : 1);
  const [passphrase, setPassphrase] = useState(initialPassphrase || '');
  const [encryptionPassword, setEncryptionPassword] = useState(initialEncryptionPassword || '');

  // Keep refs in sync with state for use inside closures
  useEffect(() => { passphraseRef.current = passphrase; }, [passphrase]);
  useEffect(() => { encryptionPasswordRef.current = encryptionPassword; }, [encryptionPassword]);
  const [showPassphraseInput, setShowPassphraseInput] = useState(mode === 'register' && !initialPassphrase);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [samplesDone, setSamplesDone] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentStepRef = useRef(1);
  const passphraseRef = useRef(initialPassphrase || '');
  const encryptionPasswordRef = useRef(initialEncryptionPassword || '');

  // Initialize audio context and microphone
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          } 
        });
        streamRef.current = stream;

        // Create audio context for level monitoring
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        // Create media recorder
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          audioChunksRef.current = [];

          if (mode === 'register') {
            const step = currentStepRef.current;
            if (step < maxSteps) {
              setSamplesDone(step);
              setCurrentStep(step + 1);
              currentStepRef.current = step + 1;
              setHasRecorded(false);
              setRecordingTime(0);
            } else {
              setSamplesDone(maxSteps);
              onCapture(audioBlob, passphraseRef.current, encryptionPasswordRef.current);
            }
          } else {
            onCapture(audioBlob);
          }
        };

        // Start monitoring audio levels
        monitorAudioLevel();
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        showNotification('error', 'Could not access microphone. Please check permissions.');
        onClose();
      }
    };

    initializeAudio();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
      
      animationRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current) {
      showNotification('error', 'Microphone not ready');
      return;
    }

    if (mode === 'register' && !passphrase.trim()) {
      showNotification('error', 'Please enter a passphrase first');
      return;
    }

    if (mode === 'register' && !encryptionPassword.trim()) {
      showNotification('error', 'Please enter an encryption password');
      return;
    }

    setIsRecording(true);
    setRecordingTime(0);
    setHasRecorded(true);
    audioChunksRef.current = [];
    
    mediaRecorderRef.current.start();

    // Start timer
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setRecordingTime(elapsed);
      if (elapsed >= 10) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSubmit = () => {
    if (mode === 'register' && showPassphraseInput) {
      if (!passphrase.trim()) {
        showNotification('error', 'Please enter a passphrase');
        return;
      }
      if (!encryptionPassword.trim()) {
        showNotification('error', 'Please enter an encryption password');
        return;
      }
      if (passphrase.trim().split(/\s+/).length < 3) {
        showNotification('error', 'Passphrase must contain at least 3 words');
        return;
      }
      setShowPassphraseInput(false);
      showNotification('info', `Great! Now say "${passphrase}" clearly ${maxSteps} times.`);
      return;
    }

    if (!hasRecorded) {
      showNotification('error', 'Please record your voice first');
      return;
    }

    // If we have a recording, start it
    if (!isRecording) {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">
              {mode === 'register' ? '🎤 Voice Registration' : '🎤 Voice Login'}
            </h3>
            {mode === 'register' && !showPassphraseInput && (
              <p className="text-sm text-white/60 mt-1">
                Step {currentStep} of {maxSteps}
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Passphrase Input (Register Mode) */}
        {mode === 'register' && showPassphraseInput && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Create Your Voice Passphrase
              </label>
              <input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="e.g., hello world secure login"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50"
              />
              <p className="text-xs text-white/50 mt-1">
                Use at least 3 words for better security
              </p>
            </div>

            {!initialEncryptionPassword && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Encryption Password
              </label>
              <input
                type="password"
                value={encryptionPassword}
                onChange={(e) => setEncryptionPassword(e.target.value)}
                placeholder="Enter a secure password"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50"
              />
              <p className="text-xs text-white/50 mt-1">
                This will encrypt your voice data
              </p>
            </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all"
            >
              Continue to Recording
            </button>
          </div>
        )}

        {/* Recording Interface */}
        {(!showPassphraseInput || mode === 'login') && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="text-center">
              <p className="text-white/80 text-sm mb-2">
                {mode === 'register' 
                  ? `Say: "${passphrase}" clearly`
                  : 'Speak your passphrase clearly'
                }
              </p>
              {mode === 'register' && (
                <p className="text-white/50 text-xs">
                  Recording {currentStep} of {maxSteps} voice samples
                </p>
              )}
            </div>

            {/* Audio Visualizer */}
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                {/* Outer pulse ring */}
                <div 
                  className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                    isRecording 
                      ? 'border-red-500 animate-pulse' 
                      : 'border-violet-500/30'
                  }`}
                  style={{
                    transform: `scale(${1 + (audioLevel / 100) * 0.3})`
                  }}
                />
                
                {/* Inner microphone */}
                <div className={`absolute inset-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500/20 border-red-500/50' 
                    : 'bg-violet-500/20 border-violet-500/50'
                } border-2`}>
                  <svg 
                    className={`w-8 h-8 transition-colors ${
                      isRecording ? 'text-red-400' : 'text-violet-400'
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                    />
                  </svg>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>

            {/* Audio Level Indicator */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-100 ${
                  isRecording ? 'bg-red-500' : 'bg-violet-500'
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>

            {/* Recording Timer */}
            {isRecording && (
              <div className="text-center">
                <p className="text-red-400 font-mono text-lg">{formatTime(recordingTime)}</p>
                <p className="text-white/50 text-xs">Recording... (max 10 seconds)</p>
              </div>
            )}

            {/* Samples progress */}
            {mode === 'register' && samplesDone > 0 && !isRecording && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: maxSteps }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < samplesDone ? 'bg-green-500' : 'bg-white/20'
                  }`} />
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={mode === 'register' && !passphrase.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.30 6-6.72h-1.7z"/>
                  </svg>
                  {hasRecorded ? 'Record Again' : 'Start Recording'}
                </button>
              ) : (
                <>
                  <button
                    onClick={stopRecording}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z"/>
                    </svg>
                    Stop
                  </button>
                  {mode === 'register' && (
                    <button
                      onClick={stopRecording}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold transition-all"
                    >
                      {currentStep < maxSteps ? 'Next Sample →' : 'Finish ✓'}
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-semibold transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Tips */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-violet-300">
                  <p className="font-medium mb-1">Tips for best results:</p>
                  <ul className="space-y-0.5 text-violet-300/80">
                    <li>• Speak clearly and at normal pace</li>
                    <li>• Use a quiet environment</li>
                    <li>• Keep consistent volume</li>
                    <li>• Hold microphone close to mouth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCapture;