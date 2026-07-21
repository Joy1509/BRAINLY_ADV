import pyaudio
import wave
import threading
import time
import numpy as np
from typing import Optional
import config
from utils import log_info, log_error, log_warning

class VoiceRecorder:
    def __init__(self):
        """Initialize voice recorder with audio settings"""
        self.sample_rate = config.SAMPLE_RATE
        self.chunk_size = config.CHUNK_SIZE
        self.channels = config.CHANNELS
        self.format = pyaudio.paInt16
        self.record_timeout = config.RECORD_TIMEOUT
        
        self.audio = None
        self.recording = False
        self.audio_data = []
        
    def _initialize_audio(self) -> bool:
        """Initialize PyAudio instance"""
        try:
            self.audio = pyaudio.PyAudio()
            return True
        except Exception as e:
            log_error(f"Failed to initialize audio: {e}")
            return False
    
    def _cleanup_audio(self):
        """Clean up PyAudio instance"""
        if self.audio:
            self.audio.terminate()
            self.audio = None
    
    def test_microphone(self) -> bool:
        """Test if microphone is available"""
        if not self._initialize_audio():
            return False
            
        try:
            # Try to open microphone stream
            stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            
            # Read a small amount of data to test
            data = stream.read(self.chunk_size, exception_on_overflow=False)
            stream.stop_stream()
            stream.close()
            
            log_info("Microphone test successful")
            return True
            
        except Exception as e:
            log_error(f"Microphone test failed: {e}")
            return False
        finally:
            self._cleanup_audio()
    
    def record_audio(self, duration: Optional[float] = None) -> Optional[bytes]:
        """
        Record audio from microphone
        Args:
            duration: Recording duration in seconds. If None, use default timeout
        Returns:
            Raw audio data as bytes, or None if recording failed
        """
        if not self._initialize_audio():
            return None
            
        duration = duration or self.record_timeout
        
        try:
            stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            
            log_info(f"Recording for {duration} seconds. Speak now...")
            
            frames = []
            frames_to_record = int(self.sample_rate / self.chunk_size * duration)
            
            for _ in range(frames_to_record):
                try:
                    data = stream.read(self.chunk_size, exception_on_overflow=False)
                    frames.append(data)
                except Exception as e:
                    log_warning(f"Audio buffer overflow: {e}")
                    continue
            
            stream.stop_stream()
            stream.close()
            
            # Convert to bytes
            audio_data = b''.join(frames)
            log_info("Recording completed successfully")
            
            return audio_data
            
        except Exception as e:
            log_error(f"Recording failed: {e}")
            return None
        finally:
            self._cleanup_audio()
    
    def record_with_silence_detection(self, max_duration: float = 10.0) -> Optional[bytes]:
        """
        Record audio with automatic silence detection to stop recording
        Args:
            max_duration: Maximum recording duration in seconds
        Returns:
            Raw audio data as bytes, or None if recording failed
        """
        if not self._initialize_audio():
            return None
            
        try:
            stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            
            log_info("Recording with silence detection. Speak now...")
            
            frames = []
            silent_chunks = 0
            max_silent_chunks = int(config.PAUSE_THRESHOLD * self.sample_rate / self.chunk_size)
            max_chunks = int(max_duration * self.sample_rate / self.chunk_size)
            
            for i in range(max_chunks):
                try:
                    data = stream.read(self.chunk_size, exception_on_overflow=False)
                    frames.append(data)
                    
                    # Convert to numpy array to check volume
                    audio_np = np.frombuffer(data, dtype=np.int16)
                    
                    # Calculate volume safely
                    if len(audio_np) > 0:
                        volume = np.sqrt(np.mean(np.abs(audio_np.astype(np.float32))**2))
                    else:
                        volume = 0
                    
                    if volume < config.ENERGY_THRESHOLD:
                        silent_chunks += 1
                    else:
                        silent_chunks = 0
                    
                    # Stop if silence detected after some speech
                    if silent_chunks > max_silent_chunks and len(frames) > self.chunk_size:
                        log_info("Silence detected, stopping recording")
                        break
                        
                except Exception as e:
                    log_warning(f"Audio processing error: {e}")
                    continue
            
            stream.stop_stream()
            stream.close()
            
            if frames:
                audio_data = b''.join(frames)
                log_info("Recording with silence detection completed")
                return audio_data
            else:
                log_warning("No audio data recorded")
                return None
                
        except Exception as e:
            log_error(f"Recording with silence detection failed: {e}")
            return None
        finally:
            self._cleanup_audio()
    
    def save_audio_to_file(self, audio_data: bytes, filename: str) -> bool:
        """
        Save audio data to WAV file
        Args:
            audio_data: Raw audio data
            filename: Output filename
        Returns:
            True if successful, False otherwise
        """
        try:
            with wave.open(filename, 'wb') as wf:
                wf.setnchannels(self.channels)
                wf.setsampwidth(pyaudio.get_sample_size(self.format))
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_data)
            
            log_info(f"Audio saved to {filename}")
            return True
            
        except Exception as e:
            log_error(f"Failed to save audio to {filename}: {e}")
            return False
    
    def record_and_save(self, filename: str, duration: Optional[float] = None) -> bool:
        """
        Record audio and save to file
        Args:
            filename: Output filename
            duration: Recording duration in seconds
        Returns:
            True if successful, False otherwise
        """
        audio_data = self.record_audio(duration)
        if audio_data:
            return self.save_audio_to_file(audio_data, filename)
        return False