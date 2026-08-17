import { parseISO } from 'date-fns';
import { z } from 'zod';
import { zOptionalDateString } from '@/components/event-management/constant';

function refineEndAfterStart(data, ctx) {
  const startRaw = String(data.start_datetime ?? '').trim();
  const endRaw = String(data.end_datetime ?? '').trim();
  if (!startRaw || !endRaw) return;
  const s = parseISO(startRaw);
  const e = parseISO(endRaw);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return;
  if (e.getTime() <= s.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_datetime'],
      message: 'End must be after start',
    });
  }
}

export const createExternalEventSchema = z
  .object({
    event_name: z.string().min(1, { message: 'Event name is required' }),
    partner_name: z.string().min(1, { message: 'Partner name is required' }),
    partner_owner: z.string().optional(),
    partner_owner_name: z.string().optional(),
    all_centers: z.boolean(),
    centre_name: z.array(z.string()),
    start_datetime: z.string().min(1, { message: 'Start date & time is required' }),
    end_datetime: z.string().min(1, { message: 'End date & time is required' }),
    assignee: z.array(z.any()).min(1, { message: 'Assignee is required' }),
    status: z.string().optional(),
    event_category: z.string().min(1, { message: 'Event category is required' }),
    revenue_mode: z.string().min(1, { message: 'Revenue mode is required' }),
    // Backend only has `max_registrations` – treat this as "Max Seats" in UI.
    // Empty / "No Limit" / 0 → unlimited; positive ints only otherwise.
    max_registrations: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        if (typeof val === 'string' && val.trim().toLowerCase() === 'no limit') return undefined;
        const n = Number(val);
        if (!Number.isNaN(n) && n === 0) return undefined;
        return n;
      },
      z
        .number({
          invalid_type_error: 'Must be a number',
        })
        .min(1, 'Must be at least 1')
        .optional(),
    ),
    registration_deadline: zOptionalDateString,
    event_details: z.string().optional(),
    attachments: z.any().optional(),
    spoc_name: z.string().min(1, { message: 'SPOC name is required' }),
    spoc_phone: z.string().min(1, { message: 'SPOC contact number is required' }),
    spoc_email: z
      .string()
      .min(1, { message: 'SPOC email is required' })
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Enter a valid email' }),
  })
  .superRefine((data, ctx) => {
    if (!data.all_centers) {
      const selected = Array.isArray(data.centre_name) ? data.centre_name : [];
      if (selected.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['centre_name'],
          message: 'Select at least one center or enable All centers.',
        });
      }
    }
    refineEndAfterStart(data, ctx);
  });

export const defaultExternalEventValues = {
  event_name: '',
  partner_name: '',
  partner_owner: '',
  partner_owner_name: '',
  all_centers: true,
  centre_name: [],
  start_datetime: '',
  end_datetime: '',
  assignee: [],
  status: '',
  event_category: '',
  revenue_mode: '',
  max_registrations: '',
  registration_deadline: '',
  event_details: '',
  attachments: [],
  spoc_name: '',
  spoc_phone: '',
  spoc_email: '',
};

export const createMicroEventSchema = z
  .object({
    partner: z.string().min(1, { message: 'Partner name is required' }),
    partner_owner: z.string().optional(),
    partner_owner_name: z.string().optional(),
    all_centers: z.boolean(),
    center: z.array(z.string()),
    eventName: z.string().min(1, { message: 'Event name is required' }),
    start_datetime: z.string().min(1, { message: 'Start date & time is required' }),
    end_datetime: z.string().min(1, { message: 'End date & time is required' }),
    assignee: z.array(z.any()).min(1, { message: 'Assignee is required' }),
    eventCategory: z.string().min(1, { message: 'Event category is required' }),
    // subCategory: z.string().optional(),
    engagementMode: z.string().min(1, { message: 'Engagement mode is required' }),
    revenueMode: z.string().min(1, { message: 'Revenue mode is required' }),
    status: z.string().min(1, { message: 'Status is required' }),
    eventDetails: z.string().optional(),
    spocName: z.string().min(1, { message: 'SPOC name is required' }),
    spocPhone: z.string().min(1, { message: 'SPOC contact number is required' }),
    spocEmail: z
      .string()
      .min(1, { message: 'SPOC email is required' })
      .email('Enter a valid email'),
    facilitiesNeeded: z.array(z.string()).optional(),
    attachments: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.all_centers) {
      const selected = Array.isArray(data.center) ? data.center : [];
      if (selected.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['center'],
          message: 'Select at least one center or enable All centers.',
        });
      }
    }
    refineEndAfterStart(data, ctx);
  });

