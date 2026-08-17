/** Fixed department list for co-worker assignment and filtering (fallback). */
export const COWORKER_DEPARTMENTS = [
  'Sales',
  'Operations',
  'HR',
  'Finance',
  'Marketing',
  'Engineering',
  'IT',
  'Support',
  'Admin',
  'Legal',
  'Compliance',
  'Procurement',
  'Logistics',
  'Production',
  'Design',
  'QA',
  'DevOps',
  'Security',
  'Analytics',
  'Research',
  'Training',
  'Customer Success',
  'Business Development',
  'Product',
  'Accounts',
  'Management',
  'Planning',
  'Strategy',
  'Consulting',
  'Infrastructure',
];

export const COWORKER_DEPARTMENT_FILTER_OPTIONS = [
  { value: 'All', label: 'All' },
  ...COWORKER_DEPARTMENTS.map((department) => ({
    value: department,
    label: department,
  })),
];

/**
 * Extract department names from client detail API (`departments` or `department` child table).
 *
 * @param {object | null | undefined} clientDetailData
 * @returns {string[]}
 */
export function extractClientDepartmentNames(clientDetailData) {
  if (!clientDetailData || typeof clientDetailData !== 'object') return [];

  const names = new Set();
  const addName = (item) => {
    if (!item || typeof item !== 'object') return;
    const label = String(item.department_name ?? item.department_id ?? item.name ?? '').trim();
    if (label) names.add(label);
  };

  const preferred = clientDetailData.departments;
  if (Array.isArray(preferred) && preferred.length > 0) {
    preferred.forEach(addName);
  } else if (Array.isArray(clientDetailData.department)) {
    clientDetailData.department.forEach(addName);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string[]} departmentNames
 * @param {{ includeAll?: boolean, allLabel?: string, allValue?: string }} [options]
 * @returns {Array<{ value: string, label: string }>}
 */
export function toDepartmentSelectOptions(
  departmentNames,
  { includeAll = false, allLabel = 'All Departments', allValue = 'all' } = {},
) {
  const opts = (departmentNames || []).map((name) => ({
    value: name,
    label: name,
  }));
  if (includeAll) {
    return [{ value: allValue, label: allLabel }, ...opts];
  }
  return opts;
}

/**
 * Filter department select options by search text (case-insensitive substring).
 * When search is empty, returns no options unless `showAllWhenEmpty` is true.
 *
 * @param {Array<{ value: string, label: string }>} options
 * @param {string} search
 * @param {{ showAllWhenEmpty?: boolean }} [options]
 * @returns {Array<{ value: string, label: string }>}
 */
export function filterDepartmentOptionsBySearch(
  options,
  search,
  { showAllWhenEmpty = false } = {},
) {
  const q = String(search || '')
    .trim()
    .toLowerCase();
  if (!q) return showAllWhenEmpty ? options : [];
  return options.filter((opt) =>
    String(opt.label || opt.value || '')
      .toLowerCase()
      .includes(q),
  );
}
