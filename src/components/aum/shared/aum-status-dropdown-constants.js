import { getStatusMetaForOption } from '@/components/ticket-management/constants';

export const MWQ_PREVENTIVE_STATUS_META = {
  pending: { percentage: 20, color: 'blue' },
  checked: { percentage: 80, color: 'green' },
  overdue: { percentage: 60, color: 'red' },
};

export const MWQ_TASK_STATUS_META = {
  open: { percentage: 20, color: 'blue' },
  'in progress': { percentage: 40, color: 'orange' },
  completed: { percentage: 80, color: 'green' },
  cancelled: { percentage: 100, color: 'gray' },
};

export const MWQ_PREVENTIVE_STATUS_DROPDOWN_OPTIONS = [
  { label: 'PENDING', value: 'Pending', color: 'blue', percentage: 20 },
  { label: 'CHECKED', value: 'Checked', color: 'green', percentage: 80 },
  { label: 'OVERDUE', value: 'Overdue', color: 'red', percentage: 60 },
];

export const MWQ_TASK_STATUS_DROPDOWN_OPTIONS = [
  { label: 'IN PROGRESS', value: 'In Progress', color: 'orange', percentage: 40 },
  { label: 'COMPLETED', value: 'Completed', color: 'green', percentage: 80 },
  { label: 'CANCELLED', value: 'Cancelled', color: 'gray', percentage: 100 },
];

export const MWQ_TASK_STATUS_DROPDOWN_OPTIONS_WITH_OPEN = [
  { label: 'OPEN', value: 'Open', color: 'blue', percentage: 20 },
  ...MWQ_TASK_STATUS_DROPDOWN_OPTIONS,
];

export function getMwqPreventiveStatusMetaForOption(option) {
  return getStatusMetaForOption(option, MWQ_PREVENTIVE_STATUS_META);
}

export function getMwqTaskStatusMetaForOption(option) {
  return getStatusMetaForOption(option, MWQ_TASK_STATUS_META);
}

export function getMwqTaskStatusDropdownOptionsForRow(row) {
  if (row?.status === 'Open') {
    return MWQ_TASK_STATUS_DROPDOWN_OPTIONS_WITH_OPEN;
  }
  return MWQ_TASK_STATUS_DROPDOWN_OPTIONS;
}
