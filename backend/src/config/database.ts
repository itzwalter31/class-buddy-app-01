import prisma from './prisma.js';

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params) as Promise<T[]>;
}

export { prisma };
