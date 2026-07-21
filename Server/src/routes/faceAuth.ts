import express from 'express';
import fetch from 'node-fetch';
import User from '../models/userModel';
import { isAuthenticated, AuthRequest } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Face API configuration
const FACE_API_URL = 'http://localhost:5002';

// Interface for face authentication response
interface FaceAuthResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  confidence?: number;
}

// Interface for face registration response  
interface FaceRegisterResponse {
  success: boolean;
  message?: string;
  user_id?: string;
}

// Helper function to make requests to Face API
async function callFaceAPI(endpoint: string, data: any): Promise<any> {
  try {
    const response = await fetch(`${FACE_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    return await response.json();
  } catch (error) {
    console.error('Face API Error:', error);
    throw new Error('Face authentication service unavailable');
  }
}

// Register face for authenticated user
router.post('/register-face', isAuthenticated, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = req.userID as string;
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Images are required for face registration' 
      });
      return;
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    // Call Face API to register face
    const faceApiResponse: FaceRegisterResponse = await callFaceAPI('/register_face', {
      user_id: userId,
      images: images
    });

    if (faceApiResponse.success) {
      // Update user's face registration status
      await User.findByIdAndUpdate(userId, {
        faceRegistered: true,
        faceRegisteredAt: new Date()
      });

      res.json({
        success: true,
        message: 'Face registered successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: faceApiResponse.message || 'Face registration failed'
      });
    }
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during face registration'
    });
  }
});

// Face login endpoint
router.post('/login-face', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ 
        success: false, 
        message: 'Image is required for face login' 
      });
      return;
    }

    // Call Face API to authenticate
    const faceApiResponse: FaceAuthResponse = await callFaceAPI('/authenticate_face', {
      image: image
    });

    if (faceApiResponse.success && faceApiResponse.user_id) {
      // Find user by ID
      const user = await User.findById(faceApiResponse.user_id);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Update last login information
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        lastLoginMethod: 'face'
      });

      // Generate JWT token
      if (!process.env.SECRET_KEY) {
        res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
        return;
      }

      const token = jwt.sign(
        { userID: user._id, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Face authentication successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role
        },
        confidence: faceApiResponse.confidence
      });
    } else {
      res.status(401).json({
        success: false,
        message: faceApiResponse.message || 'Face authentication failed'
      });
    }
  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during face authentication'
    });
  }
});

// Get face registration status for authenticated user
router.get('/face-status', isAuthenticated, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const userId = req.userID as string;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    res.json({
      success: true,
      faceRegistered: user.faceRegistered,
      faceRegisteredAt: user.faceRegisteredAt,
      lastLogin: user.lastLogin,
      lastLoginMethod: user.lastLoginMethod
    });
  } catch (error) {
    console.error('Face status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;