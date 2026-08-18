import {
  RiArrowDownSLine,
  RiBuildingLine,
  RiCalendarLine,
  RiChat2Line,
  RiCheckboxLine,
  RiEdit2Line,
  RiFlagLine,
  RiHashtag,
  RiImageLine,
  RiLink,
  RiMailLine,
  RiPhoneLine,
  RiPriceTag3Line,
  RiTeamLine,
  RiText,
  RiTicketLine,
  RiTimeLine,
  RiUploadLine,
  RiUser2Line,
  RiUserLine,
  RiBox3Line,
} from 'react-icons/ri';

export const CUSTOM_FIELDS_TABS = [
  { id: 'custom', label: 'Custom' },
  { id: 'standard', label: 'Standard' },
  { id: 'erp', label: 'ERP' },
];

export const CUSTOM_TAB_ALL_FIELDS = [
  { type: 'dropdown', label: 'Dropdown', icon: RiArrowDownSLine },
  { type: 'labels', label: 'Labels', icon: RiPriceTag3Line },
  { type: 'text', label: 'Text', icon: RiText },
  { type: 'email', label: 'Email', icon: RiMailLine },
  { type: 'phone', label: 'Phone', icon: RiPhoneLine },
  { type: 'long-text', label: 'Long Text', icon: RiEdit2Line },
  { type: 'date', label: 'Date', icon: RiCalendarLine },
  { type: 'number', label: 'Number', icon: RiHashtag },
  { type: 'image', label: 'Image', icon: RiImageLine },
  { type: 'url', label: 'URL', icon: RiLink },
  { type: 'checkbox', label: 'Checkbox', icon: RiCheckboxLine },
  { type: 'file-upload', label: 'File Upload', icon: RiUploadLine },
  { type: 'people', label: 'People', icon: RiUserLine },
  { type: 'tags', label: 'Tags', icon: RiPriceTag3Line },
];

export const STANDARD_TAB_FIELDS = [
  {
    id: 'assignee',
    key: 'assignee',
    label: 'Assignee',
    fieldType: 'people',
    icon: RiUserLine,
    defaultVisible: true,
    sortable: true,
  },
  {
    id: 'due-date',
    key: 'dueDate',
    label: 'Due Date',
    fieldType: 'date',
    icon: RiCalendarLine,
    defaultVisible: true,
    sortable: true,
  },
  {
    id: 'status',
    key: 'status',
    label: 'Status',
    fieldType: 'status',
    icon: RiPriceTag3Line,
    defaultVisible: true,
    sortable: true,
  },
  {
    id: 'priority',
    key: 'priority',
    label: 'Priority',
    fieldType: 'priority',
    icon: RiFlagLine,
    defaultVisible: false,
    sortable: true,
  },
  {
    id: 'comments',
    key: 'comments',
    label: 'Comments',
    fieldType: 'number',
    icon: RiChat2Line,
    defaultVisible: false,
  },
  {
    id: 'latest-comment',
    key: 'latestComment',
    label: 'Latest Comment',
    fieldType: 'text',
    icon: RiChat2Line,
    defaultVisible: false,
  },
  {
    id: 'time-estimation',
    key: 'timeEstimation',
    label: 'Time Estimation',
    fieldType: 'text',
    icon: RiTimeLine,
    defaultVisible: false,
  },
  {
    id: 'time-tracked',
    key: 'timeTracked',
    label: 'Time Tracked',
    fieldType: 'text',
    icon: RiTimeLine,
    defaultVisible: false,
  },
  {
    id: 'created-by',
    key: 'createdBy',
    label: 'Created By',
    fieldType: 'people',
    icon: RiUserLine,
    defaultVisible: false,
  },
  {
    id: 'date-closed',
    key: 'dateClosed',
    label: 'Date Closed',
    fieldType: 'date',
    icon: RiCalendarLine,
    defaultVisible: false,
  },
  {
    id: 'date-created',
    key: 'dateCreated',
    label: 'Date Created',
    fieldType: 'date',
    icon: RiCalendarLine,
    defaultVisible: false,
  },
  {
    id: 'date-done',
    key: 'dateDone',
    label: 'Date Done',
    fieldType: 'date',
    icon: RiCalendarLine,
    defaultVisible: false,
  },
  {
    id: 'date-updated',
    key: 'dateUpdated',
    label: 'Date Updated',
    fieldType: 'date',
    icon: RiCalendarLine,
    defaultVisible: false,
  },
  {
    id: 'tags',
    key: 'tags',
    label: 'Tags',
    fieldType: 'tags',
    icon: RiPriceTag3Line,
    defaultVisible: false,
  },
];

export function createDefaultStandardFieldVisibility() {
  return Object.fromEntries(STANDARD_TAB_FIELDS.map((field) => [field.id, field.defaultVisible]));
}

export function createStandardFieldsState(visibility = {}) {
  return STANDARD_TAB_FIELDS.map((field) => ({
    ...field,
    visible: visibility[field.id] ?? field.defaultVisible,
  }));
}

export const ERP_MODULES = [
  { id: 'clients', label: 'Clients', icon: RiUser2Line },
  { id: 'ticket-management', label: 'Tickets', icon: RiTicketLine },
  { id: 'centers', label: 'Centers', icon: RiBuildingLine },
  { id: 'spaces', label: 'Spaces', icon: RiBox3Line },
  { id: 'vendors', label: 'Vendors', icon: RiTeamLine },
  { id: 'partners', label: 'Partners', icon: RiUserLine },
];

/** @deprecated Prefer module fields from System List API */
export const DEFAULT_ERP_FIELDS = [
  { id: 'client-name', label: 'Client Name', icon: RiPriceTag3Line, visible: true },
  { id: 'assignee', label: 'Assignee', icon: RiUserLine, visible: true },
  { id: 'due-date', label: 'Due Date', icon: RiCalendarLine, visible: true },
  { id: 'status', label: 'Status', icon: RiPriceTag3Line, visible: true },
  { id: 'comments', label: 'Comments', icon: RiChat2Line, visible: false },
  { id: 'created-by', label: 'Created By', icon: RiUserLine, visible: false },
  { id: 'date-closed', label: 'Date Closed', icon: RiCalendarLine, visible: false },
  { id: 'date-created', label: 'Date Created', icon: RiCalendarLine, visible: false },
  { id: 'date-done', label: 'Date Done', icon: RiCalendarLine, visible: false },
  { id: 'date-updated', label: 'Date Updated', icon: RiCalendarLine, visible: false },
  { id: 'tags', label: 'Tags', icon: RiPriceTag3Line, visible: false },
];

export function createDefaultErpModuleFields() {
  return DEFAULT_ERP_FIELDS.map((field) => ({ ...field }));
}

export function createInitialErpModuleFieldsState() {
  return Object.fromEntries(
    ERP_MODULES.map((module) => [module.id, createDefaultErpModuleFields()]),
  );
}

export function getErpModuleLabel(moduleId) {
  return ERP_MODULES.find((module) => module.id === moduleId)?.label ?? 'Module';
}
