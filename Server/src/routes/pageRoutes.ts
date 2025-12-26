import  {Router}  from "express";
import { registeration,login} from "../controllers/authController";
import { newContent,content,deleteContent, shareContent } from "../controllers/crudController";
import { isAuthenticated } from "../middleware/authMiddleware";
import { forgotPassword, verifyOtp, resetPassword } from "../controllers/passwordController";

const router = Router();

router.get("/content",isAuthenticated,content)
router.post("/signup",registeration)
router.post("/signin",login)
router.post("/addcontent",isAuthenticated,newContent)
router.delete("/delete/:contentId",isAuthenticated,deleteContent)
router.get("/share/:userId",isAuthenticated,shareContent)

// Password reset flow
router.post('/password/forgot', forgotPassword);
router.post('/password/verify-otp', verifyOtp);
router.post('/password/reset', resetPassword);

export default router;
