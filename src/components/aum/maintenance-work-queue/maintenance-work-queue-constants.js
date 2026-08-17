import { AUM_MULTI_GROUP_BY_FIELD_IDS } from '@/components/aum/constants';
import {
  getMwqConditionBadgeStyle,
  getMwqPreventiveStatusBadgeColor,
  getMwqPriorityBadgeStyle,
  MWQ_PREVENTIVE_CONDITION_OPTIONS,
  MWQ_PREVENTIVE_STATUS_OPTIONS,
  MWQ_PRIORITY_OPTIONS,
} from '@/components/aum/shared/mwq-badge-helpers';

export {
  getMwqConditionBadgeStyle,
  getMwqPreventiveStatusBadgeColor,
  getMwqPriorityBadgeStyle,
  MWQ_PREVENTIVE_CONDITION_OPTIONS,
  MWQ_PREVENTIVE_STATUS_OPTIONS,
  MWQ_PRIORITY_OPTIONS,
};

export const MWQ_MONTH_OPTIONS = [
  { value: '1', label: 'January', shortLabel: 'Jan' },
  { value: '2', label: 'February', shortLabel: 'Feb' },
  { value: '3', label: 'March', shortLabel: 'Mar' },
  { value: '4', label: 'April', shortLabel: 'Apr' },
  { value: '5', label: 'May', shortLabel: 'May' },
  { value: '6', label: 'June', shortLabel: 'Jun' },
  { value: '7', label: 'July', shortLabel: 'Jul' },
  { value: '8', label: 'August', shortLabel: 'Aug' },
  { value: '9', label: 'September', shortLabel: 'Sep' },
  { value: '10', label: 'October', shortLabel: 'Oct' },
  { value: '11', label: 'November', shortLabel: 'Nov' },
  { value: '12', label: 'December', shortLabel: 'Dec' },
];

export function getMwqMonthLabel(value, { short = false } = {}) {
  const month = MWQ_MONTH_OPTIONS.find((option) => option.value === String(value));
  if (!month) return '';
  return short ? month.shortLabel : month.label;
}

export const MWQ_CENTER_OPTIONS = [];

export const MWQ_DEFAULT_GROUP_BY_RULES = [
  { id: 'group-pg-1', field: AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_GROUP, order: 'asc' },
];

export const MWQ_TASK_CONDITION_OPTIONS = [
  'Need Repair',
  'Fair',
  'Damaged',
  'Good',
  'Needs Retirement',
];

export function isNeedRepairLocked(row) {
  if (!row) return false;
  if (row.status === 'Completed') return true;
  if (row.maintenanceTaskStatus === 'Completed') return true;
  if (row.maintenanceStatus === 'Completed') return true;
  if (
    row.status === 'Checked' &&
    (row.maintenanceTaskStatus === 'Completed' || row.maintenanceStatus === 'Completed')
  ) {
    return true;
  }
  return false;
}

export function getMwqTaskConditionOptionsForRow(row) {
  if (isNeedRepairLocked(row)) {
    return MWQ_TASK_CONDITION_OPTIONS.filter((option) => option !== 'Need Repair');
  }
  return MWQ_TASK_CONDITION_OPTIONS;
}

export function getMwqPreventiveConditionOptionsForRow(row) {
  if (isNeedRepairLocked(row)) {
    return MWQ_PREVENTIVE_CONDITION_OPTIONS.filter((option) => option !== 'Need Repair');
  }
  return MWQ_PREVENTIVE_CONDITION_OPTIONS;
}

export const MWQ_TASK_STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Cancelled'];

export const MWQ_FILTER_TABS = [
  { value: 'center', label: 'Center' },
  { value: 'area', label: 'Area' },
  { value: 'floor', label: 'Floor' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'brand', label: 'Brand' },
  { value: 'condition', label: 'Condition' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'productType', label: 'Product Type' },
  { value: 'productGroup', label: 'Product Group' },
  { value: 'productCategory', label: 'Category Type' },
  { value: 'categoryGroup', label: 'Category Group' },
];

export const MWQ_DEFAULT_APPLIED_FILTERS = {
  center: [],
  area: [],
  floor: [],
  assignee: [],
  brand: [],
  condition: [],
  status: [],
  priority: [],
  productType: [],
  productGroup: [],
  productCategory: [],
  categoryGroup: [],
};

export const MWQ_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search maintenance records',
  monthPlaceholder: 'Month',
  centerPlaceholder: 'All Centers',
  productTypeChipLabel: 'Product Type',
  columnsTooltip: 'Columns',
  columnsAriaLabel: 'Column settings',
  filterTooltip: 'Filter',
  filterAriaLabel: 'Filter',
  completedQuickFilterAriaLabel: 'Show completed tasks',
  completedQuickFilterTooltip: 'Completed tasks',
};

export const MWQ_PREVENTIVE_COLUMN_CONFIG = [
  { id: 'name', columnLabel: 'Name', visible: true, enableHiding: false },
  { id: 'productCode', columnLabel: 'Product Code', visible: true, enableHiding: true },
  { id: 'assignee', columnLabel: 'Assignee', visible: true, enableHiding: true },
  { id: 'startDate', columnLabel: 'Start Date', visible: true, enableHiding: true },
  { id: 'dueDate', columnLabel: 'Due Date', visible: true, enableHiding: true },
  { id: 'condition', columnLabel: 'Condition', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  { id: 'priority', columnLabel: 'Priority', visible: true, enableHiding: true },
  { id: 'brand', columnLabel: 'Brand', visible: false, enableHiding: true },
  { id: 'area', columnLabel: 'Area', visible: false, enableHiding: true },
  { id: 'center', columnLabel: 'Center', visible: false, enableHiding: true },
  { id: 'productType', columnLabel: 'Product Type', visible: false, enableHiding: true },
  { id: 'productGroup', columnLabel: 'Product Group', visible: false, enableHiding: true },
  { id: 'productCategory', columnLabel: 'Category Type', visible: false, enableHiding: true },
  { id: 'categoryGroup', columnLabel: 'Category Group', visible: false, enableHiding: true },
  { id: 'purchaseDate', columnLabel: 'Purchase Date', visible: false, enableHiding: true },
  { id: 'warrantyDueDate', columnLabel: 'Warranty Due Date', visible: false, enableHiding: true },
  { id: 'originalValue', columnLabel: 'Original Value', visible: false, enableHiding: true },
  { id: 'currentValue', columnLabel: 'Current Value', visible: false, enableHiding: true },
  {
    id: 'lastMaintenanceDate',
    columnLabel: 'Last Maintenance',
    visible: false,
    enableHiding: true,
  },
  {
    id: 'totalMaintenanceValue',
    columnLabel: 'Total Maintenance Value',
    visible: false,
    enableHiding: true,
  },
];

export const MWQ_TASK_COLUMN_CONFIG = MWQ_PREVENTIVE_COLUMN_CONFIG;

export function getMwqTaskStatusBadgeColor(status) {
  switch (status) {
    case 'Open':
      return 'blue';
    case 'In Progress':
      return 'orange';
    case 'Completed':
      return 'green';
    case 'Cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}
