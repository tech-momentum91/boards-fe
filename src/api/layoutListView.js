import apiClient from '@/api/axios';

const GET_LAYOUT_LISTVIEW_PATH = '/method/devx.layouts.api.api_layout.get_layout_listview';

/**
 * Paginated layout list for Space Management layout view.
 * `page` / `page_size` paginate by **center** (each result includes all floors for that center).
 *
 * @param {{
 *   center?: string,
 *   page?: number,
 *   page_size?: number,
 *   keyword?: string,
 *   filters?: object,
 * }} params
 * @returns {Promise<object>}
 */
export async function postGetLayoutListView({
  center,
  page = 1,
  page_size = 3,
  keyword = '',
  filters = {},
} = {}) {
  const pageNum = Number(page) || 1;
  const pageSize = Number(page_size) || 3;

  const centerId = String(center || '').trim();
  const keywordStr = String(keyword || '').trim();

  const payload = {
    page: pageNum,
    page_size: pageSize,
    limit_page_length: pageSize,
    keyword: keywordStr || null,
    search: null,
  };

  const filterEntries = filters && typeof filters === 'object' ? Object.entries(filters) : [];
  const activeFilters = Object.fromEntries(
    filterEntries.filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    }),
  );

  if (Object.keys(activeFilters).length > 0) {
    payload.filters = activeFilters;
    payload.applied_filters = activeFilters;
  } else {
    payload.filters = {};
    payload.applied_filters = {};
  }

  if (centerId) {
    payload.center = centerId;
  }

  const response = await apiClient.post(GET_LAYOUT_LISTVIEW_PATH, payload, { params: payload });
  return response?.data?.message ?? response?.data ?? {};
}
