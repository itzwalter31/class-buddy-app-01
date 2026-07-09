import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/responses.js';
import { createAttendanceRecord, listTodayAttendance as listToday } from '../modules/attendance/attendance.service.js';

export async function createAttendanceSession(req: Request, res: Response) {
  try {
    const session = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10) };
    res.status(201).json(successResponse(session, 'Attendance session created'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to create attendance session'));
  }
}

export async function recordAttendance(req: Request, res: Response) {
  try {
    const { studentId, status, confidenceScore, capturedImage } = req.body as { studentId?: string; status?: string; confidenceScore?: number; capturedImage?: string };
    if (!studentId || !status) {
      res.status(400).json(errorResponse('studentId and status are required'));
      return;
    }

    const record = await createAttendanceRecord({ studentId, status, confidenceScore, capturedImage });
    res.status(201).json(successResponse(record, 'Attendance recorded'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to record attendance'));
  }
}

export async function listTodayAttendance(_req: Request, res: Response) {
  try {
    const rows = await listToday();
    res.json(successResponse(rows, 'Today attendance fetched'));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorResponse('Failed to fetch attendance'));
  }
}
