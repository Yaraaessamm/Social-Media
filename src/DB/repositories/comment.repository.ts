import type {
  QueryFilter,
  HydratedDocument,
  Model,
  ProjectionType,
  QueryOptions,
  Types,
  PopulateOptions,
  UpdateQuery,
} from "mongoose";
import commentModel, { IComment } from "../models/comment.model";
import BaseRepository from "./base.repository";

class CommentRepository extends BaseRepository<IComment> {
  constructor(protected readonly model: Model<IComment> = commentModel) {
    super(model);
  }
}

export default CommentRepository;