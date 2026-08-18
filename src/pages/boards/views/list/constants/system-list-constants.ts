import { ERP_MODULES } from './list-custom-fields-constants';

export const SYSTEM_LIST_MODULES = ERP_MODULES.map((module) => ({
  value: module.id,
  label: module.label,
}));

const SHARED_PRIMARY_COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'due-date', label: 'Due Date' },
  { value: 'date-created', label: 'Date Created' },
  { value: 'date-updated', label: 'Date Updated' },
];

const MODULE_PRIMARY_COLUMNS = {
  clients: [
    { value: 'client-name', label: 'Client Name' },
    { value: 'status', label: 'Status' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'due-date', label: 'Due Date' },
  ],
  'ticket-management': [
    { value: 'ticket-id', label: 'Ticket ID' },
    { value: 'subject', label: 'Subject' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
  ],
  centers: [
    { value: 'center-name', label: 'Center Name' },
    { value: 'location', label: 'Location' },
    { value: 'status', label: 'Status' },
  ],
  spaces: [
    { value: 'space-name', label: 'Space Name' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'status', label: 'Status' },
  ],
  vendors: [
    { value: 'vendor-name', label: 'Vendor Name' },
    { value: 'category', label: 'Category' },
    { value: 'type', label: 'Type' },
  ],
  partners: [
    { value: 'partner-name', label: 'Partner Name' },
    { value: 'type', label: 'Industry Type' },
    { value: 'status', label: 'Onboarding Stage' },
    { value: 'category', label: 'Primary Category' },
  ],
  facility: [
    { value: 'asset-name', label: 'Asset Name' },
    { value: 'location', label: 'Location' },
    { value: 'status', label: 'Status' },
  ],
  settings: [
    { value: 'setting-name', label: 'Setting Name' },
    { value: 'value', label: 'Value' },
    { value: 'status', label: 'Status' },
  ],
};

export function getSystemListPrimaryColumns(moduleId) {
  return MODULE_PRIMARY_COLUMNS[moduleId] ?? SHARED_PRIMARY_COLUMNS;
}

export function getSystemListModuleLabel(moduleId) {
  return SYSTEM_LIST_MODULES.find((module) => module.value === moduleId)?.label ?? 'List';
}
