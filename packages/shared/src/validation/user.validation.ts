import { z } from 'zod';
import { UserRole } from '../constants/roles';
import { PASSWORD_MIN_LENGTH } from '../constants/app.constants';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.nativeEnum(UserRole),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional(),
  batch: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional(),
  batch: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
