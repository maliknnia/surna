// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: Field-Level Data Encryption
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
}

interface DecryptionData {
  encrypted: string;
  iv: string;
  tag: string;
}

class DataEncryption {
  private static instance: DataEncryption;
  private masterKey: Buffer;
  private keyDerivationSalt: Buffer;

  private constructor() {
    this.initializeKeys();
  }

  public static getInstance(): DataEncryption {
    if (!DataEncryption.instance) {
      DataEncryption.instance = new DataEncryption();
    }
    return DataEncryption.instance;
  }

  private initializeKeys(): void {
    // In production, these should come from secure environment variables or key management service
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;
    const saltHex = process.env.ENCRYPTION_SALT;

    if (!masterKeyHex || !saltHex) {
      console.warn('⚠️  Encryption keys not found in environment. Generating temporary keys...');
      this.masterKey = crypto.randomBytes(KEY_LENGTH);
      this.keyDerivationSalt = crypto.randomBytes(16);
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
      this.keyDerivationSalt = Buffer.from(saltHex, 'hex');
    }
  }

  private deriveKey(purpose: string): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, Buffer.concat([this.keyDerivationSalt, Buffer.from(purpose)]), 100000, KEY_LENGTH, 'sha256');
  }

  public encryptPII(data: string, purpose: 'email' | 'phone' | 'ssn' | 'payment' = 'email'): EncryptionResult {
    if (!data || data.trim() === '') {
      throw new Error('Data to encrypt cannot be empty');
    }

    const key = this.deriveKey(`pii_${purpose}`);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  public decryptPII(encryptionData: DecryptionData, purpose: 'email' | 'phone' | 'ssn' | 'payment' = 'email'): string {
    if (!encryptionData.encrypted || !encryptionData.iv || !encryptionData.tag) {
      throw new Error('Invalid encryption data provided');
    }

    const key = this.deriveKey(`pii_${purpose}`);
    const iv = Buffer.from(encryptionData.iv, 'hex');
    const tag = Buffer.from(encryptionData.tag, 'hex');
    
    const decipher = crypto.createDecipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptionData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  public encryptSensitiveData(data: any): EncryptionResult {
    const jsonData = JSON.stringify(data);
    return this.encryptPII(jsonData, 'payment');
  }

  public decryptSensitiveData(encryptionData: DecryptionData): any {
    const decryptedJson = this.decryptPII(encryptionData, 'payment');
    return JSON.parse(decryptedJson);
  }

  public hashSensitiveData(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha256').toString('hex');
    return `${actualSalt}:${hash}`;
  }

  public verifySensitiveData(data: string, hashedData: string): boolean {
    const [salt, originalHash] = hashedData.split(':');
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256').toString('hex');
    return hash === originalHash;
  }

  // Generate secure tokens for session management
  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Create HMAC for data integrity verification
  public createHMAC(data: string, purpose: string = 'general'): string {
    const key = this.deriveKey(`hmac_${purpose}`);
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  public verifyHMAC(data: string, signature: string, purpose: string = 'general'): boolean {
    const expectedSignature = this.createHMAC(data, purpose);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }
}

export { DataEncryption };
export const dataEncryption = DataEncryption.getInstance();

// Helper functions for common encryption scenarios
export function encryptEmail(email: string): EncryptionResult {
  return dataEncryption.encryptPII(email, 'email');
}

export function decryptEmail(encryptionData: DecryptionData): string {
  return dataEncryption.decryptPII(encryptionData, 'email');
}

export function encryptPhoneNumber(phone: string): EncryptionResult {
  return dataEncryption.encryptPII(phone, 'phone');
}

export function decryptPhoneNumber(encryptionData: DecryptionData): string {
  return dataEncryption.decryptPII(encryptionData, 'phone');
}

export function encryptPaymentData(paymentInfo: any): EncryptionResult {
  return dataEncryption.encryptSensitiveData(paymentInfo);
}

export function decryptPaymentData(encryptionData: DecryptionData): any {
  return dataEncryption.decryptSensitiveData(encryptionData);
}

export function hashPassword(password: string): string {
  return dataEncryption.hashSensitiveData(password);
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return dataEncryption.verifySensitiveData(password, hashedPassword);
}

export function generateSessionToken(): string {
  return dataEncryption.generateSecureToken(64);
}

export function generateAPIKey(): string {
  return dataEncryption.generateSecureToken(48);
}

export function createDataIntegritySignature(data: any): string {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return dataEncryption.createHMAC(dataString, 'integrity');
}

export function verifyDataIntegrity(data: any, signature: string): boolean {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return dataEncryption.verifyHMAC(dataString, signature, 'integrity');
}

// Secure random number generation for security purposes
export function generateSecureRandomNumber(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValidValue = Math.floor(256 ** bytesNeeded / range) * range - 1;
  
  let randomValue;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = randomBytes.readUIntBE(0, bytesNeeded);
  } while (randomValue > maxValidValue);
  
  return min + (randomValue % range);
}

// Secure password generation with encryption
export function generateSecurePassword(options: {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
} = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true
  } = options;

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = '';
  if (includeUppercase) charset += uppercase;
  if (includeLowercase) charset += lowercase;
  if (includeNumbers) charset += numbers;
  if (includeSymbols) charset += symbols;

  if (charset === '') {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = generateSecureRandomNumber(0, charset.length - 1);
    password += charset[randomIndex];
  }

  return password;
}

// Data masking for logs and display purposes
export function maskSensitiveData(data: string, type: 'email' | 'phone' | 'card' | 'ssn' = 'email'): string {
  if (!data) return '';

  switch (type) {
    case 'email':
      const [username, domain] = data.split('@');
      if (!domain) return data;
      const maskedUsername = username.length > 2 
        ? username.slice(0, 2) + '*'.repeat(username.length - 2)
        : '*'.repeat(username.length);
      return `${maskedUsername}@${domain}`;

    case 'phone':
      const digits = data.replace(/\D/g, '');
      if (digits.length < 4) return '*'.repeat(digits.length);
      return '*'.repeat(digits.length - 4) + digits.slice(-4);

    case 'card':
      const cardDigits = data.replace(/\D/g, '');
      if (cardDigits.length < 4) return '*'.repeat(cardDigits.length);
      return '*'.repeat(cardDigits.length - 4) + cardDigits.slice(-4);

    case 'ssn':
      const ssnDigits = data.replace(/\D/g, '');
      if (ssnDigits.length !== 9) return data;
      return `***-**-${ssnDigits.slice(-4)}`;

    default:
      return data;
  }
}