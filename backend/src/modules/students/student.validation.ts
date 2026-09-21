// eslint-disable-next-line prettier/prettier
// eslint-disable-next-line prettier/prettier
// eslint-disable-next-line prettier/prettier
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
// eslint-disable-next-line prettier/prettier
});

export const createStudentSchema = z.object({
  // eslint-disable-next-line prettier/prettier
  studentNumber: z.string().trim().min(1, 'Student number is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  otherNames: z.string().trim().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required').refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date'),
  email: z.string().email('Invalid email address'),
  phone: z.string().trim().min(7, 'Phone is required'),
  address: z.string().trim().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
});
