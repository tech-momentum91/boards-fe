import { z } from 'zod';

/** `yyyy-MM-dd` strings compare lexicographically by calendar order. */
export function isCustomNextUpdateAfterDueDate(dueYmd, customNextYmd) {
  const next = String(customNextYmd ?? '').trim();
  if (!next) return true;
  const due = String(dueYmd ?? '').trim();
  if (!due) return true;
  return next > due;
}

// Form validation schema for client tasks
export const taskCreateSchema = z
  .object({
    subject: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    assignees: z.array(z.string()).min(1, 'At least one assignee is required'),
    exp_end_date: z.string().min(1, 'Due date is required'),
    priority: z.string().min(1, 'Priority is required'),
    status: z.string().min(1, 'Status is required'),
    custom_next_update_date: z.string().optional(),
    tags: z.string().optional(),
    recurrence_period: z.string().optional(),
    recurrence_date: z.string().optional(),
    recurrence_quarterly_date: z.string().optional(),
    recurrence_month: z.string().optional(),
  })
  .refine(
    (data) => {
      // If recurrence_period is "Monthly", recurrence_date is required
      if (data.recurrence_period === 'Monthly' && !data.recurrence_date) {
        return false;
      }
      // If recurrence_period is "Quarterly", recurrence_quarterly_date is required
      if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
        return false;
      }
      // If recurrence_period is "Yearly", recurrence_date and recurrence_month are required
      if (
        data.recurrence_period === 'Yearly' &&
        (!data.recurrence_date || !data.recurrence_month)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select recurrence date',
      path: ['recurrence_date'],
    },
  )
  .refine(
    (data) => {
      // If recurrence_period is "Quarterly", recurrence_quarterly_date is required
      if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select recurrence quarterly date',
      path: ['recurrence_quarterly_date'],
    },
  )
  .refine(
    (data) => {
      // If recurrence_period is "Yearly", recurrence_month is required
      if (data.recurrence_period === 'Yearly' && !data.recurrence_month) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select recurrence month',
      path: ['recurrence_month'],
    },
  )
  .refine(
    (data) => isCustomNextUpdateAfterDueDate(data.exp_end_date, data.custom_next_update_date),
    {
      message: 'Next update date must be after the due date',
      path: ['custom_next_update_date'],
    },
  );

export const defaultTaskValues = {
  subject: '',
  description: '',
  assignees: [],
  exp_end_date: '',
  priority: 'Medium',
  status: 'Open',
  custom_next_update_date: '',
  tags: '',
  recurrence_period: 'One Time',
  recurrence_date: '',
  recurrence_quarterly_date: '',
  recurrence_month: '',
};

// Schema for CreateTaskDrawerCommon component
const createTaskDrawerCommonObjectSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assignedTo: z
    .union([z.string(), z.array(z.string())])
    .refine(
      (v) => (Array.isArray(v) ? v.some(Boolean) : String(v || '').trim() !== ''),
      'Assignee is required',
    ),
  duration: z
    .string()
    .min(1, 'Duration is required')
    .refine((value) => {
      const number_ = Number(value);
      return !Number.isNaN(number_) && number_ > 0;
    }, 'Duration must be a positive number'),
  next_update: z.string().refine((value) => {
    const s = String(value ?? '').trim();
    if (s === '') return true;
    const number_ = Number(s);
    return !Number.isNaN(number_) && number_ > 0;
  }, 'Enter a positive number of days'),
  priority: z.string().min(1, 'Priority is required'),
  status: z.string().min(1, 'Status is required'),
  tagArr: z.array(z.string()).optional(),
  recurrence_period: z.string().optional(),
  recurrence_date: z.string().optional(),
  recurrence_quarterly_date: z.string().optional(),
  recurrence_month: z.string().optional(),
});

const applyCreateTaskDrawerCommonRefines = (schema) =>
  schema
    .refine(
      (data) => {
        if (data.recurrence_period === 'Monthly' && !data.recurrence_date) {
          return false;
        }
        if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
          return false;
        }
        if (
          data.recurrence_period === 'Yearly' &&
          (!data.recurrence_date || !data.recurrence_month)
        ) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence date',
        path: ['recurrence_date'],
      },
    )
    .refine(
      (data) => {
        if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence quarterly date',
        path: ['recurrence_quarterly_date'],
      },
    )
    .refine(
      (data) => {
        if (data.recurrence_period === 'Yearly' && !data.recurrence_month) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence month',
        path: ['recurrence_month'],
      },
    );

export const createTaskDrawerCommonSchema = applyCreateTaskDrawerCommonRefines(
  createTaskDrawerCommonObjectSchema,
);

/** Event Task Master create: priority optional */
export const createTaskDrawerCommonOptionalPrioritySchema = applyCreateTaskDrawerCommonRefines(
  createTaskDrawerCommonObjectSchema.extend({
    priority: z.string().optional(),
  }),
);

const eventCentersFieldSchema = z.array(z.string()).min(1, 'Select at least one center');

