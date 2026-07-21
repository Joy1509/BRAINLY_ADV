from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import tempfile
import os
import sys
import json
from datetime import datetime

# Add the face_auth directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from face_system import FaceRecognitionSystem
from utils import log_error, log_info

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Initialize face recognition system
try:
    face_system = FaceRecognitionSystem()
    log_info("Face recognition system initialized")
except Exception as e:
    log_error(f"Failed to initialize face system: {e}")
    face_system = None

# User mapping file to store username -> user_id mappings
USER_MAPPING_FILE = os.path.join(os.path.dirname(__file__), 'users', 'user_mapping.json')

def load_user_mapping():
    """Load username to user_id mapping"""
    try:
        if os.path.exists(USER_MAPPING_FILE):
            with open(USER_MAPPING_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        log_error(f"Error loading user mapping: {e}")
        return {}

def save_user_mapping(mapping):
    """Save username to user_id mapping"""
    try:
        os.makedirs(os.path.dirname(USER_MAPPING_FILE), exist_ok=True)
        with open(USER_MAPPING_FILE, 'w') as f:
            json.dump(mapping, f, indent=2)
        return True
    except Exception as e:
        log_error(f"Error saving user mapping: {e}")
        return False

def save_base64_image(base64_string):
    """Convert base64 string to temporary image file"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(image_data)
        temp_file.close()
        
        return temp_file.name
    except Exception as e:
        log_error(f"Error saving base64 image: {e}")
        return None

def validate_face_in_image(image_path):
    """Validate that image contains a detectable face"""
    try:
        import face_recognition
        
        image = face_recognition.load_image_file(image_path)
        face_locations = face_recognition.face_locations(image)
        
        if not face_locations:
            return False, "No face detected in image"
        
        if len(face_locations) > 1:
            return False, "Multiple faces detected. Please ensure only one face is visible"
        
        # Check image quality
        if image.shape[0] < 200 or image.shape[1] < 200:
            return False, "Image resolution too low. Please move closer to camera"
        
        return True, "Face detected successfully"
        
    except Exception as e:
        log_error(f"Error validating face: {e}")
        return False, f"Error processing image: {str(e)}"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Face Recognition API",
        "system_ready": face_system is not None,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/register_face', methods=['POST'])
def register_face():
    """Register face for a user with user_id"""
    if not face_system:
        return jsonify({
            "success": False,
            "message": "Face recognition system not initialized"
        }), 500
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        images = data.get('images', [])  # Array of base64 images
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400
        
        if len(images) < 3:
            return jsonify({
                "success": False,
                "message": "At least 3 face images required for registration"
            }), 400
        
        log_info(f"Registering user ID: {user_id} with {len(images)} images")
        
        # Use user_id as username for face system
        username = f"user_{user_id}"
        
        # Process each image and extract face encodings
        encodings = []
        temp_files = []
        
        for i, image_base64 in enumerate(images):
            # Save base64 to temporary file
            temp_path = save_base64_image(image_base64)
            if not temp_path:
                # Cleanup and return error
                for tf in temp_files:
                    if os.path.exists(tf):
                        os.remove(tf)
                return jsonify({
                    "success": False,
                    "message": f"Failed to process image {i+1}"
                }), 400
            
            temp_files.append(temp_path)
            
            # Validate face in image
            is_valid, message = validate_face_in_image(temp_path)
            if not is_valid:
                # Cleanup and return error
                for tf in temp_files:
                    if os.path.exists(tf):
                        os.remove(tf)
                return jsonify({
                    "success": False,
                    "message": f"Image {i+1}: {message}"
                }), 400
            
            # Extract face encoding
            try:
                import face_recognition
                image = face_recognition.load_image_file(temp_path)
                face_locations = face_recognition.face_locations(image)
                face_encodings = face_recognition.face_encodings(image, face_locations)
                
                if face_encodings:
                    encodings.append(face_encodings[0])
                else:
                    # Cleanup and return error
                    for tf in temp_files:
                        if os.path.exists(tf):
                            os.remove(tf)
                    return jsonify({
                        "success": False,
                        "message": f"Could not extract face encoding from image {i+1}"
                    }), 400
                    
            except Exception as e:
                # Cleanup and return error
                for tf in temp_files:
                    if os.path.exists(tf):
                        os.remove(tf)
                return jsonify({
                    "success": False,
                    "message": f"Error processing image {i+1}: {str(e)}"
                }), 500
        
        # Cleanup temp files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Save user with face system
        if face_system.save_user(username, encodings):
            # Update user mapping
            user_mapping = load_user_mapping()
            user_mapping[username] = user_id
            save_user_mapping(user_mapping)
            
            log_info(f"Successfully registered user ID: {user_id}")
            return jsonify({
                "success": True,
                "message": f"Face registered successfully for user {user_id}",
                "user_id": user_id,
                "encoding_count": len(encodings)
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to save user data"
            }), 500
            
    except Exception as e:
        log_error(f"Registration error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/authenticate_face', methods=['POST'])
def authenticate_face():
    """Authenticate user with single face image"""
    if not face_system:
        return jsonify({
            "success": False,
            "message": "Face recognition system not initialized"
        }), 500
    
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                "success": False,
                "message": "Image is required"
            }), 400
        
        log_info("Authenticating user face")
        
        # Save base64 to temporary file
        temp_path = save_base64_image(image_base64)
        if not temp_path:
            return jsonify({
                "success": False,
                "message": "Failed to process image"
            }), 400
        
        try:
            # Validate face in image
            is_valid, message = validate_face_in_image(temp_path)
            if not is_valid:
                os.remove(temp_path)
                return jsonify({
                    "success": False,
                    "message": message
                }), 400
            
            # Extract face encoding
            import face_recognition
            image = face_recognition.load_image_file(temp_path)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if not face_encodings:
                os.remove(temp_path)
                return jsonify({
                    "success": False,
                    "message": "Could not extract face encoding"
                }), 400
            
            # Authenticate using face system
            result = face_system.authenticate_face(face_encodings[0])
            
            if result:
                username, confidence = result
                
                # Get user_id from mapping
                user_mapping = load_user_mapping()
                user_id = user_mapping.get(username)
                
                if user_id:
                    log_info(f"Authentication successful: {username} -> {user_id} (confidence: {confidence:.3f})")
                    return jsonify({
                        "success": True,
                        "user_id": user_id,
                        "confidence": float(confidence),
                        "message": f"Authentication successful"
                    })
                else:
                    log_error(f"User mapping not found for username: {username}")
                    return jsonify({
                        "success": False,
                        "message": "User mapping not found"
                    }), 500
            else:
                log_info("Authentication failed: face not recognized")
                return jsonify({
                    "success": False,
                    "message": "Face not recognized"
                }), 401
                
        finally:
            # Always cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
    except Exception as e:
        log_error(f"Authentication error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/users', methods=['GET'])
def get_users():
    """Get list of registered users"""
    if not face_system:
        return jsonify({
            "success": False,
            "message": "Face recognition system not initialized"
        }), 500
    
    try:
        users = list(face_system.known_faces.keys())
        user_mapping = load_user_mapping()
        
        # Convert usernames back to user_ids
        user_list = []
        for username in users:
            user_id = user_mapping.get(username, username)
            user_list.append({
                "username": username,
                "user_id": user_id
            })
        
        return jsonify({
            "success": True,
            "users": user_list,
            "count": len(user_list)
        })
    except Exception as e:
        log_error(f"Error getting users: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("Starting Face Recognition API...")
    print("Server will run on http://localhost:5002")
    print("Endpoints:")
    print("   POST /register_face - Register face with user_id")
    print("   POST /authenticate_face - Authenticate face")
    print("   GET /health - Health check")
    
    app.run(host='0.0.0.0', port=5002, debug=True)