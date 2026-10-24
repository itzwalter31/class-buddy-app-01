import type { Response } from 'express';
import { errorResponse, successResponse } from '../utils/responses.js';
import {
  ClassHasStudentsError,
  assignStudentToClass,
  createClass,
  deleteClass,
  listClasses,
  updateClass,
} from '../modules/classes/class.service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function listClassesController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const rows = await listClasses(req.user.schoolId);
    res.json(successResponse(rows, 'Classes fetched successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch classes'));
  }
}

export async function createClassController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const { className } = req.body as { className?: string };

    if (typeof className !== 'string' || !className.trim()) {
      res.status(400).json(errorResponse('Class name is required'));
      return;
    }

    const created = await createClass(req.user.schoolId, {
      className: className.trim(),
    });

    res.status(201).json(successResponse(created, 'Class created successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to create class'));
  }
}

export async function updateClassController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const { className } = req.body as { className?: string };

    if (className !== undefined && (typeof className !== 'string' || !className.trim())) {
      res.status(400).json(errorResponse('Class name cannot be empty'));
      return;
    }

    const updated = await updateClass(req.params.id, req.user.schoolId, {
      ...(className !== undefined ? { className: className.trim() } : {}),
    });

    if (!updated) {
      res.status(404).json(errorResponse('Class not found', 404));
      return;
    }

    res.json(successResponse(updated, 'Class updated successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to update class'));
  }
}

export async function deleteClassController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const deleted = await deleteClass(req.params.id, req.user.schoolId);

    if (!deleted) {
      res.status(404).json(errorResponse('Class not found', 404));
      return;
    }

    res.json(successResponse(null, 'Class deleted successfully'));
  } catch (error) {
    if (error instanceof ClassHasStudentsError) {
      res.status(409).json(errorResponse(error.message, 409));
      return;
    }
    console.error(error);
    res.status(500).json(errorResponse('Failed to delete class'));
  }
}

export async function assignStudentToClassController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const { studentId } = req.body as { studentId?: string };

    if (typeof studentId !== 'string' || !studentId.trim()) {
      res.status(400).json(errorResponse('Student id is required'));
      return;
    }

    const assigned = await assignStudentToClass(
      req.params.id,
      studentId.trim(),
      req.user.schoolId,
    );

    if (!assigned) {
      res.status(404).json(errorResponse('Student or class not found', 404));
      return;
    }

    res.json(successResponse(assigned, 'Student assigned to class successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to assign student to class'));
  }
}