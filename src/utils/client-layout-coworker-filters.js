import {
  CLIENT_LAYOUT_DEPARTMENT_FILTER_OPTIONS,
  CLIENT_LAYOUT_FILTER_ALL,
  CLIENT_LAYOUT_WORK_MODE_FILTER_OPTIONS,
  CLIENT_LAYOUT_WORK_MODE_VALUES,
} from '@/constants/layout/client-filter-constants';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/filter-sentinel';
import {
  extractClientDepartmentNames,
  toDepartmentSelectOptions,
} from '@/utils/coworker-departments';

export {
  CLIENT_LAYOUT_FILTER_ALL,
  CLIENT_LAYOUT_WORK_MODE_VALUES,
  CLIENT_LAYOUT_WORK_MODE_FILTER_OPTIONS,
  CLIENT_LAYOUT_DEPARTMENT_FILTER_OPTIONS,
};

/**
 * Build the `filters` payload sent to `get_client_floor_layout_coordinates`.
 * Returns `undefined` when no active filter is selected so the API receives no
 * `filters` key (matches center pattern).
 *
 * @param {{
 *   workType?: string,
 *   department?: string,
 *   coworkerRef?: string,
 * }} uiFilters
 * @returns {{ work_mode: string[]|null, department: string[]|null, coworker_ids: string[]|null } | undefined}
 */
export function buildClientLayoutDetailApiFilters(uiFilters) {
  const workType = String(uiFilters?.workType ?? '').trim();
  const department = String(uiFilters?.department ?? '').trim();
  const coworkerRef = String(uiFilters?.coworkerRef ?? '').trim();

  const hasWorkType = workType && workType !== LAYOUT_FILTER_ALL;
  const hasDepartment = department && department !== LAYOUT_FILTER_ALL;
  const hasCoworker = coworkerRef && coworkerRef !== LAYOUT_FILTER_ALL;

  if (!hasWorkType && !hasDepartment && !hasCoworker) return undefined;

  return {
    work_mode: hasWorkType ? [workType] : null,
    department: hasDepartment ? [department] : null,
    coworker_ids: hasCoworker ? [coworkerRef] : null,
  };
}

/** Stable key for matching layout responses to the active filter request. */
export function serializeClientLayoutFiltersKey(filters) {
  return JSON.stringify(filters ?? null);
}

/**
 * @param {object} details
 * @returns {string}
 */
function readCoworkerDisplayName(details) {
  if (!details || typeof details !== 'object') return '';
  const parts = [details.first_name, details.last_name].filter(Boolean).join(' ').trim();
  return parts || details.full_name || details.coworker_name || '';
}

/**
 * Build co-worker dropdown options from the client co-worker list rows
 * returned by `getCoworkerListThunk`. Each option also carries `name` and
 * `image` so the search popover can render a co-worker avatar (initials when
 * no image is available). Extra fields are ignored by `SearchableSelect`.
 *
 * @param {unknown[]} rows
 * @returns {Array<{ value: string, label: string, name?: string, image?: string | null }>}
 */
export function buildClientLayoutCoworkerFilterOptionsFromRows(rows) {
  const byRef = new Map();
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') continue;
    const ref = String(row.name ?? row.client_coworker_ref ?? '').trim();
    if (!ref) continue;
    if (byRef.has(ref)) continue;
    const name =
      readCoworkerDisplayName(row) ||
      String(row.full_name ?? row.coworker_name ?? '').trim() ||
      ref;
    const image =
      (typeof row.image === 'string' && row.image.trim()) ||
      (typeof row.user_image === 'string' && row.user_image.trim()) ||
      (typeof row.profile_image === 'string' && row.profile_image.trim()) ||
      null;
    byRef.set(ref, { value: ref, label: name, name, image });
  }
  const options = [...byRef.values()].sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: LAYOUT_FILTER_ALL, label: 'All co-workers' }, ...options];
}

/**
 * Department filter options from client detail (`departments` child table),
 * matching the co-workers add/edit modal department list.
 *
 * @param {object | null | undefined} clientDetailData
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildClientLayoutDepartmentFilterOptions(clientDetailData) {
  const fromClient = extractClientDepartmentNames(clientDetailData);
  if (fromClient.length === 0) {
    return [];
  }
  return toDepartmentSelectOptions(fromClient, {
    includeAll: true,
    allLabel: 'All departments',
    allValue: LAYOUT_FILTER_ALL,
  });
}
