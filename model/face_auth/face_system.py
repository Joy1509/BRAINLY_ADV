import cv2
import face_recognition
import numpy as np
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import config
from utils import load_json_with_lock, save_json_with_lock, validate_username, log_error, log_info

class FaceRecognitionSystem:
    def __init__(self):
        """Initialize face recognition system with config settings"""
        self.threshold = config.FACE_MATCH_THRESHOLD
        self.encodings_per_user = config.ENCODINGS_PER_USER
        self.camera_index = config.CAMERA_INDEX
        self.users_dir = config.USERS_DIR
        self.registry_file = config.REGISTRY_FILE
        
        # Ensure users directory exists
        os.makedirs(self.users_dir, exist_ok=True)
        
        # Load known faces into memory
        self.known_faces = self.load_known_faces()
        log_info(f"Loaded {len(self.known_faces)} registered users")

    def load_known_faces(self) -> Dict[str, List[np.ndarray]]:
        """Scan users directory and load all face encodings"""
        known_faces = {}
        
        try:
            if not os.path.exists(self.users_dir):
                return known_faces
                
            for username in os.listdir(self.users_dir):
                user_path = os.path.join(self.users_dir, username)
                
                # Skip files (we only want directories)
                if not os.path.isdir(user_path):
                    continue
                    
                encodings = []
                # Load all encoding files for this user
                for i in range(self.encodings_per_user):
                    encoding_file = os.path.join(user_path, f"face_encoding_{i}.npy")
                    if os.path.exists(encoding_file):
                        try:
                            encoding = np.load(encoding_file)
                            encodings.append(encoding)
                        except Exception as e:
                            log_error(f"Could not load encoding {encoding_file}: {e}")
                
                if encodings:
                    known_faces[username] = encodings
                    
        except Exception as e:
            log_error(f"Error loading known faces: {e}")
            
        return known_faces

    def capture_face(self, prompt_text: str = "") -> Optional[np.ndarray]:
        """Capture a single face encoding from camera"""
        cap = None
        try:
            cap = cv2.VideoCapture(self.camera_index)
            if not cap.isOpened():
                log_error("Could not open camera")
                return None
                
            log_info("Camera opened. Press SPACE to capture face, ESC to cancel")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    log_error("Failed to read from camera")
                    break
                    
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Add text overlay
                if prompt_text:
                    cv2.putText(frame, prompt_text, (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                cv2.putText(frame, "Press SPACE to capture, ESC to cancel", (10, frame.shape[0] - 20),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                cv2.imshow('Face Capture', frame)
                
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC key
                    log_info("Face capture cancelled")
                    return None
                elif key == 32:  # SPACE key
                    # Convert BGR to RGB for face_recognition
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    
                    # Detect faces
                    face_locations = face_recognition.face_locations(rgb_frame)
                    if not face_locations:
                        log_error("No face detected, please try again")
                        continue
                        
                    # Extract face encodings
                    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                    if not face_encodings:
                        log_error("Could not generate face encoding, please try again")
                        continue
                        
                    log_info("Face captured successfully!")
                    return face_encodings[0]  # Return first encoding
                    
        except Exception as e:
            log_error(f"Error during face capture: {e}")
            return None
        finally:
            if cap:
                cap.release()
            cv2.destroyAllWindows()
            
        return None

    def capture_multiple_encodings(self, count: int = 5) -> List[np.ndarray]:
        """Capture multiple face encodings for better accuracy"""
        encodings = []
        prompts = [
            "Look straight at camera",
            "Turn slightly left",
            "Turn slightly right", 
            "Tilt head slightly up",
            "Look straight again"
        ]
        
        for i in range(count):
            prompt = prompts[i % len(prompts)]
            log_info(f"Capture {i+1}/{count} - {prompt}")
            
            encoding = self.capture_face(f"Capture {i+1}/{count} - {prompt}")
            if encoding is not None:
                encodings.append(encoding)
            else:
                log_info("Retrying face capture...")
                # Allow retry for same position
                encoding = self.capture_face(f"Retry {i+1}/{count} - {prompt}")
                if encoding is not None:
                    encodings.append(encoding)
                    
        return encodings

    def save_user(self, username: str, encodings: List[np.ndarray]) -> bool:
        """Save user face encodings and metadata"""
        try:
            # Validate username
            if not validate_username(username):
                log_error("Username must contain only letters, numbers and underscores (min 2 chars)")
                return False
                
            # Check if user already exists in registry
            registry = load_json_with_lock(self.registry_file)
            if username in registry:
                log_error(f"User '{username}' already exists")
                return False
                
            # Create user directory
            user_dir = os.path.join(self.users_dir, username)
            os.makedirs(user_dir, exist_ok=True)
            
            # Save face encodings
            for i, encoding in enumerate(encodings):
                encoding_file = os.path.join(user_dir, f"face_encoding_{i}.npy")
                np.save(encoding_file, encoding)
                
            # Save metadata
            metadata = {
                "name": username,
                "registered_at": datetime.now().isoformat(),
                "encoding_count": len(encodings)
            }
            metadata_file = os.path.join(user_dir, "metadata.json")
            save_json_with_lock(metadata_file, metadata)
            
            # Update user registry atomically
            registry[username] = {
                "registered_at": metadata["registered_at"],
                "encoding_count": len(encodings)
            }
            
            if save_json_with_lock(self.registry_file, registry):
                # Update in-memory known faces
                self.known_faces[username] = encodings
                log_info(f"User '{username}' registered successfully with {len(encodings)} encodings")
                return True
            else:
                log_error("Failed to update user registry")
                return False
                
        except Exception as e:
            log_error(f"Error saving user '{username}': {e}")
            return False

    def authenticate_face(self, live_encoding: np.ndarray) -> Optional[Tuple[str, float]]:
        """Authenticate face against known users using majority voting"""
        if not self.known_faces:
            log_info("No registered users found")
            return None
            
        best_match = None
        best_distance = float('inf')
        
        try:
            for username, stored_encodings in self.known_faces.items():
                # Compare against all stored encodings for this user
                matches = face_recognition.compare_faces(stored_encodings, live_encoding, 
                                                       tolerance=self.threshold)
                distances = face_recognition.face_distance(stored_encodings, live_encoding)
                
                # Use majority voting: user matches if >50% of encodings match
                match_percentage = sum(matches) / len(matches)
                min_distance = min(distances)
                
                if match_percentage > 0.5 and min_distance < best_distance:
                    best_match = username
                    best_distance = min_distance
                    
            # Return match if best distance is below threshold
            if best_match and best_distance < self.threshold:
                confidence = 1.0 - best_distance  # Convert distance to confidence score
                return (best_match, confidence)
                
        except Exception as e:
            log_error(f"Error during authentication: {e}")
            
        return None