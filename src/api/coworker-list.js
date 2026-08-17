import apiClient from '@/api/axios';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Search coworkers without touching Redux coworker list state.
 *
 * @param {{
 *   keyword?: string,
 *   client_id?: string,
 *   page?: number,
 *   limitPageLength?: number,
 *   filters?: unknown[],
 *   orderBy?: string,
 * }} params
 * @returns {Promise<{ rows: object[], totalCount: number }>}
 */
export async function fetchCoworkerList({
  keyword = '',
  client_id = '',
  page = 1,
  limitPageLength = DEFAULT_PAGE_SIZE,
  filters = [],
  orderBy = 'modified desc',
} = {}) {
  const formData = new FormData();
  formData.append('keyword', String(keyword || '').trim());
  formData.append('filters', Array.isArray(filters) ? JSON.stringify(filters) : '[]');
  formData.append('page', String(page));
  formData.append('limit_page_length', String(limitPageLength));
  formData.append('order_by', orderBy || 'modified desc');
  const clientIdTrim = String(client_id ?? '').trim();
  if (clientIdTrim) {
    formData.append('client_id', clientIdTrim);
  }

  const response = await apiClient.post('/method/devx.coworker.api.get_coworker_list', formData);
  const message = response?.data?.message || {};
  return {
    rows: Array.isArray(message?.results) ? message.results : [],
    totalCount: Number(message?.total_count || 0) || 0,
  };
}

/**
 * Map coworker rows to searchable select options (full name as value/label).
 *
 * @param {object[]} rows
 * @returns {Array<{ value: string, label: string }>}
 */
export function mapCoworkerRowsToManagerOptions(rows = []) {
  const seen = new Set();
  const options = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const label = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
    const value = label || String(item.name || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }
  return options;
}
