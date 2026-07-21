#!/usr/bin/env python3
"""
Voice Authentication Bridge for Node.js Integration
Handles communication between Node.js server and Python voice authentication system
"""

import sys
import json
import os
import base64
import tempfile
import traceback
from pathlib import Path
from typing import Optional

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

try:
    from voice_auth_system import VoiceAuthSystem
    from voice_recorder import VoiceRecorder
    from speech_converter import SpeechConverter
    from passphrase_manager import PassphraseManager
    from utils import log_info, log_error
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Failed to import voice modules: {e}"
    }))
    sys.exit(1)

def convert_webm_to_pcm(audio_data: bytes) -> Optional[bytes]:
    """Convert WebM/Opus audio bytes to raw PCM WAV bytes using ffmpeg or pydub"""
    try:
        import subprocess
        import shutil
        if shutil.which('ffmpeg'):
            proc = subprocess.run(
                ['ffmpeg', '-y', '-i', 'pipe:0', '-f', 'wav', '-ar', '16000', '-ac', '1', 'pipe:1'],
                input=audio_data, capture_output=True
            )
            if proc.returncode == 0 and proc.stdout:
                import wave, io
                with wave.open(io.BytesIO(proc.stdout), 'rb') as wf:
                    return wf.readframes(wf.getnframes())
    except Exception as e:
        log_error(f"ffmpeg conversion failed: {e}")

    try:
        from pydub import AudioSegment
        import io
        seg = AudioSegment.from_file(io.BytesIO(audio_data), format='webm')
        seg = seg.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        return seg.raw_data
    except Exception as e:
        log_error(f"pydub conversion failed: {e}")

    # Last resort: return as-is (may already be PCM/WAV from browser)
    return audio_data


class VoiceBridge:
    def __init__(self):
        """Initialize voice authentication system"""
        try:
            self.converter = SpeechConverter()
            self.passphrase_manager = PassphraseManager()
            log_info("Voice bridge initialized successfully")
        except Exception as e:
            log_error(f"Failed to initialize voice system: {e}")
            raise

    def register_user(self, data):
        """Register new user with voice authentication"""
        try:
            username = (data.get('username') or '').strip().lower()
            passphrase = data.get('passphrase')
            encryption_password = data.get('encryption_password')

            if not all([username, passphrase, encryption_password]):
                return {
                    "success": False,
                    "message": "Missing required fields: username, passphrase, or encryption_password"
                }

            log_info(f"Registering voice authentication for user: {username}")

            success = self.passphrase_manager.register_passphrase(username, passphrase, encryption_password)
            if success:
                return {
                    "success": True,
                    "message": f"Voice authentication registered for user {username}",
                    "username": username
                }
            return {
                "success": False,
                "message": "Failed to register passphrase"
            }

        except Exception as e:
            log_error(f"Registration error: {e}")
            return {"success": False, "error": str(e)}

    def authenticate_user(self, data):
        """Authenticate user with voice"""
        try:
            username = (data.get('username') or '').strip().lower()
            encryption_password = data.get('encryption_password')
            audio_data_b64 = data.get('audio_data')

            if not all([username, encryption_password, audio_data_b64]):
                return {
                    "success": False,
                    "message": "Missing required fields: username, encryption_password, or audio_data"
                }

            # Decode audio data
            try:
                raw_audio = base64.b64decode(audio_data_b64)
                log_info(f"Received audio data: {len(raw_audio)} bytes")
            except Exception as e:
                return {"success": False, "message": f"Invalid audio data: {e}"}

            # Convert WebM to PCM for speech recognition
            pcm_audio = convert_webm_to_pcm(raw_audio)
            if not pcm_audio:
                return {"success": False, "message": "Failed to convert audio format"}

            # Transcribe speech
            log_info(f"Transcribing audio for user: {username}")
            recognized_text = self.converter.audio_bytes_to_text(pcm_audio)
            if not recognized_text:
                return {"success": False, "message": "Could not recognize speech in audio", "confidence": 0.0, "debug": {"audio_bytes": len(pcm_audio), "username": username}}

            log_info(f"Recognized: '{recognized_text}'")

            # Verify passphrase + encryption password
            result = self.passphrase_manager.authenticate_passphrase(username, recognized_text, encryption_password)
            result["recognized_text"] = recognized_text  # expose for debugging
            return result

        except Exception as e:
            log_error(f"Authentication error: {e}")
            return {"success": False, "error": str(e)}

    def test_system(self, data):
        """Test voice authentication system"""
        try:
            available_engines = self.converter.get_available_engines()
            return {
                "success": True,
                "message": "Voice system test completed",
                "status": {
                    "available_engines": available_engines,
                    "system_ready": len(available_engines) > 0
                }
            }
        except Exception as e:
            log_error(f"System test error: {e}")
            return {"success": False, "error": str(e)}

def main():
    """Main function to handle Node.js requests"""
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python voice_bridge.py <action>"
        }))
        sys.exit(1)

    action = sys.argv[1]
    
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data) if input_data.strip() else {}
        
        # Initialize voice bridge
        bridge = VoiceBridge()
        
        # Handle different actions
        if action == 'register':
            result = bridge.register_user(data)
        elif action == 'authenticate':
            result = bridge.authenticate_user(data)
        elif action == 'test':
            result = bridge.test_system(data)
        else:
            result = {
                "success": False,
                "error": f"Unknown action: {action}"
            }
        
        # Return result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {e}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {e}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()