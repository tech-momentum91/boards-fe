import { useCallback, useMemo } from 'react';

import {
  fetchBoqTemplateProductsListPref,
  saveBoqTemplateProductsListPref,
} from '@/api/boqTemplates';
import {
  BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
  BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID,
  BOQ_COLUMN_PREF_DEBOUNCE_MS,
  PROJECT_BOQ_PRICE_VIEW,
} from '@/components/boq/constants';
import {
  PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_CONFIG,
  PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG,
  PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_CONFIG,
} from '@/components/procurements/constants';
import { useColumnConfig } from '@/hooks/use-column-config';
import { applyColumnConfig, prepareColumnsForConfig } from '@/lib/column-utils';

export const BOQ_PRODUCT_COLUMN_CONFIG_SOURCES = {
  TEMPLATE: 'template',
  PURCHASE_BOQ: 'purchase-boq',
  PACKAGE_ITEMS: 'package-items',
  RAISE_PO_LINE_ITEMS: 'raise-po-line-items',
  INTERNAL_BOQ: 'internal-boq',
};

/**
 * Procurement Internal BOQ — template product columns minus Selling (always filtered for
 * INTERNAL price view) with Quantity visible by default so the column manager matches the table.
 */
export const PROJECT_PROCUREMENT_INTERNAL_BOQ_PRODUCTS_COLUMN_CONFIG =
  BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG.filter((column) => column.id !== 'sellingRate').map(
    (column) => (column.id === 'quantity' ? { ...column, visible: true } : column),
  );

