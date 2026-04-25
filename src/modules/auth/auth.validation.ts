import * as z from "zod";
import { GenderEnum } from "../../common/enum/user.enum";

export const general_rule = {
  emailField: z.string().email("Invalid email address"),
  otpField: z
    .string()
    .length(6)
    .regex(/^[0-9]{6}$/),
  passwordField: z.string().min(6).max(20),
};

export const emailSchema = {
  body: z.object({ email: general_rule.emailField }),
};

export const loginSchema = {
  body: emailSchema.body.safeExtend({
    password: general_rule.passwordField,
  }),
};

export const signUpSchema = {
  body: loginSchema.body
    .safeExtend({
      firstName: z.string({ error: "firstName is required" }).min(3).max(20),
      lastName: z.string({ error: "lastName is required" }).min(3).max(20),
      email: general_rule.emailField,
      password: general_rule.passwordField,
      cPassword: general_rule.passwordField,
      age: z.number().min(20).max(50),
      gender: z.enum(GenderEnum).optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
    })
    .refine((data) => data.password === data.cPassword, {
      message: "Passwords do not match",
      path: ["cPassword"],
    }),
};

export const confirmEmailSchema = {
  body: emailSchema.body.safeExtend({
    otp: general_rule.otpField,
  }),
};

export const resetPasswordSchema = {
  body: z
    .object({
      email: general_rule.emailField,
      otp: general_rule.otpField,
      password: general_rule.passwordField,
      cPassword: general_rule.passwordField,
    })
    .refine((data) => data.password === data.cPassword, {
      message: "Passwords do not match",
      path: ["cPassword"],
    }),
};

export const updatePasswordSchema = {
  body: z
    .object({
      oldPassword: general_rule.passwordField,
      newPassword: general_rule.passwordField,
      cPassword: general_rule.passwordField,
    })
    .refine((data) => data.newPassword === data.cPassword, {
      message: "Passwords do not match",
      path: ["cPassword"],
    }),
};