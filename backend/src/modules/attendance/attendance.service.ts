import { Prisma, type Attendance } from '@prisma/client';
import prisma from '../../config/prisma.js';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export class AttendanceStudentNotFoundError extends Error {
  constructor() {
    super('Student not found in your school');
    this.name = 'AttendanceStudentNotFoundError';
  }
}

export class DuplicateAttendanceError extends Error {
  constructor() {
    super('Attendance has already been recorded for this student today');
    this.name = 'DuplicateAttendanceError';
  }
}

function utcDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function createAttendanceRecord(input: {
  studentId: string;
  schoolId: string;
  status: AttendanceStatus;
}): Promise<Attendance> {
  const now = new Date();
  const { start, end } = utcDayRange(now);

  try {
    return await prisma.$transaction(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: input.studentId, schoolId: input.schoolId },
        select: { id: true },
      });
      if (!student) throw new AttendanceStudentNotFoundError();

      const existing = await tx.attendance.findFirst({
        where: {
          studentId: input.studentId,
          date: { gte: start, lt: end },
        },
        select: { id: true },
      });
      if (existing) throw new DuplicateAttendanceError();

      return tx.attendance.create({
        data: {
          studentId: input.studentId,
          date: now,
          status: input.status,
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new DuplicateAttendanceError();
    }
    throw error;
  }
}

export async function listTodayAttendance(schoolId: string) {
  const { start, end } = utcDayRange(new Date());
  return prisma.attendance.findMany({
    where: {
      date: { gte: start, lt: end },
      student: { schoolId },
    },
    orderBy: { date: 'desc' },
  });
}
