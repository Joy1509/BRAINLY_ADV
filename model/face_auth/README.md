# Face Recognition Authentication System

A complete Python-based face recognition system for user authentication with multiple encoding storage and continuous login capabilities.

## Features

- **User Registration**: Capture 5 face encodings per user for improved accuracy
- **Single Login**: One-time face authentication
- **Continuous Login**: Real-time face recognition with live camera feed
- **Secure Storage**: File-locked JSON registry and NumPy encoding files
- **Majority Voting**: Uses multiple encodings for robust authentication

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install system dependencies (Windows):**
   - Visual Studio Build Tools or Visual Studio Community
   - CMake (for dlib compilation)

3. **For Linux/Mac additional requirements:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install cmake libopenblas-dev liblapack-dev
   
   # macOS
   brew install cmake
   ```

## Usage

1. **Run the system:**
   ```bash
   python main.py
   ```

2. **Menu Options:**
   - **[1] Register**: Add new user with face data
   - **[2] Login**: Single authentication attempt
   - **[3] Continuous**: Live feed with real-time recognition
   - **[4] Exit**: Quit application

3. **Camera Controls:**
   - **SPACE**: Capture face
   - **ESC**: Cancel capture
   - **Q**: Quit continuous mode

## System Requirements

- **Camera**: Working webcam (index 0 by default)
- **Python**: 3.9+
- **RAM**: 4GB+ recommended
- **CPU**: Supports AVX instructions for better performance

## Configuration

Edit `config.py` to customize:

```python
FACE_MATCH_THRESHOLD = 0.5    # Lower = stricter matching
ENCODINGS_PER_USER = 5        # Face samples per user
CAMERA_INDEX = 0              # Camera device index
```

## File Structure

```
face_auth/
├── main.py              # Entry point
├── face_system.py       # Core recognition logic
├── utils.py             # Helper functions
├── config.py            # Configuration constants
├── requirements.txt     # Python dependencies
└── users/
    ├── user_registry.json
    └── {username}/
        ├── face_encoding_0.npy
        ├── face_encoding_1.npy
        ├── ...
        └── metadata.json
```

## Troubleshooting

**Camera not found:**
- Check camera permissions
- Try different CAMERA_INDEX values (0, 1, 2...)
- Ensure no other apps are using the camera

**Import errors:**
- Install Visual Studio Build Tools
- Use Python 3.9-3.11 (better dlib compatibility)
- Try: `pip install --upgrade cmake`

**Poor recognition:**
- Increase ENCODINGS_PER_USER
- Adjust FACE_MATCH_THRESHOLD
- Ensure good lighting during registration

## Security Notes

- Face encodings are stored as NumPy arrays (not images)
- File locking prevents concurrent access issues
- Username validation prevents directory traversal
- No network communication (fully offline)