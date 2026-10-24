import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';

export interface ClassCreateInput {
  className: string;
}

export class ClassHasStudentsError extends Error {
  constructor() {
    super('Class cannot be deleted while it has students assigned');
    this.name = 'ClassHasStudentsError';
  }
}

export async function listClasses(schoolId: string) {
  return prisma.class.findMany({
    where: { schoolId },
    orderBy: { className: 'asc' },
    include: {
      _count: {
        select: { students: true },
      },
    },
  });
}

export async function createClass(schoolId: string, input: ClassCreateInput) {
  return prisma.class.create({
    data: {
      className: input.className.trim(),
      schoolId,
    },
  });
}

export async function updateClass(
  id: string,
  schoolId: string,
  input: Partial<ClassCreateInput>,
) {
  const existing = await prisma.class.findFirst({
    where: { id, schoolId },
    select: { id: true },
  });

  if (!existing) return null;

  return prisma.class.update({
    where: { id, schoolId },
    data: {
      ...(input.className !== undefined
        ? { className: input.className.trim() }
        : {}),
    },
  });
}

export async function deleteClass(id: string, schoolId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.class.findFirst({
          where: { id, schoolId },
          select: {
            id: true,
            _count: {
              select: { students: true },
            },
          },
        });

        if (!existing) return null;
        if (existing._count.students > 0) throw new ClassHasStudentsError();

        try {
          return await tx.class.delete({
            where: { id, schoolId },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2003'
          ) {
            throw new ClassHasStudentsError();
          }
          throw error;
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      throw new ClassHasStudentsError();
    }
    throw error;
  }
}

export async function assignStudentToClass(
  classId: string,
  studentId: string,
  schoolId: string,
) {
  const [student, selectedClass] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    }),
    prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    }),
  ]);

  if (!student || !selectedClass) return null;

  return prisma.student.update({
    where: { id: studentId, schoolId },
    data: { classId },
    select: { id: true },
  });
}
