import * as z from "zod";
import { confirmEmailSchema, emailSchema, loginSchema, resetPasswordSchema, signUpSchema } from "./auth.validation";

export type SignupDTO = z.infer<typeof signUpSchema.body>;
export type SignInDTO = z.infer<typeof loginSchema.body>;
export type ConfirmEmailDTO = z.infer<typeof confirmEmailSchema.body>;
export type ResendOtpDTO = z.infer<typeof emailSchema.body>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema.body>;