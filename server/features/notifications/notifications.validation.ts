import { z } from "zod";

export const ListQuery = z.object({
  cursorCreatedAt: z.string().datetime().optional(),
  cursorId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const MarkOneParams = z.object({
  id: z.string().uuid(),
});
