import { AUM_DEFAULT_APPLIED_FILTERS, AUM_FILTER_VALUE_ALL } from '@/components/aum/constants';
import { MWQ_DEFAULT_APPLIED_FILTERS } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-constants';
import { resolveMwqCenterFilterValue } from '@/components/aum/maintenance-work-queue/maintenance-work-queue-helper';

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function compactFilters(filters = {}, keys = []) {
  const compact = {};
  for (const key of keys) {
    const values = ensureArray(filters[key]);
    if (values.length > 0) {
      compact[key] = values;
    }
  }
  return compact;
}

function serializeFilters(filters) {
  const entries = Object.entries(filters).filter(([, values]) => ensureArray(values).length > 0);
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : '';
}

/**
 * Build API list params for Preventive Checks / Maintenance Task pages.
 */
export function buildMwqListFetchParams({
  search = '',
  toolbarCenter = AUM_FILTER_VALUE_ALL,
  month = '',
  appliedFilters = MWQ_DEFAULT_APPLIED_FILTERS,
  completedQuickFilter = false,
} = {}) {
  const center = resolveMwqCenterFilterValue(toolbarCenter);
  const filterKeys = Object.keys(MWQ_DEFAULT_APPLIED_FILTERS);
  const filters = compactFilters(appliedFilters, filterKeys);

  if (center) {
    delete filters.center;
  }

  if (completedQuickFilter) {
    filters.status = ['Completed'];
  }

  const params = {
    search,
    center,
    month,
  };

  const filtersJson = serializeFilters(filters);
  if (filtersJson) {
    params.filters = filtersJson;
  }

  return params;
}

/**
 * Build API list params for the AUM Asset list page.
 */
export function buildAumListFetchParams({
  search = '',
  appliedFilters = AUM_DEFAULT_APPLIED_FILTERS,
} = {}) {
  const filterKeys = Object.keys(AUM_DEFAULT_APPLIED_FILTERS);
  const filters = compactFilters(appliedFilters, filterKeys);
  const params = { search };

  const filtersJson = serializeFilters(filters);
  if (filtersJson) {
    params.filters = filtersJson;
  }

  return params;
}
