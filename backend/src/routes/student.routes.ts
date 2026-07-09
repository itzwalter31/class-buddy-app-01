import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  createStudentController,
  deleteStudentController,
  getStudentController,
  listStudentPhotos,
  listStudentsController,
  deleteStudentPhoto,
  updateStudentController,
  uploadStudentPhotos,
} from '../controllers/student.controller.js';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR ?? './uploads/students';
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_IMAGE_SIZE_MB ?? 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_IMAGE_TYPES ?? 'image/jpeg,image/png,image/jpg').split(',');
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG/PNG images are allowed'));
  },
});

router.get('/', authenticateToken, requireRole('ADMIN', 'TEACHER', 'STUDENT'), listStudentsController);
router.get('/:id', authenticateToken, requireRole('ADMIN', 'TEACHER', 'STUDENT'), getStudentController);
router.post('/', authenticateToken, requireRole('ADMIN'), createStudentController);
router.put('/:id', authenticateToken, requireRole('ADMIN'), updateStudentController);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteStudentController);
router.post('/:id/photos', authenticateToken, requireRole('ADMIN'), upload.array('photos', 10), uploadStudentPhotos);
router.get('/:id/photos', authenticateToken, requireRole('ADMIN', 'TEACHER', 'STUDENT'), listStudentPhotos);
router.delete('/:id/photos/:photoId', authenticateToken, requireRole('ADMIN'), deleteStudentPhoto);

export default router;
