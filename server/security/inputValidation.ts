// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import validator from "validator";

export class InputValidationService {
  // Common validation schemas
  static readonly emailSchema = z.string()
    .email("Invalid email format")
    .max(254, "Email too long")
    .refine((email) => validator.isEmail(email), "Invalid email format");

  static readonly usernameSchema = z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .refine((username) => !validator.contains(username, ' '), "Username cannot contain spaces");

  static readonly phoneSchema = z.string()
    .refine((phone) => validator.isMobilePhone(phone, 'any'), "Invalid phone number format");

  static readonly urlSchema = z.string()
    .refine((url) => validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    }), "Invalid URL format");

  static readonly dateSchema = z.string()
    .refine((date) => validator.isISO8601(date), "Invalid date format");

  // Sanitization methods
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href'],
      ALLOWED_URI_REGEXP: /^https?:\/\//
    });
  }

  static sanitizeText(input: string): string {
    return validator.escape(input.trim());
  }

  static sanitizeFilename(filename: string): string {
    // Remove dangerous characters and path traversal attempts
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .substring(0, 255);
  }

  // SQL Injection prevention
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(union.*select|select.*union)/gi,
      /(\b(or|and)\s+\w+\s*=\s*\w+)/gi,
      /([\'\"];?\s*(or|and)\s+[\'\"]?\w+[\'\"]?\s*=\s*[\'\"]?\w+)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(0x[0-9a-f]+)/gi,
      /(\bhex\()/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // XSS prevention
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src\s*=\s*["']javascript:/gi,
      /<svg[^>]*on\w+/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Command injection prevention
  static detectCommandInjection(input: string): boolean {
    const commandPatterns = [
      /[;&|`$(){}[\]\\]/g,
      /\b(cat|ls|ps|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/gi,
      /\.\.\//g,
      /~\//g
    ];

    return commandPatterns.some(pattern => pattern.test(input));
  }

  // Path traversal prevention
  static detectPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\]/g,
      /%2e%2e%2f/gi,
      /%2e%2e\//gi,
      /\.\.%2f/gi,
      /%2e%2e%5c/gi
    ];

    return pathPatterns.some(pattern => pattern.test(input));
  }

  // Comprehensive input validation
  static validateAndSanitize(input: any, schema: z.ZodSchema): {
    isValid: boolean;
    data?: any;
    errors?: string[];
    securityFlags?: string[];
  } {
    const securityFlags: string[] = [];

    // Type check
    if (typeof input === 'string') {
      // Security checks
      if (this.detectSQLInjection(input)) {
        securityFlags.push('Potential SQL injection detected');
      }
      if (this.detectXSS(input)) {
        securityFlags.push('Potential XSS attack detected');
      }
      if (this.detectCommandInjection(input)) {
        securityFlags.push('Potential command injection detected');
      }
      if (this.detectPathTraversal(input)) {
        securityFlags.push('Potential path traversal detected');
      }

      // If security issues found, reject immediately
      if (securityFlags.length > 0) {
        return {
          isValid: false,
          errors: ['Input contains potentially malicious content'],
          securityFlags
        };
      }
    }

    // Schema validation
    const result = schema.safeParse(input);
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors.map(err => err.message),
        securityFlags
      };
    }

    return {
      isValid: true,
      data: result.data,
      securityFlags
    };
  }

  // File upload validation
  static validateFileUpload(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
  }, options: {
    allowedTypes: string[];
    maxSize: number;
    scanContent?: boolean;
  }): {
    isValid: boolean;
    errors?: string[];
    sanitizedFilename?: string;
  } {
    const errors: string[] = [];

    // File type validation
    if (!options.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // File size validation
    if (file.size > options.maxSize) {
      errors.push(`File size exceeds limit of ${options.maxSize} bytes`);
    }

    // Filename validation
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    if (!sanitizedFilename) {
      errors.push('Invalid filename');
    }

    // Content scanning
    if (options.scanContent && file.buffer) {
      const content = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length));
      if (this.detectXSS(content) || this.detectSQLInjection(content)) {
        errors.push('File content contains potentially malicious code');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedFilename
    };
  }

  // Rate limiting validation
  static validateRateLimit(identifier: string, limit: number, window: number): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: Date;
  } {
    // This would integrate with your rate limiting system
    // For now, returning a mock implementation
    return {
      allowed: true,
      remainingRequests: limit - 1,
      resetTime: new Date(Date.now() + window)
    };
  }

  // Custom validation for sports-specific fields
  static readonly sportSchema = z.enum([
    'soccer', 'basketball', 'tennis', 'running', 'swimming', 
    'cycling', 'volleyball', 'baseball', 'golf', 'boxing',
    'wrestling', 'athletics', 'gymnastics', 'hockey', 'rugby'
  ]);

  static readonly skillLevelSchema = z.enum([
    'beginner', 'intermediate', 'advanced', 'professional'
  ]);

  static readonly postContentSchema = z.string()
    .min(1, "Post content cannot be empty")
    .max(2000, "Post content must not exceed 2000 characters")
    .refine((content) => {
      const cleaned = content.trim();
      return cleaned.length > 0 && !this.detectXSS(cleaned) && !this.detectSQLInjection(cleaned);
    }, "Post content contains invalid or potentially harmful content");

  // Geolocation validation
  static readonly coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  });

  // Age validation (for compliance)
  static validateAge(birthDate: string, minimumAge: number = 13): {
    isValid: boolean;
    age?: number;
    requiresParentalConsent?: boolean;
  } {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
      ? age - 1 
      : age;

    return {
      isValid: actualAge >= minimumAge,
      age: actualAge,
      requiresParentalConsent: actualAge < 18
    };
  }
}