import { Router } from "express";
import AuthService from "./auth.service";
import * as AuthValidation from "./auth.validation";
import { validation } from "../../common/middleware/validation";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";

const authRouter = Router();

authRouter.post(
  "/signup",
  validation(AuthValidation.signUpSchema),
  AuthService.signUp,
);
authRouter.post("/signup/google", AuthService.signUpWithGoogle);


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


authRouter.post(
  "/login",
  validation(AuthValidation.loginSchema),
  AuthService.login,
);


authRouter.patch(
  "/forget-password",
  validation(AuthValidation.emailSchema),
  AuthService.forgetPassword,
);

authRouter.patch(
  "/reset-password",
  validation(AuthValidation.resetPasswordSchema),
  AuthService.resetPassword,
);


authRouter.patch(
  "/update-password",
  authentication,
  validation(AuthValidation.updatePasswordSchema),
  AuthService.updatePassword,
);

authRouter.post(
  "/upload",

  AuthService.uploadImage,
);

export default authRouter;