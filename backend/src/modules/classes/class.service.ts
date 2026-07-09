import { query } from '../../config/database.js';

export interface ClassCreateInput {
  className: string;
  classTeacher?: string | null;
}

export interface ClassRecord {
  id: string;
  class_name: string;
  class_teacher: string | null;
  created_at: string;
}

export async function listClasses() {
  return query<ClassRecord>('SELECT * FROM classes ORDER BY created_at DESC');
}

export async function createClass(input: ClassCreateInput) {
  const rows = await query<ClassRecord>(
    'INSERT INTO classes (class_name, class_teacher) VALUES ($1, $2) RETURNING *',
    [input.className, input.classTeacher ?? null],
  );
  return rows[0] ?? null;
}

export async function updateClass(id: string, input: Partial<ClassCreateInput>) {
  const rows = await query<ClassRecord>(
    'UPDATE classes SET class_name = COALESCE($1, class_name), class_teacher = COALESCE($2, class_teacher) WHERE id = $3 RETURNING *',
    [input.className ?? null, input.classTeacher ?? null, id],
  );
  return rows[0] ?? null;
}

export async function deleteClass(id: string) {
  const rows = await query<ClassRecord>('DELETE FROM classes WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}

export async function assignStudentToClass(classId: string, studentId: string) {
  const rows = await query<{ id: string }>('UPDATE students SET class_id = $1 WHERE id = $2 RETURNING id', [classId, studentId]);
  return rows[0] ?? null;
}
