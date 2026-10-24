import type { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { Prisma } from '@prisma/client';
import { createStudent, deleteStudent, getStudentById, InvalidStudentClassError, listStudents, updateStudent } from '../modules/students/student.service.js';
import { createStudentSchema, studentQuerySchema, updateStudentSchema } from '../modules/students/student.validation.js';
import { deletePhoto, listPhotos, savePhoto, savePhotos } from '../modules/photos/photo.service.js';
import { errorResponse, successResponse } from '../utils/responses.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

function isClassForeignKeyViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003' &&
    String(error.meta?.field_name ?? '').toLowerCase().includes('classid')
  );
}

export async function listStudentsController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const parsed = studentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid query params', 400, parsed.error.flatten()));
      return;
    }

    const result = await listStudents(parsed.data, req.user.schoolId);
    res.json(successResponse(result, 'Students fetched successfully'));
  } catch (error) {
    console.error('Failed to fetch students', {
      query: req.query,
      error,
    });
    res.status(500).json(errorResponse('Failed to fetch students'));
  }
}

export async function getStudentController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const student = await getStudentById(req.params.id, req.user.schoolId);
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

export async function createStudentController(req: AuthenticatedRequest, res: Response) {
  let submittedClassId: string | null | undefined;

  try {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid student payload', 400, parsed.error.flatten()));
      return;
    }
    submittedClassId = parsed.data.classId;

    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const student = await createStudent(req.user.schoolId, parsed.data);

    res.status(201).json(successResponse(student, 'Student created successfully'));
  } catch (error) {
    if (error instanceof InvalidStudentClassError) {
      res.status(400).json(errorResponse(error.message, 400));
      return;
    }

    if (submittedClassId && isClassForeignKeyViolation(error)) {
      res.status(400).json(errorResponse('Selected class does not exist or does not belong to your school', 400));
      return;
    }

    console.error(error);
    res.status(500).json(errorResponse('Failed to create student'));
  }
}

export async function updateStudentController(req: AuthenticatedRequest, res: Response) {
  let submittedClassId: string | null | undefined;

  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse('Invalid student payload', 400, parsed.error.flatten()));
      return;
    }
    submittedClassId = parsed.data.classId;

    const student = await updateStudent(req.params.id, req.user.schoolId, parsed.data);
    if (!student) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    res.json(successResponse(student, 'Student updated successfully'));
  } catch (error) {
    if (error instanceof InvalidStudentClassError || (submittedClassId && isClassForeignKeyViolation(error))) {
      res.status(400).json(errorResponse(
        error instanceof InvalidStudentClassError
          ? error.message
          : 'Selected class does not exist or does not belong to your school',
        400,
      ));
      return;
    }

    console.error(error);
    res.status(500).json(errorResponse('Failed to update student'));
  }
}

export async function deleteStudentController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const student = await deleteStudent(req.params.id, req.user.schoolId);
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

export async function uploadStudentPhotos(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const files = (req as Request & { files?: Array<{ path: string }> }).files;
    if (!files?.length) {
      res.status(400).json(errorResponse('At least one image is required'));
      return;
    }

    if (files.length < 5 || files.length > 10) {
      res.status(400).json(errorResponse('Between 5 and 10 photos are required'));
      return;
    }

    const student = await getStudentById(req.params.id, req.user.schoolId);
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

    const savedPhotos = await savePhotos(photoInputs, req.user.schoolId);
    res.status(201).json(successResponse(savedPhotos, 'Photos uploaded successfully'));
  } catch (error) {
    console.error('Failed to upload photos', {
      studentId: req.params.id,
      fileCount: ((req as Request & { files?: Array<{ path: string }> }).files)?.length,
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

export async function listStudentPhotos(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const photos = await listPhotos(req.params.id, req.user.schoolId);
    res.json(successResponse(photos, 'Photos fetched successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch photos'));
  }
}

export async function deleteStudentPhoto(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const photo = await deletePhoto(req.params.photoId, req.params.id, req.user.schoolId);
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
