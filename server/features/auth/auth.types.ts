export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  profileImageUrl?: string;
  createdAt: string; // ISO string
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  requiresEmailVerification?: boolean;
  devVerificationCode?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}
