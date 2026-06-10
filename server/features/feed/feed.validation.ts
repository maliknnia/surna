import { z } from "zod";

export const FeedQuerySchema = z.object({
  scope: z.enum(["following", "global"]).default("following"),
  cursorCreatedAt: z.string().optional(),
  cursorId: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});
