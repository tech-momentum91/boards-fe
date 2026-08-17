import { z } from 'zod';

export const supportSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  module: z.string().min(1, 'Module is required'),
  title: z.string().min(1, ' Title is required'),
  description: z.string().min(1, 'Description is required'),
  photo: z.any().optional(),
});
