import prisma from '../../config/prisma.js';
import { Prisma, type StudentPhoto } from '@prisma/client';

export type EmbeddingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface StudentPhotoCreateInput {
  studentId: string;
  imageUrl: string;
  embeddingStatus: EmbeddingStatus;
  embeddingVector?: Prisma.InputJsonValue | null;
  isPrimary?: boolean;
}

export async function listPhotos(studentId: string, schoolId: string) {
  return prisma.studentPhoto.findMany({
    where: {
      studentId,
      student: {
        schoolId,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      studentId: true,
      imageUrl: true,
      embeddingStatus: true,
      isPrimary: true,
      createdAt: true,
    },
  });
}

export async function savePhoto(input: StudentPhotoCreateInput) {
  if (input.isPrimary) {
    await prisma.studentPhoto.updateMany({
      where: { studentId: input.studentId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.studentPhoto.create({
    data: {
      studentId: input.studentId,
      imageUrl: input.imageUrl,
      embeddingStatus: input.embeddingStatus,
      embeddingVector: input.embeddingVector === undefined ? undefined : input.embeddingVector === null ? Prisma.JsonNull : input.embeddingVector,
      isPrimary: input.isPrimary ?? false,
    },
  });
}

export async function savePhotos(inputs: StudentPhotoCreateInput[], schoolId: string) {
  if (inputs.length === 0) return [];

  return prisma.$transaction(async (tx) => {
    const targetStudentIds = new Set(inputs.map((input) => input.studentId));

    const allowedStudentIds = await tx.student.findMany({
      where: {
        id: { in: Array.from(targetStudentIds) },
        schoolId,
      },
      select: { id: true },
    });

    const allowedSet = new Set(allowedStudentIds.map((student) => student.id));
    const validInputs = inputs.filter((input) => allowedSet.has(input.studentId));

    if (validInputs.length === 0) return [];

    const firstInput = validInputs.find((input) => input.isPrimary);
    if (firstInput) {
      await tx.studentPhoto.updateMany({
        where: { studentId: firstInput.studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const createdPhotos = [];
    for (const input of validInputs) {
      const photo = await tx.studentPhoto.create({
        data: {
          studentId: input.studentId,
          imageUrl: input.imageUrl,
          embeddingStatus: input.embeddingStatus,
          embeddingVector: input.embeddingVector === undefined ? undefined : input.embeddingVector === null ? Prisma.JsonNull : input.embeddingVector,
          isPrimary: input.isPrimary ?? false,
        },
      });
      createdPhotos.push(photo);
    }

    return createdPhotos;
  });
}

export async function deletePhoto(photoId: string, studentId: string, schoolId: string) {
  const photo = await prisma.studentPhoto.findFirst({
    where: {
      id: photoId,
      studentId,
      student: { schoolId },
    },
  });
  if (!photo) return null;

  await prisma.studentPhoto.delete({ where: { id: photoId } });
  return photo;
}
