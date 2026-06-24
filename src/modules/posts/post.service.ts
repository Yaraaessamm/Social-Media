import { NextFunction, Request, Response } from "express";
import PostRepository from "../../DB/repositories/post.repository";
import { successResponse } from "../../common/utils/response.success";
import { CreatePostDTO, UpdatePostDTO } from "./post.dto";
import UserRepository from "../../DB/repositories/user.repository";
import { S3Service } from "../../common/service/s3.service";
import redisService from "../../common/service/redis.service";
import notificationService from "../../common/service/notification.service";
import { AppError } from "../../common/utils/general-error-handler";
import { Types } from "mongoose";
import { Store_Enum } from "../../common/enum/multer.enum";
import { randomUUID } from "node:crypto";
import { AvailabilityPost } from "../../common/utils/post.utils";
import CommentRepository from "../../DB/repositories/comment.repository";

class PostService {
  private readonly _commentRepo = new CommentRepository();
  private readonly _postRepo = new PostRepository();
  private readonly _userModel = new UserRepository();
  private readonly _s3Service = new S3Service();
  private readonly _redisService = redisService;
  private readonly _notificationService = notificationService;

  constructor() {}

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    const { content, tags, allowComments, availability }: CreatePostDTO =
      req.body;
    let mentions: Types.ObjectId[] = [];
    let fcmTokens: string[] = [];
    let urls: string[] = [];
    let folderId = randomUUID();

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

    if (req?.files) {
      urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${folderId}`,
        store_type: Store_Enum.memory,
      });
    }

    const post = await this._postRepo.create({
      content: content!,
      attachment: urls,
      createdBy: req.user?._id!,
      tags: mentions,
      allowComments,
      availability,
      folderId,
    });
    if (!post) {
      await this._s3Service.deleteFiles(urls);
      throw new AppError("Failed to create post");
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
    successResponse({ res, message: "Post created successfully", data: post });
  };

  getPost = async (req: Request, res: Response, next: NextFunction) => {
    // const searchQuery = req.query?.search
    //   ? { content: { $regex: req.query?.search, $options: "i" } }
    //   : {};
    // const posts = await this._postRepo.pagination({
    //   page: +req?.query.page!,
    //   limit: +req?.query.limit!,
    //   search: { $or: [...AvailabilityPost(req)], ...searchQuery },
    // });

    const posts = await this._postRepo.find({
      filter: { $or: [...AvailabilityPost(req)] },
      options: {
        populate: [
          {
            path: "comments",
            match: { commentId: { $existed: false } },
            populate: [{ path: "replies" }],
          },
        ],
      },
    });
    successResponse({ res, data: posts });
  };

  likePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const { flag } = req.query;
    let updateQuery: any = {
      $addToSet: { likes: req.user?._id },
    };
    if (flag && flag === "disLike") {
      updateQuery = {
        $pull: { likes: req.user?._id },
      };
    }
    const post = await this._postRepo.findOneAndUpdate({
      filter: {
        _id: postId,
        ...AvailabilityPost(req),
      },
      update: {
        $addToSet: { likes: req.user?._id },
      },
    });
    if (!post) {
      throw new AppError("Post not Found or not authorized");
    }
    successResponse({ res, data: post });
  };

  updatePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const {
      content,
      tags,
      allowComments,
      availability,
      removeFiles,
      removeTags,
    }: UpdatePostDTO = req.body;

    const post = await this._postRepo.findOne({
      filter: { _id: postId, createBy: req?.user?._id },
    });
    if (!post) throw new AppError("Post not found or not authorized");

    if (removeFiles?.length) {
      const inValidFiles = removeFiles.filter((file: string) =>
        post.attachment?.includes(file),
      );
      if (inValidFiles?.length) {
        throw new AppError("Some of path file you want remove not exist");
      }
      await this._s3Service.deleteFiles(removeFiles);
      post.attachment = post.attachment?.filter(
        (file: string) => !removeFiles.includes(file),
      ) as string[];
    }

    const updateTags = new Set(post?.tags?.map((id) => id.toString()));
    removeTags?.forEach((tag: string) => updateTags.delete(tag));

    let fcmTokens: string[] = [];
    let folderId = randomUUID();

    if (tags?.length) {
      const mentionsTags = await this._userModel.find({
        filter: { _id: { $in: tags } },
      });
      if (tags.length != mentionsTags.length)
        throw new AppError("Invalid tag id");

      for (const tag of mentionsTags) {
        if (tag._id.toString() == req.user?._id.toString())
          throw new AppError("you can not mention tou your self");
        updateTags.add(tag._id.toString());
        (await this._redisService.getFCM(tag._id)).map((token) =>
          fcmTokens.push(token),
        );
      }
    }
    post.tags = [...updateTags].map((id: string) => new Types.ObjectId(id));

    if (req?.files?.length) {
      let urls = await this._s3Service.uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${folderId}`,
        store_type: Store_Enum.memory,
      });
      post.attachment?.push(...urls);
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
    successResponse({ res, message: "Post updated successfully", data: post });
  };
}

export default new PostService();