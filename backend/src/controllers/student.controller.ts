import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { Prisma } from '@prisma/client';
import { createStudent, deleteStudent, getStudentById, listStudents, updateStudent } from '../modules/students/student.service.js';
import { createStudentSchema, studentQuerySchema, updateStudentSchema } from '../modules/students/student.validation.js';
import { deletePhoto, listPhotos, savePhoto, savePhotos } from '../modules/photos/photo.service.js';
import { errorResponse, successResponse } from '../utils/responses.js';

export async function listStudentsController(req: Request, res: Response) {
  try {
    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid query params', 400, parsed.error.flatten()));
      return;
    }

    const result = await listStudents(parsed.data);
    res.json(successResponse(result, 'Students fetched successfully'));
  } catch (error) {
    console.error('Failed to fetch students', {
      query: req.query,
      error,
    });
    res.status(500).json(errorResponse('Failed to fetch students'));
  }
}

export async function getStudentController(req: Request, res: Response) {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    res.json(successResponse(student, 'Student fetched successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch student'));
  }
}

export async function createStudentController(req: Request, res: Response) {
  try {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid student payload', 400, parsed.error.flatten()));
      return;
    }

    const student = await createStudent(parsed.data);
    res.status(201).json(successResponse(student, 'Student created successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to create student'));
  }
}

export async function updateStudentController(req: Request, res: Response) {
  try {
    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid student payload', 400, parsed.error.flatten()));
      return;
    }

    const student = await updateStudent(req.params.id, parsed.data);
    if (!student) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    res.json(successResponse(student, 'Student updated successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to update student'));
  }
}

export async function deleteStudentController(req: Request, res: Response) {
  try {
    const student = await deleteStudent(req.params.id);
    if (!student) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    res.json(successResponse(null, 'Student deleted successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to delete student'));
  }
}

export async function uploadStudentPhotos(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      res.status(400).json(errorResponse('At least one image is required'));
      return;
    }

    if (files.length < 5 || files.length > 10) {
      res.status(400).json(errorResponse('Between 5 and 10 photos are required'));
      return;
    }

    const student = await getStudentById(req.params.id);
    if (!student) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    const photoInputs = files.map((file, index) => ({
      studentId: req.params.id,
      imageUrl: path.posix.join('uploads', 'students', path.basename(file.path)),
      embeddingStatus: 'PENDING' as const,
      embeddingVector: null,
      isPrimary: index === 0,
    }));

    const savedPhotos = await savePhotos(photoInputs);
    res.status(201).json(successResponse(savedPhotos, 'Photos uploaded successfully'));
  } catch (error) {
    console.error('Failed to upload photos', {
      studentId: req.params.id,
      fileCount: (req.files as Express.Multer.File[] | undefined)?.length,
      error,
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json(errorResponse('Database error while uploading photos', 500, { code: error.code }));
      return;
    }

    if (error instanceof Error) {
      res.status(500).json(errorResponse(error.message || 'Failed to upload photos'));
      return;
    }

    res.status(500).json(errorResponse('Failed to upload photos'));
  }
}

export async function listStudentPhotos(req: Request, res: Response) {
  try {
    const photos = await listPhotos(req.params.id);
    res.json(successResponse(photos, 'Photos fetched successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch photos'));
  }
}

export async function deleteStudentPhoto(req: Request, res: Response) {
  try {
    const photo = await deletePhoto(req.params.photoId, req.params.id);
    if (!photo) {
      res.status(404).json(errorResponse('Photo not found', 404));
      return;
    }

    const filePath = path.join(process.cwd(), photo.imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json(successResponse(null, 'Photo deleted successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to delete photo'));
  }
}
