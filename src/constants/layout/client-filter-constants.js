import { COWORKER_DEPARTMENTS } from '@/utils/coworker-departments';

import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';

/** @deprecated Use `LAYOUT_FILTER_ALL` — kept for client layout imports. */
export const CLIENT_LAYOUT_FILTER_ALL = LAYOUT_FILTER_ALL;

/**
 * Static work-mode options for the client layout filter dropdown.
 * Matches the values used elsewhere (e.g. coworker creation modal).
 */
export const CLIENT_LAYOUT_WORK_MODE_VALUES = [
  'Full-Time Office',
  'Hybrid',
  'Remote-First',
  'Visitor only',
];

export const CLIENT_LAYOUT_WORK_MODE_FILTER_OPTIONS = [
  { value: LAYOUT_FILTER_ALL, label: 'All work types' },
  ...CLIENT_LAYOUT_WORK_MODE_VALUES.map((value) => ({ value, label: value })),
];

export const CLIENT_LAYOUT_DEPARTMENT_FILTER_OPTIONS = [
  { value: LAYOUT_FILTER_ALL, label: 'All departments' },
  ...COWORKER_DEPARTMENTS.map((value) => ({ value, label: value })),
];
