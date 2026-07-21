# Voice Authentication Configuration

# Audio Recording Settings
SAMPLE_RATE = 16000  # 16kHz sampling rate
CHUNK_SIZE = 1024    # Audio chunk size
FORMAT = 16          # 16-bit audio format
CHANNELS = 1         # Mono audio
RECORD_TIMEOUT = 10  # Maximum recording time in seconds

# Speech Recognition Settings
RECOGNITION_TIMEOUT = 5  # Timeout for speech recognition
ENERGY_THRESHOLD = 300   # Microphone sensitivity threshold
PAUSE_THRESHOLD = 0.8    # Seconds of silence before considering phrase complete

# Authentication Settings
MATCH_THRESHOLD = 0.75   # Minimum similarity score for successful authentication
MAX_ATTEMPTS = 3         # Maximum login attempts allowed
FUZZY_MATCH_RATIO = 80   # Minimum fuzzy matching percentage

# File Paths
DATA_DIR = "data"
PASSPHRASES_FILE = "data/passphrases.json"
AUDIO_SAMPLES_DIR = "data/audio_samples"

# Speech-to-Text Engine Options
STT_ENGINE = "whisper"  # Options: "google", "whisper", "windows"
WHISPER_MODEL = "base"  # Options: "tiny", "base", "small", "medium", "large"

# Security Settings
ENCRYPTION_KEY_LENGTH = 32
PASSPHRASE_HASH_ITERATIONS = 100000