export const defaultMicroEventValues = {
  client: '',
  all_centers: true,
  center: [],
  eventName: '',
  start_datetime: '',
  end_datetime: '',
  partner_owner: '',
  partner_owner_name: '',
  assignee: [],
  eventCategory: '',
  // subCategory: '',
  engagementMode: '',
  revenueMode: '',
  status: '',
  eventDetails: '',
  spocName: '',
  spocEmail: '',
  spocPhone: '',
  facilitiesNeeded: [],
  attachments: [],
  partner: '',
};

export const createCommunityEventSchema = z
  .object({
    event_name: z.string().min(1, { message: 'Event name is required' }),
    all_centers: z.boolean(),
    centre_name: z.array(z.string()),
    assignee: z.array(z.any()).min(1, { message: 'Assignee is required' }),
    all_clients: z.boolean().default(true),
    clients: z.array(z.string()).optional(),
    event_details: z.string().optional(),
    participation_type: z.enum(['Single Participation', 'Team Participation'], {
      required_error: 'Participation type is required',
    }),
    start_datetime: z.string().min(1, { message: 'Start date & time is required' }),
    end_datetime: z.string().min(1, { message: 'End date & time is required' }),
    registration_deadline: zOptionalDateString,
    max_registrations: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        if (typeof val === 'string' && val.trim().toLowerCase() === 'no limit') return undefined;
        const n = Number(val);
        // Typed 0 / "0" is unlimited (same as display / persist helpers).
        if (!Number.isNaN(n) && n === 0) return undefined;
        return n;
      },
      z
        .number({
          invalid_type_error: 'Must be a number',
        })
        .min(1, 'Must be at least 1')
        .optional(),
    ),
    community_status: z.string().optional(),
    minimum_team_members: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).int().min(1).optional(),
    ),
    maximum_team_members: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Must be a number' }).int().min(1).optional(),
    ),
    posterImage: z.array(z.any()).optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.all_centers) {
      const centersSelected = Array.isArray(values.centre_name) ? values.centre_name : [];
      if (centersSelected.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['centre_name'],
          message: 'Select at least one center or enable All Centers.',
        });
      }
    }

    // Clients Applicable is required; default is All Clients
    if (!values.all_clients) {
      const selected = Array.isArray(values.clients) ? values.clients : [];
      if (selected.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clients'],
          message: 'Select at least one client or enable All Clients.',
        });
      }
    }

    refineEndAfterStart(values, ctx);

    // Team Participation requires min/max team members
    if (values.participation_type === 'Team Participation') {
      if (!values.minimum_team_members) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['minimum_team_members'],
          message: 'Minimum team members is required',
        });
      }
      if (!values.maximum_team_members) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['maximum_team_members'],
          message: 'Maximum team members is required',
        });
      }
      if (
        values.minimum_team_members != null &&
        values.maximum_team_members != null &&
        values.minimum_team_members > values.maximum_team_members
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['maximum_team_members'],
          message: 'Maximum team members must be greater than or equal to minimum team members',
        });
      }
    }
  });

export const defaultCommunityEventValues = {
  event_name: '',
  all_centers: true,
  centre_name: [],
  assignee: [],
  all_clients: true,
  clients: [],
  event_details: '',
  participation_type: 'Single Participation',
  start_datetime: '',
  end_datetime: '',
  registration_deadline: '',
  max_registrations: '',
};
