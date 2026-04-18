import { HydratedDocument } from "mongoose";
import type { Request, Response, NextFunction } from "express";
import { type IUser } from "../../DB/models/user.model";
import { SignupRequestBody } from "./auth.dto";
import { AppError } from "../../common/utils/general-error-handler";
import UserRepository from "../../DB/repositories/user.repository";
import { encrypt } from "../../common/utils/security/encrypt.security";
import { Compare, Hash } from "../../common/utils/security/hash";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email";
import { emailTemplate } from "../../common/utils/email/email.template";
import RedisRepository, { Keys } from "../../DB/repositories/redis.repository";
import { emailEnum, EmailSubject } from "../../common/enum/email.enum";
import { eventEmitter } from "../../common/utils/email/email.events";
import { GenerateToken } from "../../common/utils/token.service";
import {
  ACCESS_SECRET_KEY,
  REFRESH_SECRET_KEY,
} from "../../config/config.service";
import { randomUUID } from "crypto";

class UserService {
  private readonly _userModel = new UserRepository();
  private readonly _redis = new RedisRepository();

  constructor() {}

  sendEmailOtp = async ({
    email,
    userName,
    subject = emailEnum.confirmEmail,
  }: {
    email: string;
    userName: string;
    subject?: EmailSubject;
  }) => {
    await this._redis.delValue(Keys.otp({ email, subject }));
    const otp = await generateOTP();
    eventEmitter.emit(subject, async () => {
      await sendEmail({
        to: email,
        subject: "Email Confirmation",
        html: emailTemplate({ userName: userName, otp }),
      });
      await this._redis.setValue({
        key: Keys.otp({ email, subject }),
        value: Hash({ plainText: `${otp}` }),
      });
    });
  };

  signUp = async (req: Request, res: Response, next: NextFunction) => {
    const {
      userName,
      email,
      password,
      age,
      gender,
      address,
      phone,
    }: SignupRequestBody = req.body;

    const emailExist = await this._userModel.findOne({ filter: { email } });
    if (emailExist) throw new AppError("Email already exist", 409);
    const user: HydratedDocument<IUser> = await this._userModel.create({
      userName,
      email,
      password: Hash({ plainText: password }),
      phone: phone ? encrypt(phone) : null,
      age,
      gender,
      address,
    } as Partial<IUser>);

    await this.sendEmailOtp({ email, userName: user.userName });
    res
      .status(200)
      .json({ message: "User signed up successfully.", data: user });
  };

  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;

    const emailExist = await this._userModel.findOne({ filter: { email } });
    if (!emailExist) throw new AppError("Email not exists", 409);

    const otpExist = await this._redis.getValue(
      Keys.otp({ email, subject: emailEnum.confirmEmail }),
    );
    if (!otpExist) throw new Error("OTP Expired");
    if (!Compare({ plainText: otp, cipherText: otpExist }))
      throw new Error("Invalid OTP");

    const user = await this._userModel.findOneAndUpdate({
      filter: { email, confirmed: { $exists: false } },
      update: { confirmed: true },
    });
    if (!user) throw new Error("User not exist");

    await this._redis.delValue(
      Keys.otp({ email, subject: emailEnum.confirmEmail }),
    );
    res
      .status(200)
      .json({ message: "Email confirmed successfully", data: user });
  };


  login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const userExist = await this._userModel.findOne({ filter: { email } });
    if (!userExist) throw new AppError("User not exists", 409);
    if (!userExist.confirmed) {
      await this.sendEmailOtp({ email, userName: userExist.userName });
      throw new AppError(
        "User not confirmed, Please confirm your email first",
        409,
      );
    }
    if (!Compare({ plainText: password, cipherText: userExist.password }))
      throw new Error("Invalid password");

    const jwtid = randomUUID();
    const access_token = GenerateToken({
      payload: { id: userExist._id, email },
      secret_key: ACCESS_SECRET_KEY,
      options: { expiresIn: 60 * 3, jwtid },
    });
    const refresh_token = GenerateToken({
      payload: { id: userExist._id, email },
      secret_key: REFRESH_SECRET_KEY,
      options: { expiresIn: "1y", jwtid },
    });
    res.status(200).json({
      message: "Login Successfully...",
      data: { access_token, refresh_token },
    });
  };

  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const userExist = await this._userModel.findOne({ filter: { email } });
    if (!userExist)
      throw new AppError(
        "If your email is registered, you’ll receive an OTP shortly.",
        404,
      );
    if (!userExist.confirmed) {
      await this.sendEmailOtp({ email, userName: userExist.userName });
      throw new AppError(
        "Your account is not verified. Please check your email to verify your account.",
        403,
      );
    }
    await this.sendEmailOtp({
      email,
      userName: userExist.userName,
      subject: emailEnum.forgetPassword,
    });
    res.status(200).json({
      message:
        "An OTP has been sent to your email. Please use it to reset your password.",
    });
  };


  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, password } = req.body;
    const otpExist = await this._redis.getValue(
      Keys.otp({ email, subject: emailEnum.forgetPassword }),
    );
    if (!otpExist) throw new AppError("OTP Expired", 401);
    if (!Compare({ plainText: otp, cipherText: otpExist }))
      throw new AppError("Invalid OTP", 400);

    const userExist = await this._userModel.findOne({ filter: { email } });
    if (!userExist)
      throw new AppError(
        "If your email is registered, you’ll receive an OTP shortly.",
        404,
      );
    if (!userExist.confirmed) {
      await this.sendEmailOtp({ email, userName: userExist.userName });
      throw new AppError(
        "Your account is not verified. Please check your email to verify your account.",
        403,
      );
    }
    (await this._userModel.findOneAndUpdate({
      filter: { email },
      update: { password: Hash({ plainText: Hash({ plainText: password }) }) },
    }),
      await this._redis.delValue(
        Keys.otp({ email, subject: emailEnum.forgetPassword }),
      ));
    res.status(200).json({
      message: "Password has been reset successfully",
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    const { oldPassword, newPassword } = req.body;
    if (!Compare({ plainText: oldPassword, cipherText: req.user.password })) {
      throw new Error("Invalid old password");
    }
    await this._userModel.findOneAndUpdate({
      filter: { email: req.user.email },
      update: {
        password: Hash({ plainText: Hash({ plainText: newPassword }) }),
      },
    });
    res.status(200).json({
      message: "Password has been reset successfully",
    });
  };
}

export default new UserService();