/** Event Task Master: duration mode + required centers from the event */
export const createTaskDrawerCommonWithCentersSchema = applyCreateTaskDrawerCommonRefines(
  createTaskDrawerCommonObjectSchema.extend({
    eventCenter: eventCentersFieldSchema,
  }),
);

/** Event Task Master: duration + centers, priority optional */
export const createTaskDrawerCommonWithCentersOptionalPrioritySchema =
  applyCreateTaskDrawerCommonRefines(
    createTaskDrawerCommonObjectSchema.extend({
      priority: z.string().optional(),
      eventCenter: eventCentersFieldSchema,
    }),
  );

/** Base shape before `.refine()` — must stay a `ZodObject` so callers can `.extend()`. */
const createTaskDrawerPartnerDueDateObjectSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assignedTo: z
    .union([z.string(), z.array(z.string())])
    .refine(
      (v) => (Array.isArray(v) ? v.some(Boolean) : String(v || '').trim() !== ''),
      'Assignee is required',
    ),
  duration: z.string().optional(),
  next_update_date: z.string().min(1, 'Due date is required'),
  priority: z.string().min(1, 'Priority is required'),
  status: z.string().min(1, 'Status is required'),
  custom_next_update_date: z.string().optional(),
  tagArr: z.array(z.string()).optional(),
  recurrence_period: z.string().optional(),
  recurrence_date: z.string().optional(),
  recurrence_quarterly_date: z.string().optional(),
  recurrence_month: z.string().optional(),
});

const createTaskDrawerPartnerDueDateObjectSchemaOptionalPriority =
  createTaskDrawerPartnerDueDateObjectSchema.extend({
    priority: z.string().optional(),
  });

const applyPartnerDueDateRecurrenceRefines = (schema) =>
  schema
    .refine(
      (data) => {
        if (data.recurrence_period === 'Monthly' && !data.recurrence_date) {
          return false;
        }
        if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
          return false;
        }
        if (
          data.recurrence_period === 'Yearly' &&
          (!data.recurrence_date || !data.recurrence_month)
        ) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence date',
        path: ['recurrence_date'],
      },
    )
    .refine(
      (data) => {
        if (data.recurrence_period === 'Quarterly' && !data.recurrence_quarterly_date) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence quarterly date',
        path: ['recurrence_quarterly_date'],
      },
    )
    .refine(
      (data) => {
        if (data.recurrence_period === 'Yearly' && !data.recurrence_month) {
          return false;
        }
        return true;
      },
      {
        message: 'Please select recurrence month',
        path: ['recurrence_month'],
      },
    )
    .refine(
      (data) => isCustomNextUpdateAfterDueDate(data.next_update_date, data.custom_next_update_date),
      {
        message: 'Next update date must be after the due date',
        path: ['custom_next_update_date'],
      },
    );

/** Partner detail CRM tasks: due date required, no duration / next-update split */
export const createTaskDrawerPartnerDueDateSchema = applyPartnerDueDateRecurrenceRefines(
  createTaskDrawerPartnerDueDateObjectSchema,
);

/** Event Tasks (document task): due date + centers linked to the event */
export const createTaskDrawerEventTaskWithCentersSchema = applyPartnerDueDateRecurrenceRefines(
  createTaskDrawerPartnerDueDateObjectSchema.extend({
    eventCenter: eventCentersFieldSchema,
  }),
);

/** Event Tasks: same as above but priority is optional */
export const createTaskDrawerEventTaskWithCentersOptionalPrioritySchema =
  applyPartnerDueDateRecurrenceRefines(
    createTaskDrawerPartnerDueDateObjectSchemaOptionalPriority.extend({
      eventCenter: eventCentersFieldSchema,
    }),
  );

export const defaultCreateTaskDrawerCommonValues = {
  taskTitle: '',
  description: '',
  assignedTo: '',
  duration: '',
  next_update: '',
  next_update_date: '',
  custom_next_update_date: '',
  priority: '',
  status: '',
  tagArr: [],
  eventCenter: [],
  recurrence_period: 'One Time',
  recurrence_date: '',
  recurrence_quarterly_date: '',
  recurrence_month: '',
};

// Schema for ACL Task create (Account, Contact, Lead detail pages)
export const crmContactTaskCreateSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  dueDate: z.string().min(1, 'Due Date is required'),
  priority: z.string().optional(),
  status: z.string().optional(),
  tagArr: z.array(z.string()).optional(),
  assign_to: z.union([z.string(), z.array(z.string())]).optional(),
  lifecycle_stage: z.string().optional().nullable(),
  lifecycle_stage_status: z.string().optional().nullable(),
});

export const defaultCrmContactTaskCreateValues = {
  taskTitle: '',
  description: '',
  type: '',
  dueDate: '',
  priority: 'LOW',
  status: 'Pending',
  tagArr: [],
  assign_to: '',
  lifecycle_stage: null,
  lifecycle_stage_status: null,
};
