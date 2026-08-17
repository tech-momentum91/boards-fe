import { z } from 'zod';
import { isMobileStdCode } from '@/components/centers-management/utils/emergency-contact-phone-utils';

export function createEmergencyContactSchema({ stdOptionByKey }) {
  return z
    .object({
      contact_name: z
        .string()
        .min(1, 'Name is required')
        .min(2, 'Name must be at least 2 characters'),
      category: z.string().optional(),
      newCategory: z.string().optional(),
      isSelectMode: z.boolean(),
      std_selection: z.string().optional(),
      local_number: z.string().min(1, 'Contact number is required'),
    })
    .superRefine((data, ctx) => {
      if (data.isSelectMode) {
        if (!data.category || !data.category.trim()) {
          ctx.addIssue({
            path: ['category'],
            code: z.ZodIssueCode.custom,
            message: 'Category is required',
          });
        }
      } else if (!data.newCategory || !data.newCategory.trim()) {
        ctx.addIssue({
          path: ['newCategory'],
          code: z.ZodIssueCode.custom,
          message: 'Category name is required',
        });
      }

      const localDigits = String(data.local_number || '').replaceAll(/\D/g, '');
      const std = data.std_selection ? stdOptionByKey.get(data.std_selection)?.std_code : '';
      const isMobile = isMobileStdCode(std);

      if (isMobile) {
        if (localDigits.length !== 10) {
          ctx.addIssue({
            path: ['local_number'],
            code: z.ZodIssueCode.custom,
            message: 'Mobile number must be 10 digits with +91',
          });
        }
        return;
      }

      if (localDigits.length < 3 || localDigits.length > 8) {
        ctx.addIssue({
          path: ['local_number'],
          code: z.ZodIssueCode.custom,
          message: 'Contact number must be 3–8 digits for landline/short code',
        });
      }

      if (localDigits.length >= 6 && !std) {
        ctx.addIssue({
          path: ['std_selection'],
          code: z.ZodIssueCode.custom,
          message: 'Select STD for local landline numbers',
        });
      }
    });
}
