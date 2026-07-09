import { query } from '../../config/database.js';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  time: string;
  status: string;
  captured_image: string | null;
  confidence_score: number | null;
  created_at: string;
}

export async function createAttendanceRecord(input: { studentId: string; status: string; confidenceScore?: number | null; capturedImage?: string | null }) {
  const rows = await query<AttendanceRecord>(
    'INSERT INTO attendance (student_id, date, time, status, confidence_score, captured_image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [input.studentId, new Date().toISOString().slice(0, 10), new Date().toTimeString().slice(0, 8), input.status, input.confidenceScore ?? null, input.capturedImage ?? null],
  );
  return rows[0] ?? null;
}

export async function listTodayAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  return query<AttendanceRecord>('SELECT * FROM attendance WHERE date = $1 ORDER BY time DESC', [today]);
}
