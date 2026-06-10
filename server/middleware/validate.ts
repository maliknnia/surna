// server/middleware/validate.ts
import { ZodSchema } from "zod";
import type { RequestHandler } from "express";

export const validateBody = (schema: ZodSchema): RequestHandler => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err: any) {
    return res.status(400).json({ message: "Invalid request", issues: err.errors || err });
  }
};