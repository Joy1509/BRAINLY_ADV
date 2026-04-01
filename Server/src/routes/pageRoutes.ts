import  {Router}  from "express";
import { registeration,login} from "../controllers/authController";
import { newContent,content,deleteContent, shareContent, createShareLink, getSharedContent, getProfile } from "../controllers/crudController";
import { isAuthenticated } from "../middleware/authMiddleware";
import { forgotPassword, verifyOtp, resetPassword } from "../controllers/passwordController";
import passport from '../controllers/oauthController';
import { generateTokenAndRedirect } from '../controllers/oauthController';

const router = Router();

router.get("/content",isAuthenticated,content)
router.get("/profile",isAuthenticated,getProfile)
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

export default router;
