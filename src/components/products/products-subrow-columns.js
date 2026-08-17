import {
  buildCatalogSubRowConfig,
  buildCatalogSubRowColumns,
} from '@/components/products/products-catalog-list';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import { buildProductsColumnDefsForTab } from '@/components/products/products-column-defs';

/** Product bundle sub-table columns (package detail drawer). */
export const PRODUCT_SUBROW_COLUMNS = buildCatalogSubRowColumns(PRODUCTS_TAB_IDS.PRODUCT);

export function buildSubRowConfigForTab(tabId, options = {}) {
  return buildCatalogSubRowConfig(tabId, {
    ...options,
    buildColumnDefs: buildProductsColumnDefsForTab,
  });
}
