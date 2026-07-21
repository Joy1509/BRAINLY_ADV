# 🎤 Voice Authentication System

A complete Python-based voice authentication system that converts speech to text and matches it against user-defined passphrases for secure login.

## 🔧 Features

- **🎙️ Voice Registration**: Record user passphrases with multiple samples
- **🔐 Voice Login**: Authenticate users by speaking their passphrase  
- **🔊 Multiple Speech Engines**: Google, Whisper (offline), Windows Speech Recognition
- **🔒 Secure Storage**: Encrypted passphrase storage with file locking
- **📊 User Statistics**: Track login attempts and success rates
- **🎯 Fuzzy Matching**: Handle pronunciation variations and accents
- **⚡ Real-time Processing**: Fast authentication (2-3 seconds)

## 🏗️ Architecture

```
voice_model/
├── main.py                    # Entry point & user interface
├── voice_auth_system.py       # Main authentication system
├── voice_recorder.py          # Audio recording functionality
├── speech_converter.py        # Speech-to-text conversion
├── passphrase_manager.py      # Passphrase storage & matching
├── config.py                  # System configuration
├── utils.py                   # Helper functions & encryption
├── requirements.txt           # Python dependencies
├── data/
│   ├── passphrases.json      # Encrypted user passphrases
│   └── audio_samples/         # Optional voice samples
└── README.md                  # This file
```

## 🚀 Installation

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install System Audio Dependencies

**Windows:**
```bash
# PyAudio might need Visual C++ Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install python3-pyaudio portaudio19-dev
```

**macOS:**
```bash
brew install portaudio
pip install pyaudio
```

### 3. Download Whisper Model (Optional - for offline recognition)
```bash
# The system will automatically download the base model on first use
# Or manually download:
python -c "import whisper; whisper.load_model('base')"
```

## 💻 Usage

### Start the System
```bash
python main.py
```

### Menu Options

1. **Register New User**
   - Enter username and passphrase
   - Speak the passphrase 3 times for training
   - System stores encrypted passphrase

2. **Voice Login**
   - Enter username
   - Speak your registered passphrase
   - Get authenticated with confidence score

3. **Test Voice Recognition**
   - Test microphone and speech recognition
   - No authentication required

4. **List Users**
   - View all registered users

5. **User Statistics**
   - View login attempts and success rates

6. **Update Passphrase**
   - Change passphrase for existing user

7. **Delete User**
   - Remove user and all associated data

8. **System Status**
   - Check system health and configuration

## 🎯 How It Works

### Registration Process:
1. User provides username and passphrase text
2. System records 3 voice samples of the passphrase
3. Passphrase is encrypted and stored securely
4. Voice samples converted to text for verification

### Authentication Process:
1. User speaks their passphrase
2. Speech converted to text using available engines
3. Text normalized (lowercase, remove punctuation)
4. Multiple similarity algorithms compare spoken vs stored text:
   - Exact matching
   - Fuzzy string matching (Levenshtein distance)
   - Word-based similarity
   - Token-based matching
5. Success if confidence score ≥ threshold (default 75%)

## ⚙️ Configuration

Edit `config.py` to customize system behavior:

```python
# Audio Settings
SAMPLE_RATE = 16000          # Audio quality
ENERGY_THRESHOLD = 300       # Microphone sensitivity
PAUSE_THRESHOLD = 0.8        # Silence detection

# Authentication Settings  
MATCH_THRESHOLD = 0.75       # Minimum confidence for success
MAX_ATTEMPTS = 3             # Login attempts allowed
FUZZY_MATCH_RATIO = 80       # String similarity percentage

# Speech Recognition
STT_ENGINE = "google"        # Primary engine: google/whisper/windows
WHISPER_MODEL = "base"       # Whisper model size
```

## 🔐 Security Features

- **Encryption**: Passphrases encrypted with user-provided passwords
- **No Plain Text Storage**: Only encrypted hashes stored on disk
- **File Locking**: Prevents concurrent access corruption
- **Input Validation**: Username and passphrase validation
- **Secure Deletion**: Completely removes user data when deleted

## 🎛️ Speech Recognition Engines

### 1. Google Speech Recognition (Default)
- **Pros**: High accuracy, good with accents
- **Cons**: Requires internet connection
- **Best for**: General use with internet access

### 2. Whisper (OpenAI)
- **Pros**: Works offline, very accurate
- **Cons**: Larger memory usage, slower first load
- **Best for**: Privacy-focused or offline environments

### 3. Windows Speech Recognition
- **Pros**: Built into Windows, no extra dependencies
- **Cons**: Lower accuracy, Windows only
- **Best for**: Simple setups, backup option

## 🛠️ Troubleshooting

### Microphone Issues:
```bash
# Test microphone access
python -c "import pyaudio; p=pyaudio.PyAudio(); print('Microphone OK')"
```

### Audio Permission Errors:
- **Windows**: Check microphone permissions in Settings > Privacy
- **macOS**: Grant microphone access in System Preferences > Security & Privacy
- **Linux**: Add user to audio group: `sudo usermod -a -G audio $USER`

### Recognition Accuracy Issues:
- Speak clearly and at normal pace
- Use quiet environment
- Increase `ENERGY_THRESHOLD` for noisy environments
- Use shorter, distinct passphrases
- Try different speech recognition engines

### Installation Problems:
```bash
# PyAudio installation issues
pip install pipwin
pipwin install pyaudio

# Or use conda
conda install pyaudio

# Whisper installation issues
pip install --upgrade openai-whisper
```

## 📊 Performance Tips

- Use **3-5 word passphrases** for best accuracy
- **Avoid similar sounding words** (to/too/two)
- **Consistent pronunciation** during registration and login  
- **Good microphone quality** improves recognition
- **Quiet environment** reduces errors

## 🔧 Example Usage

```bash
# Start system
python main.py

# Register new user
Username: john_doe
Passphrase: my secret voice password  
Password: ********

# Login
Username: john_doe
Password: ********
[Speak: "my secret voice password"]
✅ LOGIN SUCCESSFUL! Confidence: 0.87
```

## 📈 System Requirements

- **Python**: 3.7+
- **RAM**: 2GB+ (4GB+ for Whisper)
- **Microphone**: Any USB/built-in microphone
- **Internet**: Optional (for Google Speech Recognition)
- **OS**: Windows, macOS, Linux

## 🤝 Contributing

The system is modular and extensible:
- Add new speech recognition engines in `speech_converter.py`
- Modify matching algorithms in `passphrase_manager.py`
- Enhance audio processing in `voice_recorder.py`
- Add new authentication methods in `voice_auth_system.py`

## 📄 License

This project is open source and available under the MIT License.

---

**🎉 Enjoy your new voice authentication system!** 

For support or questions, please check the troubleshooting section or create an issue.