export const useBoqTemplateProductsColumnConfig = () => {
  const defaultColumnConfig = useMemo(
    () =>
      prepareColumnsForConfig(BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG).map((column, index) => ({
        ...column,
        order: index,
      })),
    [],
  );

  const fetchBoqTemplateProductColumns = useCallback(async () => {
    try {
      const data = await fetchBoqTemplateProductsListPref();
      if (!Array.isArray(data) || data.length === 0) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  const persistBoqTemplateProductColumns = useCallback(async (columns) => {
    await saveBoqTemplateProductsListPref(columns);
  }, []);

  return useColumnConfig(
    BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG_TABLE_ID,
    defaultColumnConfig,
    persistBoqTemplateProductColumns,
    fetchBoqTemplateProductColumns,
    { autoSave: true, debounce: BOQ_COLUMN_PREF_DEBOUNCE_MS },
  );
};

const widthByColumnId = new Map(
  [
    ...BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
    ...PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG,
    ...PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_CONFIG,
    ...PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_CONFIG,
  ].map((column) => [column.id, column.width]),
);

export const BOQ_TEMPLATE_PRODUCTS_GRID_CLASS = 'grid items-stretch';

/** Edit/add rows — stretch cells so column dividers span the full row height. */
export const BOQ_TEMPLATE_PRODUCTS_EDIT_GRID_CLASS = 'grid items-stretch';

/** Inline style avoids Tailwind arbitrary-value parsing issues with minmax() commas.
 * Prefer each visible column's own `width` so shared ids (e.g. quantity) don't steal
 * Raise-PO's narrow width when rendering Project/Purchase BOQ tables. */
export const buildBoqTemplateProductsGridStyle = (visibleColumnsOrIds) => {
  const columns = (Array.isArray(visibleColumnsOrIds) ? visibleColumnsOrIds : []).map((entry) =>
    typeof entry === 'string' ? { id: entry, width: widthByColumnId.get(entry) ?? '120px' } : entry,
  );
  const widths = columns.map(
    (column) => column?.width ?? widthByColumnId.get(column?.id) ?? '120px',
  );

  return {
    gridTemplateColumns: widths.length > 0 ? widths.join(' ') : '249px',
  };
};

const DRAWER_EXCLUDED_COLUMN_IDS = new Set(['quantity', 'margin', 'er']);

const ensureBoqTemplateAreaLocationColumn = (columns) => {
  if (columns.some((column) => column.id === 'areaLocation')) return columns;

  const areaLocationColumn = BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG.find(
    (column) => column.id === 'areaLocation',
  );
  if (!areaLocationColumn) return columns;

  const productIndex = columns.findIndex((column) => column.id === 'product');
  const next = [...columns];
  next.splice(productIndex >= 0 ? productIndex + 1 : 0, 0, {
    ...areaLocationColumn,
    visible: true,
  });
  return next;
};

export const getVisibleBoqTemplateProductColumns = (columnConfig) => {
  const columns = applyColumnConfig(
    BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
    columnConfig,
    BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
  ).filter((column) => !DRAWER_EXCLUDED_COLUMN_IDS.has(column.id));

  return ensureBoqTemplateAreaLocationColumn(columns);
};

const HIDDEN_COLUMNS_BY_PRICE_VIEW = {
  [PROJECT_BOQ_PRICE_VIEW.INTERNAL]: new Set(['sellingRate']),
  [PROJECT_BOQ_PRICE_VIEW.CLIENT]: new Set(['purchaseRate']),
};

export const getVisibleBoqTemplateProductColumnsForPriceView = (columnConfig, priceView) => {
  const columns = getVisibleBoqTemplateProductColumns(columnConfig);
  const hiddenIds = priceView ? HIDDEN_COLUMNS_BY_PRICE_VIEW[priceView] : null;
  const filtered = hiddenIds ? columns.filter((column) => !hiddenIds.has(column.id)) : columns;
  return filtered.filter((column) => column.id !== 'er');
};

const PROJECT_BOQ_DRAWER_EXCLUDED_COLUMN_IDS = new Set(['margin']);

export const PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX = 'quantityFloor:';

const PROJECT_BOQ_COLUMN_WIDTH_OVERRIDES = {
  areaLocation: '232px',
  product: '236px',
  productCategory: 'minmax(200px,260px)',
  units: '99px',
  quantity: '140px',
};

const withProjectBoqColumnWidths = (columns = []) =>
  columns.map((column) => ({
    ...column,
    width: PROJECT_BOQ_COLUMN_WIDTH_OVERRIDES[column.id] ?? column.width,
  }));

/**
 * Keep a single Quantity column (dropdown edits qty by floor).
 * Do not expand into per-floor columns or a Total amount column.
 */
const ensureProjectBoqQuantityColumn = (columns = []) => {
  const withoutLegacyQuantityColumns = columns.filter(
    (column) =>
      column.id !== 'quantityTotal' &&
      !String(column.id ?? '').startsWith(PROJECT_BOQ_FLOOR_QUANTITY_COLUMN_PREFIX),
  );

  if (withoutLegacyQuantityColumns.some((column) => column.id === 'quantity')) {
    return withoutLegacyQuantityColumns.map((column) =>
      column.id === 'quantity' ? { ...column, visible: true } : column,
    );
  }

  const quantityColumn = BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG.find(
    (column) => column.id === 'quantity',
  );
  if (!quantityColumn) return withoutLegacyQuantityColumns;

  const unitsIndex = withoutLegacyQuantityColumns.findIndex((column) => column.id === 'units');
  const next = [...withoutLegacyQuantityColumns];
  next.splice(unitsIndex >= 0 ? unitsIndex + 1 : next.length, 0, {
    ...quantityColumn,
    visible: true,
  });
  return next;
};

export const getVisibleProjectBoqProductColumnsForPriceView = (
  columnConfig,
  priceView,
  _projectFloors = [],
) => {
  const columns = applyColumnConfig(
    BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
    columnConfig,
    BOQ_TEMPLATE_PRODUCTS_COLUMN_CONFIG,
  ).filter((column) => !PROJECT_BOQ_DRAWER_EXCLUDED_COLUMN_IDS.has(column.id));

  const hiddenIds = priceView ? HIDDEN_COLUMNS_BY_PRICE_VIEW[priceView] : null;
  const filtered = hiddenIds ? columns.filter((column) => !hiddenIds.has(column.id)) : columns;

  return withProjectBoqColumnWidths(ensureProjectBoqQuantityColumn(filtered));
};

/**
 * Procurement Internal BOQ — honors manager visibility and order (no quantity
 * force-inject).
 */
export const getVisibleInternalBoqProductColumnsForPriceView = (columnConfig, priceView) => {
  const columns = applyColumnConfig(
    PROJECT_PROCUREMENT_INTERNAL_BOQ_PRODUCTS_COLUMN_CONFIG,
    columnConfig,
    PROJECT_PROCUREMENT_INTERNAL_BOQ_PRODUCTS_COLUMN_CONFIG,
  ).filter((column) => !PROJECT_BOQ_DRAWER_EXCLUDED_COLUMN_IDS.has(column.id));

  const hiddenIds = priceView ? HIDDEN_COLUMNS_BY_PRICE_VIEW[priceView] : null;
  return hiddenIds ? columns.filter((column) => !hiddenIds.has(column.id)) : columns;
};

export const getVisiblePurchaseBoqProductColumns = (columnConfig) =>
  applyColumnConfig(
    PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG,
    columnConfig,
    PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG,
  );

export const getVisiblePackageItemsProductColumns = (columnConfig) =>
  applyColumnConfig(
    PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_CONFIG,
    columnConfig,
    PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_CONFIG,
  );

export const getVisibleRaisePoLineItemsProductColumns = (columnConfig) =>
  applyColumnConfig(
    PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_CONFIG,
    columnConfig,
    PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_CONFIG,
  );

export const getVisibleProductColumnsForSource = (
  columnConfig,
  priceView,
  {
    useProjectBoqColumns = false,
    columnConfigSource = BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.TEMPLATE,
  } = {},
) => {
  if (columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PURCHASE_BOQ) {
    return getVisiblePurchaseBoqProductColumns(columnConfig);
  }

  if (columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.PACKAGE_ITEMS) {
    return getVisiblePackageItemsProductColumns(columnConfig);
  }

  if (columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.RAISE_PO_LINE_ITEMS) {
    return getVisibleRaisePoLineItemsProductColumns(columnConfig);
  }

  if (columnConfigSource === BOQ_PRODUCT_COLUMN_CONFIG_SOURCES.INTERNAL_BOQ) {
    return getVisibleInternalBoqProductColumnsForPriceView(columnConfig, priceView);
  }

  return useProjectBoqColumns
    ? getVisibleProjectBoqProductColumnsForPriceView(columnConfig, priceView)
    : getVisibleBoqTemplateProductColumnsForPriceView(columnConfig, priceView);
};
