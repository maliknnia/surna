// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" | "all" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    let data: any;
    
    if (source === "all") {
      data = { ...req.body, ...req.query, ...req.params };
    } else {
      data = req[source];
    }
    
    const result = schema.safeParse(data);
    
    if (!result.success) {
      return res.status(400).json({
        error: "validation_error",
        details: result.error.flatten()
      });
    }
    
    (req as any).validated = result.data;
    next();
  };
}

// Common validation schemas
export const schemas = {
  id: z.string().uuid(),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),
  search: z.object({
    q: z.string().min(1).max(200)
  }),
  createEvent: z.object({
    title: z.string().min(3).max(120),
    description: z.string().max(5000),
    timeStart: z.string().datetime(),
    timeEnd: z.string().datetime().optional(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().max(200).optional()
    }),
    capacity: z.number().int().positive().optional(),
    isPublic: z.boolean().default(true)
  }),
  createTeam: z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(1000).optional(),
    sport: z.string().min(2).max(50),
    isPublic: z.boolean().default(true)
  }),
  createPost: z.object({
    content: z.string().min(1).max(5000),
    imageUrl: z.string().url().optional(),
    postType: z.enum(["text", "image", "event", "shared"]).default("text")
  }),
  updateProfile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    profileImageUrl: z.string().url().optional(),
    coverImageUrl: z.string().url().optional()
  }),
  createProduct: z.object({
    name: z.string().min(3).max(200),
    description: z.string().max(5000),
    price: z.number().positive(),
    category: z.string().min(2).max(50),
    stockQuantity: z.number().int().nonnegative(),
    imageUrls: z.array(z.string().url()).max(10).optional()
  })
};

// Sanitize HTML to prevent XSS
export function sanitizeHtml(dirty: string): string {
  // Basic HTML escape - in production use a library like DOMPurify
  return dirty
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Validate and sanitize user input
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return sanitizeHtml(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}
