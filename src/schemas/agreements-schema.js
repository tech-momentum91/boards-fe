import { z } from 'zod';
import {
  parseDDMMYYYYToTimestamp,
  parseToDate,
  parseYYYYMMDDToTimestamp,
} from '@/utils/date-utils';

/** Parse DD/MM/YYYY or yyyy-MM-dd string, or return Date as-is; used by schema and forms (e.g. Datepicker value). */
export const parseDDMMYYYY = (val) => {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }

  if (typeof val !== 'string') {
    return undefined;
  }

  const ddmmyyyyTs = parseDDMMYYYYToTimestamp(val);
  if (ddmmyyyyTs) return new Date(ddmmyyyyTs);

  const yyyymmddTs = parseYYYYMMDDToTimestamp(val);
  if (yyyymmddTs) return new Date(yyyymmddTs);

  const d = parseToDate(val);
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    return d;
  }

  return undefined;
};
/** Coerce value to number for schema; empty string/null/undefined -> undefined. */
const coerceNumber = (val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
};

export const agreementsSchema = z
  .object({
    client: z.string().min(1, 'Client is required'),
    center: z.array(z.string()).min(1, 'Center is required'),
    space: z
      .array(z.string())
      .min(1, 'At least one space is required')
      .nonempty('At least one space is required'),
    no_of_monthly_deposit: z.preprocess(coerceNumber, z.number().optional()),
    notice_period_client: z.preprocess(coerceNumber, z.number().optional()),
    notice_period_devx: z.preprocess(coerceNumber, z.number().optional()),
    roc: z.boolean().optional(),
    change_type: z.string().optional(),

    agreement_start_date: z.preprocess(
      parseDDMMYYYY,
      z.date({ invalid_type_error: 'Invalid date' }).optional(),
    ),

    annual_escalation: z.preprocess(coerceNumber, z.number().optional()),
    escalation_years: z.string().optional(),
    payment_due_day: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.union([z.string(), z.number()]).optional(),
    ),
    photos: z.array(z.any()).optional(),
    membership_plan: z.union([z.string(), z.array(z.string())]).optional(),
    space_details: z.record(z.any()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // ✅ Required checks (moved from field-level)
    if (!data.agreement_start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agreement_start_date'],
        message: 'Start date is required',
      });
    }

    // ✅ Space Details validation
    const spaceIds = data.space || [];
    const details = data.space_details || {};

    const isMissingSpaceScalar = (v) => {
      if (v === undefined || v === null || v === '') return true;
      if (v instanceof Date) return Number.isNaN(v.getTime());
      return false;
    };

    spaceIds.forEach((id) => {
      const key = String(id);
      const s = details[key] ?? details[id];
      // Skip when assign-space data is still loading (e.g. re-select after clearing); no user-facing error.
      if (!s) return;

      const requiredSpaceField = (field, message) => {
        if (isMissingSpaceScalar(s[field])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['space_details', key, field],
            message,
          });
        }
      };

      // Required on each space (aligned with create flow + AgreementSpaceDetailCard)
      requiredSpaceField('no_of_seats', 'No. of seats is required');
      requiredSpaceField('area', 'Area is required');
      requiredSpaceField('price_per_seat', 'Price per seat is required');
      requiredSpaceField('monthly_revenue', 'Monthly revenue is required');
      requiredSpaceField('rent_start_date', 'Rent start date is required');
      requiredSpaceField('agreement_end_date', 'Agreement end date is required');
      requiredSpaceField('lock_in_period', 'Lock-in period is required');
      requiredSpaceField('lock_in_end_date', 'Lock-in end date is required');

      const getTs = (d) => {
        if (!d) return null;
        const parsed = parseDDMMYYYY(d);
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : null;
      };

      const startTs = getTs(data.agreement_start_date);
      const rentTs = getTs(s.rent_start_date);
      const endTs = getTs(s.agreement_end_date);
      const lockInEndTs = getTs(s.lock_in_end_date);
      const incrementDateTs = getTs(s.increment_date);

      if (startTs !== null && rentTs !== null && rentTs < startTs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['space_details', key, 'rent_start_date'],
          message: 'Rent start date must be on or after agreement start date',
        });
      }

      if (startTs !== null && endTs !== null && endTs <= startTs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['space_details', key, 'agreement_end_date'],
          message: 'Agreement End Date cannot be before or same as Agreement Start Date',
        });
      }

      if (lockInEndTs !== null && startTs !== null && lockInEndTs <= startTs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['space_details', key, 'lock_in_end_date'],
          message: 'Lock In End Date cannot be before or same as Agreement Start Date',
        });
      }

      if (incrementDateTs !== null && startTs !== null && incrementDateTs <= startTs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['space_details', key, 'increment_date'],
          message: 'Increment Date cannot be before or same as Agreement Start Date',
        });
      }
    });

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
  });

export const defaultAgreementValues = {
  change_type: '',
  client: '',
  center: [],
  space: [],
  no_of_monthly_deposit: undefined,
  notice_period_client: undefined,
  notice_period_devx: undefined,
  roc: false,
  agreement_start_date: '',
  annual_escalation: undefined,
  escalation_years: '',
  payment_due_day: '',
  membership_plan: undefined,
  photos: [],
  space_details: {},
  notes: '',
};
