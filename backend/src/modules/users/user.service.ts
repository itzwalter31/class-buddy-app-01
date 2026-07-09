import { query } from '../../config/database.js';
import { hashPassword } from '../auth/auth.service.js';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await hashPassword(input.password);
  const rows = await query<{ id: string; username: string; email: string; role: string }>(
    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
    [input.username, input.email, passwordHash, input.role],
  );
  return rows[0] ?? null;
}
