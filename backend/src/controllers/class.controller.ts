import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/responses.js';
import { assignStudentToClass, createClass, deleteClass, listClasses, updateClass } from '../modules/classes/class.service.js';

export async function listClassesController(_req: Request, res: Response) {
  try {
    const rows = await listClasses();
    res.json(successResponse(rows, 'Classes fetched successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch classes'));
  }
}

export async function createClassController(req: Request, res: Response) {
  try {
    const { className, classTeacher } = req.body as { className?: string; classTeacher?: string };
    if (!className) {
      res.status(400).json(errorResponse('Class name is required'));
      return;
    }

    const created = await createClass({ className, classTeacher });
    res.status(201).json(successResponse(created, 'Class created successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to create class'));
  }
}

export async function updateClassController(req: Request, res: Response) {
  try {
    const { className, classTeacher } = req.body as { className?: string; classTeacher?: string };
    const updated = await updateClass(req.params.id, { className, classTeacher });
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

export async function deleteClassController(req: Request, res: Response) {
  try {
    const deleted = await deleteClass(req.params.id);
    if (!deleted) {
      res.status(404).json(errorResponse('Class not found', 404));
      return;
    }

    res.json(successResponse(null, 'Class deleted successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to delete class'));
  }
}

export async function assignStudentToClassController(req: Request, res: Response) {
  try {
    const { studentId } = req.body as { studentId?: string };
    if (!studentId) {
      res.status(400).json(errorResponse('Student id is required'));
      return;
    }

    const assigned = await assignStudentToClass(req.params.id, studentId);
    if (!assigned) {
      res.status(404).json(errorResponse('Student not found', 404));
      return;
    }

    res.json(successResponse(assigned, 'Student assigned to class successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to assign student to class'));
  }
}
