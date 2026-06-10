// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: Password Security & Validation
import bcrypt from 'bcrypt';
import validator from 'validator';

const SALT_ROUNDS = 12;

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxLength: number;
  preventCommonPasswords: boolean;
}

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventCommonPasswords: true,
};

// Common passwords to block
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'iloveyou', 'princess', 'rockyou', '123123', '654321', 'superman',
  'qwertyuiop', 'michael', 'computer', 'password!', 'login', 'player',
  'sunshine', 'football', 'chargers', 'whatever', 'dragon', 'basketball'
]);

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export function validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length validation
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  } else {
    score += Math.min(25, (password.length / policy.minLength) * 10);
  }

  if (password.length > policy.maxLength) {
    errors.push(`Password must not exceed ${policy.maxLength} characters`);
  }

  // Character requirements
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 20;
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    score += 15;
  }

  // Common password check
  if (policy.preventCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password');
    score = Math.min(score, 20);
  }

  // Additional security checks
  if (password.toLowerCase().includes('surna') || password.toLowerCase().includes('sport')) {
    errors.push('Password should not contain the application name or obvious sport terms');
    score = Math.min(score, 30);
  }

  // Repeated characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
    score = Math.min(score, 40);
  }

  // Sequential characters check
  const sequential = ['123', 'abc', 'qwe', 'asd', 'zxc'];
  if (sequential.some(seq => password.toLowerCase().includes(seq))) {
    errors.push('Password should not contain sequential characters');
    score = Math.min(score, 50);
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score >= 80) strength = 'very-strong';
  else if (score >= 60) strength = 'strong';
  else if (score >= 40) strength = 'medium';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + specialChars;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export interface PasswordHistory {
  userId: string;
  passwordHash: string;
  createdAt: Date;
}

// Check if password was used recently (prevent reuse of last 5 passwords)
export async function isPasswordReused(userId: string, newPassword: string, passwordHistory: PasswordHistory[]): Promise<boolean> {
  const recentPasswords = passwordHistory
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  for (const record of recentPasswords) {
    if (await verifyPassword(newPassword, record.passwordHash)) {
      return true;
    }
  }
  
  return false;
}

export function sanitizeInput(input: string): string {
  return validator.escape(input.trim());
}

export function validateEmail(email: string): boolean {
  return validator.isEmail(email) && email.length <= 255;
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 30) {
    return { isValid: false, error: 'Username must not exceed 30 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  const bannedUsernames = ['admin', 'root', 'administrator', 'mod', 'moderator', 'support', 'help', 'surna'];
  if (bannedUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'Username is not available' };
  }
  
  return { isValid: true };
}