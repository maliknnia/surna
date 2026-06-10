import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).optional(), // Temporarily optional for testing
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Environment validation failed:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
