export class AppError extends Error {
  status: number;
  code: string;
  
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'AppError';
  }
}

export const BadRequest = (message = "Bad Request") => new AppError(400, "BAD_REQUEST", message);
export const Unauthorized = (message = "Unauthorized") => new AppError(401, "UNAUTHORIZED", message);
export const Forbidden = (message = "Forbidden") => new AppError(403, "FORBIDDEN", message);
export const NotFound = (message = "Not Found") => new AppError(404, "NOT_FOUND", message);
export const Conflict = (message = "Conflict") => new AppError(409, "CONFLICT", message);
export const InternalServerError = (message = "Internal Server Error") => new AppError(500, "INTERNAL_SERVER_ERROR", message);
