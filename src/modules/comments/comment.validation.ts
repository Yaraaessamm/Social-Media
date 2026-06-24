import * as z from "zod";
import { GenderEnum } from "../../common/enum/user.enum";
import {
  Allow_Comment_Enum,
  Availability_Enum,
  On_Model_Enum,
} from "../../common/enum/post-enum";
import { Types } from "mongoose";
import { generalRules } from "../../common/utils/generalRules";

// Main Field
// =====================
export const createCommentSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachment: z.array(z.string()).optional(),
      tags: z.array(generalRules.id).optional(),
      onModel: z.enum(On_Model_Enum),
    })
    .superRefine((args, ctx) => {
      if (!args.content && !args.attachment?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "Either content or attachment is required",
        });
      }
      if (args?.tags) {
        const uniqueTags = new Set(args.tags);
        if (args.tags.length !== uniqueTags.size) {
          ctx.addIssue({
            code: "custom",
            path: ["tags"],
            message: "Duplicate tags are not allowed",
          });
        }
      }
    }),
  params: z.strictObject({
    postId: generalRules.id,
    commentId: generalRules.id.optional(),
  }),
};