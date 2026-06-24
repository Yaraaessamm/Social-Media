import type { Model } from "mongoose";
import chatModel, { IChat } from "../models/chat.model";
import BaseRepository from "./base.repository";

class ChatRepository extends BaseRepository<IChat> {
  constructor(protected readonly model: Model<IChat> = chatModel) {
    super(model);
  }

}

export default ChatRepository;