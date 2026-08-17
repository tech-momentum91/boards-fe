export const PROJECT_COLUMN_STORAGE_KEY = 'projects-list-column-config';

/** Default visible columns per Figma column manager (21:25870). */
export const PROJECT_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'account', label: 'Account', visible: true },
  { id: 'stage', label: 'Stage', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'parent_project', label: 'Parent Project', visible: true },
  { id: 'design_start', label: 'Design Start', visible: true },
  { id: 'design_end', label: 'Design End', visible: true },
  { id: 'project_start', label: 'Project Start', visible: true },
  { id: 'project_end', label: 'Project End', visible: true },
  { id: 'carpet_area', label: 'Carpet Area', visible: true },
  { id: 'project_director', label: 'Project Director', visible: true },
  { id: 'execution_team', label: 'Execution Team', visible: true },
  { id: 'floors', label: 'Floors', visible: false },
  { id: 'crm', label: 'CRM', visible: false },
  { id: 'sales', label: 'Sales', visible: false },
  { id: 'interior_designer', label: 'Interior Designer', visible: false },
  { id: 'design_lead', label: 'Design Lead', visible: false },
  { id: 'execution_lead', label: 'Execution Lead', visible: false },
  { id: 'purchase', label: 'Purchase', visible: false },
  { id: 'safety_officer', label: 'Safety Officer', visible: false },
  { id: 'graphics', label: 'Graphics', visible: false },
  { id: 'documentation_incharge', label: 'Documentation Incharge', visible: false },
  { id: 'gfc', label: 'GFC', visible: false },
  { id: 'mepf', label: 'MEPF', visible: false },
  { id: 'boq_lead', label: 'BOQ Lead', visible: false },
  { id: 'billing_lead', label: 'Billing Lead', visible: false },
];

export const PROJECT_COLUMN_WIDTHS = {
  name: 'min-w-[149px]',
  account: 'min-w-[148px]',
  stage: 'min-w-[112px]',
  city: 'min-w-[109px]',
  parent_project: 'min-w-[166px]',
  design_start: 'min-w-[140px]',
  design_end: 'min-w-[140px]',
  project_start: 'min-w-[138px]',
  project_end: 'min-w-[138px]',
  carpet_area: 'min-w-[128px]',
  project_director: 'min-w-[160px]',
  execution_team: 'min-w-[160px]',
  floors: 'min-w-[120px]',
  crm: 'min-w-[140px]',
  sales: 'min-w-[140px]',
  interior_designer: 'min-w-[160px]',
  design_lead: 'min-w-[140px]',
  execution_lead: 'min-w-[150px]',
  purchase: 'min-w-[130px]',
  safety_officer: 'min-w-[150px]',
  graphics: 'min-w-[120px]',
  documentation_incharge: 'min-w-[180px]',
  gfc: 'min-w-[120px]',
  mepf: 'min-w-[120px]',
  boq_lead: 'min-w-[130px]',
  billing_lead: 'min-w-[140px]',
};

/** Default list ordering for `get_project_listview`. */
export const PROJECT_LIST_DEFAULT_ORDER_BY = 'creation desc';

/** TanStack column id → Frappe Project field for `order_by`. */
export const PROJECT_LIST_SORT_FIELD_MAP = {
  name: 'project_name',
  account: 'custom_crm_account',
  stage: 'custom_project_stage',
  city: 'custom_city',
  design_start: 'custom_design_start_date',
  design_end: 'custom_design_end_date',
  project_start: 'custom_project_start_date',
  project_end: 'custom_project_end_date',
  carpet_area: 'custom_carpet_area',
  creation: 'creation',
};

/** Initial sorting state matching {@link PROJECT_LIST_DEFAULT_ORDER_BY}. */
export const PROJECT_LIST_DEFAULT_SORTING = [{ id: 'creation', desc: true }];

/**
 * Build `order_by` for `fetchProjectListview` from TanStack sorting state.
 * @param {import('@tanstack/react-table').SortingState} sorting
 */
export function buildProjectListOrderBy(sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return PROJECT_LIST_DEFAULT_ORDER_BY;
  }

  const { id, desc } = sorting[0] ?? {};
  const backendField = PROJECT_LIST_SORT_FIELD_MAP[id];
  if (!backendField) {
    return PROJECT_LIST_DEFAULT_ORDER_BY;
  }

  return `${backendField} ${desc ? 'desc' : 'asc'}`;
}

export const PROJECT_STAGE_OPTIONS = [];

/** @deprecated Prefer fetchProjectStageOptions() / buildProjectStageFilterOptions(). */
export const PROJECT_STAGE_FILTER_OPTIONS = [{ value: 'all', label: 'All Stages' }];

export const PROJECT_CITY_FILTER_ALL = { value: 'all', label: 'All Cities' };

/** Toolbar city filter options from India city list (same source as project create). */
export function buildProjectCityFilterOptions(cities = []) {
  return [
    PROJECT_CITY_FILTER_ALL,
    ...(Array.isArray(cities) ? cities : []).map(({ value, label }) => ({
      value,
      label: label || value,
    })),
  ];
}

export const PROJECT_MEMBER_FIELDS = [
  { id: 'project_director', label: 'Project Director' },
  { id: 'crm', label: 'CRM' },
  { id: 'sales', label: 'Sales' },
  { id: 'design_lead', label: 'Design Lead' },
  { id: 'interior_designer', label: 'Interior Designer' },
  { id: 'gfc', label: 'GFC' },
  { id: 'mepf', label: 'MEPF' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'execution_team', label: 'Execution Team' },
  { id: 'execution_lead', label: 'Execution Lead' },
  { id: 'safety_officer', label: 'Safety Officer' },
  { id: 'documentation_incharge', label: 'Documentation Incharge' },
  { id: 'boq_lead', label: 'BOQ Lead' },
  { id: 'billing_lead', label: 'Billing Lead' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'account_team', label: 'Account Team' },
  { id: 'purchase_team', label: 'Purchase Team' },
  { id: 'purchase_lead', label: 'Purchase Lead' },
];

export const PROJECT_MEMBER_ASSIGN_OPTIONS = [
  'Rahul Mehta',
  'Sneha Patel',
  'Anita Sharma',
  'Karan Desai',
  'Arun Reddy',
  'Deepak Gupta',
  'Lakshmi Iyer',
  'Priya Nair',
  'Vikram Rao',
  'Meera Iyer',
];

export const PROJECT_ACCOUNT_FILTER_ALL = { value: 'all', label: 'All Accounts' };

/** Toolbar account filter options from CRM account list API. */
export function buildProjectAccountFilterOptions(accounts = []) {
  return [
    PROJECT_ACCOUNT_FILTER_ALL,
    ...(Array.isArray(accounts) ? accounts : []).map(({ value, label }) => ({
      value,
      label: label || value,
    })),
  ];
}

export const PROJECT_PARENT_PROJECT_OPTIONS = [
  { value: 'Topgrip', label: 'Topgrip' },
  { value: 'Acme HQ Fitout', label: 'Acme HQ Fitout' },
  { value: 'Nova Workspace', label: 'Nova Workspace' },
  { value: 'Urban Works Annex', label: 'Urban Works Annex' },
  { value: 'Pune Tech Park', label: 'Pune Tech Park' },
  { value: 'Mumbai Client Hub', label: 'Mumbai Client Hub' },
  { value: 'Bengaluru Studio', label: 'Bengaluru Studio' },
  { value: 'Hyderabad Campus', label: 'Hyderabad Campus' },
];

/** Shared class strings for project drawer / detail tab menus. */
export const PROJECT_DRAWER_TAB_LIST_CLASS = 'h-auto gap-4 border-t-0 px-6';

export const PROJECT_TAB_TRIGGER_CLASS =
  'gap-2 px-0 text-label-sm font-medium text-text-sub-600 data-[state=active]:text-text-strong-950';

/** Dynamic status config for the project stage field. */
export const PROJECT_STAGE_STATUS_CONFIG = {
  doctype: 'Project',
  field: 'custom_project_stage',
};

/** Dynamic status config for project layout workflow status. */
export const PROJECT_LAYOUT_STATUS_CONFIG = {
  doctype: 'Project Layout',
  field: 'status',
};

