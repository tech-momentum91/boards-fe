import { normalizeProjectSectionStatus } from '@/components/projects/tasks/project-task-helpers';

/**
 * Walk parent + nested versions and keep only rows whose status is in `statuses`.
 * Cleared nested `versions` so the table stays flat.
 */
export function flattenProjectSectionRowsByStatuses(rows = [], statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return rows;
  }

  const allowed = new Set(statuses.map((status) => normalizeProjectSectionStatus(status)));
  const flattened = [];

  const visit = (row) => {
    if (!row) return;
    const status = normalizeProjectSectionStatus(row.status);
    if (allowed.has(status)) {
      flattened.push({ ...row, versions: [] });
    }
    (row.versions ?? []).forEach(visit);
  };

  rows.forEach(visit);
  return flattened;
}

/** Apply status flatten across listview groups. Empty statuses → unchanged groups. */
export function flattenProjectSectionGroupsByStatuses(groups = [], statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      rows: flattenProjectSectionRowsByStatuses(group.rows, statuses),
    }))
    .filter((group) => (group.rows?.length ?? 0) > 0);
}

export function isProjectSectionStatusFilterActive(statuses = []) {
  return Array.isArray(statuses) && statuses.length > 0;
}
