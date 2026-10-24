import { Router } from 'express';
import { getCurrentUser, login, registerAdmin } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register-admin', registerAdmin);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
