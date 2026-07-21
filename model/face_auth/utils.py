import json
import os
from filelock import FileLock
from typing import Dict, Any

def load_json_with_lock(file_path: str) -> Dict[str, Any]:
    """Load JSON file with file locking to prevent concurrent access issues"""
    lock_path = f"{file_path}.lock"
    with FileLock(lock_path):
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not read {file_path}: {e}")
                return {}
        return {}

def save_json_with_lock(file_path: str, data: Dict[str, Any]) -> bool:
    """Save JSON file with file locking to prevent concurrent access issues"""
    lock_path = f"{file_path}.lock"
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with FileLock(lock_path):
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
        return True
    except IOError as e:
        print(f"Error: Could not save {file_path}: {e}")
        return False

def validate_username(username: str) -> bool:
    """Validate username contains only alphanumeric characters and underscores"""
    if not username or len(username) < 2:
        return False
    return username.replace('_', '').isalnum()

def log_error(message: str) -> None:
    """Simple error logging function"""
    print(f"ERROR: {message}")

def log_info(message: str) -> None:
    """Simple info logging function"""
    print(f"INFO: {message}")