import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  createAttendanceSession,
  listTodayAttendance,
  recognizeAttendance,
  recordAttendance,
} from '../controllers/attendance.controller.js';

const router = Router();

router.post('/start', authenticateToken, requireRole('ADMIN'), createAttendanceSession);
router.post('/recognize', authenticateToken, requireRole('ADMIN'), recognizeAttendance);
router.post('/record', authenticateToken, requireRole('ADMIN'), recordAttendance);
router.get('/today', authenticateToken, requireRole('ADMIN'), listTodayAttendance);

export default router;
