import { PRODUCTS_COLUMN_CONFIG_BY_TAB, PRODUCTS_TAB_IDS } from '@/components/products/constants';

/** Product + Job share the same list UI (group-by, filters, variant sub-rows). */
export const PRODUCTS_CATALOG_LIST_TAB_IDS = [PRODUCTS_TAB_IDS.PRODUCT, PRODUCTS_TAB_IDS.JOB];

export function productsTabIsCatalogListTab(tabId) {
  return PRODUCTS_CATALOG_LIST_TAB_IDS.includes(tabId);
}

export function productsTabUsesVariantSubRows(tabId) {
  return productsTabIsCatalogListTab(tabId);
}

/** Min-width classes keyed by column id (shared by table + variant sub-row headers). */
export const PRODUCTS_CATALOG_COLUMN_CLASS = {
  name: 'min-w-[201px] max-w-[201px]',
  productCode: 'min-w-[150px] max-w-[150px]',
  packageCode: 'min-w-[150px] max-w-[150px]',
  jobCode: 'min-w-[142px] max-w-[142px]',
  brand: 'min-w-[142px] max-w-[142px]',
  categoryGroup: 'min-w-[160px] max-w-[160px]',
  categoryType: 'min-w-[150px] max-w-[150px]',
  productGroup: 'min-w-[150px] max-w-[150px]',
  productType: 'min-w-[161px] max-w-[161px]',
  hsnCode: 'min-w-[120px] max-w-[120px]',
  uom: 'min-w-[149px] max-w-[149px]',
  moq: 'min-w-[120px] max-w-[120px]',
  tags: 'min-w-[130px] max-w-[130px]',
  vendors: 'min-w-[242px] max-w-[242px]',
  materialBasicRate: 'min-w-[170px] max-w-[170px]',
  labourBaseRate: 'min-w-[158px] max-w-[158px]',
  totalRate: 'min-w-[117px] max-w-[117px]',
  purchasePrice: 'min-w-[220px]',
  sellingPrice: 'min-w-[220px]',
  status: 'min-w-[120px] max-w-[120px]',
};

const DEFAULT_COLUMN_CLASS = 'min-w-[142px] max-w-[142px]';

const NON_SORTABLE_COLUMN_IDS = new Set(['name', 'tags', 'vendors']);

export function getProductsCatalogColumnClass(columnId) {
  return PRODUCTS_CATALOG_COLUMN_CLASS[columnId] ?? DEFAULT_COLUMN_CLASS;
}

export function buildCatalogSubRowColumns(tabId) {
  return (PRODUCTS_COLUMN_CONFIG_BY_TAB[tabId] ?? []).map((column) => ({
    id: column.id,
    label: column.columnLabel,
    className: getProductsCatalogColumnClass(column.id),
    sticky: column.id === 'name',
    sortable: !NON_SORTABLE_COLUMN_IDS.has(column.id),
    headerClassName: column.id === 'name' ? 'pl-9' : undefined,
  }));
}

export function buildCatalogSubRowConfig(tabId, options = {}) {
  if (tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
    const productTabId = PRODUCTS_TAB_IDS.PRODUCT;
    return {
      columns: buildCatalogSubRowColumns(productTabId),
      columnDefsById: options.buildColumnDefs(productTabId, options),
    };
  }

  if (!productsTabUsesVariantSubRows(tabId)) {
    return undefined;
  }

  return {
    columns: buildCatalogSubRowColumns(tabId),
    columnDefsById: options.buildColumnDefs(tabId, options),
  };
}
