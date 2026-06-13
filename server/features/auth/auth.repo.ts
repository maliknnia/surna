import { db } from "../../db";
import { sql } from "drizzle-orm";
import type { AuthUser } from "./auth.types";

export async function findUserByUsername(username: string): Promise<any | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        id, 
        username, 
        email, 
        password_hash AS "passwordHash",
        profile_image_url AS "profileImageUrl",
        created_at AS "createdAt"
      FROM users 
      WHERE username = ${username} 
      LIMIT 1
    `);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<any | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        id, 
        username, 
        email, 
        password_hash AS "passwordHash",
        profile_image_url AS "profileImageUrl",
        created_at AS "createdAt"
      FROM users 
      WHERE email = ${email} 
      LIMIT 1
    `);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

export async function createUser(
  username: string, 
  email: string | null, 
  passwordHash: string,
  extras?: { firstName?: string; lastName?: string },
): Promise<any> {
  try {
    // Generate a unique ID for JWT users (prefix with 'jwt-' + timestamp + random)
    const jwtUserId = `jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await db.execute(sql`
      INSERT INTO users (id, username, email, password_hash, email_verified, first_name, last_name)
      VALUES (${jwtUserId}, ${username}, ${email}, ${passwordHash}, false, ${extras?.firstName ?? null}, ${extras?.lastName ?? null})
      RETURNING 
        id, 
        username, 
        email,
        first_name AS "firstName",
        last_name AS "lastName",
        email_verified AS "emailVerified",
        profile_image_url AS "profileImageUrl",
        created_at AS "createdAt"
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
