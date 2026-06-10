import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../core/env";
import { isProduction, resolveJwtSecret } from "../lib/productionSecurity";

export interface JWTUser {
  id: string;
  username: string;
}

// Extend Express Request type to include JWT user data
declare module 'express-serve-static-core' {
  interface Request {
    jwtUser?: JWTUser;
  }
}

function getJwtSecret(): string {
  return env.JWT_SECRET || process.env.JWT_SECRET || resolveJwtSecret();
}

export function authMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    
    // If no Authorization header, continue without setting user (public route)
    if (!header?.startsWith("Bearer ")) {
      return next();
    }
    
    try {
      const token = header.slice(7); // Remove "Bearer " prefix
      const payload = jwt.verify(token, getJwtSecret()) as any;
      
      // Set JWT user on request object
      req.jwtUser = {
        id: payload.sub,
        username: payload.username
      };
    } catch (error) {
      // Invalid token - continue without setting user
      // Protected routes will check for req.user existence
    }
    
    next();
  };
}

// Helper middleware to require JWT authentication
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.jwtUser) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }
    next();
  };
}