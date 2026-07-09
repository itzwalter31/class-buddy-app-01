import prisma from '../../config/prisma.js';
import type { StudentPhoto } from '@prisma/client';

export type EmbeddingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface StudentPhotoCreateInput {
  studentId: string;
  imageUrl: string;
  imageType: string;
  embeddingStatus: EmbeddingStatus;
  embeddingVector?: string | null;
  isPrimary?: boolean;
}

export async function listPhotos(studentId: string) {
  return prisma.studentPhoto.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
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
      imageType: input.imageType,
      embeddingStatus: input.embeddingStatus,
      embeddingVector: input.embeddingVector ?? null,
      isPrimary: input.isPrimary ?? false,
    },
  });
}

export async function deletePhoto(photoId: string, studentId: string) {
  const photo = await prisma.studentPhoto.findFirst({
    where: { id: photoId, studentId },
  });
  if (!photo) return null;

  await prisma.studentPhoto.delete({ where: { id: photoId } });
  return photo;
}
