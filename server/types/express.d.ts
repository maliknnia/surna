import "express";

declare global {
  namespace Express {
    /** Passport / Replit OIDC user shape merged with DB user in middleware. */
    interface User {
      id?: string;
      claims?: {
        sub?: string;
        email?: string;
        exp?: number;
      };
      dbUser?: Record<string, unknown>;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

export {};
