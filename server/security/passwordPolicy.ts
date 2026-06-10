// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import bcrypt from "bcrypt";
import { z } from "zod";
import zxcvbn from "zxcvbn";

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords to check
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  preventReuse: 5,
};

export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
  .max(128, "Password must not exceed 128 characters");

export class PasswordPolicyService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly commonPasswords = new Set([
    "password123", "123456789", "qwerty123", "admin123", "welcome123",
    "password1", "123456", "password", "qwerty", "abc123"
  ]);

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static validatePasswordStrength(password: string, policy: PasswordPolicy = defaultPasswordPolicy, userInputs: string[] = []): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
    zxcvbnScore: number;
    crackTime: string;
    feedback: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Use zxcvbn for advanced password analysis
    const zxcvbnResult = zxcvbn(password, userInputs);

    // Length check
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    } else {
      score += Math.min(25, password.length - policy.minLength + 10);
    }

    // Character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    }

    // Common password check (enhanced with zxcvbn)
    if (this.commonPasswords.has(password.toLowerCase()) || zxcvbnResult.score < 2) {
      errors.push("Password is too common and easily guessable");
      score = Math.max(0, score - 30);
    }

    // zxcvbn-based warnings and suggestions
    if (zxcvbnResult.feedback.warning) {
      warnings.push(zxcvbnResult.feedback.warning);
    }

    // Add zxcvbn suggestions as warnings
    if (zxcvbnResult.feedback.suggestions.length > 0) {
      warnings.push(...zxcvbnResult.feedback.suggestions);
    }

    // Adjust score based on zxcvbn analysis
    const zxcvbnBonus = zxcvbnResult.score * 10;
    score += zxcvbnBonus;

    // Complexity bonus
    const charTypes = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ].filter(Boolean).length;

    score += charTypes * 5;

    // Repetition penalty
    const repetitionRatio = this.calculateRepetitionRatio(password);
    score -= repetitionRatio * 20;

    // Personal information penalty (if detected by zxcvbn)
    if (zxcvbnResult.score < 3 && userInputs.length > 0) {
      warnings.push("Avoid using personal information in your password");
    }

    // Final score adjustment based on zxcvbn
    const finalScore = Math.max(0, Math.min(100, score));
    const isStrongEnough = zxcvbnResult.score >= 3 && finalScore >= 60;

    return {
      isValid: errors.length === 0 && isStrongEnough,
      errors: isStrongEnough ? errors : [...errors, "Password is not strong enough"],
      warnings,
      score: finalScore,
      zxcvbnScore: zxcvbnResult.score,
      crackTime: zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second,
      feedback: [
        ...(zxcvbnResult.feedback.warning ? [zxcvbnResult.feedback.warning] : []),
        ...zxcvbnResult.feedback.suggestions
      ]
    };
  }

  private static calculateRepetitionRatio(password: string): number {
    const chars = password.split('');
    const charCounts = chars.reduce((acc, char) => {
      acc[char] = (acc[char] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxRepeats = Math.max(...Object.values(charCounts));
    return maxRepeats / password.length;
  }

  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*(),.?":{}|<>';
    
    const allChars = uppercase + lowercase + numbers + special;
    const mandatoryChars = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      special[Math.floor(Math.random() * special.length)]
    ];

    const remainingChars = Array.from({ length: length - 4 }, () =>
      allChars[Math.floor(Math.random() * allChars.length)]
    );

    const password = [...mandatoryChars, ...remainingChars]
      .sort(() => Math.random() - 0.5)
      .join('');

    return password;
  }
}