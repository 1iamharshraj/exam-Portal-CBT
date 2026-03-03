import { z } from 'zod';

export const createBatchSchema = z.object({
  name: z.string().min(1, 'Batch name is required').max(100),
  code: z
    .string()
    .min(1, 'Batch code is required')
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, 'Only letters, numbers, and hyphens allowed'),
  description: z.string().max(300).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
});

export const updateBatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, 'Only letters, numbers, and hyphens allowed')
    .optional(),
  description: z.string().max(300).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBatchFormData = z.infer<typeof createBatchSchema>;
export type UpdateBatchFormData = z.infer<typeof updateBatchSchema>;
