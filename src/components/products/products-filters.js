import {
  getProductsFilterTabs,
  PRODUCTS_FILTER_TAB_API_FIELDS,
} from '@/components/products/constants';

export function countActiveProductsFilters(filters = {}, tabId) {
  return getProductsFilterTabs(tabId).reduce((total, tab) => {
    const values = filters[tab.value];
    return total + (Array.isArray(values) ? values.length : 0);
  }, 0);
}

/** Build API filter payload from applied UI filter state. */
export function buildProductsListApiFilters(appliedFilters = {}, tabId) {
  const apiFilters = {};

  getProductsFilterTabs(tabId).forEach((tab) => {
    const selected = appliedFilters[tab.value];
    if (!Array.isArray(selected) || selected.length === 0) return;
    const apiField = PRODUCTS_FILTER_TAB_API_FIELDS[tab.value];
    if (apiField) apiFilters[apiField] = selected;
  });

  return Object.keys(apiFilters).length > 0 ? apiFilters : undefined;
}
