import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/userModel";
import VoiceAuth from "../models/voiceAuthModel";
import multer from "multer";

const VOICE_API_URL = process.env.VOICE_API_URL || "http://localhost:5003";

// Multer for audio upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.fieldname === "audio") {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// HTTP helper — calls the persistent Flask voice API
async function callVoiceAPI(endpoint: string, body: object): Promise<any> {
  const res = await fetch(`${VOICE_API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });
  return res.json();
}

// Voice Registration
export const voiceRegister = async (req: Request, res: Response) => {
  try {
    const { username, email, password, passphrase, encryptionPassword } = req.body;

    if (!username || !email || !password || !passphrase || !encryptionPassword) {
      res.status(400).json({ success: false, message: "All fields are required" });
      return;
    }

    if (passphrase.trim().split(/\s+/).length < 3) {
      res.status(400).json({ success: false, message: "Passphrase must contain at least 3 words" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email already exists" });
      return;
    }

    // Register passphrase in Python service first
    const voiceResult = await callVoiceAPI("/register", {
      username: username.trim().toLowerCase(),
      passphrase,
      encryption_password: encryptionPassword,
    });

    if (!voiceResult.success) {
      res.status(500).json({ success: false, message: voiceResult.message || "Voice registration failed" });
      return;
    }

    // Create MongoDB user
    const bcrypt = require("bcrypt");
    const hashPassword = await bcrypt.hash(password, 5);
    const newUser = new User({
      username,
      email,
      password: hashPassword,
      voiceRegistered: true,
      voiceRegisteredAt: new Date(),
      lastLoginMethod: "voice",
    });
    await newUser.save();

    // Create VoiceAuth record (upsert by userId)
    await VoiceAuth.findOneAndUpdate(
      { userId: newUser._id },
      {
        userId: newUser._id,
        username,
        passphrase,
        encryptedPassphrase: "managed-by-python-service",
        salt: "managed-by-python-service",
        voiceSamples: 1,
      },
      { upsert: true, new: true }
    );

    if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY not set");
    const token = jwt.sign({ userID: newUser._id, role: newUser.role }, process.env.SECRET_KEY, { expiresIn: 3600 });

    res.status(201).json({
      success: true,
      message: "Voice registration successful",
      token,
      userID: newUser._id,
      username: newUser.username,
      role: newUser.role,
      avatar: newUser.avatar || "",
    });
  } catch (error: any) {
    console.error("Voice registration error:", error);
    // If it's a connection error to Python service
    if (error.cause?.code === "ECONNREFUSED") {
      res.status(503).json({ success: false, message: "Voice service unavailable. Please start the voice API (python api.py in model/voice_model)" });
      return;
    }
    res.status(500).json({ success: false, message: "Voice registration failed" });
  }
};

// Voice Login
export const voiceLogin = async (req: Request, res: Response) => {
  try {
    const { username, encryptionPassword } = req.body;
    const audioFile = req.file;

    if (!username || !encryptionPassword) {
      res.status(400).json({ success: false, message: "Username and encryption password are required" });
      return;
    }
    if (!audioFile) {
      res.status(400).json({ success: false, message: "Audio file is required" });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    if (!user.voiceRegistered) {
      res.status(400).json({ success: false, message: "Voice authentication not set up for this account" });
      return;
    }

    // Call persistent Flask API
    const authResult = await callVoiceAPI("/authenticate", {
      username: username.trim().toLowerCase(),
      encryption_password: encryptionPassword,
      audio_data: audioFile.buffer.toString("base64"),
    });

    // Update VoiceAuth stats
    await VoiceAuth.findOneAndUpdate(
      { userId: user._id },
      {
        $inc: {
          totalLoginAttempts: 1,
          ...(authResult.success ? { successfulLogins: 1 } : {}),
        },
        lastAttempt: new Date(),
        ...(authResult.success ? { lastSuccessfulLogin: new Date() } : {}),
      }
    );

    if (!authResult.success) {
      res.status(401).json({
        success: false,
        message: authResult.message || "Voice authentication failed",
        confidence: authResult.confidence || 0,
        recognized_text: authResult.recognized_text,
      });
      return;
    }

    // Update user last login
    user.lastLogin = new Date();
    user.lastLoginMethod = "voice";
    await user.save();

    if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY not set");
    const token = jwt.sign({ userID: user._id, role: user.role }, process.env.SECRET_KEY, { expiresIn: 3600 });

    res.status(200).json({
      success: true,
      message: "Voice authentication successful",
      token,
      userID: user._id,
      username: user.username,
      role: user.role,
      avatar: user.avatar || "",
      confidence: authResult.confidence || 1.0,
    });
  } catch (error: any) {
    console.error("Voice login error:", error);
    if (error.cause?.code === "ECONNREFUSED") {
      res.status(503).json({ success: false, message: "Voice service unavailable. Please start the voice API (python api.py in model/voice_model)" });
      return;
    }
    res.status(500).json({ success: false, message: "Voice authentication failed" });
  }
};

// Test Voice System
export const testVoiceSystem = async (req: Request, res: Response) => {
  try {
    const result = await fetch(`${VOICE_API_URL}/test`).then((r) => r.json());
    res.status(200).json(result);
  } catch {
    res.status(503).json({ success: false, message: "Voice service unavailable" });
  }
};

// Get Voice Auth Status
export const getVoiceAuthStatus = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const voiceAuth = await VoiceAuth.findOne({ userId: user._id });
    res.status(200).json({
      success: true,
      voiceRegistered: user.voiceRegistered,
      voiceAuthData: voiceAuth ? {
        username: voiceAuth.username,
        voiceSamples: voiceAuth.voiceSamples,
        totalLoginAttempts: voiceAuth.totalLoginAttempts,
        successfulLogins: voiceAuth.successfulLogins,
        successRate: voiceAuth.totalLoginAttempts > 0
          ? ((voiceAuth.successfulLogins / voiceAuth.totalLoginAttempts) * 100).toFixed(1)
          : "0",
        lastSuccessfulLogin: voiceAuth.lastSuccessfulLogin,
        registeredAt: voiceAuth.registeredAt,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get voice auth status" });
  }
};

export const uploadAudio = upload.single("audio");
