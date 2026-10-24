import type { Response } from 'express';
import { errorResponse, successResponse } from '../utils/responses.js';
import {
  AttendanceStudentNotFoundError,
  createAttendanceRecord,
  DuplicateAttendanceError,
  listTodayAttendance as listToday,
  type AttendanceStatus,
} from '../modules/attendance/attendance.service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export function createAttendanceSession(_req: AuthenticatedRequest, res: Response) {
  res.status(501).json(errorResponse('Attendance sessions are not implemented', 501));
}

export function recognizeAttendance(_req: AuthenticatedRequest, res: Response) {
  res.status(501).json(errorResponse('Face recognition is not implemented; use manual attendance recording', 501));
}

export async function recordAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const body = req.body as { studentId?: unknown; status?: unknown };
    const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
    const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId)) {
      res.status(400).json(errorResponse('A valid studentId is required', 400));
      return;
    }
    if (!validStatuses.includes(status as AttendanceStatus)) {
      res.status(400).json(errorResponse('Status must be present, absent, late, or excused', 400));
      return;
    }
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const record = await createAttendanceRecord({
      studentId,
      status: status as AttendanceStatus,
      schoolId: req.user.schoolId,
    });
    res.status(201).json(successResponse(record, 'Attendance recorded manually'));
  } catch (error) {
    if (error instanceof AttendanceStudentNotFoundError) {
      res.status(404).json(errorResponse(error.message, 404));
      return;
    }
    if (error instanceof DuplicateAttendanceError) {
      res.status(409).json(errorResponse(error.message, 409));
      return;
    }
    console.error(error);
    res.status(500).json(errorResponse('Failed to record attendance'));
  }
}

export async function listTodayAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.schoolId) {
      res.status(403).json(errorResponse('Authenticated user is not assigned to a school', 403));
      return;
    }

    const rows = await listToday(req.user.schoolId);
    res.json(successResponse(rows, 'Today attendance fetched'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch attendance'));
  }
}
