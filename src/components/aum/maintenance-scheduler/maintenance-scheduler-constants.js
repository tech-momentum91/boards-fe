/** @typedef {'add' | 'planned' | 'partial' | 'empty'} MsMonthCellType */

/**
 * @typedef {Object} MsSchedulerRow
 * @property {string} id
 * @property {string} productType
 * @property {string} assigneeRole
 * @property {string} frequency
 * @property {{ type: MsMonthCellType, label?: string }[]} monthCells
 * @property {MsSchedulerRow[]} [children]
 * @property {boolean} [showGroupDividerAfter]
 */

export const MS_MONTH_COLUMNS = [
  { id: 'jan', label: 'Jan' },
  { id: 'feb', label: 'Feb' },
  { id: 'mar', label: 'Mar' },
  { id: 'apr', label: 'Apr' },
  { id: 'may', label: 'May' },
  { id: 'jun', label: 'Jun' },
  { id: 'jul', label: 'Jul' },
  { id: 'aug', label: 'Aug' },
  { id: 'sep', label: 'Sep' },
  { id: 'oct', label: 'Oct' },
  { id: 'nov', label: 'Nov' },
  { id: 'dec', label: 'Dec' },
];

export const MS_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const MS_ROLE_OPTIONS = [
  { value: 'Facility Manager', label: 'Facility Manager', abbrev: 'FM' },
  { value: 'Facility User', label: 'Facility User', abbrev: 'FU' },
];
