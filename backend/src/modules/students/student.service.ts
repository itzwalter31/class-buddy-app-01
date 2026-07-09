import type { Student as PrismaStudent, StudentPhoto } from '@prisma/client';
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
  email: string;
  phone: string;
  address?: string | null;
  classId?: string | null;
  status?: StudentStatus;
}

export interface StudentUpdateInput extends Partial<StudentCreateInput> {}

export interface StudentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface StudentListResult {
  data: Array<PrismaStudent & { photos: StudentPhoto[] }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listStudents(params: StudentQueryParams): Promise<StudentListResult> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(params.limit ?? 10)));
  const skip = (page - 1) * limit;
  const search = params.search?.trim();

  const where = search
    ? {
        OR: [
          { studentNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { otherNames: { contains: search, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const [total, data] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { photos: true },
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

export async function getStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: { photos: true },
  });
}

export async function createStudent(input: StudentCreateInput) {
  return prisma.student.create({
    data: {
      studentNumber: input.studentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: input.otherNames ?? null,
      gender: input.gender,
      dateOfBirth: new Date(input.dateOfBirth),
      email: input.email,
      phone: input.phone,
      address: input.address ?? null,
      classId: input.classId ?? null,
      status: input.status ?? 'ACTIVE',
    },
  });
}

export async function updateStudent(id: string, input: StudentUpdateInput) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};

  if (input.studentNumber !== undefined) data.studentNumber = input.studentNumber;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.otherNames !== undefined) data.otherNames = input.otherNames;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.dateOfBirth !== undefined) data.dateOfBirth = new Date(input.dateOfBirth);
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.classId !== undefined) data.classId = input.classId;
  if (input.status !== undefined) data.status = input.status;

  if (!Object.keys(data).length) {
    return prisma.student.findUnique({ where: { id }, include: { photos: true } });
  }

  return prisma.student.update({
    where: { id },
    data,
    include: { photos: true },
  });
}

export async function deleteStudent(id: string) {
  try {
    return await prisma.student.delete({ where: { id } });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2025') {
      return null;
    }
    throw error;
  }
}
