import { Router } from "express";
import CommentService from "./comment.service";
import * as CommentValidation from "./comment.validation";
import { validation } from "../../common/middleware/validation";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";

const commentRouter = Router({ mergeParams: true });

// Create -------------------------
commentRouter.post(
  "/",
  authentication,
  multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
  validation(CommentValidation.createCommentSchema),
  CommentService.createComment,
);

export default commentRouter;