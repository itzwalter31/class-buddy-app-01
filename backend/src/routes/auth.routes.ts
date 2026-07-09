import { Router } from 'express';
import { login, registerAdmin } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/register-admin', registerAdmin);

export default router;
