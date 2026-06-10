import { z } from "zod";

export const GetProfileParamsSchema = z.object({
  username: z.string().min(3).max(32),
});

export const UpdateMeSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(280).optional(),
  avatarThumbUrl: z.string().url().optional(),
});
