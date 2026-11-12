import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "tokoana-super-secret-jwt-key-2026-secure-session-hash";
const key = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = "tokoana_session";

export interface SessionPayload {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Hash a plain text password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain text password against a bcrypt hash (compatible with Laravel bcrypt hashes)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Replace Laravel's $2y$ prefix with $2a$ if needed for bcryptjs compatibility
  const normalizedHash = hash.replace(/^\$2y\$/, "$2a$");
  return bcrypt.compare(password, normalizedHash);
}

/**
 * Create a signed JWT session token
 */
export async function signSessionToken(payload: SessionPayload, remember = false): Promise<string> {
  const expiresIn = remember ? "30d" : "1d";
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * Verify a session token and return the payload
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return {
      id: Number(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

/**
 * Get current session user in Server Components / Server Actions / Route Handlers
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authenticated user, optionally checking role
 */
export async function requireUser(allowedRoles?: string[]): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
