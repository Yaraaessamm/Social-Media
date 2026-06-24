import mongoose, { Types } from "mongoose";
import {
  Allow_Comment_Enum,
  Availability_Enum,
} from "../../common/enum/post-enum";

export interface IPost {
  content?: string;
  attachment?: string[];
  createdBy: Types.ObjectId;
  tags?: Types.ObjectId[];
  likes?: Types.ObjectId[];
  allowComments?: Allow_Comment_Enum;
  availability?: Availability_Enum;
  folderId: string;
}

const postSchema = new mongoose.Schema<IPost>(
  {
    content: {
      type: String,
      min: 1,
      required: function (this) {
        return !this.attachment?.length;
      },
    },
    attachment: [String],
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: Types.ObjectId, ref: "User" }],
    likes: [{ type: Types.ObjectId, ref: "User" }],
    allowComments: {
      type: String,
      enum: Allow_Comment_Enum,
      default: Allow_Comment_Enum.allow,
    },
    availability: {
      type: String,
      enum: Availability_Enum,
      default: Availability_Enum.public,
    },
    folderId: String,
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "refId",
  
});

const postModel =
  mongoose.models.Post || mongoose.model<IPost>("Post", postSchema);

export default postModel;