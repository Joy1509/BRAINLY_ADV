import os
import sys
import json
import hashlib
import string
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import config

def generate_key_from_password(password: str, salt: bytes) -> bytes:
    """Generate encryption key from password"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=config.PASSPHRASE_HASH_ITERATIONS,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key

def encrypt_text(text: str, password: str) -> dict:
    """Encrypt text using password"""
    salt = os.urandom(16)
    key = generate_key_from_password(password, salt)
    f = Fernet(key)
    encrypted_text = f.encrypt(text.encode())
    
    return {
        "encrypted_data": base64.b64encode(encrypted_text).decode(),
        "salt": base64.b64encode(salt).decode()
    }

def decrypt_text(encrypted_data: dict, password: str) -> str:
    """Decrypt text using password"""
    try:
        salt = base64.b64decode(encrypted_data["salt"])
        key = generate_key_from_password(password, salt)
        f = Fernet(key)
        
        encrypted_text = base64.b64decode(encrypted_data["encrypted_data"])
        decrypted_text = f.decrypt(encrypted_text)
        return decrypted_text.decode()
    except Exception:
        return None

def normalize_text(text: str) -> str:
    """Normalize text for comparison by removing punctuation and converting to lowercase"""
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text

def calculate_word_similarity(text1: str, text2: str) -> float:
    """Calculate similarity based on word matching"""
    words1 = set(normalize_text(text1).split())
    words2 = set(normalize_text(text2).split())
    
    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union)

def ensure_directory_exists(directory: str) -> None:
    """Create directory if it doesn't exist"""
    os.makedirs(directory, exist_ok=True)

def load_json_file(file_path: str) -> dict:
    """Load JSON file or return empty dict if file doesn't exist"""
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading {file_path}: {e}", file=sys.stderr)
    return {}

def save_json_file(file_path: str, data: dict) -> bool:
    """Save data to JSON file"""
    try:
        ensure_directory_exists(os.path.dirname(file_path))
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except IOError as e:
        print(f"Error saving {file_path}: {e}", file=sys.stderr)
        return False

def validate_username(username: str) -> bool:
    """Validate username format"""
    if not username or len(username) < 2:
        return False
    return username.replace('_', '').replace('-', '').isalnum()

def log_info(message: str) -> None:
    """Log info message"""
    print(f"INFO: {message}", file=__import__('sys').stderr)

def log_error(message: str) -> None:
    """Log error message"""
    print(f"ERROR: {message}", file=__import__('sys').stderr)

def log_success(message: str) -> None:
    """Log success message"""
    print(f"SUCCESS: {message}", file=__import__('sys').stderr)

def log_warning(message: str) -> None:
    """Log warning message"""
    print(f"WARNING: {message}", file=__import__('sys').stderr)