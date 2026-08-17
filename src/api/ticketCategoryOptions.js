import apiClient from '@/api/axios';
import { getFrappeResponseError, showErrorToast } from '@/utils/error-utils';

export function buildTicketCategoryOptionId(category, subCategory) {
  if (!subCategory) return '';
  return `${subCategory}::${category || ''}`;
}

/**
 * Normalize API / legacy subcategory rows so option ids always match the
 * controlled value from buildTicketCategoryOptionId(category, subCategory).
 */
export function normalizeTicketCategoryOption(opt = {}) {
  const sub_category = String(opt.sub_category || opt.value || '').trim();
  const category = String(opt.category || '').trim();
  const breadcrumbParts = Array.isArray(opt.breadcrumb_parts)
    ? opt.breadcrumb_parts.filter(Boolean)
    : [category, sub_category].filter(Boolean);
  const breadcrumb =
    opt.breadcrumb || (breadcrumbParts.length > 0 ? breadcrumbParts.join(' > ') : sub_category);

  return {
    ...opt,
    id: opt.id || buildTicketCategoryOptionId(category, sub_category),
    value: opt.value || sub_category,
    label: opt.label || breadcrumb || sub_category,
    category,
    sub_category,
    severity: opt.severity || '',
    breadcrumb_parts: breadcrumbParts,
    breadcrumb,
  };
}

export async function searchTicketCategoryOptions({ search = '' } = {}) {
  try {
    const response = await apiClient.get('/method/devx.api.ticket_options.get_categories', {
      params: {
        category_level: 'L2',
        // Always send search (including empty) so the API returns breadcrumb options.
        search: search?.trim() || '',
        limit: 500,
      },
    });

    const result = response?.data;
    const frappeError = getFrappeResponseError(result, 'Failed to load ticket categories');
    if (frappeError) {
      throw new Error(frappeError);
    }

    const rows = Array.isArray(result?.message) ? result.message : [];
    return rows
      .map(normalizeTicketCategoryOption)
      .filter(
        (opt) =>
          opt.sub_category !== 'Unspecified' &&
          opt.category !== 'Unspecified' &&
          opt.label !== 'Unspecified',
      );
  } catch (error) {
    showErrorToast(error, { defaultMessage: 'Failed to load ticket categories' });
    throw error;
  }
}
