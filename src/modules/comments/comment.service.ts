import { NextFunction, Request, Response } from "express";
import PostRepository from "../../DB/repositories/post.repository";
import { successResponse } from "../../common/utils/response.success";
import { CreateCommentDTO } from "./comment.dto";
import UserRepository from "../../DB/repositories/user.repository";
import { S3Service } from "../../common/service/s3.service";
import redisService from "../../common/service/redis.service";
import notificationService from "../../common/service/notification.service";
import { AppError } from "../../common/utils/general-error-handler";
import { Allow_Comment_Enum, On_Model_Enum } from "../../common/enum/post-enum";
import { HydratedDocument, Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { Store_Enum } from "../../common/enum/multer.enum";
import CommentRepository from "../../DB/repositories/comment.repository";
import { AvailabilityPost } from "../../common/utils/post.utils";
import { IPost } from "../../DB/models/post.model";
import { IComment } from "../../DB/models/comment.model";

class CommentService {
  private readonly _commentRepo = new CommentRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _userModel = new UserRepository();
  private readonly _s3Service = new S3Service();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;

  constructor() {}

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    const { content, tags, onModel }: CreateCommentDTO = req.body;
    const { postId, commentId } = req.params;

    let doc: HydratedDocument<IPost | IComment> | null;

    if (onModel === On_Model_Enum.Post && !commentId) {
      doc = await this._postRepo.findOne({
        filter: {
          _id: postId,
          $or: [...AvailabilityPost(req)],
          allowComments: Allow_Comment_Enum.allow,
        },
      });
      if (!doc)
        throw new AppError("Post not found or comments are not allowed", 404);
    } else if (onModel === On_Model_Enum.Comment && commentId) {
      const comment = await this._commentRepo.findOne({
        filter: { _id: commentId, refId: postId! },
        options: {
          populate: [
            {
              path: "refId",
              match: {
                $or: [...AvailabilityPost(req)],
                allowComment: Allow_Comment_Enum.allow,
              },
            },
          ],
        },
      });
      if (!comment?.refId)
        throw new AppError(
          "Comment not found or comments are not allowed",
          404,
        );

      doc = comment;
    }

    if (!doc)
      throw new AppError(
        "Post or comment not found or comments are not allowed",
        404,
      );

    let mentions: Types.ObjectId[] = [];
    let fcmTokens: string[] = [];
    if (tags?.length) {
      const mentionsTags = await this._userModel.find({
        filter: { _id: { $in: tags } },
      });
      if (tags.length != mentionsTags.length)
        throw new AppError("Invalid tag id");

      for (const tag of mentionsTags) {
        mentions.push(tag._id);
        (await this._redisService.getFCM(tag._id)).map((token) =>
          fcmTokens.push(token),
        );
      }
    }
    let urls: string[] = [];
    let folderId = randomUUID();
    if (req.files?.length) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${doc?.folderId}/comments/${folderId}`,
        store_type: Store_Enum.memory,
      });
    }
    const comment = await this._commentRepo.create({
      content: content || "",
      attachments: urls,
      createdBy: req.user?._id!,
      tags: mentions,
      folderId,
      refId: doc?._id!,
      onModel,
    });
    if (!comment) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Failed to create comment");
    }
    if (fcmTokens?.length) {
      await this._notificationService.sendNotifications({
        tokens: fcmTokens,
        data: {
          title: "You were mentioned in a post",
          body: `${req.user?.name} mentioned you in a post`,
        },
      });
    }
    successResponse({ res, message: "Comment created successfully" });
  };
}

export default new CommentService();