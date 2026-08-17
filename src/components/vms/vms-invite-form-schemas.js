import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  validateVisitorHostFields,
  validateVisitorPurposeFields,
} from '@/components/vms/vms-entry-edit-validation';

const optionalPositiveInt = () =>
  z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || Number.isNaN(n)) return undefined;
    return n;
  }, z.number().int().positive('Field is mandatory').optional());

const requiredPositiveInt = () =>
  z.preprocess(
    (v) => {
      const n = typeof v === 'number' ? v : Number(v);
      return n;
    },
    z
      .number({
        invalid_type_error: 'Field is mandatory',
      })
      .int()
      .positive('Field is mandatory'),
  );

const baseVisitorInviteSchema = z.object({
  first_name: z.string().min(1, 'Field is mandatory'),
  last_name: z.string().min(1, 'Field is mandatory'),
  mobile_number: z.string().min(10, 'Field is mandatory'),
  email: z.string().min(1, 'Field is mandatory').email('Enter a valid email address'),
  center: z.string().min(1, 'Field is mandatory'),
  company_name: z.string().optional(),
  no_of_visitors: optionalPositiveInt(),
  whom_to_meet: z.enum(['devx', 'client']).optional(),
  host: z.string().optional(),
  host_company_name: z.string().optional(),
  vehicle_number: z.string().optional(),
  badge_number: z.string().optional(),
  purpose_of_visit: z.string().optional(),
  other_purpose: z.string().optional(),
  visit_date: z.date({ required_error: 'Field is mandatory' }),
  visit_time: z.string().min(1, 'Field is mandatory'),
  book_meeting_room: z.boolean().optional(),
  notes: z.string().optional(),
});

const addFieldIssues = (context, errors) => {
  Object.entries(errors).forEach(([path, message]) => {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message,
    });
  });
};

const withVisitorPurposeRefinements = (schema) =>
  schema.superRefine((values, context) => {
    addFieldIssues(context, validateVisitorPurposeFields(null, values));
  });

const withVisitorHostRefinements = (schema) =>
  schema.superRefine((values, context) => {
    addFieldIssues(context, validateVisitorHostFields(null, values));
  });

const withVisitorRefinements = (schema) =>
  withVisitorHostRefinements(withVisitorPurposeRefinements(schema));

export const visitorInviteSchema = withVisitorRefinements(baseVisitorInviteSchema);

const spaceInquiryInviteSchemaBase = z.object({
  inquiry_type: z.enum(['direct', 'channel-partner']).default('direct'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  mobile_number: z.string().optional(),
  email: z.string().optional(),
  company_name: z.string().optional(),
  center: z.string().optional(),
  no_of_visitors: optionalPositiveInt(),
  type_of_space: z.string().optional(),
  seats: requiredPositiveInt(),
  source_category: z.string().optional(),
  other_source: z.string().optional(),
  sales_person_in_touch: z.string().optional(),
  visit_date: z.date().optional(),
  visit_time: z.string().optional(),
  vehicle_number: z.string().optional(),
  badge_number: z.string().optional(),
  book_meeting_room: z.boolean().optional(),
  notes: z.string().optional(),
  cp_type: z.enum(['Digital', 'IPC', 'DPC']).optional(),
  cp_company_legal_name: z.string().optional(),
  client_first_name: z.string().optional(),
  client_last_name: z.string().optional(),
  client_mobile_number: z.string().optional(),
  client_email: z.string().optional(),
  client_company_name: z.string().optional(),
});

export const spaceInquiryInviteSchema = spaceInquiryInviteSchemaBase.superRefine(
  (values, context) => {
    const isDirect = values.inquiry_type === 'direct';
    const isCp = values.inquiry_type === 'channel-partner';

    const requireField = (cond, path, message = 'Field is mandatory') => {
      if (!cond) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
      }
    };

    if (isDirect) {
      requireField(values.first_name?.trim(), 'first_name');
      requireField(values.last_name?.trim(), 'last_name');
      requireField((values.mobile_number || '').trim().length >= 10, 'mobile_number');
      requireField(values.email?.trim(), 'email');
      if (values.email?.trim()) {
        const r = z.string().email().safeParse(values.email);
        if (!r.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'Enter a valid email address',
          });
        }
      }
      requireField(values.center?.trim(), 'center');
      requireField(values.type_of_space?.trim(), 'type_of_space');
      requireField(
        typeof values.seats === 'number' && Number.isFinite(values.seats) && values.seats > 0,
        'seats',
      );
      requireField(values.visit_date instanceof Date, 'visit_date');
      requireField(values.visit_time?.trim(), 'visit_time');
      if (values.source_category === 'Other' && !values.other_source?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['other_source'],
          message: 'Field is mandatory',
        });
      }
    }

    if (isCp) {
      requireField(values.cp_type, 'cp_type');
      requireField(values.cp_company_legal_name?.trim(), 'cp_company_legal_name');
      requireField(values.first_name?.trim(), 'first_name');
      requireField(values.last_name?.trim(), 'last_name');
      requireField((values.mobile_number || '').trim().length >= 10, 'mobile_number');
      if (values.email?.trim()) {
        const r = z.string().email().safeParse(values.email);
        if (!r.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'Enter a valid email address',
          });
        }
      } else {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Field is mandatory',
        });
      }
      requireField(values.center?.trim(), 'center');
      requireField(values.client_first_name?.trim(), 'client_first_name');
      requireField(values.client_last_name?.trim(), 'client_last_name');
      requireField((values.client_mobile_number || '').trim().length >= 10, 'client_mobile_number');
      if (values.client_email?.trim()) {
        const r = z.string().email().safeParse(values.client_email);
        if (!r.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['client_email'],
            message: 'Enter a valid email address',
          });
        }
      }
      requireField(values.type_of_space?.trim(), 'type_of_space');
      requireField(
        typeof values.seats === 'number' && Number.isFinite(values.seats) && values.seats > 0,
        'seats',
      );
      requireField(values.visit_date instanceof Date, 'visit_date');
      requireField(values.visit_time?.trim(), 'visit_time');
    }
  },
);

export const vendorInviteSchema = withVisitorPurposeRefinements(
  baseVisitorInviteSchema.extend({
    vendor: z.string().min(1, 'Field is mandatory'),
    assigned_supervisor: z.string().min(1, 'Field is mandatory'),
    material_desc: z.string().optional(),
  }),
);

export const eventParticipantInviteSchema = visitorInviteSchema;

export const getVmsInviteSchema = (activeTab) => {
  switch (activeTab) {
    case 'space-inquiries':
      return spaceInquiryInviteSchema;
    case 'vendors':
      return vendorInviteSchema;
    case 'event-participants':
      return eventParticipantInviteSchema;
    case 'visitors':
    default:
      return visitorInviteSchema;
  }
};

export const getVmsInviteResolver = (activeTab) => zodResolver(getVmsInviteSchema(activeTab));

export { optionalPositiveInt, requiredPositiveInt };
