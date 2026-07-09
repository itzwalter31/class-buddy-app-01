import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAttendanceSession, listTodayAttendance, recordAttendance } from '../controllers/attendance.controller.js';

const router = Router();

router.post('/start', authenticateToken, requireRole('ADMIN', 'TEACHER'), createAttendanceSession);
router.post('/recognize', authenticateToken, requireRole('ADMIN', 'TEACHER'), recordAttendance);
router.get('/today', authenticateToken, requireRole('ADMIN', 'TEACHER', 'STUDENT'), listTodayAttendance);

export default router;
