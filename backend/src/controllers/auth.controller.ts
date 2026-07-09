import { Request, Response } from 'express';
import { comparePassword, findUserByEmail, hashPassword, signJwt } from '../services/auth.service.js';
import { query } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/responses.js';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json(errorResponse('Email and password are required'));
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json(errorResponse('Invalid credentials'));
      return;
    }

    const passwordHashRows = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE email = $1', [email]);
    const passwordHash = passwordHashRows[0]?.password_hash;
    if (!passwordHash) {
      res.status(401).json(errorResponse('Invalid credentials'));
      return;
    }

    const valid = await comparePassword(password, passwordHash);
    if (!valid) {
      res.status(401).json(errorResponse('Invalid credentials'));
      return;
    }

    const token = signJwt(user);
    res.json(successResponse({ token, user }, 'Login successful'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Login failed'));
  }
}

export async function registerAdmin(req: Request, res: Response) {
  try {
    const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
    if (!username || !email || !password) {
      res.status(400).json(errorResponse('Username, email, and password are required'));
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json(errorResponse('User already exists'));
      return;
    }

    const passwordHash = await hashPassword(password);
    const rows = await query<{ id: string; username: string; email: string; role: string }>(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, passwordHash, 'ADMIN'],
    );

    const user = rows[0];
    res.status(201).json(successResponse(user, 'Admin user created'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to create admin'));
  }
}
