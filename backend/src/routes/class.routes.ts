import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { assignStudentToClassController, createClassController, deleteClassController, listClassesController, updateClassController } from '../controllers/class.controller.js';

const router = Router();

router.get('/', authenticateToken, requireRole('ADMIN', 'TEACHER', 'STUDENT'), listClassesController);
router.post('/', authenticateToken, requireRole('ADMIN'), createClassController);
router.put('/:id', authenticateToken, requireRole('ADMIN'), updateClassController);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteClassController);
router.post('/:id/assign', authenticateToken, requireRole('ADMIN'), assignStudentToClassController);

export default router;