export const PROJECT_DETAIL_TABS = [
  { id: 'tasks', label: 'Tasks', icon: 'task-line' },
  { id: 'areas', label: 'Areas', icon: 'shape-2-line' },
  { id: 'layouts', label: 'Layouts', icon: 'layout-6-line' },
  { id: 'gfc', label: 'GFC', icon: 'task-line' },
  { id: 'graphics', label: 'Graphics', icon: 'palette-line' },
  { id: 'three_d', label: '3D', icon: 'box-3-line' },
  { id: 'dpr', label: 'DPR', icon: 'calendar-line' },
  { id: 'wpr', label: 'WPR', icon: 'calendar-event-line' },
  { id: 'collections', label: 'Collection', icon: 'money-dollar-circle-line' },
];

export const PROJECT_DETAIL_FLOOR_OPTIONS = [
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '5th', label: '5th' },
  { value: '10th', label: '10th' },
  { value: '12th', label: '12th' },
];

export const PROJECT_DETAIL_AREA_OPTIONS = [
  { value: 'meeting-room-1', label: 'Meeting Room 1', badge: 'BOM' },
  { value: 'director-cabin', label: 'Director Cabin', badge: 'PUN' },
  { value: 'private-cabin', label: 'Private Cabin', badge: 'AMD' },
];

/** Task type modes for the project-level create task drawer. */
export const PROJECT_TASK_CREATE_TYPE_OPTIONS = [
  { value: 'Project Tasks', label: 'Task' },
  { value: 'Layout Tasks', label: 'Layout' },
];

/** Project Tasks tab only — see screenshot status set (To Do … Cancelled). */
export const PROJECT_DETAIL_STATUS_OPTIONS = [
  { value: 'To Do', label: 'TO DO' },
  { value: 'In Progress', label: 'IN PROGRESS' },
  { value: 'On Hold', label: 'ON HOLD' },
  { value: 'Completed', label: 'COMPLETED' },
  { value: 'Re-Open', label: 'RE-OPEN' },
  { value: 'Cancelled', label: 'CANCELLED' },
];

/** Status value used by the completed quick-filter toolbar button per project tab. */
export const PROJECT_DETAIL_COMPLETED_QUICK_FILTER_STATUS = {
  task: 'Completed',
  snag: 'Completed',
  gfc: 'Completed',
  // Project Layout Status Master seed uses kebab-case labels.
  layout: 'release',
  document: 'Completed',
  threeD: 'Completed',
  graphics: 'Completed',
  areas: 'Active',
  selection: 'Delivered',
};

export const PROJECT_DETAIL_STAGE_OPTIONS = PROJECT_STAGE_OPTIONS.map((option) => option.value);

export const PROJECT_DETAIL_PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

/** Progress and badge colors for project task status dropdown. Keys lowercase for getStatusMetaForOption. */
export const PROJECT_TASK_STATUS_META = {
  'to do': { percentage: 10, color: 'blue' },
  'in progress': { percentage: 40, color: 'orange' },
  'on hold': { percentage: 50, color: 'purple' },
  completed: { percentage: 100, color: 'green' },
  're-open': { percentage: 30, color: 'sky' },
  cancelled: { percentage: 0, color: 'red' },
  // Legacy Task status values still present in older records
  pending: { percentage: 10, color: 'blue' },
  open: { percentage: 10, color: 'blue' },
  working: { percentage: 40, color: 'orange' },
  ongoing: { percentage: 40, color: 'orange' },
};

