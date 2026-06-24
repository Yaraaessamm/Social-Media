import mongoose, { Types } from "mongoose";

export interface IMessage {
  content: string;
  createdBy: Types.ObjectId;
}

export interface IChat {
  // ovo
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  messages: IMessage[];
  // ovm
  group: string;
  groupImage: string;
  roomId: string;
}

const messagesSchema = new mongoose.Schema<IMessage>({
  content: { type: String, required: true },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
});

const chatSchema = new mongoose.Schema<IChat>(
  {
    participants: [{ type: Types.ObjectId, ref: "User", required: true }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    messages: [messagesSchema],
    group: String,
    groupImage: String,
    roomId: String,
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const chatModel =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", chatSchema);

export default chatModel;