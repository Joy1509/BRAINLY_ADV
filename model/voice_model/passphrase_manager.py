import os
from datetime import datetime
from typing import Optional, Dict, List
from fuzzywuzzy import fuzz
import config
from utils import (
    load_json_file, save_json_file, validate_username, 
    normalize_text, calculate_word_similarity, encrypt_text, decrypt_text,
    log_info, log_error, log_success, log_warning, ensure_directory_exists
)

class PassphraseManager:
    def __init__(self):
        """Initialize passphrase manager"""
        self.passphrases_file = config.PASSPHRASES_FILE
        self.match_threshold = config.MATCH_THRESHOLD
        self.fuzzy_match_ratio = config.FUZZY_MATCH_RATIO
        
        # Ensure data directory exists
        ensure_directory_exists(config.DATA_DIR)
        
        # Load existing passphrases
        self.passphrases_data = load_json_file(self.passphrases_file)
    
    def register_passphrase(self, username: str, passphrase: str, password: str) -> bool:
        username = username.strip().lower()
        """
        Register a new passphrase for a user
        Args:
            username: User identifier
            passphrase: The passphrase text
            password: Password for encryption
        Returns:
            True if registration successful, False otherwise
        """
        try:
            # Validate inputs
            if not validate_username(username):
                log_error("Invalid username format")
                return False
            
            if not passphrase or len(passphrase.strip()) < 3:
                log_error("Passphrase must be at least 3 characters long")
                return False
            
            # Check if user already exists
            if username in self.passphrases_data:
                log_error(f"User '{username}' already exists")
                return False
            
            # Normalize passphrase for storage
            normalized_passphrase = normalize_text(passphrase)
            
            # Encrypt passphrase
            encrypted_data = encrypt_text(normalized_passphrase, password)
            
            # Store user data
            user_data = {
                "encrypted_passphrase": encrypted_data,
                "original_passphrase": encrypt_text(passphrase, password),  # Store original for reference
                "registered_at": datetime.now().isoformat(),
                "login_attempts": 0,
                "successful_logins": 0
            }
            
            # Add to passphrases data
            self.passphrases_data[username] = user_data
            
            # Save to file
            if save_json_file(self.passphrases_file, self.passphrases_data):
                log_success(f"Passphrase registered for user '{username}'")
                return True
            else:
                log_error("Failed to save passphrase data")
                return False
                
        except Exception as e:
            log_error(f"Error registering passphrase for '{username}': {e}")
            return False
    
    def authenticate_passphrase(self, username: str, spoken_text: str, password: str) -> Dict:
        username = username.strip().lower()
        """
        Authenticate user with spoken passphrase
        Args:
            username: User identifier
            spoken_text: The spoken text to verify
            password: Password for decryption
        Returns:
            Dictionary with authentication result
        """
        result = {
            "success": False,
            "confidence": 0.0,
            "message": "",
            "details": {}
        }
        
        try:
            # Check if user exists
            if username not in self.passphrases_data:
                result["message"] = f"User '{username}' not found"
                return result
            
            user_data = self.passphrases_data[username]
            
            # Increment login attempts
            user_data["login_attempts"] = user_data.get("login_attempts", 0) + 1
            
            # Decrypt stored passphrase
            stored_passphrase = decrypt_text(user_data["encrypted_passphrase"], password)
            if not stored_passphrase:
                result["message"] = "Failed to decrypt stored passphrase"
                return result
            
            # Normalize spoken text
            normalized_spoken = normalize_text(spoken_text)
            
            if not normalized_spoken:
                result["message"] = "No valid text detected in speech"
                return result
            
            # Calculate different similarity metrics
            similarities = self._calculate_similarities(stored_passphrase, normalized_spoken)
            
            # Determine if authentication is successful
            max_confidence = max(similarities.values())
            
            if max_confidence >= self.match_threshold:
                result["success"] = True
                result["confidence"] = max_confidence
                result["message"] = "Authentication successful"
                
                # Update successful login count
                user_data["successful_logins"] = user_data.get("successful_logins", 0) + 1
                user_data["last_successful_login"] = datetime.now().isoformat()
                
                log_success(f"Authentication successful for '{username}' (confidence: {max_confidence:.2f})")
                
            else:
                result["success"] = False
                result["confidence"] = max_confidence
                result["message"] = f"Authentication failed - confidence too low ({max_confidence:.2f})"
                
                log_warning(f"Authentication failed for '{username}' - confidence: {max_confidence:.2f}")
            
            result["details"] = {
                "stored_passphrase": stored_passphrase,
                "spoken_text": normalized_spoken,
                "similarities": similarities,
                "threshold": self.match_threshold
            }
            
            # Save updated user data
            save_json_file(self.passphrases_file, self.passphrases_data)
            
            return result
            
        except Exception as e:
            log_error(f"Error during authentication for '{username}': {e}")
            result["message"] = f"Authentication error: {e}"
            return result
    
    def _calculate_similarities(self, stored_text: str, spoken_text: str) -> Dict[str, float]:
        """
        Calculate various similarity metrics between stored and spoken text
        Args:
            stored_text: The stored passphrase
            spoken_text: The spoken text
        Returns:
            Dictionary with different similarity scores
        """
        similarities = {}
        
        # Exact match
        similarities["exact_match"] = 1.0 if stored_text == spoken_text else 0.0
        
        # Fuzzy string matching
        similarities["fuzzy_ratio"] = fuzz.ratio(stored_text, spoken_text) / 100.0
        similarities["fuzzy_partial"] = fuzz.partial_ratio(stored_text, spoken_text) / 100.0
        similarities["fuzzy_token_sort"] = fuzz.token_sort_ratio(stored_text, spoken_text) / 100.0
        similarities["fuzzy_token_set"] = fuzz.token_set_ratio(stored_text, spoken_text) / 100.0
        
        # Word-based similarity
        similarities["word_similarity"] = calculate_word_similarity(stored_text, spoken_text)
        
        # Length-based penalty (significant length differences reduce confidence)
        len_ratio = min(len(stored_text), len(spoken_text)) / max(len(stored_text), len(spoken_text), 1)
        similarities["length_adjusted"] = similarities["fuzzy_ratio"] * len_ratio
        
        return similarities
    
    def update_passphrase(self, username: str, new_passphrase: str, password: str) -> bool:
        """
        Update passphrase for existing user
        Args:
            username: User identifier
            new_passphrase: New passphrase text
            password: Password for encryption
        Returns:
            True if update successful, False otherwise
        """
        try:
            if username not in self.passphrases_data:
                log_error(f"User '{username}' not found")
                return False
            
            if not new_passphrase or len(new_passphrase.strip()) < 3:
                log_error("New passphrase must be at least 3 characters long")
                return False
            
            # Normalize and encrypt new passphrase
            normalized_passphrase = normalize_text(new_passphrase)
            encrypted_data = encrypt_text(normalized_passphrase, password)
            
            # Update user data
            user_data = self.passphrases_data[username]
            user_data["encrypted_passphrase"] = encrypted_data
            user_data["original_passphrase"] = encrypt_text(new_passphrase, password)
            user_data["updated_at"] = datetime.now().isoformat()
            
            # Save to file
            if save_json_file(self.passphrases_file, self.passphrases_data):
                log_success(f"Passphrase updated for user '{username}'")
                return True
            else:
                log_error("Failed to save updated passphrase")
                return False
                
        except Exception as e:
            log_error(f"Error updating passphrase for '{username}': {e}")
            return False
    
    def delete_user(self, username: str) -> bool:
        """
        Delete user and their passphrase
        Args:
            username: User identifier
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            if username not in self.passphrases_data:
                log_error(f"User '{username}' not found")
                return False
            
            # Remove user data
            del self.passphrases_data[username]
            
            # Save to file
            if save_json_file(self.passphrases_file, self.passphrases_data):
                log_success(f"User '{username}' deleted successfully")
                return True
            else:
                log_error("Failed to save after user deletion")
                return False
                
        except Exception as e:
            log_error(f"Error deleting user '{username}': {e}")
            return False
    
    def list_users(self) -> List[str]:
        """
        Get list of registered users
        Returns:
            List of usernames
        """
        return list(self.passphrases_data.keys())
    
    def get_user_stats(self, username: str) -> Optional[Dict]:
        """
        Get statistics for a user
        Args:
            username: User identifier
        Returns:
            Dictionary with user statistics or None if user not found
        """
        if username not in self.passphrases_data:
            return None
        
        user_data = self.passphrases_data[username]
        return {
            "username": username,
            "registered_at": user_data.get("registered_at"),
            "login_attempts": user_data.get("login_attempts", 0),
            "successful_logins": user_data.get("successful_logins", 0),
            "last_successful_login": user_data.get("last_successful_login"),
            "success_rate": (user_data.get("successful_logins", 0) / 
                           max(user_data.get("login_attempts", 1), 1)) * 100
        }