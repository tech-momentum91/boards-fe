import { z } from 'zod';
import { PROJECT_MEMBER_FIELDS } from '@/components/projects/constants';
import {
  LAYOUT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '@/pages/profile/project-master/project-master.constants';

// Stages are fetched at runtime — keep non-empty string only (do not refine against empty PROJECT_STAGE_OPTIONS).
const stageSchema = z.string().trim().min(1, 'Stage is required');

const masterDurationSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Enter a valid number of days')
  .transform((value) => Number(value))
  .refine((value) => value >= 0, { message: 'Duration cannot be negative' });

const memberShape = PROJECT_MEMBER_FIELDS.reduce((shape, field) => {
  shape[field.id] = z.array(z.string()).default([]);
  return shape;
}, {});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, 'Project title is required'),
  description: z.string().optional(),
  stage: stageSchema,
  account: z.string().min(1, 'Account is required'),
  parent_project: z.string().optional(),
  city: z.string().trim().min(1, 'City is required'),
  design_start: z.date({ required_error: 'Design start date is required' }),
  design_end: z.date({ required_error: 'Design end date is required' }),
  project_start: z.date({ required_error: 'Project start date is required' }),
  project_end: z.date({ required_error: 'Project end date is required' }),
  carpet_area: z
    .string()
    .trim()
    .min(1, 'Carpet area is required')
    .regex(/^\d+(\.\d+)?$/, 'Enter a valid carpet area'),
  floors: z.array(z.string()).default([]),
  members: z.object(memberShape).default({}),
});

export const defaultProjectCreateValues = {
  name: '',
  description: '',
  stage: 'S1',
  account: '',
  parent_project: '',
  city: '',
  design_start: undefined,
  design_end: undefined,
  project_start: undefined,
  project_end: undefined,
  carpet_area: '',
  floors: [],
  members: PROJECT_MEMBER_FIELDS.reduce((acc, field) => {
    acc[field.id] = [];
    return acc;
  }, {}),
};

