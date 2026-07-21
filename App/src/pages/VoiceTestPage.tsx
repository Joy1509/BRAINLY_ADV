import React, { useState } from 'react';
import VoiceCapture from '../components/VoiceCapture';
import { useVoiceAuth } from '../components/voiceAuthAPI';
import { useNotification } from '../components/NotificationUi/NotificationProvider';

const VoiceTestPage: React.FC = () => {
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [testResults, setTestResults] = useState<any[]>([]);
  const { showNotification } = useNotification();
  const voiceAuth = useVoiceAuth();

  const addTestResult = (test: string, result: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { test, result, timestamp }]);
  };

  const testBrowserSupport = () => {
    const support = voiceAuth.checkSupport();
    addTestResult('Browser Support Check', support);
    
    if (support.supported) {
      showNotification('success', 'Browser supports voice authentication!');
    } else {
      showNotification('error', `Missing features: ${support.missingFeatures.join(', ')}`);
    }
  };

  const testMicrophonePermission = async () => {
    const permission = await voiceAuth.requestPermission();
    addTestResult('Microphone Permission', permission);
    
    if (permission.granted) {
      showNotification('success', 'Microphone permission granted!');
    } else {
      showNotification('error', permission.error || 'Microphone permission denied');
    }
  };

  const testVoiceSystem = async () => {
    const systemTest = await voiceAuth.testSystem();
    addTestResult('Voice System Test', systemTest);
    
    if (systemTest.success) {
      showNotification('success', 'Voice system is working!');
    } else {
      showNotification('error', systemTest.message || 'Voice system test failed');
    }
  };

  const handleVoiceCapture = async (audioBlob: Blob, passphrase?: string, encryptionPassword?: string) => {
    setShowVoiceCapture(false);
    
    try {
      if (mode === 'register') {
        const testData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123',
          passphrase: passphrase || 'test voice passphrase',
          encryptionPassword: encryptionPassword || 'testencrypt123'
        };
        
        const result = await voiceAuth.register(testData);
        addTestResult('Voice Registration Test', result);
        
        if (result.success) {
          showNotification('success', 'Voice registration test successful!');
        } else {
          showNotification('error', result.message || 'Voice registration test failed');
        }
      } else {
        const audioFile = voiceAuth.blobToFile(audioBlob);
        const testData = {
          username: 'testuser',
          encryptionPassword: 'testencrypt123',
          audioFile
        };
        
        const result = await voiceAuth.login(testData);
        addTestResult('Voice Login Test', result);
        
        if (result.success) {
          showNotification('success', `Voice login test successful! Confidence: ${(result.confidence! * 100).toFixed(1)}%`);
        } else {
          showNotification('error', result.message || 'Voice login test failed');
        }
      }
    } catch (error) {
      console.error('Voice test error:', error);
      showNotification('error', 'Voice test failed');
    }
  };

  const testAudioUpload = async () => {
    // Create a dummy audio blob for testing
    const audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, 16000, 16000); // 1 second of silence
    const audioData = buffer.getChannelData(0);
    
    // Create a blob from the buffer
    const arrayBuffer = new ArrayBuffer(audioData.length * 2);
    const view = new Int16Array(arrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      view[i] = audioData[i] * 32767;
    }
    
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const result = await voiceAuth.testAudio(audioBlob);
    
    addTestResult('Audio Upload Test', result);
    
    if (result.success) {
      showNotification('success', 'Audio upload test successful!');
    } else {
      showNotification('error', result.message || 'Audio upload test failed');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎤 Voice Authentication Test</h1>
          <p className="text-white/60">Test voice authentication integration and functionality</p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={testBrowserSupport}
            className="p-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
          >
            Test Browser Support
          </button>
          
          <button
            onClick={testMicrophonePermission}
            className="p-4 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-all"
          >
            Test Microphone
          </button>
          
          <button
            onClick={testVoiceSystem}
            className="p-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all"
          >
            Test Voice System
          </button>
          
          <button
            onClick={testAudioUpload}
            className="p-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-all"
          >
            Test Audio Upload
          </button>
          
          <button
            onClick={() => { setMode('register'); setShowVoiceCapture(true); }}
            className="p-4 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-all"
          >
            Test Voice Registration
          </button>
          
          <button
            onClick={() => { setMode('login'); setShowVoiceCapture(true); }}
            className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all"
          >
            Test Voice Login
          </button>
        </div>

        {/* Results */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Test Results</h2>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold transition-all"
            >
              Clear Results
            </button>
          </div>
          
          {testResults.length === 0 ? (
            <p className="text-white/50 text-center py-8">No tests run yet</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testResults.map((test, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white">{test.test}</h3>
                    <span className="text-xs text-white/50">{test.timestamp}</span>
                  </div>
                  <pre className="text-xs text-white/70 bg-black/20 rounded p-2 overflow-x-auto">
                    {JSON.stringify(test.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Endpoints Info */}
        <div className="mt-8 bg-[#1a1a2e] border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">API Endpoints</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-mono">POST</span>
              <span className="text-white/80">/api/v1/voice/register</span>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono">POST</span>
              <span className="text-white/80">/api/v1/voice/login</span>
            </div>
            <div className="flex gap-2">
              <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-mono">GET</span>
              <span className="text-white/80">/api/v1/voice/test</span>
            </div>
            <div className="flex gap-2">
              <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-mono">GET</span>
              <span className="text-white/80">/api/v1/voice/status/:username</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Capture Modal */}
      {showVoiceCapture && (
        <VoiceCapture
          mode={mode}
          onCapture={handleVoiceCapture}
          onClose={() => setShowVoiceCapture(false)}
        />
      )}
    </div>
  );
};

export default VoiceTestPage;