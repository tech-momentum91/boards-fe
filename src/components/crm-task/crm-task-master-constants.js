export const CRM_TASK_MASTER_FILTER_TABS = {
  DEPARTMENT: 'department',
  TYPE: 'type',
  PRIORITY: 'priority',
  STATUS: 'status',
};

export const CRM_TASK_MASTER_FILTER_TAB_CONFIG = [
  { value: CRM_TASK_MASTER_FILTER_TABS.DEPARTMENT, label: 'Department' },
  { value: CRM_TASK_MASTER_FILTER_TABS.TYPE, label: 'Type' },
  { value: CRM_TASK_MASTER_FILTER_TABS.PRIORITY, label: 'Priority' },
  { value: CRM_TASK_MASTER_FILTER_TABS.STATUS, label: 'Status' },
];

export const CRM_TASK_MASTER_FILTER_OPTION = {
  department: [],
  type: [],
  priority: [],
  status: [],
};

export const CRM_TASK_MASTER_DEPARTMENT_OPTIONS = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Inside Sales', label: 'Inside Sales' },
  { value: 'Marketing', label: 'Marketing' },
];

export const getCrmTaskMasterFiltersStorageKey = (tabId) => `crm-task-master-filters-${tabId}`;

export const getCpTaskMasterFiltersStorageKey = (tabId) => `cp-task-master-filters-${tabId}`;

/** Build API filters payload for Lead CRM Task Master list. */
export const buildCrmTaskMasterListFilters = (appliedFilters = {}) => {
  const filters = {};
  if (appliedFilters.department?.length > 0) filters.department = appliedFilters.department;
  if (appliedFilters.type?.length > 0) filters.type = appliedFilters.type;
  if (appliedFilters.priority?.length > 0) filters.priority = appliedFilters.priority;
  if (appliedFilters.status?.length > 0) filters.status = appliedFilters.status;
  return filters;
};

export const countCrmTaskMasterAppliedFilters = (appliedFilters = {}) =>
  (appliedFilters.department?.length || 0) +
  (appliedFilters.type?.length || 0) +
  (appliedFilters.priority?.length || 0) +
  (appliedFilters.status?.length || 0);

export function normalizeCrmTaskTypeOptions(taskTypeOptions = []) {
  const list = Array.isArray(taskTypeOptions) ? taskTypeOptions : [];
  return list
    .map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      const value = opt?.name ?? opt?.type ?? opt?.value ?? '';
      const label = opt?.type ?? opt?.name ?? String(value);
      return value ? { label, value } : null;
    })
    .filter(Boolean);
}
