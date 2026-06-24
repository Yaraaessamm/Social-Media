import { Router } from "express";
import PostService from "./post.service";
import * as PostValidation from "./post.validation";
import { validation } from "../../common/middleware/validation";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";
import commentRouter from "../comments/comment.controller";

const postRouter = Router();
postRouter.use("/:postId/comments{/:commentId/replies}", commentRouter)

// --------------------------------
// Create -------------------------
postRouter.post(
  "/",
  authentication,
  multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
  validation(PostValidation.createPostSchema),
  PostService.createPost,
);
// --------------------------------
// Get -------------------------
postRouter.get("/", authentication, PostService.getPost);
// --------------------------------
// Patch -------------------------
postRouter.patch(
  "/:postId",
  authentication,
  validation(PostValidation.likePostSchema),
  PostService.likePost,
);
// --------------------------------
// Post -------------------------
postRouter.put(
  "/update/:postId",
  authentication,
  validation(PostValidation.updatePostSchema),
  PostService.updatePost,
);

export default postRouter;