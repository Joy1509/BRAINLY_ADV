import os
from typing import Optional, Dict, List
from voice_recorder import VoiceRecorder
from speech_converter import SpeechConverter
from passphrase_manager import PassphraseManager
import config
from utils import log_info, log_error, log_success, log_warning, ensure_directory_exists

class VoiceAuthSystem:
    def __init__(self):
        """Initialize voice authentication system with all components"""
        self.recorder = VoiceRecorder()
        self.converter = SpeechConverter()
        self.passphrase_manager = PassphraseManager()
        
        # System status
        self.system_ready = False
        self._initialize_system()
    
    def _initialize_system(self) -> None:
        """Initialize and test all system components"""
        log_info("Initializing Voice Authentication System...")
        
        try:
            # Test microphone
            if not self.recorder.test_microphone():
                log_error("Microphone test failed")
                return
            
            # Test speech recognition engines
            available_engines = self.converter.get_available_engines()
            if not available_engines:
                log_error("No speech recognition engines available")
                return
            
            log_info(f"Available speech recognition engines: {', '.join(available_engines)}")
            
            # Ensure data directories exist
            ensure_directory_exists(config.DATA_DIR)
            ensure_directory_exists(config.AUDIO_SAMPLES_DIR)
            
            self.system_ready = True
            log_success("Voice Authentication System initialized successfully")
            
        except Exception as e:
            log_error(f"System initialization failed: {e}")
            self.system_ready = False
    
    def register_user_voice(self, username: str, passphrase: str, password: str) -> bool:
        """
        Register a new user with voice passphrase
        Args:
            username: User identifier
            passphrase: Text passphrase to register
            password: Encryption password
        Returns:
            True if registration successful, False otherwise
        """
        if not self.system_ready:
            log_error("System not ready for registration")
            return False
        
        try:
            log_info(f"Starting voice registration for user: {username}")
            log_info(f"Passphrase to speak: '{passphrase}'")
            
            # Record voice samples for training (optional - for future enhancement)
            voice_samples = []
            sample_count = 3  # Record 3 samples for better accuracy
            
            for i in range(sample_count):
                log_info(f"Recording sample {i+1}/{sample_count}")
                log_info(f"Please say: '{passphrase}'")
                
                # Record audio
                audio_data = self.recorder.record_with_silence_detection(max_duration=10.0)
                if not audio_data:
                    log_warning(f"Failed to record sample {i+1}, skipping...")
                    continue
                
                # Convert to text to verify
                recognized_text = self.converter.audio_bytes_to_text(audio_data)
                if recognized_text:
                    log_info(f"Recognized: '{recognized_text}'")
                    voice_samples.append({
                        "audio_data": audio_data,
                        "recognized_text": recognized_text
                    })
                    
                    # Save audio sample (optional)
                    sample_filename = os.path.join(
                        config.AUDIO_SAMPLES_DIR, 
                        f"{username}_sample_{i+1}.wav"
                    )
                    self.recorder.save_audio_to_file(audio_data, sample_filename)
                else:
                    log_warning(f"Could not recognize speech in sample {i+1}")
            
            if not voice_samples:
                log_error("No valid voice samples recorded")
                return False
            
            # Register passphrase in manager
            if self.passphrase_manager.register_passphrase(username, passphrase, password):
                log_success(f"User '{username}' registered successfully with {len(voice_samples)} voice samples")
                return True
            else:
                log_error("Failed to register passphrase")
                return False
                
        except Exception as e:
            log_error(f"Error during user registration: {e}")
            return False
    
    def authenticate_user_voice(self, username: str, password: str, max_attempts: int = None) -> Dict:
        """
        Authenticate user using voice
        Args:
            username: User identifier
            password: Decryption password
            max_attempts: Maximum authentication attempts (default from config)
        Returns:
            Dictionary with authentication result
        """
        if not self.system_ready:
            return {
                "success": False,
                "message": "System not ready for authentication",
                "confidence": 0.0
            }
        
        max_attempts = max_attempts or config.MAX_ATTEMPTS
        
        for attempt in range(1, max_attempts + 1):
            try:
                log_info(f"Authentication attempt {attempt}/{max_attempts} for user: {username}")
                log_info("Please speak your passphrase now...")
                
                # Record audio
                audio_data = self.recorder.record_with_silence_detection(max_duration=10.0)
                if not audio_data:
                    log_warning("No audio recorded, please try again")
                    continue
                
                # Convert speech to text
                recognized_text = self.converter.audio_bytes_to_text(audio_data)
                if not recognized_text:
                    log_warning("Could not understand speech, please try again")
                    continue
                
                log_info(f"Recognized speech: '{recognized_text}'")
                
                # Authenticate with passphrase manager
                auth_result = self.passphrase_manager.authenticate_passphrase(
                    username, recognized_text, password
                )
                
                if auth_result["success"]:
                    log_success(f"Authentication successful! Confidence: {auth_result['confidence']:.2f}")
                    return auth_result
                else:
                    log_warning(f"Authentication failed: {auth_result['message']}")
                    if attempt < max_attempts:
                        log_info("Please try again...")
                
            except Exception as e:
                log_error(f"Error during authentication attempt {attempt}: {e}")
        
        return {
            "success": False,
            "message": f"Authentication failed after {max_attempts} attempts",
            "confidence": 0.0
        }
    
    def test_voice_recognition(self) -> Optional[str]:
        """
        Test voice recognition without authentication
        Returns:
            Recognized text or None if failed
        """
        if not self.system_ready:
            log_error("System not ready for voice test")
            return None
        
        try:
            log_info("Voice recognition test - please speak something...")
            
            # Record audio
            audio_data = self.recorder.record_with_silence_detection(max_duration=10.0)
            if not audio_data:
                log_error("No audio recorded")
                return None
            
            # Convert to text
            recognized_text = self.converter.audio_bytes_to_text(audio_data)
            if recognized_text:
                log_success(f"Voice test successful! Recognized: '{recognized_text}'")
                return recognized_text
            else:
                log_error("Voice recognition test failed")
                return None
                
        except Exception as e:
            log_error(f"Error during voice test: {e}")
            return None
    
    def list_registered_users(self) -> List[str]:
        """
        Get list of registered users
        Returns:
            List of usernames
        """
        return self.passphrase_manager.list_users()
    
    def get_user_statistics(self, username: str) -> Optional[Dict]:
        """
        Get user authentication statistics
        Args:
            username: User identifier
        Returns:
            Dictionary with user stats or None if user not found
        """
        return self.passphrase_manager.get_user_stats(username)
    
    def update_user_passphrase(self, username: str, new_passphrase: str, password: str) -> bool:
        """
        Update passphrase for existing user
        Args:
            username: User identifier
            new_passphrase: New passphrase text
            password: Encryption password
        Returns:
            True if update successful, False otherwise
        """
        return self.passphrase_manager.update_passphrase(username, new_passphrase, password)
    
    def delete_user(self, username: str) -> bool:
        """
        Delete user and all associated data
        Args:
            username: User identifier
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            # Delete from passphrase manager
            if not self.passphrase_manager.delete_user(username):
                return False
            
            # Delete audio samples if they exist
            for i in range(1, 4):  # Up to 3 samples
                sample_file = os.path.join(config.AUDIO_SAMPLES_DIR, f"{username}_sample_{i}.wav")
                if os.path.exists(sample_file):
                    try:
                        os.remove(sample_file)
                        log_info(f"Deleted audio sample: {sample_file}")
                    except Exception as e:
                        log_warning(f"Could not delete audio sample {sample_file}: {e}")
            
            log_success(f"User '{username}' and associated data deleted successfully")
            return True
            
        except Exception as e:
            log_error(f"Error deleting user '{username}': {e}")
            return False
    
    def get_system_status(self) -> Dict:
        """
        Get current system status
        Returns:
            Dictionary with system status information
        """
        return {
            "system_ready": self.system_ready,
            "microphone_available": self.recorder.test_microphone(),
            "available_engines": self.converter.get_available_engines(),
            "registered_users": len(self.list_registered_users()),
            "data_directory": config.DATA_DIR,
            "audio_samples_directory": config.AUDIO_SAMPLES_DIR
        }