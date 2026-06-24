import { Router } from "express";
import AuthService from "./auth.service";
import * as AuthValidation from "./auth.validation";
import { validation } from "../../common/middleware/validation";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";
import chatRouter from "../chat/chat.controller";

const authRouter = Router();

authRouter.use("/:userId/chat", chatRouter )
// --------------------------------
// Sign Up ------------------------
authRouter.post(
  "/signup",
  validation(AuthValidation.signUpSchema),
  AuthService.signUp,
);
authRouter.post("/signup/google", AuthService.signUpWithGoogle);

// -----------------------------------
// Confirm email ---------------------
authRouter.post(
  "/verify-email",
  validation(AuthValidation.confirmEmailSchema),
  AuthService.confirmEmail,
);
authRouter.post(
  "/resend-otp",
  validation(AuthValidation.emailSchema),
  AuthService.resendOtp,
);

// -------------------------------
// Login -------------------------
authRouter.post(
  "/login",
  validation(AuthValidation.loginSchema),
  AuthService.login,
);

// ------------------------------------
// Forget Password --------------------
authRouter.patch(
  "/forget-password",
  validation(AuthValidation.emailSchema),
  AuthService.forgetPassword,
);

// -----------------------------------
// Reset Password --------------------
authRouter.patch(
  "/reset-password",
  validation(AuthValidation.resetPasswordSchema),
  AuthService.resetPassword,
);

// -----------------------------------
// Update Password -------------------
authRouter.patch(
  "/update-password",
  authentication,
  validation(AuthValidation.updatePasswordSchema),
  AuthService.updatePassword,
);

// -------------------------------
// Upload ------------------------
authRouter.post(
  "/upload",
  multerCloud({ store_type: Store_Enum.disk }).array("attachment"),
  AuthService.uploadImage,
);

authRouter.get("/profile", authentication, AuthService.getProfile);
authRouter.post("/add-friends", authentication, AuthService.addFriends);

export default authRouter;