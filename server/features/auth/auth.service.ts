import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../core/env";
import { resolveJwtSecret } from "../../lib/productionSecurity";
import { BadRequest, Unauthorized, Conflict } from "../../core/errors";
import { findUserByUsername, findUserByEmail, createUser } from "./auth.repo";
import type { AuthUser, AuthResponse } from "./auth.types";
import { issueEmailVerificationCode } from "./emailVerification.service";

const getJwtSecret = () => env.JWT_SECRET || process.env.JWT_SECRET || resolveJwtSecret();

export async function login(username: string, password: string): Promise<AuthResponse> {
  const userRow = await findUserByUsername(username);
  
  if (!userRow?.passwordHash) {
    throw Unauthorized("Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, userRow.passwordHash);
  if (!isPasswordValid) {
    throw Unauthorized("Invalid credentials");
  }

  const user: AuthUser = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    profileImageUrl: userRow.profileImageUrl,
    createdAt: userRow.createdAt
  };

  const token = jwt.sign(
    { 
      sub: user.id, 
      username: user.username 
    }, 
    getJwtSecret(), 
    { expiresIn: "7d" }
  );

  return { user, token };
}

export async function register(
  username: string, 
  email: string, 
  password: string
): Promise<AuthResponse> {
  // Check if username already exists
  const existingUserByUsername = await findUserByUsername(username);
  if (existingUserByUsername) {
    throw Conflict("Username already exists");
  }

  const existingUserByEmail = await findUserByEmail(email);
  if (existingUserByEmail) {
    throw Conflict("Email already exists");
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userRow = await createUser(username, email, passwordHash);

  const verification = await issueEmailVerificationCode(userRow.id);

  const user: AuthUser = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    emailVerified: false,
    profileImageUrl: userRow.profileImageUrl,
    createdAt: userRow.createdAt
  };

  const token = jwt.sign(
    { 
      sub: user.id, 
      username: user.username 
    }, 
    getJwtSecret(), 
    { expiresIn: "7d" }
  );

  return {
    user,
    token,
    requiresEmailVerification: true,
    devVerificationCode: verification.devCode,
  };
}
