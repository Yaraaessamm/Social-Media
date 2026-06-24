import * as z from "zod";
import { createPostSchema, updatePostSchema } from "./post.validation";

export type CreatePostDTO = z.infer<typeof createPostSchema.body>;
export type UpdatePostDTO = z.infer<typeof updatePostSchema.body>;