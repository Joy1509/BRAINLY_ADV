import express from "express";
import { 
  voiceRegister, 
  voiceLogin, 
  testVoiceSystem, 
  getVoiceAuthStatus,
  uploadAudio 
} from "../controllers/voiceAuthController";
import { isAuthenticated } from "../middleware/authMiddleware";

const router = express.Router();

// Voice Authentication Routes

// POST /api/voice/register - Register user with voice authentication
router.post('/register', voiceRegister);

// POST /api/voice/login - Login with voice authentication
router.post('/login', uploadAudio, voiceLogin);

// GET /api/voice/test - Test voice system
router.get('/test', testVoiceSystem);

// GET /api/voice/status/:username - Get voice auth status for user
router.get('/status/:username', isAuthenticated, getVoiceAuthStatus);

// POST /api/voice/test-audio - Test audio upload and processing
router.post('/test-audio', uploadAudio, (req, res) => {
  try {
    const audioFile = req.file;
    
    if (!audioFile) {
      res.status(400).json({
        success: false,
        message: "No audio file uploaded"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Audio file received successfully",
      fileInfo: {
        originalName: audioFile.originalname,
        size: audioFile.size,
        mimetype: audioFile.mimetype
      }
    });
  } catch (error) {
    console.error("Audio test error:", error);
    res.status(500).json({
      success: false,
      message: "Audio test failed"
    });
  }
});

export default router;