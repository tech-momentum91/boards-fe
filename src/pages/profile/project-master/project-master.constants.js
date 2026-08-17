import { PROJECT_MEMBER_FIELDS } from '@/components/projects/constants';
import { colorForProjectStage } from '@/components/projects/shared';

export const PROJECT_TASK_TABS = [
  { id: 'Tasks', label: 'Tasks' },
  { id: 'Status', label: 'Status' },
];

export const PROJECT_MASTER_LIST_PAGE_SIZE = 20;

export const INITIAL_PROJECT_TASK_STATUSES = [
  { id: 'task-status-1', label: 'To Do', color: 'bg-blue-base', enabled: true },
  { id: 'task-status-2', label: 'In Progress', color: 'bg-orange-base', enabled: true },
  { id: 'task-status-3', label: 'On Hold', color: 'bg-purple-base', enabled: true },
  { id: 'task-status-4', label: 'Completed', color: 'bg-green-base', enabled: true },
  { id: 'task-status-5', label: 'Re-Open', color: 'bg-sky-200', enabled: false },
  { id: 'task-status-6', label: 'Cancelled', color: 'bg-red-base', enabled: true },
];

export const ASSIGNEE_OPTIONS = PROJECT_MEMBER_FIELDS.map((field) => field.label);
/** Fallback until Project Stages API loads; prefer fetched options. */
export const STAGE_OPTIONS = [];
export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
export const STATUS_OPTIONS = ['Active', 'Inactive', 'Draft'];

