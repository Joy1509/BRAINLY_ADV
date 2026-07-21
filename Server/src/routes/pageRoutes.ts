import  {Router}  from "express";
import { registeration,login} from "../controllers/authController";
import { newContent,content,deleteContent, shareContent, createShareLink, getSharedContent, getProfile, uploadVoiceNote } from "../controllers/crudController";
import { isAuthenticated } from "../middleware/authMiddleware";
import { forgotPassword, verifyOtp, resetPassword } from "../controllers/passwordController";
import passport from '../controllers/oauthController';
import { generateTokenAndRedirect } from '../controllers/oauthController';
import upload from '../middleware/uploadMiddleware';
import { imageUpload } from '../middleware/uploadMiddleware';
import faceAuthRoutes from './faceAuth';
import voiceAuthRoutes from './voiceAuth';
import adminRoutes from './adminRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

// Existing routes
router.get("/content",isAuthenticated,content)
router.get("/profile",isAuthenticated,getProfile)
router.post("/addvoice",isAuthenticated,upload.single('audio'),uploadVoiceNote)
router.post("/signup",registeration)
router.post("/signin",login)
router.post("/addcontent",isAuthenticated,newContent)
router.delete("/delete/:contentId",isAuthenticated,deleteContent)
router.get("/share/:userId",isAuthenticated,shareContent)
router.post("/create-share",isAuthenticated,createShareLink)
router.get("/shared/:shareId",getSharedContent)

// Password reset flow
router.post('/password/forgot', forgotPassword);
router.post('/password/verify-otp', verifyOtp);
router.post('/password/reset', resetPassword);

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:5173/?error=auth_failed', session: false }), generateTokenAndRedirect);

// GitHub OAuth
router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: 'http://localhost:5173/?error=auth_failed', session: false }), generateTokenAndRedirect);

// Avatar update
router.patch('/avatar', isAuthenticated, imageUpload.single('avatar'), async (req: any, res: any) => {
  try {
    const userId = req.userID;
    const User = (await import('../models/userModel')).default;
    const cloudinary = (await import('../config/cloudinary')).default;

    let avatarUrl = '';

    if (req.file) {
      // Upload image to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'second-brain/avatars', transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }] },
          (err, res) => { if (err) reject(err); else resolve(res); }
        );
        stream.end(req.file.buffer);
      });
      avatarUrl = result.secure_url;
    } else if (req.body.prompt) {
      // Generate avatar using DiceBear API (free, no API key, instant)
      const prompt = (req.body.prompt as string).trim();
      const seed = encodeURIComponent(prompt);
      // Pick style based on keywords in prompt
      const styles = ['adventurer', 'avataaars', 'big-ears', 'bottts', 'croodles', 'fun-emoji', 'lorelei', 'micah', 'miniavs', 'notionists', 'open-peeps', 'personas', 'pixel-art'];
      const style = styles[Math.abs(prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % styles.length];
      const imageUrl = `https://api.dicebear.com/8.x/${style}/png?seed=${seed}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) { res.status(500).json({ message: 'AI generation failed' }); return; }
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'second-brain/avatars', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
          (err, res) => { if (err) reject(err); else resolve(res); }
        );
        stream.end(imgBuffer);
      });
      avatarUrl = result.secure_url;
    } else {
      res.status(400).json({ message: 'Provide an image file or a prompt' }); return;
    }

    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });
    res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({ message: 'Failed to update avatar' });
  }
});

// Face Authentication routes
router.use('/face', faceAuthRoutes);

// Voice Authentication routes
router.use('/voice', voiceAuthRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Notification / Inbox routes
router.use('/notifications', notificationRoutes);

export default router;