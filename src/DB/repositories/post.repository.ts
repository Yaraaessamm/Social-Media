import type { Model } from "mongoose";
import postModel, { IPost } from "../models/post.model";
import BaseRepository from "./base.repository";

class PostRepository extends BaseRepository<IPost> {
  constructor(protected readonly model: Model<IPost> = postModel) {
    super(model);
  }

}

export default PostRepository;