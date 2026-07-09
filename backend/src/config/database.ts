import prisma from './prisma.js';

export async function query<T>(sql: string, params: unknown[] = []) {
  return prisma.$queryRawUnsafe<T>(sql, ...params);
}

export { prisma };
