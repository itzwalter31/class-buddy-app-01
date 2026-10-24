import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query } from '../../config/database.js';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signJwt(user: AuthUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d';
  return jwt.sign(user, secret, { expiresIn });
}

export async function findUserByEmail(email: string) {
  const rows = await query<AuthUser>('SELECT id, username, email, role FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}
