// Voice Authentication API utilities
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface VoiceRegistrationData {
  username: string;
  email: string;
  password: string;
  passphrase: string;
  encryptionPassword: string;
}

interface VoiceLoginData {
  username: string;
  encryptionPassword: string;
  audioFile: File;
}

interface VoiceResponse {
  success: boolean;
  message?: string;
  token?: string;
  userID?: string;
  username?: string;
  role?: string;
  confidence?: number;
  error?: string;
}

interface VoiceStatusResponse {
  success: boolean;
  voiceRegistered: boolean;
  voiceAuthData?: {
    username: string;
    voiceSamples: number;
    totalLoginAttempts: number;
    successfulLogins: number;
    successRate: string;
    lastSuccessfulLogin: string;
    registeredAt: string;
  };
}

export class VoiceAuthAPI {
  /**
   * Register user with voice authentication
   */
  static async registerWithVoice(data: VoiceRegistrationData): Promise<VoiceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/voice/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Voice registration error:', error);
      return {
        success: false,
        message: 'Failed to connect to voice authentication service'
      };
    }
  }

  /**
   * Login with voice authentication
   */
  static async loginWithVoice(data: VoiceLoginData): Promise<VoiceResponse> {
    try {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('encryptionPassword', data.encryptionPassword);
      formData.append('audio', data.audioFile);

      const response = await fetch(`${API_BASE_URL}/api/v1/voice/login`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Voice login error:', error);
      return {
        success: false,
        message: 'Failed to connect to voice authentication service'
      };
    }
  }

  /**
   * Test voice system status
   */
  static async testVoiceSystem(): Promise<VoiceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/voice/test`, {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Voice system test error:', error);
      return {
        success: false,
        message: 'Voice system is not available'
      };
    }
  }

  /**
   * Get voice authentication status for user
   */
  static async getVoiceStatus(username: string, token: string): Promise<VoiceStatusResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/voice/status/${username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Voice status error:', error);
      return {
        success: false,
        voiceRegistered: false,
        message: 'Failed to get voice authentication status'
      };
    }
  }

  /**
   * Test audio upload capability
   */
  static async testAudioUpload(audioBlob: Blob): Promise<VoiceResponse> {
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'test-audio.webm', { type: 'audio/webm' });
      formData.append('audio', audioFile);

      const response = await fetch(`${API_BASE_URL}/api/v1/voice/test-audio`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Audio upload test error:', error);
      return {
        success: false,
        message: 'Failed to test audio upload'
      };
    }
  }

  /**
   * Convert audio blob to File for upload
   */
  static blobToFile(blob: Blob, filename: string = 'voice-auth.webm'): File {
    return new File([blob], filename, { 
      type: blob.type || 'audio/webm',
      lastModified: Date.now()
    });
  }

  /**
   * Check if browser supports voice authentication features
   */
  static checkBrowserSupport(): { 
    supported: boolean; 
    missingFeatures: string[];
    warnings: string[];
  } {
    const missingFeatures: string[] = [];
    const warnings: string[] = [];

    // Check for getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      missingFeatures.push('Microphone access (getUserMedia)');
    }

    // Check for MediaRecorder
    if (!window.MediaRecorder) {
      missingFeatures.push('Audio recording (MediaRecorder)');
    }

    // Check for AudioContext
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      missingFeatures.push('Audio processing (AudioContext)');
    }

    // Check for Blob support
    if (!window.Blob) {
      missingFeatures.push('File handling (Blob)');
    }

    // Warnings for better experience
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      warnings.push('HTTPS required for microphone access in production');
    }

    // Check for WebM support
    const mediaRecorder = window.MediaRecorder;
    if (mediaRecorder && !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      warnings.push('WebM audio format not fully supported');
    }

    return {
      supported: missingFeatures.length === 0,
      missingFeatures,
      warnings
    };
  }

  /**
   * Request microphone permission
   */
  static async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately as we only want to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true };
    } catch (error: any) {
      let errorMessage = 'Microphone access denied';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone access not supported in this browser.';
      }

      return { granted: false, error: errorMessage };
    }
  }
}

// Voice authentication hooks for React components
export const useVoiceAuth = () => {
  const checkSupport = () => VoiceAuthAPI.checkBrowserSupport();
  const requestPermission = () => VoiceAuthAPI.requestMicrophonePermission();
  const testSystem = () => VoiceAuthAPI.testVoiceSystem();
  
  return {
    checkSupport,
    requestPermission,
    testSystem,
    register: VoiceAuthAPI.registerWithVoice,
    login: VoiceAuthAPI.loginWithVoice,
    getStatus: VoiceAuthAPI.getVoiceStatus,
    testAudio: VoiceAuthAPI.testAudioUpload,
    blobToFile: VoiceAuthAPI.blobToFile
  };
};

export default VoiceAuthAPI;