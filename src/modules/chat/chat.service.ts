import { NextFunction, Request, Response } from "express";
import UserRepository from "../../DB/repositories/user.repository";
import { AppError } from "../../common/utils/general-error-handler";
import { Types } from "mongoose";
import ChatRepository from "../../DB/repositories/chat.repository";
import { successResponse } from "../../common/utils/response.success";

class chatService {
  private readonly _userRepo = new UserRepository();
  private readonly _chatRepo = new ChatRepository();
  constructor() {}

  // Socket io
  sayHi = async (data: any) => {
    console.log(data);
  };
  sendMessage = async (data: any) => {
    const { sendTo, content } = data;
    const user = await this._userRepo.findOne({ filter: { _id: sendTo } });
    if (!user) throw new AppError("User not exist")
  };
  // Rest apis
  getChat = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const chat = await this._chatRepo.findOne({
      filter: {
        participants: { $all: [req.user._id, userId] },
        group: { $exists: false },
      },
      options: { populate: { path: "participants" } },
    });
    if (!chat) throw new AppError("Chat not exist", 400);
    successResponse({ res, message: "Done", data: chat });
  };
}

export default new chatService();