export const projectLayoutCreateSchema = z.object({
  subject: z.string().trim().min(1, 'Layout title is required'),
  type: z.literal('Layout Tasks'),
  description: z.string().optional(),
  assignee: z.string().min(1, 'Assignee is required'),
  duration: masterDurationSchema,
  layout_type: z
    .string()
    .min(1, 'Layout type is required')
    .refine((value) => LAYOUT_TYPE_OPTIONS.includes(value), {
      message: 'Select a valid layout type',
    }),
  priority: z.enum(PRIORITY_OPTIONS, { required_error: 'Priority is required' }),
  status: z.enum(STATUS_OPTIONS, { required_error: 'Status is required' }),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectLayoutCreateValues = {
  subject: '',
  type: 'Layout Tasks',
  description: '',
  assignee: '',
  duration: '0',
  layout_type: '',
  priority: 'Medium',
  status: 'Active',
  tags: [],
};

export const projectLayoutAreaCreateSchema = z.object({
  area_label: z.string().trim().min(1, 'Area name is required'),
  area_type: z.string().trim().min(1, 'Area type is required'),
  carpet_area: z.string().optional(),
});

export const defaultProjectLayoutAreaCreateValues = {
  area_label: '',
  area_type: '',
  carpet_area: '',
};

export const projectTaskCreateSchema = z.object({
  subject: z.string().trim().min(1, 'Task title is required'),
  type: z.literal('Project Tasks'),
  description: z.string().optional(),
  assignee: z.string().min(1, 'Assignee is required'),
  duration: masterDurationSchema,
  stage: stageSchema,
  priority: z.enum(PRIORITY_OPTIONS, { required_error: 'Priority is required' }),
  status: z.enum(STATUS_OPTIONS, { required_error: 'Status is required' }),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectTaskCreateValues = {
  subject: '',
  type: 'Project Tasks',
  description: '',
  assignee: '',
  duration: '0',
  stage: 'S1',
  priority: 'Medium',
  status: 'Active',
  tags: [],
};

export const projectDocumentMasterCreateSchema = z.object({
  subject: z.string().trim().min(1, 'Document title is required'),
  type: z.literal('Document Tasks'),
  description: z.string().optional(),
  assignee: z.string().optional().default(''),
  duration: masterDurationSchema,
  document_category: z.string().min(1, 'Category is required'),
  priority: z.enum(PRIORITY_OPTIONS, { required_error: 'Priority is required' }),
  status: z.enum(STATUS_OPTIONS, { required_error: 'Status is required' }),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectDocumentMasterCreateValues = {
  subject: '',
  type: 'Document Tasks',
  description: '',
  assignee: '',
  duration: '0',
  document_category: '',
  priority: 'Medium',
  status: 'Active',
  tags: [],
};

const projectGfcPriorityValues = ['High', 'Medium', 'Low'];
/** Status Master drives allowed values — accept any non-empty configured label. */
const projectStatusField = z.string().trim().min(1, 'Status is required');

export const projectGfcCreateSchema = z.object({
  title: z.string().trim().min(1, 'GFC title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).min(1, 'Assignee is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z.string().trim().min(1, 'Area is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(projectGfcPriorityValues).optional(),
  layoutId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectGfcCreateValues = {
  title: '',
  description: '',
  status: 'Yet to Start',
  assignees: [],
  floor: '',
  area: '',
  due_date: undefined,
  priority: 'Low',
  layoutId: '',
  tags: [],
};

export const projectThreeDCreateSchema = z.object({
  title: z.string().trim().min(1, '3D title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).min(1, 'Assignee is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z.string().trim().min(1, 'Area is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(projectGfcPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectThreeDCreateValues = {
  title: '',
  description: '',
  status: 'Yet to Start',
  assignees: [],
  floor: '',
  area: '',
  due_date: undefined,
  priority: 'Low',
  tags: [],
};

export const projectGraphicsCreateSchema = z.object({
  title: z.string().trim().min(1, 'Graphics title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).min(1, 'Assignee is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z.string().trim().min(1, 'Area is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(projectGfcPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectGraphicsCreateValues = {
  title: '',
  description: '',
  status: 'Yet to Start',
  assignees: [],
  floor: '',
  area: '',
  due_date: undefined,
  priority: 'Low',
  tags: [],
};

export const projectDetailLayoutCreateSchema = z.object({
  title: z.string().trim().min(1, 'Layout title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).min(1, 'Assignee is required'),
  floor: z.string().min(1, 'Floor is required'),
  layout_type: z.string().min(1, 'Layout type is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(projectGfcPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectDetailLayoutCreateValues = {
  title: '',
  description: '',
  status: '',
  assignees: [],
  floor: '',
  layout_type: '',
  due_date: undefined,
  priority: 'Low',
  tags: [],
};

export const projectAreaCreateSchema = z.object({
  area_label: z.string().trim().min(1, 'Area name is required'),
  floor: z.string().min(1, 'Floor is required'),
  area_type: z.string().min(1, 'Area type is required'),
  carpet_area: z.string().optional(),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
});

export const defaultProjectAreaCreateValues = {
  area_label: '',
  floor: '',
  area_type: '',
  carpet_area: '',
  description: '',
  color: '#FF5733',
};

const documentPriorityValues = ['high', 'medium', 'low'];
export const projectDocumentCreateSchema = z.object({
  title: z.string().trim().min(1, 'Document title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).default([]),
  category: z.string().trim().min(1, 'Category is required'),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(documentPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectDocumentCreateValues = {
  title: '',
  description: '',
  status: 'Yet to Start',
  assignees: [],
  category: '',
  due_date: undefined,
  priority: 'low',
  tags: [],
};

const snagPriorityValues = ['High', 'Medium', 'Low'];
const snagStatusValues = ['To Do', 'In Progress', 'On Hold', 'Completed', 'Re-Open', 'Cancelled'];
const snagSourceValues = ['Internal', 'Client', 'PMC', 'External'];

export const projectSnagCreateSchema = z.object({
  title: z.string().trim().min(1, 'Snag title is required'),
  description: z.string().optional(),
  status: z.enum(snagStatusValues, { required_error: 'Status is required' }),
  assignees: z.array(z.string()).default([]),
  category: z.string().min(1, 'Product category is required'),
  sub_category: z
    .string()
    .optional()
    .transform((value) => value ?? ''),
  snag_source: z
    .string()
    .optional()
    .refine((value) => !value || snagSourceValues.includes(value), {
      message: 'Select a valid snag source',
    })
    .transform((value) => value ?? ''),
  floor: z
    .string()
    .optional()
    .transform((value) => value ?? ''),
  area: z
    .string()
    .optional()
    .transform((value) => value ?? ''),
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(snagPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectSnagCreateValues = {
  title: '',
  description: '',
  status: 'To Do',
  assignees: [],
  category: '',
  sub_category: '',
  snag_source: '',
  floor: '',
  area: '',
  due_date: undefined,
  priority: 'Low',
  tags: [],
};

const projectLevelTaskPriorityValues = ['High', 'Medium', 'Low'];
export const projectLevelTaskCreateSchema = z.object({
  subject: z.string().trim().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: projectStatusField,
  assignees: z.array(z.string()).min(1, 'Assignee is required'),
  floor: z.string().min(1, 'Floor is required'),
  area: z.string().trim().min(1, 'Area is required'),
  custom_stage: stageSchema,
  due_date: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(projectLevelTaskPriorityValues).optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultProjectLevelTaskCreateValues = {
  subject: '',
  description: '',
  status: 'To Do',
  assignees: [],
  floor: '',
  area: '',
  custom_stage: 'S1',
  due_date: undefined,
  priority: 'Medium',
  tags: [],
};