export const PROJECT_DETAIL_GROUP_BY_OPTIONS = [
  { value: 'stage', label: 'Stage' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_FILTER_SECTIONS = [
  { id: 'stage', label: 'Stage' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_FILTER_OPTIONS = {
  stage: PROJECT_STAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  status: PROJECT_DETAIL_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [
    { value: 'SA', label: 'SA' },
    { value: 'RK', label: 'RK' },
    { value: 'AA', label: 'AA' },
    { value: 'VP', label: 'VP' },
    { value: 'SN', label: 'SN' },
    { value: 'PJ', label: 'PJ' },
    { value: 'DK', label: 'DK' },
    { value: 'RM', label: 'RM' },
  ],
  priority: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ],
};

export const PROJECT_DETAIL_TASK_COLUMN_STORAGE_KEY = 'project-detail-task-column-config';

export const PROJECT_DETAIL_TASK_COLUMNS = [
  { id: 'title', label: 'Title', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'area', label: 'Area', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_TASK_COLUMN_WIDTHS = {
  // Fluid fill column under table-fixed (no fixed width). Cells use max-w-0 so long titles truncate.
  title: 'max-w-0',
  assignee: 'w-[160px]',
  floor: 'w-[148px]',
  area: 'w-[220px]',
  tags: 'w-[140px]',
  due_date: 'w-[148px]',
  status: 'w-[200px]',
  priority: 'w-[120px]',
};

export function getStoredProjectDetailTaskColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_TASK_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailTaskColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_TASK_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function projectTaskStatusLabel(status) {
  return PROJECT_DETAIL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'TO DO';
}

export const PROJECT_DETAIL_TASK_GROUPS = [
  {
    id: 'S1',
    rows: [
      {
        id: 'task-s1-1',
        title: 'Sign-Off of GFCs - Execution Lead & Design Lead',
        assignees: [
          { id: 'u1', initials: 'SA', color: 'blue' },
          { id: 'u2', initials: 'RK', color: 'yellow' },
        ],
        floor: '',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '15th Nov 26',
        status: 'todo',
        priority: 'high',
      },
    ],
  },
  {
    id: 'E1',
    rows: [
      {
        id: 'task-e1-1',
        title: 'Layout Closure - Mail to HVAC Team - Design Lead',
        assignees: [
          { id: 'u3', initials: 'AA', color: 'blue' },
          { id: 'u4', initials: 'VP', color: 'red' },
          { id: 'u5', initials: 'SN', color: 'sky' },
          { id: 'u6', initials: 'PJ', color: 'purple' },
        ],
        floor: '2nd',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '24th Nov 26',
        status: 'todo',
        priority: 'high',
      },
    ],
  },
  {
    id: 'E2',
    rows: [
      {
        id: 'task-e2-1',
        title: 'Graphics and Branding Call - Designers',
        assignees: [{ id: 'u7', initials: 'DK', color: 'blue' }],
        floor: '1st',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '23rd Dec 26',
        status: 'todo',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'E3',
    rows: [
      {
        id: 'task-e3-1',
        title: 'Weekly Vendor Call - Execution Lead',
        assignees: [{ id: 'u8', initials: 'RM', color: 'blue' }],
        floor: '1st',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '15th Nov 24',
        status: 'todo',
        priority: 'medium',
      },
      {
        id: 'task-e3-2',
        title: 'Invite Marketing Team to Site - Execution Team',
        assignees: [{ id: 'u9', initials: 'RM', color: 'blue' }],
        floor: '2nd',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '15th Nov 24',
        status: 'todo',
        priority: 'medium',
      },
      {
        id: 'task-e3-3',
        title: 'Creation of Final BOQ - Commercials and Negotiation',
        assignees: [{ id: 'u10', initials: 'RM', color: 'blue' }],
        floor: '5th',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '15th Nov 24',
        status: 'todo',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'D1',
    rows: [
      {
        id: 'task-d1-1',
        title: 'IT Network Infra Call - Designer',
        assignees: [{ id: 'u11', initials: 'SA', color: 'yellow' }],
        floor: '1st',
        area: '',
        tags: ['GFC', 'Design'],
        due_date: '2 days ago',
        status: 'todo',
        priority: 'low',
        overdue: true,
      },
    ],
  },
];

export function getStoredProjectColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_LAYOUT_COLUMN_STORAGE_KEY = 'project-detail-layout-column-config';

export const PROJECT_DETAIL_LAYOUT_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_LAYOUT_COLUMN_WIDTHS = {
  // Percentage shares fill the row; Name stays modest (short titles) instead of taking leftover.
  name: 'w-[20%] min-w-[180px]',
  assignee: 'w-[14%] min-w-[160px]',
  floor: 'w-[12%] min-w-[148px]',
  tags: 'w-[14%] min-w-[120px]',
  due_date: 'w-[14%] min-w-[130px]',
  status: 'w-[14%] min-w-[160px]',
  priority: 'w-[14%] min-w-[110px]',
};

export function getStoredProjectDetailLayoutColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_LAYOUT_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailLayoutColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_LAYOUT_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_LAYOUT_GROUP_BY_OPTIONS = [
  { value: 'layout_type', label: 'Layout Type' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_LAYOUT_FILTER_SECTIONS = [
  { id: 'layout_type', label: 'Layout Type' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

/**
 * Status options for all project detail sections except Project Tasks
 * (Layouts, GFC, 3D, Graphics, Documents, Snags).
 */
export const PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS = [
  { value: 'Yet to Start', label: 'YET TO START' },
  { value: 'Work In Progress', label: 'WORK IN PROGRESS' },
  { value: 'Re-work', label: 'RE-WORK' },
  { value: 'Submitted for Approval', label: 'SUBMITTED FOR APPROVAL' },
  { value: 'Release', label: 'RELEASE' },
];

/** Alias — same options used by every non–Project Tasks section. */
export const PROJECT_DETAIL_SECTION_STATUS_OPTIONS = PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS;

/** Progress and badge colors for layout/section status dropdown (StatusDropdown). */
export const PROJECT_LAYOUT_STATUS_META = {
  'yet to start': { percentage: 10, color: 'blue' },
  'work in progress': { percentage: 40, color: 'orange' },
  're-work': { percentage: 50, color: 'purple' },
  'submitted for approval': { percentage: 70, color: 'green' },
  release: { percentage: 100, color: 'gray' },
  // Legacy / kebab aliases
  'yet-to-start': { percentage: 10, color: 'blue' },
  'work-in-progress': { percentage: 40, color: 'orange' },
  'submitted-for-approval': { percentage: 70, color: 'green' },
  pending: { percentage: 10, color: 'blue' },
  working: { percentage: 40, color: 'orange' },
  completed: { percentage: 100, color: 'gray' },
  done: { percentage: 100, color: 'gray' },
};

export const PROJECT_SECTION_STATUS_META = PROJECT_LAYOUT_STATUS_META;

export const PROJECT_DETAIL_LAYOUT_FILTER_OPTIONS = {
  layout_type: [
    { value: 'Floor Layout', label: 'Floor Layout' },
    { value: 'GFC Layout', label: 'GFC Layout' },
    { value: 'Concept Layout', label: 'Concept Layout' },
    { value: 'As-Built Layout', label: 'As-Built Layout' },
    { value: 'Furniture Layout', label: 'Furniture Layout' },
  ],
  status: PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [
    { value: 'SA', label: 'SA' },
    { value: 'RK', label: 'RK' },
    { value: 'AA', label: 'AA' },
    { value: 'VP', label: 'VP' },
    { value: 'SN', label: 'SN' },
    { value: 'PJ', label: 'PJ' },
    { value: 'DK', label: 'DK' },
    { value: 'RM', label: 'RM' },
  ],
  priority: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ],
};

export const PROJECT_DETAIL_LAYOUT_TYPE_OPTIONS = [
  { value: 'MEPF Layout', label: 'MEPF Layout' },
  { value: 'Designer Layout', label: 'Designer Layout' },
];

export const PROJECT_DETAIL_LAYOUT_GROUPS = [
  {
    id: 'S1',
    rows: [
      {
        id: 'layout-s1-1',
        title: '1st Floor Layout',
        version: 'V1',
        assignees: [
          { id: 'u1', initials: 'SA', color: 'blue' },
          { id: 'u2', initials: 'RK', color: 'yellow' },
          { id: 'u3', initials: 'AA', color: 'blue' },
        ],
        floor: '1st',
        tags: ['Design', 'GFC'],
        due_date: '12th Nov 25',
        status: 'yet-to-start',
        priority: 'low',
        layout_type: 'floor',
        description:
          'The coffee machine in the pantry area is not functioning properly and requires maintenance. Users have reported inconsistent brewing and unusual noises during operation.',
      },
      {
        id: 'layout-s1-2',
        title: '10th Floor Layout',
        version: 'V2',
        assignees: [
          { id: 'u4', initials: 'VP', color: 'red' },
          { id: 'u5', initials: 'SN', color: 'sky' },
        ],
        floor: '10th',
        tags: ['Design'],
        due_date: '20th Nov 25',
        status: 'work-in-progress',
        priority: 'medium',
        layout_type: 'gfc',
        description: 'Finalize the 10th floor GFC layout for client review.',
      },
      {
        id: 'layout-s1-3',
        title: '12th Floor Layout',
        version: 'V1',
        assignees: [{ id: 'u6', initials: 'PJ', color: 'purple' }],
        floor: '12th',
        tags: ['GFC'],
        due_date: '28th Nov 25',
        status: 'submitted-for-approval',
        priority: 'high',
        layout_type: 'concept',
        description: 'Concept layout for the 12th floor collaboration zone.',
      },
    ],
  },
  {
    id: 'E1',
    rows: [
      {
        id: 'layout-e1-1',
        title: 'Ground Floor Furniture Layout',
        version: 'V3',
        assignees: [
          { id: 'u7', initials: 'DK', color: 'blue' },
          { id: 'u8', initials: 'RM', color: 'blue' },
        ],
        floor: '1st',
        tags: ['Furniture'],
        due_date: '5th Dec 25',
        status: 're-work',
        priority: 'medium',
        layout_type: 'furniture',
        description: 'Update furniture placement based on revised BOQ.',
      },
      {
        id: 'layout-e1-2',
        title: 'Terrace As-Built Layout',
        version: 'V1',
        assignees: [{ id: 'u9', initials: 'SA', color: 'yellow' }],
        floor: '12th',
        tags: ['As-Built'],
        due_date: '15th Dec 25',
        status: 'release',
        priority: 'low',
        layout_type: 'as-built',
        description: 'As-built layout for terrace utility and services.',
      },
    ],
  },
];

export function layoutStatusLabel(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  const match = PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalized,
  );
  return match?.label ?? 'YET TO START';
}

export function colorForLayoutStatus(status) {
  const normalized = String(status ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ');
  if (normalized === 'yet to start' || normalized === 'pending') return 'blue';
  if (normalized === 'work in progress' || normalized === 'working') return 'orange';
  if (normalized === 're work' || normalized === 'rework') return 'purple';
  if (normalized === 'submitted for approval') return 'green';
  if (normalized === 'release' || normalized === 'completed' || normalized === 'done')
    return 'gray';
  return 'gray';
}

export function colorForLayoutPriority(priority) {
  const normalized = String(priority ?? '').toLowerCase();
  if (normalized === 'high') return 'orange';
  if (normalized === 'medium') return 'yellow';
  return 'green';
}

// --- Project detail: Areas tab ---

export const PROJECT_DETAIL_AREAS_COLUMN_STORAGE_KEY = 'project-detail-areas-column-config';

export const PROJECT_DETAIL_AREAS_COLUMNS = [
  { id: 'area_label', label: 'Area', visible: true, enableHiding: false },
  { id: 'area_type', label: 'Type', visible: true },
  { id: 'carpet_area', label: 'Carpet Area', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'description', label: 'Description', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'on_layout', label: 'On Layout', visible: true },
];

export const PROJECT_DETAIL_AREAS_COLUMN_WIDTHS = {
  area_label: 'w-[20%] min-w-[180px]',
  area_type: 'w-[12%] min-w-[100px]',
  carpet_area: 'w-[12%] min-w-[100px]',
  floor: 'w-[8%] min-w-[72px]',
  description: 'w-[20%] min-w-[160px]',
  status: 'w-[12%] min-w-[100px]',
  on_layout: 'w-[10%] min-w-[90px]',
};

export function getStoredProjectDetailAreasColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_AREAS_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailAreasColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_AREAS_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_AREAS_GROUP_BY_OPTIONS = [
  { value: 'floor', label: 'Floor' },
  { value: 'area_type', label: 'Area Type' },
];

export const PROJECT_DETAIL_AREAS_FILTER_SECTIONS = [
  { id: 'floor', label: 'Floor' },
  { id: 'area_type', label: 'Area Type' },
  { id: 'status', label: 'Status' },
];

// --- Project detail: GFC tab (TD/GFC documents) ---

export const PROJECT_DETAIL_GFC_COLUMN_STORAGE_KEY = 'project-detail-gfc-column-config';

export const PROJECT_DETAIL_GFC_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'area', label: 'Area', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_GFC_COLUMN_WIDTHS = {
  // Percentage shares fill the row; Name stays modest (short titles) instead of taking leftover.
  name: 'w-[18%] min-w-[180px]',
  assignee: 'w-[12%] min-w-[160px]',
  floor: 'w-[10%] min-w-[148px]',
  area: 'w-[16%] min-w-[220px]',
  tags: 'w-[12%] min-w-[120px]',
  due_date: 'w-[12%] min-w-[130px]',
  status: 'w-[12%] min-w-[160px]',
  priority: 'w-[12%] min-w-[110px]',
};

export function getStoredProjectDetailGfcColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_GFC_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailGfcColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_GFC_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_GFC_GROUP_BY_OPTIONS = [
  { value: 'floor', label: 'Floor' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_GFC_FILTER_SECTIONS = [
  { id: 'area', label: 'Area' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_GFC_FILTER_OPTIONS = {
  area: PROJECT_DETAIL_AREA_OPTIONS.map((option) => ({
    value: option.label,
    label: option.label,
  })),
  status: PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [
    { value: 'SA', label: 'SA' },
    { value: 'RK', label: 'RK' },
    { value: 'AA', label: 'AA' },
    { value: 'VP', label: 'VP' },
    { value: 'SN', label: 'SN' },
    { value: 'PJ', label: 'PJ' },
    { value: 'DK', label: 'DK' },
    { value: 'RM', label: 'RM' },
  ],
  priority: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ],
};

// --- Project detail: 3D tab ---

export const PROJECT_DETAIL_THREE_D_COLUMN_STORAGE_KEY = 'project-detail-three-d-column-config';

export const PROJECT_DETAIL_THREE_D_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_THREE_D_COLUMN_WIDTHS = {
  // Percentage shares fill the row; Name stays modest (short titles) instead of taking leftover.
  name: 'w-[20%] min-w-[180px]',
  assignee: 'w-[14%] min-w-[160px]',
  floor: 'w-[12%] min-w-[148px]',
  tags: 'w-[14%] min-w-[120px]',
  due_date: 'w-[14%] min-w-[130px]',
  status: 'w-[14%] min-w-[160px]',
  priority: 'w-[14%] min-w-[110px]',
};

export function getStoredProjectDetailThreeDColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_THREE_D_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailThreeDColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_THREE_D_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_THREE_D_GROUP_BY_OPTIONS = [
  { value: 'floor', label: 'Floor' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_THREE_D_FILTER_SECTIONS = [
  { id: 'area', label: 'Area' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_THREE_D_FILTER_OPTIONS = {
  area: PROJECT_DETAIL_AREA_OPTIONS.map((option) => ({
    value: option.label,
    label: option.label,
  })),
  status: PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [],
  priority: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ],
};

// --- Project detail: Graphics tab ---

export const PROJECT_DETAIL_GRAPHICS_COLUMN_STORAGE_KEY = 'project-detail-graphics-column-config';

export const PROJECT_DETAIL_GRAPHICS_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_GRAPHICS_COLUMN_WIDTHS = {
  // Percentage shares fill the row; Name stays modest (short titles) instead of taking leftover.
  name: 'w-[20%] min-w-[180px]',
  assignee: 'w-[14%] min-w-[160px]',
  floor: 'w-[12%] min-w-[148px]',
  tags: 'w-[14%] min-w-[120px]',
  due_date: 'w-[14%] min-w-[130px]',
  status: 'w-[14%] min-w-[160px]',
  priority: 'w-[14%] min-w-[110px]',
};

export function getStoredProjectDetailGraphicsColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_GRAPHICS_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailGraphicsColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_GRAPHICS_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_GRAPHICS_GROUP_BY_OPTIONS = [
  { value: 'floor', label: 'Floor' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_GRAPHICS_FILTER_SECTIONS = [
  { id: 'area', label: 'Area' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_GRAPHICS_FILTER_OPTIONS = {
  area: PROJECT_DETAIL_AREA_OPTIONS.map((option) => ({
    value: option.label,
    label: option.label,
  })),
  status: PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [],
  priority: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ],
};

export const PROJECT_DETAIL_GFC_ROWS = [
  {
    id: 'gfc-1',
    title: 'Ground Floor Furniture Layout',
    version: 'V1',
    assignees: [
      { id: 'u1', initials: 'SA', color: 'blue' },
      { id: 'u2', initials: 'RK', color: 'yellow' },
    ],
    floor: '1st',
    area: 'meeting-room-1',
    tags: ['GFC', 'Design'],
    due_date: '23rd Dec 26',
    status: 'work-in-progress',
    priority: 'low',
    description:
      'The coffee machine in the pantry area is not functioning properly and requires maintenance. Users have reported inconsistent brewing and unusual noises during operation.',
    attachments: [
      {
        id: 'gfc-att-1',
        name: 'GFC.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
    ],
  },
  {
    id: 'gfc-2',
    title: 'Fire Safety & Exit Plan',
    version: 'V1',
    assignees: [
      { id: 'u3', initials: 'AA', color: 'blue' },
      { id: 'u4', initials: 'VP', color: 'red' },
    ],
    floor: '10th',
    area: 'director-cabin',
    tags: ['GFC'],
    due_date: '23rd Dec 26',
    status: 'work-in-progress',
    priority: 'medium',
    description: 'Fire safety layout and exit routing for the 10th floor.',
    attachments: [],
  },
  {
    id: 'gfc-3',
    title: 'Flooring Pattern Layout',
    version: 'V1',
    assignees: [
      { id: 'u5', initials: 'SN', color: 'sky' },
      { id: 'u6', initials: 'PJ', color: 'purple' },
    ],
    floor: '12th',
    area: 'private-cabin',
    tags: ['GFC', 'Design'],
    due_date: '23rd Dec 26',
    status: 'work-in-progress',
    priority: 'low',
    description: 'Flooring pattern and material specification for private cabins.',
    attachments: [],
  },
  {
    id: 'gfc-4',
    title: 'Pantry & Utility GFC',
    version: 'V2',
    assignees: [{ id: 'u7', initials: 'DK', color: 'blue' }],
    floor: '1st',
    area: 'meeting-room-1',
    tags: ['GFC'],
    due_date: '5th Jan 27',
    status: 'yet-to-start',
    priority: 'high',
    description: 'Utility and pantry area GFC for ground floor.',
    attachments: [],
  },
  {
    id: 'gfc-5',
    title: 'Meeting Room Acoustic Layout',
    version: 'V1',
    assignees: [
      { id: 'u8', initials: 'RM', color: 'blue' },
      { id: 'u1', initials: 'SA', color: 'blue' },
    ],
    floor: '2nd',
    area: 'meeting-room-1',
    tags: ['Design'],
    due_date: '15th Jan 27',
    status: 'submitted-for-approval',
    priority: 'medium',
    description: 'Acoustic treatment layout for primary meeting rooms.',
    attachments: [],
  },
];

// --- Project detail: More menu & Documents tab ---

export const PROJECT_DETAIL_MORE_MENU_OPTIONS = [
  { id: 'documents', label: 'Documentation', tabId: 'documents' },
  { id: 'snags', label: 'Snags', tabId: 'snags' },
  { id: 'selection', label: 'Selection', tabId: 'selection' },
  { id: 'site_survey', label: 'Site Survey', tabId: 'site_survey' },
];

export const PROJECT_DETAIL_MORE_TAB_DEFINITIONS = {
  documents: { id: 'documents', label: 'Documents', icon: 'file-text-line' },
  snags: { id: 'snags', label: 'Snags', icon: 'task-line' },
  selection: { id: 'selection', label: 'Selection', icon: 'shake-hands-line' },
  site_survey: { id: 'site_survey', label: 'Site Survey', icon: 'map-pin-line' },
};

export const PROJECT_DETAIL_TAB_PREFERENCES_STORAGE_KEY = 'project-detail-tab-preferences';

/** All project detail sections (primary tabs + more-menu tabs) in default display order. */
export function getProjectDetailAllSectionTabs() {
  const moreLabelById = Object.fromEntries(
    PROJECT_DETAIL_MORE_MENU_OPTIONS.map((option) => [option.tabId, option.label]),
  );

  const moreTabs = Object.values(PROJECT_DETAIL_MORE_TAB_DEFINITIONS).map((definition) => ({
    id: definition.id,
    label: moreLabelById[definition.id] ?? definition.label,
    icon: definition.icon,
  }));

  return [...PROJECT_DETAIL_TABS, ...moreTabs];
}

export const PROJECT_DETAIL_COLLECTIONS_STATS = {
  design_fees: { label: 'Design Fees', value: '₹0', valueClassName: 'text-information-base' },
  original_boq: { label: 'Original BOQ', value: '₹0', valueClassName: 'text-text-main-900' },
  additional_boq: {
    label: 'Additional BOQ',
    value: '₹0',
    valueClassName: 'text-warning-base',
  },
  total_boq_value: {
    label: 'Total BOQ Value',
    value: '₹0',
    valueClassName: 'text-information-base',
  },
  invoiced_with_gst: {
    label: 'Invoiced (W GST)',
    value: '₹0',
    valueClassName: 'text-feature-base',
  },
  net_received: {
    label: 'Net Received',
    value: '₹0',
    valueClassName: 'text-success-base',
  },
  outstanding: {
    label: 'Outstanding',
    value: '₹0',
    valueClassName: 'text-[#9A5B13]',
  },
  overdue: {
    label: 'Overdue',
    value: '₹0',
    valueClassName: 'text-error-base',
  },
};

export const PROJECT_DETAIL_COLLECTION_PLAN_DEFAULT = {
  boq_code: 'BOQ-VAR-001',
  boq_name: 'Variation — Additional Electrical Works',
  boq_value: '3000000',
  gst: '18',
  tds: '1',
  milestones: [
    {
      id: 'milestone-1',
      name: 'Advance',
      payment_percent: '60',
      expected_invoice_date: '',
      timeline: '',
      expected_pay_date: '',
      invoice_required: true,
      remark: '',
    },
    {
      id: 'milestone-2',
      name: 'Design Approval',
      payment_percent: '40',
      expected_invoice_date: '',
      timeline: '',
      expected_pay_date: '',
      invoice_required: false,
      remark: '',
    },
  ],
};

export const PROJECT_DETAIL_COLLECTION_STATUS_META = {
  received: { label: 'RECEIVED', color: 'green' },
  overdue: { label: 'OVERDUE', color: 'red' },
  planned: { label: 'PLANNED', color: 'gray' },
};

export const PROJECT_DETAIL_COLLECTION_COLUMN_STORAGE_KEY =
  'project-detail-collection-column-config';

export const PROJECT_DETAIL_COLLECTION_COLUMNS = [
  { id: 'milestone', label: 'Milestone', visible: true, enableHiding: false },
  { id: 'boq_type', label: 'BOQ Type', visible: true },
  { id: 'invoice_no', label: 'Invoice No.', visible: true },
  { id: 'expected_invoice_date', label: 'Exp. Inv. Date', visible: true },
  { id: 'actual_invoice_date', label: 'Actual Inv. Date', visible: true },
  { id: 'expected_payment_date', label: 'Exp. Pay Date', visible: true },
  { id: 'actual_payment_date', label: 'Actual Payment Date', visible: true },
  { id: 'payment_commitment_date', label: 'Payment Commitment Date', visible: true },
  { id: 'net_receivable', label: 'Net Receivable (₹)', visible: true },
  { id: 'received', label: 'Received (₹)', visible: true },
  { id: 'pay_percent', label: 'Pay (%)', visible: true },
  { id: 'boq_ref_value', label: 'BOQ Ref. Val. (₹)', visible: true },
  { id: 'invoice_with_gst', label: 'Inv. (with GST) (₹)', visible: true },
  { id: 'tds_percent', label: 'TDS (%)', visible: true },
  { id: 'tds_amount', label: 'TDS Amt. (₹)', visible: true },
  { id: 'balance', label: 'Balance (₹)', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const PROJECT_DETAIL_COLLECTION_GROUP_BY_OPTIONS = [
  { value: 'boq_type', label: 'BOQ Type' },
  { value: 'status', label: 'Status' },
  { value: 'expected_invoice_date', label: 'Exp. Inv. Date' },
  { value: 'expected_payment_date', label: 'Exp. Pay Date' },
  { value: 'actual_invoice_date', label: 'Actual Inv. Date' },
];

export const PROJECT_DETAIL_COLLECTION_FILTER_SECTIONS = [
  { id: 'boq_type', label: 'BOQ Type' },
  { id: 'status', label: 'Status' },
];

export const PROJECT_DETAIL_COLLECTION_FILTER_OPTIONS = {
  boq_type: [
    { value: 'Original', label: 'Original' },
    { value: 'Additional', label: 'Additional' },
    { value: 'Design', label: 'Design' },
  ],
  status: [
    { value: 'planned', label: 'Planned' },
    { value: 'received', label: 'Received' },
    { value: 'overdue', label: 'Overdue' },
  ],
};

export function getStoredProjectDetailCollectionColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_COLLECTION_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailCollectionColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_COLLECTION_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

// --- Project detail: Billing & QC tab ---

export const PROJECT_DETAIL_BILLING_QC_COLUMN_STORAGE_KEY =
  'project-detail-billing-qc-column-config';

export const PROJECT_DETAIL_BILLING_QC_COLUMNS = [
  { id: 'vendor_name', label: 'Vendor Name', visible: true, enableHiding: false },
  { id: 'package', label: 'Package', visible: true },
  { id: 'submission_date', label: 'Submission Date', visible: true },
  { id: 'area', label: 'Area', visible: true },
  { id: 'certified_by', label: 'Certified By', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'last_updated', label: 'Last Updated', visible: false },
  { id: 'po_value', label: 'PO Value', visible: false },
  { id: 'gmr_value', label: 'GMR Value', visible: false },
];

export const PROJECT_DETAIL_BILLING_QC_COLUMN_WIDTHS = {
  vendor_name: 'w-[161px] min-w-[161px]',
  package: 'w-[188px] min-w-[188px]',
  submission_date: 'min-w-[140px]',
  area: 'min-w-[80px]',
  certified_by: 'w-[200px] min-w-[200px]',
  status: 'min-w-[120px]',
  last_updated: 'min-w-[140px]',
  po_value: 'min-w-[120px]',
  gmr_value: 'min-w-[120px]',
};

export const PROJECT_DETAIL_BILLING_QC_STATUS_META = {
  draft: {
    label: 'DRAFT',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
  Draft: {
    label: 'DRAFT',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
  certified: {
    label: 'CERTIFIED',
    className: 'bg-[#B5DFCC] text-[#045933]',
  },
  Certified: {
    label: 'CERTIFIED',
    className: 'bg-[#B5DFCC] text-[#045933]',
  },
  submitted: {
    label: 'SUBMITTED',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
  Submitted: {
    label: 'SUBMITTED',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
  under_review: {
    label: 'UNDER REVIEW',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
  'Under Review': {
    label: 'UNDER REVIEW',
    className: 'bg-bg-weak-100 text-text-sub-500',
  },
};

export function getStoredProjectDetailBillingQcColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_BILLING_QC_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailBillingQcColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_BILLING_QC_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_BILLING_QC_SEED = [
  {
    id: 'billing-qc-1',
    vendor_name: 'Lotus Electricals',
    reference_code: 'TMP-001',
    packages: ['Electrical', 'Carpentry'],
    submission_date: '26 Jun 2026',
    area: '4',
    certified_by: null,
    status: 'draft',
    last_updated: '20 Jun 2026',
    po_value: '₹12.50 L',
    gmr_value: '₹10.00 L',
  },
  {
    id: 'billing-qc-2',
    vendor_name: 'Modern Carpentry',
    reference_code: 'TMP-002',
    packages: ['Plumbing'],
    submission_date: '26 Jun 2026',
    area: '5',
    certified_by: null,
    status: 'draft',
    last_updated: '19 Jun 2026',
    po_value: '₹8.20 L',
    gmr_value: '₹7.50 L',
  },
  {
    id: 'billing-qc-3',
    vendor_name: 'Skyline HVAC',
    reference_code: 'TMP-003',
    packages: ['HVAC'],
    submission_date: '22 Jun 2026',
    area: '5',
    certified_by: null,
    status: 'draft',
    last_updated: '18 Jun 2026',
    po_value: '₹15.00 L',
    gmr_value: '₹14.20 L',
  },
  {
    id: 'billing-qc-4',
    vendor_name: 'Perfect Plumbing',
    reference_code: 'TMP-004',
    packages: ['Plumbing'],
    submission_date: '18 Jun 2026',
    area: '4',
    certified_by: { initials: 'GH', name: 'Guy Hawkins', color: 'gray' },
    status: 'certified',
    last_updated: '17 Jun 2026',
    po_value: '₹6.80 L',
    gmr_value: '₹6.10 L',
  },
  {
    id: 'billing-qc-5',
    vendor_name: 'Elite Electricals',
    reference_code: 'TMP-005',
    packages: ['Electrical'],
    submission_date: '16 Jun 2026',
    area: '5',
    certified_by: { initials: 'RF', name: 'Robert Fox', color: 'gray' },
    status: 'certified',
    last_updated: '15 Jun 2026',
    po_value: '₹11.40 L',
    gmr_value: '₹10.80 L',
  },
];

export const PROJECT_DETAIL_BILLING_QC_VENDOR_TABS = [
  { id: 'summary', label: 'Summary', icon: 'information-line' },
  { id: 'mr', label: 'MR', icon: 'ruler-2-line' },
  { id: 'jmr', label: 'JMR', icon: 'ruler-2-line' },
];

export const PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_STORAGE_KEY =
  'project-detail-billing-qc-jmr-v7-column-config';

export const PROJECT_DETAIL_BILLING_QC_MR_COLUMN_STORAGE_KEY =
  'project-detail-billing-qc-mr-v3-column-config';

/** Column order matches vendor portal Work Order MR table. */
export const PROJECT_DETAIL_BILLING_QC_MR_COLUMNS = [
  { id: 'subarea', label: 'Subarea', visible: true, enableHiding: false },
  { id: 'po_item', label: 'PO Item', visible: true },
  { id: 'uom', label: 'UOM', visible: true },
  { id: 'vendor_length', label: 'Length', visible: true },
  { id: 'vendor_breadth', label: 'Breadth', visible: true },
  { id: 'vendor_height', label: 'Height', visible: true },
  { id: 'vendor_qty', label: 'Qty.', visible: true },
  { id: 'po_rate', label: 'PO Rate', visible: true },
  { id: 'vendor_amount', label: 'Amount', visible: true },
  { id: 'description', label: 'Description', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_GROUPS = [
  { id: 'item', label: null, columnIds: ['subarea', 'po_item', 'uom', 'po_rate'] },
  {
    id: 'mr',
    label: 'MR',
    columnIds: ['vendor_length', 'vendor_breadth', 'vendor_height', 'vendor_qty', 'vendor_amount'],
  },
  {
    id: 'gmr',
    label: 'GMR',
    columnIds: ['same_as_vendor', 'length', 'breadth', 'height', 'qty', 'amount', 'difference'],
  },
  {
    id: 'meta',
    label: null,
    columnIds: ['description', 'remarks', 'photo', 'snags'],
  },
];

export const PROJECT_DETAIL_BILLING_QC_JMR_COLUMNS = [
  { id: 'subarea', label: 'Subarea', visible: true, enableHiding: false },
  { id: 'po_item', label: 'PO Item', visible: true },
  { id: 'uom', label: 'UOM', visible: true },
  { id: 'po_rate', label: 'PO Rate', visible: true },
  { id: 'vendor_length', label: 'Length', visible: true },
  { id: 'vendor_breadth', label: 'Breadth', visible: true },
  { id: 'vendor_height', label: 'Height', visible: true },
  { id: 'vendor_qty', label: 'Qty.', visible: true },
  { id: 'vendor_amount', label: 'Amount', visible: true },
  { id: 'same_as_vendor', label: 'Same as Vendor', visible: true },
  { id: 'length', label: 'Length', visible: true },
  { id: 'breadth', label: 'Breadth', visible: true },
  { id: 'height', label: 'Height', visible: true },
  { id: 'qty', label: 'Qty.', visible: true },
  { id: 'amount', label: 'Amount', visible: true },
  { id: 'difference', label: 'Difference', visible: true },
  { id: 'description', label: 'Description', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
  { id: 'photo', label: 'Photo', visible: true },
  { id: 'snags', label: 'Snags', visible: true },
];

export const PROJECT_DETAIL_BILLING_QC_JMR_FULL_TABLE_MIN_WIDTH = 3010;

/** Aligns with vendor Work Order MR column widths (~140+260+80+96*4+96+96+220+120). */
export const PROJECT_DETAIL_BILLING_QC_MR_FULL_TABLE_MIN_WIDTH = 1400;

export const PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_WIDTHS = {
  subarea: 'w-[184px] min-w-[184px]',
  po_item: 'w-[236px] min-w-[236px]',
  uom: 'w-[99px] min-w-[99px]',
  po_rate: 'w-[108px] min-w-[108px]',
  length: 'w-[96px] min-w-[96px]',
  breadth: 'w-[99px] min-w-[99px]',
  height: 'w-[88px] min-w-[88px]',
  qty: 'w-[120px] min-w-[120px]',
  amount: 'w-[140px] min-w-[140px]',
  description: 'w-[249px] min-w-[249px]',
  same_as_vendor: 'w-[160px] min-w-[160px]',
  vendor_length: 'w-[96px] min-w-[96px]',
  vendor_breadth: 'w-[99px] min-w-[99px]',
  vendor_height: 'w-[88px] min-w-[88px]',
  vendor_qty: 'w-[120px] min-w-[120px]',
  vendor_amount: 'w-[140px] min-w-[140px]',
  difference: 'w-[140px] min-w-[140px]',
  remarks: 'w-[183px] min-w-[183px]',
  photo: 'w-[160px] min-w-[160px]',
  snags: 'w-[100px] min-w-[100px]',
};

/** Vendor Work Order MR column widths — used for Billing & QC MR tab only. */
export const PROJECT_DETAIL_BILLING_QC_MR_COLUMN_WIDTHS = {
  subarea: 'w-[140px] min-w-[140px]',
  po_item: 'w-[260px] min-w-[260px]',
  uom: 'w-[80px] min-w-[80px]',
  po_rate: 'w-[96px] min-w-[96px]',
  vendor_length: 'w-[96px] min-w-[96px]',
  vendor_breadth: 'w-[96px] min-w-[96px]',
  vendor_height: 'w-[96px] min-w-[96px]',
  vendor_qty: 'w-[96px] min-w-[96px]',
  vendor_amount: 'w-[96px] min-w-[96px]',
  description: 'w-[220px] min-w-[220px]',
  remarks: 'w-[120px] min-w-[120px]',
};

export function getStoredProjectDetailBillingQcJmrColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailBillingQcJmrColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_BILLING_QC_JMR_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function getStoredProjectDetailBillingQcMrColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_BILLING_QC_MR_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailBillingQcMrColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_BILLING_QC_MR_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function getBillingQcVendorById(vendorId) {
  return PROJECT_DETAIL_BILLING_QC_SEED.find((row) => row.id === vendorId) ?? null;
}

export function buildProjectDetailBillingQcFloorFilters(areas = []) {
  const filters = [{ id: 'all', label: 'All' }];
  const seen = new Set();

  for (const area of Array.isArray(areas) ? areas : []) {
    const floor = String(area?.floor ?? '').trim();
    const key = floor.toLowerCase();
    if (!floor || seen.has(key)) continue;

    seen.add(key);
    filters.push({
      id: floor,
      label: String(area?.floor_badge ?? area?.floorLabel ?? floor).trim() || floor,
    });
  }

  return filters;
}

const JMR_TOTALS = { mr: '₹ 1,29,41,050', gmr: '0', difference: '0' };

const JMR_ELECTRICAL_ITEMS = [
  {
    id: 'jmr-item-1',
    subarea: 'Ceiling Electrical',
    po_item: 'Ceiling Electrical',
    uom: 'Sqft',
    po_rate: '₹ 120',
    length: '0',
    breadth: '0',
    height: '0',
    qty: '24',
    amount: '₹ 43,340',
    description: 'Electrical Work: Ceiling Electrical',
    same_as_vendor: false,
    vendor_length: '0',
    vendor_breadth: '0',
    vendor_height: '0',
    vendor_qty: '0',
    vendor_amount: '0',
    difference: '0',
    remarks: '',
    has_photo: false,
    snags_count: 0,
  },
  {
    id: 'jmr-item-2',
    subarea: '9M Ring Type Lugs',
    po_item: '9M Ring Type Lugs',
    uom: 'Nos',
    po_rate: '₹ 65',
    length: '0',
    breadth: '0',
    height: '0',
    qty: '12',
    amount: '₹ 32,540',
    description: 'Electrical Work: 9M Ring Type Lugs',
    same_as_vendor: false,
    vendor_length: '0',
    vendor_breadth: '0',
    vendor_height: '0',
    vendor_qty: '0',
    vendor_amount: '0',
    difference: '0',
    remarks: '',
    has_photo: false,
    snags_count: 0,
  },
];

const JMR_CARPENTRY_ITEMS = [
  {
    id: 'jmr-item-3',
    subarea: 'Ceiling Electrical',
    po_item: 'Ceiling Electrical',
    uom: 'Sqft',
    po_rate: '₹ 120',
    length: '0',
    breadth: '0',
    height: '0',
    qty: '24',
    amount: '₹ 43,340',
    description: 'Carpentry Work: Ceiling Electrical',
    same_as_vendor: false,
    vendor_length: '0',
    vendor_breadth: '0',
    vendor_height: '0',
    vendor_qty: '0',
    vendor_amount: '0',
    difference: '0',
    remarks: '',
    has_photo: false,
    snags_count: 0,
  },
  {
    id: 'jmr-item-4',
    subarea: '9M Ring Type Lugs',
    po_item: '9M Ring Type Lugs',
    uom: 'Nos',
    po_rate: '₹ 65',
    length: '0',
    breadth: '0',
    height: '0',
    qty: '0',
    amount: '0',
    description: 'Carpentry Work: 9M Ring Type Lugs',
    same_as_vendor: false,
    vendor_length: '0',
    vendor_breadth: '0',
    vendor_height: '0',
    vendor_qty: '0',
    vendor_amount: '0',
    difference: '0',
    remarks: '',
    has_photo: false,
    snags_count: 0,
  },
];

export const PROJECT_DETAIL_BILLING_QC_JMR_SEED = {
  'billing-qc-1': [
    {
      id: 'reception',
      name: 'Reception',
      floor: '1',
      floor_badge: '1st',
      ...JMR_TOTALS,
      categories: [
        {
          id: 'electrical-works',
          name: 'Electrical Works',
          ...JMR_TOTALS,
          items: JMR_ELECTRICAL_ITEMS,
        },
        {
          id: 'carpentry-works',
          name: 'Carpentry Works',
          ...JMR_TOTALS,
          items: JMR_CARPENTRY_ITEMS,
        },
      ],
    },
    {
      id: 'lounge',
      name: 'Lounge',
      floor: '1',
      floor_badge: '1st',
      ...JMR_TOTALS,
      categories: [],
    },
    {
      id: 'director-cabin-1st',
      name: 'Director Cabin',
      floor: '1',
      floor_badge: '1st',
      ...JMR_TOTALS,
      categories: [],
    },
    {
      id: 'director-cabin-2nd',
      name: 'Director Cabin',
      floor: '2',
      floor_badge: '2nd',
      ...JMR_TOTALS,
      categories: [],
    },
    {
      id: 'conference-room',
      name: 'Conference Room',
      floor: '1',
      floor_badge: '1st',
      ...JMR_TOTALS,
      categories: [],
    },
    {
      id: 'meeting-room-2nd',
      name: '2 Seater Meeting Room',
      floor: '2',
      floor_badge: '2nd',
      ...JMR_TOTALS,
      categories: [],
    },
    {
      id: 'workstations',
      name: 'Workstations',
      floor: '1',
      floor_badge: '1st',
      ...JMR_TOTALS,
      categories: [],
    },
  ],
};

export const PROJECT_DETAIL_COLLECTIONS_SEED = [
  {
    id: 'advance-payment',
    milestone: 'Advance Payment',
    boq_type: 'Original',
    invoice_no: 'INV-TOP-001',
    invoice_date: '23rd Dec 26',
    due_date: '23rd Dec 26',
    net_receivable: '50.02 L',
    received: '50.45 L',
    pay_percent: '15',
    boq_ref_value: '42.75 L',
    invoice_with_gst: '50.45 L',
    tds_percent: '1',
    tds_amount: '42,750',
    balance: '-',
    expected_date: '23rd Dec 26',
    status: 'received',
    remarks:
      'Minor paint touch-up work is still pending in a few areas and requires final finishing corrections.',
    attachments: [
      {
        id: 'advance-payment-attachment',
        name: 'Attachment.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
    ],
  },
  {
    id: 'design-approval',
    milestone: 'Design Approval',
    boq_type: 'Original',
    invoice_no: 'INV-TOP-001',
    invoice_date: '23rd Dec 26',
    due_date: '23rd Dec 26',
    net_receivable: '33.34 L',
    received: '33.63 L',
    pay_percent: '10',
    boq_ref_value: '28.50 L',
    invoice_with_gst: '33.63 L',
    tds_percent: '2',
    tds_amount: '28,500',
    balance: '-',
    expected_date: '23rd Dec 26',
    status: 'overdue',
    remarks: '',
  },
  {
    id: 'site-mobilization',
    milestone: 'Site Mobilization',
    boq_type: 'Original',
    invoice_no: 'INV-TOP-001',
    invoice_date: '23rd Dec 26',
    due_date: '23rd Dec 26',
    net_receivable: '33.20 L',
    received: '14.43 L',
    pay_percent: '10',
    boq_ref_value: '28.50 L',
    invoice_with_gst: '33.63 L',
    tds_percent: '3',
    tds_amount: '28,500',
    balance: '18.77 L',
    expected_date: '23rd Dec 26',
    status: 'planned',
    remarks: '',
  },
];

export const PROJECT_DETAIL_DOCUMENT_COLUMN_STORAGE_KEY = 'project-detail-document-column-config';

export const PROJECT_DETAIL_DOCUMENT_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'category', label: 'Category', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_DOCUMENT_COLUMN_WIDTHS = {
  name: 'w-[22%] min-w-[200px]',
  category: 'w-[16%] min-w-[180px]',
  assignee: 'w-[14%] min-w-[160px]',
  tags: 'w-[14%] min-w-[120px]',
  due_date: 'w-[12%] min-w-[148px]',
  status: 'w-[14%] min-w-[160px]',
  priority: 'w-[12%] min-w-[110px]',
};

export const PROJECT_DETAIL_DOCUMENT_STATUS_OPTIONS = PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS;

export const PROJECT_DOCUMENT_STATUS_META = PROJECT_LAYOUT_STATUS_META;

export function getStoredProjectDetailDocumentColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_DOCUMENT_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailDocumentColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_DOCUMENT_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export const PROJECT_DETAIL_DOCUMENT_ROWS = [
  {
    id: 'doc-1',
    title: 'Client Requirement Document',
    category: 'pre-sales',
    assignees: [
      { id: 'u1', initials: 'SA', color: 'blue' },
      { id: 'u2', initials: 'RK', color: 'yellow' },
      { id: 'u3', initials: 'AA', color: 'blue' },
    ],
    tags: ['3D', 'Design'],
    due_date: '23rd Dec 26',
    status: 'pending',
    priority: 'low',
    description:
      'The coffee machine in the pantry area is not functioning properly and requires maintenance. Users have reported inconsistent brewing and unusual noises during operation.',
    attachments: [
      {
        id: 'doc-att-1',
        name: 'Attachment.pdf',
        size: '120 KB',
        uploadedAt: '12th Nov 25, 8:40 AM',
      },
    ],
  },
  {
    id: 'doc-2',
    title: 'Space Requirement Sheet',
    category: 'design-planning',
    assignees: [
      { id: 'u4', initials: 'VP', color: 'red' },
      { id: 'u5', initials: 'SN', color: 'sky' },
    ],
    tags: ['Design'],
    due_date: '23rd Dec 26',
    status: 'pending',
    priority: 'low',
    description: 'Detailed space requirement sheet for client review.',
    attachments: [],
  },
  {
    id: 'doc-3',
    title: 'Site Survey Report',
    category: 'procurement',
    assignees: [{ id: 'u6', initials: 'PJ', color: 'purple' }],
    tags: ['3D'],
    due_date: '23rd Dec 26',
    status: 'pending',
    priority: 'medium',
    description: 'Site survey findings and recommendations.',
    attachments: [],
  },
  {
    id: 'doc-4',
    title: 'Vendor Comparison Matrix',
    category: 'procurement',
    assignees: [
      { id: 'u7', initials: 'DK', color: 'blue' },
      { id: 'u8', initials: 'RM', color: 'blue' },
    ],
    tags: ['Document'],
    due_date: '10th Jan 27',
    status: 'new',
    priority: 'high',
    description: 'Comparison matrix for shortlisted vendors.',
    attachments: [],
  },
];

// --- Project detail: Snags tab ---

export const PROJECT_DETAIL_SNAG_COLUMN_STORAGE_KEY = 'project-detail-snag-column-config';

export const PROJECT_DETAIL_SNAG_STATUS_OPTIONS = PROJECT_DETAIL_STATUS_OPTIONS;

export const PROJECT_SNAG_STATUS_META = PROJECT_TASK_STATUS_META;

export const PROJECT_DETAIL_SNAG_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'category', label: 'Product Category', visible: true },
  { id: 'sub_category', label: 'Sub-category', visible: false },
  { id: 'floor', label: 'Floor', visible: true },
  { id: 'area', label: 'Area', visible: true },
  { id: 'source', label: 'Source', visible: true },
  { id: 'raised_by', label: 'Raised By', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'tags', label: 'Tags', visible: true },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const PROJECT_DETAIL_SNAG_COLUMN_WIDTHS = {
  name: 'w-[16%] min-w-[160px]',
  category: 'w-[14%] min-w-[140px]',
  sub_category: 'w-[12%] min-w-[100px]',
  floor: 'w-[7%] min-w-[60px]',
  area: 'w-[12%] min-w-[100px]',
  source: 'w-[8%] min-w-[80px]',
  raised_by: 'w-[10%] min-w-[90px]',
  assignee: 'w-[10%] min-w-[90px]',
  tags: 'w-[12%] min-w-[100px]',
  due_date: 'w-[10%] min-w-[90px]',
  status: 'w-[12%] min-w-[110px]',
  priority: 'w-[9%] min-w-[80px]',
};

export const PROJECT_DETAIL_SNAG_GROUP_BY_OPTIONS = [
  { value: 'snag_source', label: 'Snag Source' },
  { value: 'category', label: 'Product Category' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_SNAG_FILTER_SECTIONS = [
  { id: 'category', label: 'Product Category' },
  { id: 'snag_source', label: 'Snag Source' },
  { id: 'status', label: 'Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
];

export const PROJECT_DETAIL_SNAG_FILTER_OPTIONS = {
  category: [],
  snag_source: [
    { value: 'Internal', label: 'Internal' },
    { value: 'Client', label: 'Client' },
    { value: 'PMC', label: 'PMC' },
    { value: 'External', label: 'External' },
  ],
  status: PROJECT_DETAIL_LAYOUT_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
  assignee: [],
  priority: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ],
};

export function getStoredProjectDetailSnagColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_SNAG_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailSnagColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_SNAG_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function snagStatusLabel(statusValue) {
  return (
    PROJECT_DETAIL_SNAG_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ??
    String(statusValue ?? 'PENDING').toUpperCase()
  );
}

// --- Project detail: Selection tab ---

export const PROJECT_DETAIL_SELECTION_STATUS_OPTIONS = [
  { value: 'Pending', label: 'PENDING' },
  { value: 'Sent to Purchase', label: 'SENT TO PURCHASE' },
  { value: 'PO Given', label: 'PO GIVEN' },
  { value: 'Delivered', label: 'DELIVERED' },
];

export const PROJECT_DETAIL_PO_STATUS_OPTIONS = [
  { value: 'Pending', label: 'PENDING' },
  { value: 'PO Given', label: 'PO GIVEN' },
  { value: 'Delivered', label: 'DELIVERED' },
];

export const PROJECT_DETAIL_DELIVERY_STATUS_OPTIONS = [
  { value: 'Pending', label: 'PENDING' },
  { value: 'Dispatched', label: 'DISPATCHED' },
  { value: 'Delivered', label: 'DELIVERED' },
];

export const PROJECT_DETAIL_SELECTION_PRIORITY_OPTIONS = [
  { value: 'select', label: 'Select' },
  { value: 'high', label: 'HIGH' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'low', label: 'LOW' },
];

/** Keys must be lowercase — getStatusMetaForOption normalizes values with toLowerCase(). */
export const PROJECT_SELECTION_STATUS_META = {
  pending: { percentage: 0, color: 'gray' },
  'sent to purchase': { percentage: 50, color: 'orange' },
  'po given': { percentage: 75, color: 'blue' },
  delivered: { percentage: 100, color: 'green' },
};

export const PROJECT_PO_STATUS_META = {
  pending: { percentage: 0, color: 'gray' },
  'po given': { percentage: 75, color: 'blue' },
  delivered: { percentage: 100, color: 'green' },
};

export const PROJECT_DELIVERY_STATUS_META = {
  pending: { percentage: 0, color: 'gray' },
  dispatched: { percentage: 50, color: 'orange' },
  delivered: { percentage: 100, color: 'green' },
};

export const PROJECT_SELECTION_PARENT_TABLE_MIN_WIDTH = 1850;
export const PROJECT_SELECTION_CHALLAN_NAME_MAX_LENGTH = 24;
export const PROJECT_SELECTION_AVATAR_COLORS = [
  'blue',
  'yellow',
  'red',
  'green',
  'purple',
  'orange',
];
export const PROJECT_SELECTION_CATEGORY_DATE_FIELDS = [
  'exp_selection_date',
  'exp_po_date',
  'exp_delivery_date',
];
export const PROJECT_SELECTION_ITEM_DATE_FIELDS = ['exp_selection_date'];

export const PROJECT_DETAIL_SELECTION_GROUP_BY_OPTIONS = [
  { value: 'order_category', label: 'Order Type' },
  { value: 'selection_status', label: 'Selection Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'product_category', label: 'Product Category' },
];

export const PROJECT_DETAIL_SELECTION_FILTER_SECTIONS = [
  { id: 'status', label: 'Selection Status' },
  { id: 'po_status', label: 'PO Status' },
  { id: 'delivery_status', label: 'Delivery Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'priority', label: 'Priority' },
  { id: 'order_category', label: 'Order Type' },
  { id: 'product_category', label: 'Product Category' },
];

export const PROJECT_DETAIL_SELECTION_COLUMN_STORAGE_KEY = 'project-detail-selection-column-config';

export const PROJECT_DETAIL_SELECTION_COLUMNS = [
  { id: 'title', label: 'Title', visible: true, enableHiding: false },
  { id: 'product_category', label: 'Product Category', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'exp_selection_date', label: 'Exp. Selection Date', visible: true },
  { id: 'selection_status', label: 'Selection status', visible: true },
  { id: 'exp_po_date', label: 'Exp. PO Date', visible: true },
  { id: 'po_status', label: 'PO Status', visible: true },
  { id: 'exp_delivery_date', label: 'Exp. Delivery Date', visible: true },
  { id: 'delivery_status', label: 'Delivery Status', visible: true },
  { id: 'delivery_photo', label: 'Delivery Photo', visible: true },
  { id: 'delivery_challan', label: 'Delivery Challan', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export function getStoredProjectDetailSelectionColumnConfig() {
  try {
    const raw = localStorage.getItem(PROJECT_DETAIL_SELECTION_COLUMN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredProjectDetailSelectionColumnConfig(columns) {
  try {
    localStorage.setItem(PROJECT_DETAIL_SELECTION_COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // localStorage may be unavailable in private mode
  }
}
