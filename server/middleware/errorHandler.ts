import { Request, Response, NextFunction } from "express";
import { AppError } from "../core/errors";

export const errorHandler = () =>
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ 
        error: err.code, 
        message: err.message 
      });
    }
    
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      (err as { type?: string }).type === "entity.parse.failed"
    ) {
      return res.status(400).json({
        error: "INVALID_JSON",
        message: "Invalid request body",
      });
    }

    // Handle Zod validation errors
    if (err && typeof err === 'object' && 'issues' in err) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: err
      });
    }
    
    console.error('Unhandled error:', err);
    res.status(500).json({ 
      error: "INTERNAL_SERVER_ERROR", 
      message: "Something went wrong" 
    });
  };