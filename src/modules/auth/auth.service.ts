import { HydratedDocument } from "mongoose";
import type { Request, Response, NextFunction } from "express";
import { type IUser } from "../../DB/models/user.model";
import {
  ConfirmEmailDTO,
  ResendOtpDTO,
  ResetPasswordDTO,
  SignInDTO,
} from "./auth.dto";
import { AppError } from "../../common/utils/general-error-handler";
import UserRepository from "../../DB/repositories/user.repository";
import { encrypt } from "../../common/utils/security/encrypt.security";
import { Compare, Hash } from "../../common/utils/security/hash";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email";
import { emailTemplate } from "../../common/utils/email/email.template";
import { EmailEnum } from "../../common/enum/email.enum";
import { eventEmitter } from "../../common/utils/email/email.events";
import { GenerateToken } from "../../common/utils/token.service";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import {
  ACCESS_SECRET_KEY,
  CLIENT_ID,
  REFRESH_SECRET_KEY,
  SECRET_KEY,
} from "../../config/config.service";
import { randomUUID } from "crypto";
import { successResponse } from "../../common/utils/response.success";
import { ProviderEnum } from "../../common/enum/user.enum";
import redisService from "../../common/service/redis.service";
import { S3Service } from "../../common/service/s3.service";

class UserService {
  private readonly _userModel = new UserRepository();
  private readonly _s3Service = new S3Service();
  private readonly _redisService = redisService;

  constructor() {}

  sendEmailOtp = async ({
    email,
    userName,
    subject = EmailEnum.confirmEmail,
  }: {
    email: string;
    userName: string;
    subject?: string;
  }) => {
    await this._redisService.delValue(
      this._redisService.otp_key({ email, subject }),
    );
    const otp = await generateOTP();
    eventEmitter.emit(subject, async () => {
      await sendEmail({
        to: email,
        subject: "Email Confirmation",
        html: emailTemplate({ userName: userName, otp }),
      });
      await this._redisService.setValue({
        key: this._redisService.otp_key({ email, subject }),
        value: Hash({ plainText: `${otp}` }),
      });
      await this._redisService.setValue({
        key: this._redisService.max_otp_key(email),
        value: "1",
        ttl: 60 * 30,
      });
    });
  };

  
  signUp = async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstName,
      lastName,
      email,
      password,
      age,
      gender,
      address,
      phone,
    }: SignupRequestBody = req.body;

    if (await this._userModel.findOne({ filter: { email } }))
      throw new AppError("Email already exist", 409);
    const user: HydratedDocument<IUser> = await this._userModel.create({
      firstName,
      lastName,
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

 
  signUpWithGoogle = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const { idToken } = req.body;
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID!,
    });
    const payload = ticket.getPayload();

    const { email, email_verified, name, picture } = payload as TokenPayload;

    let user = await this._userModel.findOne({ filter: { email: email! } });
    if (!user) {
      user = await this._userModel.create({
        email: email!,
        confirmed: email_verified!,
        userName: name!,
        // profilePicture: picture!,
        provider: ProviderEnum.google,
      });
    }
    if (user.provider == ProviderEnum.system) {
      throw new AppError("Please log in on system only", 400);
    }

    const access_token = GenerateToken({
      payload: { id: user._id, email: user.email },
      secret_key: SECRET_KEY,
      options: { expiresIn: "1h" },
    });
    successResponse({
      res,
      message: "Login Successfully...",
      data: { access_token },
    });
  };


  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp }: ConfirmEmailDTO = req.body;

    const emailExist = await this._userModel.findOne({ filter: { email } });
    if (!emailExist) throw new AppError("Email not exists", 409);

    const otpExist = await this._redisService.getValue(
      this._redisService.otp_key({ email, subject: EmailEnum.confirmEmail }),
    );
    if (!otpExist) throw new Error("OTP Expired");
    if (!Compare({ plainText: otp, cipherText: otpExist }))
      throw new Error("Invalid OTP");

    const user = await this._userModel.findOneAndUpdate({
      filter: { email, confirmed: { $exists: false } },
      update: { confirmed: true },
    });
    if (!user) throw new Error("User not exist");

    await this._redisService.delValue(
      this._redisService.otp_key({ email, subject: EmailEnum.confirmEmail }),
    );
    successResponse({ res, message: "Email confirmed successfully" });
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: ResendOtpDTO = req.body;
    const user = await this._userModel.findOne({
      filter: {
        email,
        confirmed: { $exists: false },
        provider: ProviderEnum.system,
      },
    });
    if (!user) throw new Error("User not exist or already confirmed");
    await this.sendEmailOtp({
      email,
      userName: user.userName,
      subject: EmailEnum.confirmEmail,
    });
    successResponse({
      res,
      message: "Email confirmed successfully",
      data: user,
    });
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: SignInDTO = req.body;

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
    successResponse({
      res,
      message: "Login Successfully...",
      data: { access_token, refresh_token },
    });
  };


  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: ResendOtpDTO = req.body;
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
      subject: EmailEnum.forgetPassword,
    });
    successResponse({
      res,
      message:
        "An OTP has been sent to your email. Please use it to reset your password.",
    });
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, password }: ResetPasswordDTO = req.body;
    const otpExist = await this._redisService.getValue(
      this._redisService.otp_key({ email, subject: EmailEnum.forgetPassword }),
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
      await this._redisService.delValue(
        this._redisService.otp_key({
          email,
          subject: EmailEnum.forgetPassword,
        }),
      ));
    successResponse({ res, message: "Password has been reset successfully" });
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
    successResponse({ res, message: "Password has been reset successfully" });
  };

 
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {



    const { fileName, ContentType } = req.body;
    const { url, Key } = await this._s3Service.createPreSignedUrl({
      fileName,
      ContentType,
      path: `users/${req?.user?._id}`,
    });
    await this._userModel.findOneAndUpdate({
      filter: { _id: req?.user?._id },
      update: { profilePic: Key },
    });
    successResponse({ res, data: { Key, url } });
  };
}

export default new UserService();