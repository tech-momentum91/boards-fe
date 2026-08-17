import { z } from 'zod';

export const addUserSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full Name is required')
    .min(2, 'Full Name must be at least 2 characters'),
  emailAddress: z
    .string()
    .min(1, 'Email Address is required')
    .email('Please enter a valid email address'),
  role: z.string().min(1, 'Role is required'),
  centers: z.string().min(1, 'Center is required'),
});

// ... existing code ...
export const editUserSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Full Name is required')
      .min(2, 'Full Name must be at least 2 characters'),
    emailAddress: z
      .string()
      .min(1, 'Email Address is required')
      .email('Please enter a valid email address'),
    role: z.string().min(1, 'Role is required'),

    // Make both optional, then enforce conditionally below
    centers: z.string().optional().default(''),
    clients: z.string().optional().default(''),
  })
  .superRefine((data, context) => {
    const role = (data.role || '').trim();
    const isClientRole = role === 'Client Admin' || role === 'Client User';

    if (isClientRole) {
      if (!String(data.clients || '').trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clients'],
          message: 'Client is required',
        });
      }
    } else {
      if (!String(data.centers || '').trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['centers'],
          message: 'Center is required',
        });
      }
    }
  });

export const removeUserSchema = z.object({
  replacementUser: z.string().min(1, 'Replacement user is required'),
  actionType: z
    .string()
    .min(1, 'Action type is required')
    .refine((value) => value === 'REMOVE', {
      message: 'Please type "REMOVE" to confirm',
    }),
});
