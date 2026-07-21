import speech_recognition as sr
import whisper
import wave
import tempfile
import os
from typing import Optional, List
import config
from utils import log_info, log_error, log_warning

class SpeechConverter:
    def __init__(self):
        """Initialize speech converter with multiple recognition engines"""
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = config.ENERGY_THRESHOLD
        self.recognizer.pause_threshold = config.PAUSE_THRESHOLD
        
        # Initialize Whisper model (offline)
        self.whisper_model = None
        self._load_whisper_model()
    
    def _load_whisper_model(self):
        """Load Whisper model for offline recognition"""
        try:
            log_info(f"Loading Whisper model: {config.WHISPER_MODEL}")
            self.whisper_model = whisper.load_model(config.WHISPER_MODEL)
            log_info("Whisper model loaded successfully")
        except Exception as e:
            log_warning(f"Failed to load Whisper model: {e}")
            self.whisper_model = None
    
    def audio_bytes_to_text_google(self, audio_data: bytes) -> Optional[str]:
        """
        Convert audio bytes to text using Google Speech Recognition
        Args:
            audio_data: Raw audio data in WAV format
        Returns:
            Recognized text or None if recognition failed
        """
        temp_file_path = None
        try:
            # Create temporary WAV file with unique name
            import time
            timestamp = str(int(time.time() * 1000))
            temp_filename = f"google_temp_{timestamp}.wav"
            temp_file_path = os.path.join(tempfile.gettempdir(), temp_filename)
                
            # Write WAV header and audio data
            with wave.open(temp_file_path, 'wb') as wf:
                wf.setnchannels(config.CHANNELS)
                wf.setsampwidth(2)  # 16-bit audio
                wf.setframerate(config.SAMPLE_RATE)
                wf.writeframes(audio_data)
            
            # Load audio file for recognition
            with sr.AudioFile(temp_file_path) as source:
                audio = self.recognizer.record(source)
            
            # Perform recognition
            text = self.recognizer.recognize_google(audio, language='en-US')
            log_info(f"Google Speech Recognition result: {text}")
            
            return text.strip()
                
        except sr.UnknownValueError:
            log_warning("Google Speech Recognition could not understand audio")
            return None
        except sr.RequestError as e:
            log_error(f"Google Speech Recognition service error: {e}")
            return None
        except Exception as e:
            log_error(f"Google Speech Recognition error: {e}")
            return None
        finally:
            # Clean up temp file with multiple attempts
            if temp_file_path and os.path.exists(temp_file_path):
                import time
                import gc
                
                # Force cleanup
                gc.collect()
                
                # Multiple cleanup attempts
                for attempt in range(5):
                    try:
                        time.sleep(0.1 * (attempt + 1))
                        os.unlink(temp_file_path)
                        break
                    except Exception as cleanup_error:
                        if attempt == 4:  # Last attempt
                            # Silent cleanup failure - file will be cleaned by OS eventually
                            pass
                        continue
    
    def audio_bytes_to_text_whisper(self, audio_data: bytes) -> Optional[str]:
        """
        Convert audio bytes to text using Whisper (offline)
        Args:
            audio_data: Raw audio data
        Returns:
            Recognized text or None if recognition failed
        """
        if not self.whisper_model:
            log_error("Whisper model not available")
            return None
            
        try:
            # Convert audio data to numpy array for direct processing
            import numpy as np
            
            # Convert bytes to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            # Convert to float32 and normalize
            audio_float = audio_array.astype(np.float32) / 32768.0
            
            # Transcribe with Whisper directly from numpy array
            result = self.whisper_model.transcribe(audio_float)
            text = result["text"].strip()
            
            log_info(f"Whisper recognition result: {text}")
            
            return text
                
        except Exception as e:
            log_error(f"Whisper recognition error: {e}")
            return None
    
    def audio_bytes_to_text_windows(self, audio_data: bytes) -> Optional[str]:
        """
        Convert audio bytes to text using Windows Speech Recognition
        Args:
            audio_data: Raw audio data
        Returns:
            Recognized text or None if recognition failed
        """
        temp_file_path = None
        try:
            # Create temporary WAV file with unique name
            import time
            timestamp = str(int(time.time() * 1000))
            temp_filename = f"windows_temp_{timestamp}.wav"
            temp_file_path = os.path.join(tempfile.gettempdir(), temp_filename)
                
            with wave.open(temp_file_path, 'wb') as wf:
                wf.setnchannels(config.CHANNELS)
                wf.setsampwidth(2)
                wf.setframerate(config.SAMPLE_RATE)
                wf.writeframes(audio_data)
            
            # Load audio file
            with sr.AudioFile(temp_file_path) as source:
                audio = self.recognizer.record(source)
            
            # Use Windows Speech Recognition (PocketSphinx)
            text = self.recognizer.recognize_sphinx(audio)
            log_info(f"Windows Speech Recognition result: {text}")
            
            return text.strip()
                
        except sr.UnknownValueError:
            log_warning("Windows Speech Recognition could not understand audio")
            return None
        except Exception as e:
            log_error(f"Windows Speech Recognition error: {e}")
            return None
        finally:
            # Clean up temp file with multiple attempts
            if temp_file_path and os.path.exists(temp_file_path):
                import time
                import gc
                
                # Force cleanup
                gc.collect()
                
                # Multiple cleanup attempts
                for attempt in range(5):
                    try:
                        time.sleep(0.1 * (attempt + 1))
                        os.unlink(temp_file_path)
                        break
                    except Exception as cleanup_error:
                        if attempt == 4:  # Last attempt
                            # Silent cleanup failure - file will be cleaned by OS eventually
                            pass
                        continue
    
    def audio_bytes_to_text(self, audio_data: bytes, engine: str = None) -> Optional[str]:
        """
        Convert audio bytes to text using specified engine
        Args:
            audio_data: Raw audio data
            engine: Recognition engine ('google', 'whisper', 'windows', or None for auto)
        Returns:
            Recognized text or None if recognition failed
        """
        engine = engine or config.STT_ENGINE
        
        # Try specified engine first
        if engine == "google":
            result = self.audio_bytes_to_text_google(audio_data)
            if result:
                return result
        elif engine == "whisper":
            result = self.audio_bytes_to_text_whisper(audio_data)
            if result:
                return result
        elif engine == "windows":
            result = self.audio_bytes_to_text_windows(audio_data)
            if result:
                return result
        
        # Fallback to other engines if primary fails
        log_warning(f"Primary engine '{engine}' failed, trying fallbacks...")
        
        fallback_engines = ["google", "whisper", "windows"]
        if engine in fallback_engines:
            fallback_engines.remove(engine)
        
        for fallback_engine in fallback_engines:
            log_info(f"Trying fallback engine: {fallback_engine}")
            
            if fallback_engine == "google":
                result = self.audio_bytes_to_text_google(audio_data)
            elif fallback_engine == "whisper":
                result = self.audio_bytes_to_text_whisper(audio_data)
            elif fallback_engine == "windows":
                result = self.audio_bytes_to_text_windows(audio_data)
            else:
                continue
                
            if result:
                return result
        
        log_error("All speech recognition engines failed")
        return None
    
    def audio_file_to_text(self, file_path: str, engine: str = None) -> Optional[str]:
        """
        Convert audio file to text
        Args:
            file_path: Path to audio file
            engine: Recognition engine to use
        Returns:
            Recognized text or None if recognition failed
        """
        try:
            # Read audio file
            with wave.open(file_path, 'rb') as wf:
                audio_data = wf.readframes(wf.getnframes())
            
            return self.audio_bytes_to_text(audio_data, engine)
            
        except Exception as e:
            log_error(f"Error reading audio file {file_path}: {e}")
            return None
    
    def get_available_engines(self) -> List[str]:
        """
        Get list of available speech recognition engines
        Returns:
            List of available engine names
        """
        available = []
        
        # Test Google (requires internet)
        try:
            # This is a quick test - actual usage will depend on internet connectivity
            available.append("google")
        except:
            pass
        
        # Test Whisper
        if self.whisper_model:
            available.append("whisper")
        
        # Windows Speech Recognition (always available on Windows)
        try:
            import platform
            if platform.system() == "Windows":
                available.append("windows")
        except:
            pass
        
        return available