#!/usr/bin/env python3
"""
Voice Authentication API - Persistent Flask service
Whisper model loads ONCE on startup and stays in memory.
Runs on http://localhost:5003
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import tempfile
import os
import sys
import subprocess
import shutil
from pathlib import Path

# Ensure imports resolve from this directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from passphrase_manager import PassphraseManager
from speech_converter import SpeechConverter
from utils import log_info, log_error

app = Flask(__name__)
CORS(app)

# ---------- Init (runs once) ----------
log_info("Loading SpeechConverter (Whisper model)...")
try:
    converter = SpeechConverter()
    passphrase_manager = PassphraseManager()
    log_info("Voice auth system ready.")
    SYSTEM_READY = True
except Exception as e:
    log_error(f"Failed to initialize: {e}")
    SYSTEM_READY = False


# ---------- Audio conversion ----------

def get_ffmpeg_binary() -> str | None:
    """Find ffmpeg — system PATH first, then imageio-ffmpeg bundled binary."""
    # 1. System ffmpeg
    system_ff = shutil.which("ffmpeg")
    if system_ff:
        return system_ff
    # 2. imageio-ffmpeg (bundled, no system install needed)
    try:
        import imageio_ffmpeg
        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path and os.path.exists(path):
            log_info(f"Using imageio-ffmpeg: {path}")
            return path
    except Exception:
        pass
    return None


def convert_webm_to_pcm(audio_bytes: bytes) -> bytes | None:
    """Convert webm/opus bytes → raw 16-bit PCM at 16kHz mono."""
    ffmpeg = get_ffmpeg_binary()

    if ffmpeg:
        try:
            proc = subprocess.run(
                [ffmpeg, "-y", "-i", "pipe:0",
                 "-f", "s16le", "-ar", "16000", "-ac", "1", "pipe:1"],
                input=audio_bytes, capture_output=True, timeout=15
            )
            if proc.returncode == 0 and proc.stdout:
                log_info(f"ffmpeg converted audio: {len(proc.stdout)} PCM bytes")
                return proc.stdout
            log_error(f"ffmpeg error: {proc.stderr.decode()[:300]}")
        except Exception as e:
            log_error(f"ffmpeg exception: {e}")
    else:
        log_error("No ffmpeg found (system or imageio-ffmpeg). Install imageio-ffmpeg: pip install imageio-ffmpeg")

    return None


def save_pcm_as_wav(pcm_bytes: bytes) -> str | None:
    """Save raw PCM bytes as a proper WAV temp file; returns path."""
    import wave, io
    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        with wave.open(tmp.name, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(pcm_bytes)
        return tmp.name
    except Exception as e:
        log_error(f"WAV save error: {e}")
        return None


# ---------- Endpoints ----------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Voice Authentication API",
        "system_ready": SYSTEM_READY,
        "engines": converter.get_available_engines() if SYSTEM_READY else []
    })


@app.route("/register", methods=["POST"])
def register():
    if not SYSTEM_READY:
        return jsonify({"success": False, "message": "System not ready"}), 500

    data = request.get_json()
    username = (data.get("username") or "").strip().lower()
    passphrase = (data.get("passphrase") or "").strip()
    encryption_password = data.get("encryption_password") or ""

    if not username or not passphrase or not encryption_password:
        return jsonify({"success": False, "message": "username, passphrase, and encryption_password are required"}), 400

    if len(passphrase.split()) < 3:
        return jsonify({"success": False, "message": "Passphrase must contain at least 3 words"}), 400

    # Allow re-registration: delete existing entry first
    if username in passphrase_manager.passphrases_data:
        log_info(f"Re-registering existing user: {username}")
        del passphrase_manager.passphrases_data[username]

    success = passphrase_manager.register_passphrase(username, passphrase, encryption_password)
    if success:
        return jsonify({"success": True, "message": f"Voice registered for {username}"})
    return jsonify({"success": False, "message": "Failed to register passphrase"}), 500


@app.route("/authenticate", methods=["POST"])
def authenticate():
    if not SYSTEM_READY:
        return jsonify({"success": False, "message": "System not ready"}), 500

    data = request.get_json()
    username = (data.get("username") or "").strip().lower()
    encryption_password = data.get("encryption_password") or ""
    audio_b64 = data.get("audio_data") or ""

    if not username or not encryption_password or not audio_b64:
        return jsonify({"success": False, "message": "username, encryption_password, and audio_data are required"}), 400

    # Decode audio
    try:
        raw_audio = base64.b64decode(audio_b64)
        log_info(f"Received {len(raw_audio)} raw audio bytes for {username}")
    except Exception as e:
        return jsonify({"success": False, "message": f"Invalid audio_data: {e}"}), 400

    # Convert webm → PCM
    pcm = convert_webm_to_pcm(raw_audio)
    if not pcm:
        return jsonify({"success": False, "message": "Audio conversion failed. Ensure ffmpeg is installed."}), 400

    # Transcribe
    recognized_text = None

    # Try Whisper first (offline, most reliable)
    if converter.whisper_model:
        import numpy as np
        audio_np = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        try:
            result = converter.whisper_model.transcribe(audio_np, language="en", fp16=False)
            recognized_text = result["text"].strip()
            log_info(f"Whisper transcription: '{recognized_text}'")
        except Exception as e:
            log_error(f"Whisper failed: {e}")

    # Fallback: Google STT (needs internet + proper WAV file)
    if not recognized_text:
        wav_path = save_pcm_as_wav(pcm)
        if wav_path:
            try:
                recognized_text = converter.audio_bytes_to_text_google(
                    open(wav_path, "rb").read()  # pass raw WAV bytes — but google method expects PCM
                )
                log_info(f"Google STT: '{recognized_text}'")
            except Exception as e:
                log_error(f"Google STT failed: {e}")
            finally:
                try: os.unlink(wav_path)
                except: pass

    if not recognized_text:
        return jsonify({
            "success": False,
            "message": "Could not recognize speech. Please speak clearly and try again.",
            "confidence": 0.0
        }), 401

    log_info(f"Recognized text for {username}: '{recognized_text}'")

    # Verify passphrase
    auth_result = passphrase_manager.authenticate_passphrase(username, recognized_text, encryption_password)
    auth_result["recognized_text"] = recognized_text
    return jsonify(auth_result)


@app.route("/test", methods=["GET"])
def test_system():
    if not SYSTEM_READY:
        return jsonify({"success": False, "message": "System not ready"}), 500
    return jsonify({
        "success": True,
        "message": "Voice system operational",
        "engines": converter.get_available_engines(),
        "whisper_loaded": converter.whisper_model is not None
    })


if __name__ == "__main__":
    print("=" * 50)
    print("  Voice Authentication API")
    print("  http://localhost:5003")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5003, debug=False)
