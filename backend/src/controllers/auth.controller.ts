import { Request, Response } from 'express';
import { comparePassword, findUserByEmail, signJwt } from '../services/auth.service.js';
import { query } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    res.status(401).json(errorResponse('Authentication required', 401));
    return;
  }

  res.json(successResponse({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    schoolId: req.user.schoolId,
  }, 'Authenticated user fetched successfully'));
}

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

export async function registerAdmin(_req: Request, res: Response) {
  res.status(403).json(errorResponse('Admin accounts must be provisioned by an authorized school administrator', 403));
}
