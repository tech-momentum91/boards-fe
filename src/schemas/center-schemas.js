import { z } from 'zod';

export const createCenterSchema = z.object({
  centerName: z
    .string()
    .min(1, 'Center Name is required')
    .min(2, 'Center Name must be at least 2 characters'),
  status: z.string().min(1, 'Status is required'),
  carpet_area: z
    .string()
    .min(1, 'Carpet Area is required')
    .regex(/^\d+$/, 'Carpet Area must be numeric only'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zone: z.string().min(1, 'Zone is required'),
  microMarket: z.string().optional(),
  pincode: z
    .string()
    .min(1, 'Pin Code is required')
    .regex(/^\d+$/, 'Pin Code must be numeric only'),
  address: z.string().min(1, 'Address is required'),
});
