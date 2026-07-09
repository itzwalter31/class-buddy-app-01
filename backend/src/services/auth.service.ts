import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

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
  return jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' });
}

export async function findUserByEmail(email: string) {
  const rows = await query<AuthUser>(
    'SELECT id, username, email, role FROM users WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await query<AuthUser>(
    'SELECT id, username, email, role FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}
