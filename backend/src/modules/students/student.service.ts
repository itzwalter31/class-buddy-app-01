import { Prisma, type Student as PrismaStudent, type StudentPhoto } from '@prisma/client';
import prisma from '../../config/prisma.js';

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';
export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface StudentCreateInput {
  studentNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: StudentGender;
  dateOfBirth: string;
  classId?: string | null;
}

export type StudentUpdateInput = Partial<StudentCreateInput>;

export interface StudentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StudentListResult {
  data: Array<PrismaStudent & { photos: Array<Pick<StudentPhoto, 'id' | 'imageUrl' | 'embeddingStatus' | 'isPrimary' | 'createdAt'>> }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class InvalidStudentClassError extends Error {
  constructor() {
    super('Selected class does not exist or does not belong to your school');
    this.name = 'InvalidStudentClassError';
  }
}

const studentSelect = {
  id: true,
  studentNumber: true,
  firstName: true,
  lastName: true,
  otherNames: true,
  gender: true,
  dateOfBirth: true,
  schoolId: true,
  classId: true,
  createdAt: true,
  updatedAt: true,
  photos: {
    select: {
      id: true,
      imageUrl: true,
      embeddingStatus: true,
      isPrimary: true,
      createdAt: true,
    },
  },
} satisfies Prisma.StudentSelect;

async function validateClassForSchool(classId: string | null | undefined, schoolId: string) {
  if (!classId) return;

  const selectedClass = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!selectedClass) throw new InvalidStudentClassError();
}

export async function listStudents(params: StudentQueryParams, schoolId: string): Promise<StudentListResult> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit ?? 10)));
  const skip = (page - 1) * limit;
  const search = params.search?.trim();
  const searchMode: Prisma.QueryMode = 'insensitive';

  const where: Prisma.StudentWhereInput = {
    schoolId,
    ...(search
      ? {
          OR: [
            { studentNumber: { contains: search, mode: searchMode } },
            { firstName: { contains: search, mode: searchMode } },
            { lastName: { contains: search, mode: searchMode } },
            { otherNames: { contains: search, mode: searchMode } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: studentSelect,
    }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getStudentById(id: string, schoolId: string) {
  return prisma.student.findFirst({
    where: {
      id,
      schoolId,
    },
    select: studentSelect,
  });
}

export async function createStudent(schoolId: string, input: StudentCreateInput) {
  const assignedSchoolId = schoolId.trim();
  if (!assignedSchoolId) {
    throw new Error('A valid school ID is required to create a student');
  }

  const school = await prisma.school.findUnique({
    where: { id: assignedSchoolId },
    select: { id: true },
  });
  if (!school) {
    throw new Error('The assigned school does not exist');
  }

  await validateClassForSchool(input.classId, assignedSchoolId);

  return prisma.student.create({
    data: {
      studentNumber: input.studentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: input.otherNames ?? null,
      gender: input.gender,
      dateOfBirth: new Date(input.dateOfBirth),
      schoolId: assignedSchoolId,
      classId: input.classId ?? null,
    },
  });
}

export async function updateStudent(id: string, schoolId: string, input: StudentUpdateInput) {
  const existing = await prisma.student.findFirst({
    where: { id, schoolId },
  });
  if (!existing) return null;

  if (input.classId !== undefined) {
    await validateClassForSchool(input.classId, schoolId);
  }

  const data: Prisma.StudentUncheckedUpdateInput = {};

  if (input.studentNumber !== undefined) data.studentNumber = input.studentNumber;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.otherNames !== undefined) data.otherNames = input.otherNames;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.dateOfBirth !== undefined) data.dateOfBirth = new Date(input.dateOfBirth);
  if (input.classId !== undefined) data.classId = input.classId;

  if (!Object.keys(data).length) {
    return prisma.student.findUnique({
      where: { id },
      select: studentSelect,
    });
  }

  return prisma.student.update({
    where: { id },
    data,
    select: studentSelect,
  });
}

export async function deleteStudent(id: string, schoolId: string) {
  try {
    return await prisma.student.delete({
      where: { id, schoolId },
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}
