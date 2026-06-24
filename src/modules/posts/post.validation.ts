import * as z from "zod";
import { GenderEnum } from "../../common/enum/user.enum";
import {
  Allow_Comment_Enum,
  Availability_Enum,
} from "../../common/enum/post-enum";
import { Types } from "mongoose";
import { generalRules } from "../../common/utils/generalRules";

// Main Field
// =====================
export const createPostSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachment: z.array(z.string()).optional(),
      tags: z.array(generalRules.id).optional(),
      availability: z.enum(Availability_Enum).default(Availability_Enum.public),
      allowComments: z
        .enum(Allow_Comment_Enum)
        .default(Allow_Comment_Enum.allow),
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
};

export const likePostSchema = {
  params: z.strictObject({
    postId: generalRules.id,
  }),
};

export const updatePostSchema = {
  body: z
    .object({
      content: z.string().optional(),
      attachment: z.array(generalRules.file).optional(),
      removeFiles: z.array(z.string()).optional(),
      tags: z.array(generalRules.id).optional(),
      availability: z.enum(Availability_Enum).default(Availability_Enum.public),
      allowComments: z
        .enum(Allow_Comment_Enum)
        .default(Allow_Comment_Enum.allow),
      removeTags: z.array(generalRules.id).optional(),
    })
    .superRefine((args, ctx) => {
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
};