export const PROJECT_TASK_MASTER_GROUP_BY_OPTIONS = [
  { value: 'stage', label: 'Stage' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_LAYOUT_MASTER_GROUP_BY_OPTIONS = [
  { value: 'layout_type', label: 'Layout Type' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DOCUMENT_MASTER_GROUP_BY_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_TASK_MASTER_FILTER_SECTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_LAYOUT_MASTER_FILTER_SECTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DOCUMENT_MASTER_FILTER_SECTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_TASK_COLUMN_STORAGE_KEY = 'project-task-master-column-config';

export const PROJECT_TASK_COLUMNS = [
  { id: 'title', label: 'Task', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'stage', label: 'Stage', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'duration', label: 'Duration', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_TASK_COLUMN_WIDTHS = {
  title: 'w-[38%]',
  assignee: 'w-[16%]',
  stage: 'w-[10%]',
  tags: 'w-[13%]',
  duration: 'w-[10%]',
  status: 'w-[10%]',
  priority: 'w-[10%]',
};

export function getStoredProjectTaskColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_TASK_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((column) => (column.id === 'task' ? { ...column, id: 'title' } : column));
  } catch {
    return [];
  }
}

export function saveStoredProjectTaskColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_TASK_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Browser storage can fail in private mode; column changes should still work in memory.
  }
}

export function formatAttachmentTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function colorForStatus(status) {
  return String(status).toLowerCase() === 'active' ? 'green' : 'gray';
}

export function colorForPriority(priority) {
  const normalized = String(priority).toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'red';
  if (normalized === 'medium') return 'orange';
  return 'green';
}

export function colorForStage(stage) {
  return colorForProjectStage(stage);
}

export const PROJECT_LAYOUT_TABS = [
  { id: 'Layouts', label: 'Layouts' },
  { id: 'Status', label: 'Status' },
];

export const LAYOUT_TYPE_OPTIONS = ['MEPF Layout', 'Designer Layout'];

export const INITIAL_PROJECT_LAYOUT_STATUSES = [
  { id: 'layout-status-1', label: 'Yet to Start', color: 'bg-blue-base', enabled: true },
  { id: 'layout-status-2', label: 'Work In Progress', color: 'bg-orange-base', enabled: true },
  { id: 'layout-status-3', label: 'Re-work', color: 'bg-purple-base', enabled: true },
  { id: 'layout-status-4', label: 'Submitted for Approval', color: 'bg-green-base', enabled: true },
  { id: 'layout-status-5', label: 'Release', color: 'bg-stroke-sub-300', enabled: true },
];

export const INITIAL_PROJECT_DOCUMENT_STATUSES = [
  { id: 'doc-status-1', label: 'Yet to Start', color: 'bg-blue-base', enabled: true },
  { id: 'doc-status-2', label: 'Work In Progress', color: 'bg-orange-base', enabled: true },
  { id: 'doc-status-3', label: 'Re-work', color: 'bg-purple-base', enabled: true },
  { id: 'doc-status-4', label: 'Submitted for Approval', color: 'bg-green-base', enabled: true },
  { id: 'doc-status-5', label: 'Release', color: 'bg-stroke-sub-300', enabled: true },
];

export const PROJECT_LAYOUT_COLUMN_STORAGE_KEY = 'project-layout-master-column-config';

export const PROJECT_LAYOUT_COLUMNS = [
  { id: 'title', label: 'Title', visible: true, enableHiding: false },
  { id: 'layout_type', label: 'Layout Type', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'duration', label: 'Duration', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_LAYOUT_COLUMN_WIDTHS = {
  title: 'w-[34%]',
  layout_type: 'w-[16%]',
  tags: 'w-[16%]',
  duration: 'w-[10%]',
  status: 'w-[12%]',
  priority: 'w-[12%]',
};

export const INITIAL_PROJECT_LAYOUTS = [
  {
    id: 'project-layout-1',
    title: 'Ground Floor GFC Layout',
    assignee: 'Design Lead',
    stage: 'S1',
    tags: ['GFC', 'Design'],
    duration: '2 Days',
    status: 'Active',
    priority: 'Medium',
    layoutType: 'GFC',
    description: 'Understand the amenities and services available for your workspace.',
    attachments: [
      {
        id: 'layout-attachment-1',
        name: 'Attachment_1.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
      {
        id: 'layout-attachment-2',
        name: 'Attachment_2.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
      {
        id: 'layout-attachment-3',
        name: 'Attachment_3.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
    ],
  },
  {
    id: 'project-layout-2',
    title: 'First Floor Concept Layout',
    assignee: 'Execution Lead',
    stage: 'S2',
    tags: ['Concept'],
    duration: '3 Days',
    status: 'Active',
    priority: 'High',
    layoutType: 'Concept Layout',
    description: 'Prepare the concept layout before project kickoff.',
    attachments: [],
  },
  {
    id: 'project-layout-3',
    title: 'Terrace Furniture Layout',
    assignee: 'Project Manager',
    stage: 'S3',
    tags: ['Furniture'],
    duration: '1 Day',
    status: 'Draft',
    priority: 'Low',
    layoutType: 'Furniture Layout',
    description: 'Capture feedback from all stakeholders on the proposed furniture layout.',
    attachments: [
      {
        id: 'layout-attachment-4',
        name: 'Concept_Layout.pdf',
        size: '95 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
    ],
  },
  {
    id: 'project-layout-4',
    title: 'Basement As-Built Layout',
    assignee: 'Operations Lead',
    stage: 'S4',
    tags: ['As-Built'],
    duration: '2 Days',
    status: 'Inactive',
    priority: 'Medium',
    layoutType: 'As-Built',
    description: 'Confirm that all as-built layout details are ready for execution planning.',
    attachments: [],
  },
];

export function getStoredProjectLayoutColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_LAYOUT_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((column) => {
        if (column.id === 'assignee') return { ...column, id: 'layout_type', label: 'Layout Type' };
        if (column.id === 'stage') return null;
        return column;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveStoredProjectLayoutColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_LAYOUT_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Browser storage can fail in private mode; column changes should still work in memory.
  }
}

export const PROJECT_DOCUMENT_TABS = [
  { id: 'Documents', label: 'Documents' },
  { id: 'Category', label: 'Category' },
  { id: 'Status', label: 'Status' },
];

export const PROJECT_ORDER_SELECTION_TABS = [
  { id: 'OrderCategory', label: 'Order Category' },
  { id: 'SelectionCategory', label: 'Selection Category & Items' },
  { id: 'Status', label: 'Status' },
];

export const SELECTION_CUSTOM_COLUMN_TYPES = [
  'Text',
  'Long Text',
  'Number',
  'Image',
  'Date',
  'URL',
  'Checkbox',
];

export const DOCUMENT_CATEGORY_DOCTYPE = 'Document Category';
export const TASK_MASTER_DOCTYPE = 'Task Master';

export const PROJECT_MASTER_ACTIONS_COLUMN_WIDTH = 'w-[48px]';

export const DOCUMENT_CATEGORY_OPTIONS = [
  'Technical',
  'Legal',
  'Commercial',
  'HSE',
  'Financial',
  'Administrative',
  'Handover',
  'Contracts',
];

export const PROJECT_MASTER_FILTER_OPTIONS = {
  status: STATUS_OPTIONS.map((value) => ({ value, label: value })),
  priority: PRIORITY_OPTIONS.map((value) => ({ value, label: value })),
  stage: STAGE_OPTIONS.map((value) => ({ value, label: value })),
  layout_type: LAYOUT_TYPE_OPTIONS.map((value) => ({ value, label: value })),
  category: DOCUMENT_CATEGORY_OPTIONS.map((value) => ({ value, label: value })),
};

export const PROJECT_MASTER_GROUP_VALUE_FIELD_MAP = {
  stage: { filterKey: 'stage', allLabel: 'All Stage' },
  status: { filterKey: 'status', allLabel: 'All Status' },
  priority: { filterKey: 'priority', allLabel: 'All Priority' },
  layout_type: { filterKey: 'layout_type', allLabel: 'All Layout Types' },
  category: { filterKey: 'category', allLabel: 'All Categories' },
};

export const INITIAL_PROJECT_SELECTION_STATUSES = [
  { id: 'selection-status-pending', label: 'Pending', color: 'bg-stroke-soft-300', enabled: true },
  {
    id: 'selection-status-sent-to-purchase',
    label: 'Sent to Purchase',
    color: 'bg-orange-base',
    enabled: true,
  },
  { id: 'selection-status-po-given', label: 'PO Given', color: 'bg-blue-base', enabled: true },
  { id: 'selection-status-delivered', label: 'Delivered', color: 'bg-green-base', enabled: true },
];

const SELECTION_STATUSES_STORAGE_KEY = 'project-master-selection-statuses';

export function loadPersistedSelectionStatuses() {
  try {
    const raw = localStorage.getItem(SELECTION_STATUSES_STORAGE_KEY);
    if (!raw) return INITIAL_PROJECT_SELECTION_STATUSES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_PROJECT_SELECTION_STATUSES;
    return parsed;
  } catch {
    return INITIAL_PROJECT_SELECTION_STATUSES;
  }
}

export function persistSelectionStatuses(statuses) {
  try {
    localStorage.setItem(SELECTION_STATUSES_STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage quota / private mode errors.
  }
}

export const PROJECT_DOCUMENT_CATEGORY_COLUMN_WIDTHS = {
  name: 'w-[32%]',
  description: 'w-[58%]',
  actions: PROJECT_MASTER_ACTIONS_COLUMN_WIDTH,
};

export const PROJECT_DOCUMENT_COLUMN_STORAGE_KEY = 'project-document-master-column-config';

export const PROJECT_DOCUMENT_COLUMNS = [
  { id: 'title', label: 'Title', visible: true, enableHiding: false },
  { id: 'category', label: 'Category', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DOCUMENT_COLUMN_WIDTHS = {
  title: 'w-[28%]',
  category: 'w-[14%]',
  assignee: 'w-[16%]',
  tags: 'w-[16%]',
  status: 'w-[12%]',
  priority: 'w-[12%]',
};

export function getStoredProjectDocumentColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DOCUMENT_COLUMN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDocumentColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DOCUMENT_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // Browser storage can fail in private mode; column changes should still work in memory.
  }
}
