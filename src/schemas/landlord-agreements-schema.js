import { z } from 'zod';
import { parseDDMMYYYY } from '@/schemas/agreements-schema';
import { parseDDMMYYYYToTimestamp, parseToDate } from '@/utils/date-utils';

const coerceNumber = (val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
};

export const landlordAgreementsSchema = z
  .object({
    landlord: z.string().min(1, 'Landlord is required'),
    /** Backend field name for landlord agreements: office */
    office: z.string().optional(),
    center: z.string().min(1, 'Center is required'),
    center_name: z.string().min(1, 'Center name is required'),
    spoc_name: z.string().optional(),
    spoc_contact: z.string().optional(),
    spoc_email: z.string().email('Invalid email').optional().or(z.literal('')),

    agreement_start_date: z.preprocess(
      parseDDMMYYYY,
      z.date({ invalid_type_error: 'Invalid date' }).optional(),
    ),
    rent_start_date: z.preprocess(
      parseDDMMYYYY,
      z.date({ invalid_type_error: 'Invalid date' }).optional(),
    ),
    agreement_end_date: z.preprocess(
      parseDDMMYYYY,
      z.date({ invalid_type_error: 'Invalid date' }).optional(),
    ),

    lock_in_period: z.preprocess(coerceNumber, z.number().min(1).optional()),

    lock_in_end_date: z.preprocess(
      parseDDMMYYYY,
      z.date({ invalid_type_error: 'Invalid date' }).optional(),
    ),
    notice_period: z.preprocess(coerceNumber, z.number().optional()),
    parking: z.string().optional(),
    photos: z.array(z.any()).optional(),
    roc: z.boolean().optional(),
    change_type: z.string().optional(),
    notes: z.string().optional(),
  })

  .superRefine((data, ctx) => {
    if (!data.agreement_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agreement_start_date'],
        message: 'Start date is required',
      });
    }
    if (!data.rent_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rent_start_date'],
        message: 'Rent start date is required',
      });
    }
    if (!data.agreement_end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agreement_end_date'],
        message: 'Agreement end date is required',
      });
    }
    if (!data.lock_in_end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lock_in_end_date'],
        message: 'Lock in end date is required',
      });
    }
    if (!data.lock_in_period || data.lock_in_period < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lock_in_period'],
        message: 'Lock In Period is required',
      });
    }
    // ✅ ROC check
    if (data?.roc === true) {
      const v = (data.change_type ?? '').trim();
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['change_type'],
          message: 'Change Type is required',
        });
      }
    }

    // ✅ Cross-field date comparisons (now always run)
    const getTs = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null);

    const startTs = getTs(data.agreement_start_date);
    const rentTs = getTs(data.rent_start_date);
    const endTs = getTs(data.agreement_end_date);
    const lockInEndTs = getTs(data.lock_in_end_date);

    if (startTs !== null && rentTs !== null && rentTs < startTs) {
      const message = 'Rent Start Date cannot be before Agreement Start Date';
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rent_start_date'], message });
    }

    if (startTs !== null && endTs !== null && endTs <= startTs) {
      const message = 'Agreement End Date cannot be before or same as Agreement Start Date';
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['agreement_end_date'], message });
    }

    if (startTs !== null && lockInEndTs !== null && lockInEndTs <= startTs) {
      const message = 'Lock In End Date cannot be before or same as Agreement Start Date';
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lock_in_end_date'], message });
    }
  });

export const defaultLandlordAgreementValues = {
  change_type: '',
  landlord: '',
  office: '',
  center: '',
  center_name: '',
  spoc_name: '',
  spoc_contact: '',
  spoc_email: '',
  agreement_start_date: '',
  rent_start_date: '',
  agreement_end_date: '',
  lock_in_period: '',
  lock_in_end_date: '',
  notice_period: undefined,
  parking: '',
  photos: [],
  roc: false,
  notes: '',
};
