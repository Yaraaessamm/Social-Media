export const emailEnum = {
  confirmEmail: "confirmEmail",
  forgetPassword: "forgetPassword",
} as const;

export type EmailSubject = (typeof emailEnum)[keyof typeof emailEnum];