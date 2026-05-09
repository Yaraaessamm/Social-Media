import { NextFunction, Request, Response } from "express";
import PostRepository from "../../DB/repositories/post.repository";
import { Availability_Enum } from "../../common/enum/post-enum";
import { successResponse } from "../../common/utils/response.success";

class PostService {
  private readonly _postRepo = new PostRepository();
  constructor() {}

  getPost = async (req: Request, res: Response, next: NextFunction) => {
    const posts = await this._postRepo.find({
      filter: {
        $or: [
          { availability: Availability_Enum.public },
          {
            availability: Availability_Enum.only_me,
            createdBy: req.user?._id!,
          },
          {
            availability: Availability_Enum.friends,
            createdBy: { $in: [...(req.user?.friends || []), req.user?._id] },
          },
        ],
      },
    });
    successResponse({ res, data: posts });
  };
}

export default new PostService();