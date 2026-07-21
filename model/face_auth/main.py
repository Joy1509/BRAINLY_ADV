import cv2
import sys
import face_recognition
from face_system import FaceRecognitionSystem
from utils import log_error, log_info
import time

def register_user(face_system: FaceRecognitionSystem) -> None:
    """Register a new user with face encodings"""
    print("\n=== USER REGISTRATION ===")
    
    try:
        # Get username input
        username = input("Enter username (letters, numbers, underscore only): ").strip()
        
        if not username:
            print("Username cannot be empty")
            return
            
        # Check if user already exists
        from utils import load_json_with_lock
        import config
        registry = load_json_with_lock(config.REGISTRY_FILE)
        if username in registry:
            print(f"User '{username}' already exists!")
            return
            
        print(f"Registering user: {username}")
        print("You will need to capture 5 face images for better accuracy")
        
        # Capture multiple encodings
        encodings = face_system.capture_multiple_encodings(face_system.encodings_per_user)
        
        if len(encodings) < 3:
            print(f"ERROR: Only {len(encodings)} valid face captures. Need at least 3.")
            print("Registration aborted. Please try again.")
            return
            
        # Save user data
        if face_system.save_user(username, encodings):
            print(f"SUCCESS: User '{username}' registered with {len(encodings)} face encodings!")
        else:
            print("FAILED: Could not register user. Please try again.")
            
    except KeyboardInterrupt:
        print("\nRegistration cancelled by user")
    except Exception as e:
        log_error(f"Registration error: {e}")

def login_user(face_system: FaceRecognitionSystem) -> None:
    """Single attempt face login"""
    print("\n=== FACE LOGIN ===")
    
    try:
        print("Position your face in front of the camera and press SPACE")
        
        # Capture face for authentication
        live_encoding = face_system.capture_face("Position face for login")
        
        if live_encoding is None:
            print("Login cancelled or no face detected")
            return
            
        # Authenticate
        result = face_system.authenticate_face(live_encoding)
        
        if result:
            username, confidence = result
            print(f"✅ Welcome, {username}! (confidence: {confidence:.2f})")
        else:
            print("❌ Access denied - face not recognized")
            
    except KeyboardInterrupt:
        print("\nLogin cancelled by user")
    except Exception as e:
        log_error(f"Login error: {e}")

def continuous_login(face_system: FaceRecognitionSystem) -> None:
    """Continuous face login with live video feed"""
    print("\n=== CONTINUOUS FACE LOGIN ===")
    print("Press Q to quit")
    
    cap = None
    last_auth_time = 0
    
    try:
        cap = cv2.VideoCapture(face_system.camera_index)
        if not cap.isOpened():
            log_error("Could not open camera")
            return
            
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Flip frame for mirror effect
            frame = cv2.flip(frame, 1)
            current_time = time.time()
            
            # Attempt authentication every 1 second
            if current_time - last_auth_time > 1.0:
                # Convert to RGB for face_recognition
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Detect faces
                face_locations = face_recognition.face_locations(rgb_frame)
                
                if face_locations:
                    # Get face encodings
                    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                    
                    if face_encodings:
                        # Try to authenticate first face
                        result = face_system.authenticate_face(face_encodings[0])
                        
                        if result:
                            username, confidence = result
                            # Draw green box around face
                            top, right, bottom, left = face_locations[0]
                            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                            cv2.putText(frame, f"{username} ({confidence:.2f})", 
                                      (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                        else:
                            # Draw red box around face
                            top, right, bottom, left = face_locations[0]
                            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
                            cv2.putText(frame, "Unknown", (left, top - 10), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                last_auth_time = current_time
            
            # Add instructions
            cv2.putText(frame, "Press Q to quit", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow('Continuous Face Login', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("\nContinuous login stopped by user")
    except Exception as e:
        log_error(f"Continuous login error: {e}")
    finally:
        if cap:
            cap.release()
        cv2.destroyAllWindows()

def show_menu() -> None:
    """Display main menu options"""
    print("\n" + "="*40)
    print("    FACE RECOGNITION LOGIN SYSTEM")
    print("="*40)
    print("1. Register New User")
    print("2. Login (Single Attempt)")
    print("3. Continuous Login (Live Feed)")
    print("4. Exit")
    print("="*40)

def main() -> None:
    """Main entry point with menu system"""
    try:
        # Initialize face recognition system
        print("Initializing Face Recognition System...")
        face_system = FaceRecognitionSystem()
        
        while True:
            show_menu()
            
            try:
                choice = input("Enter your choice (1-4): ").strip()
                
                if choice == '1':
                    register_user(face_system)
                elif choice == '2':
                    login_user(face_system)
                elif choice == '3':
                    continuous_login(face_system)
                elif choice == '4':
                    print("Goodbye!")
                    break
                else:
                    print("Invalid choice. Please enter 1-4.")
                    
            except KeyboardInterrupt:
                print("\nExiting...")
                break
                
    except ImportError as e:
        log_error("Missing required library. Please run: pip install -r requirements.txt")
        log_error(f"Import error: {e}")
    except Exception as e:
        log_error(f"System error: {e}")
        print("Please check your camera connection and try again.")
    
    print("System shutting down...")

if __name__ == "__main__":
    main()