import {
  defaultProductsNameCell,
  defaultProductsStatusCell,
  defaultProductsTextCell,
  productsJobCodeCell,
  productsPackageCodeCell,
  productsPackageNameCell,
  productsProductNameCell,
} from '@/components/products/products-table';
import {
  getProductsCatalogColumnClass,
  productsTabIsCatalogListTab,
} from '@/components/products/products-catalog-list';
import { PRODUCTS_COLUMN_CONFIG_BY_TAB, PRODUCTS_TAB_IDS } from '@/components/products/constants';

const productsSortHeader = (label, sortable = true) => ({
  columnLabel: label,
  enableSorting: sortable,
});

function catalogMeta(columnId) {
  return { columnClassName: getProductsCatalogColumnClass(columnId) };
}

function catalogTextColumn(label, field) {
  return {
    ...productsSortHeader(label),
    cell: defaultProductsTextCell(field),
    meta: catalogMeta(field),
  };
}

/** Column cell builders keyed by field id — drives Product + Job list tables from config. */
const CATALOG_LIST_COLUMN_BUILDERS = {
  name: (label, options) => ({
    ...productsSortHeader(label, false),
    cell: ({ row }) =>
      productsProductNameCell({
        row,
        onProductOpen: options.onProductOpen,
        useRowClickNavigation: options.useRowClickNavigation,
      }),
    meta: catalogMeta('name'),
  }),
  productCode: (label) => ({
    ...productsSortHeader(label),
    cell: defaultProductsTextCell('productCode'),
    meta: catalogMeta('productCode'),
  }),
  jobCode: (label) => ({
    ...productsSortHeader(label),
    cell: productsJobCodeCell,
    meta: catalogMeta('jobCode'),
  }),
  brand: (label) => catalogTextColumn(label, 'brand'),
  categoryGroup: (label) => catalogTextColumn(label, 'categoryGroup'),
  categoryType: (label) => catalogTextColumn(label, 'categoryType'),
  productGroup: (label) => catalogTextColumn(label, 'productGroup'),
  productType: (label) => catalogTextColumn(label, 'productType'),
  hsnCode: (label) => catalogTextColumn(label, 'hsnCode'),
  uom: (label) => catalogTextColumn(label, 'uom'),
  moq: (label) => catalogTextColumn(label, 'moq'),
  purchasePrice: (label) => catalogTextColumn(label, 'purchasePrice'),
  materialBasicRate: (label) => catalogTextColumn(label, 'materialBasicRate'),
  labourBaseRate: (label) => catalogTextColumn(label, 'labourBaseRate'),
  totalRate: (label) => catalogTextColumn(label, 'totalRate'),
  sellingPrice: (label) => catalogTextColumn(label, 'sellingPrice'),
  status: (label) => ({
    ...productsSortHeader(label),
    cell: defaultProductsStatusCell,
    meta: catalogMeta('status'),
  }),
};

function buildCatalogListTabColumnDefs(tabId, options = {}) {
  const config = PRODUCTS_COLUMN_CONFIG_BY_TAB[tabId] ?? [];
  const defs = {};

  for (const column of config) {
    const builder = CATALOG_LIST_COLUMN_BUILDERS[column.id];
    if (builder) {
      defs[column.id] = builder(column.columnLabel, options);
    }
  }

  return defs;
}

function packageNameCell({ row, onPackageOpen, useRowClickNavigation }) {
  return productsPackageNameCell({ row, onPackageOpen, useRowClickNavigation });
}

function buildProductPackageTabColumnDefs({ onPackageOpen, useRowClickNavigation } = {}) {
  const text = defaultProductsTextCell;
  const nameCell = ({ row }) => packageNameCell({ row, onPackageOpen, useRowClickNavigation });

  return {
    name: {
      ...productsSortHeader('Package Name', false),
      cell: nameCell,
      meta: catalogMeta('name'),
    },
    packageCode: {
      ...productsSortHeader('Package Code'),
      cell: productsPackageCodeCell,
      meta: catalogMeta('packageCode'),
    },
    categoryGroup: {
      ...productsSortHeader('Category Group'),
      cell: text('categoryGroup'),
      meta: catalogMeta('categoryGroup'),
    },
    categoryType: {
      ...productsSortHeader('Category Type'),
      cell: text('categoryType'),
      meta: catalogMeta('categoryType'),
    },
    productGroup: {
      ...productsSortHeader('Product Group'),
      cell: text('productGroup'),
      meta: catalogMeta('productGroup'),
    },
    productType: {
      ...productsSortHeader('Product Type'),
      cell: text('productType'),
      meta: catalogMeta('productType'),
    },
    purchasePrice: {
      ...productsSortHeader('Package Purchase Price'),
      cell: text('purchasePrice'),
      meta: catalogMeta('purchasePrice'),
    },
    sellingPrice: {
      ...productsSortHeader('Package Selling Price'),
      cell: text('sellingPrice'),
      meta: catalogMeta('sellingPrice'),
    },
    status: {
      ...productsSortHeader('Status'),
      cell: defaultProductsStatusCell,
      meta: catalogMeta('status'),
    },
  };
}

function buildLegacyTabColumnDefs(tabId, { onProductOpen, useRowClickNavigation } = {}) {
  const text = defaultProductsTextCell;
  const status = defaultProductsStatusCell;
  const config = PRODUCTS_COLUMN_CONFIG_BY_TAB[tabId] ?? [];
  const nameCell = ({ row }) =>
    defaultProductsNameCell({ row, onProductOpen, useRowClickNavigation });

  const base = {
    name: {
      columnLabel: config.find((c) => c.id === 'name')?.columnLabel ?? 'Name',
      cell: nameCell,
      meta: catalogMeta('name'),
      enableSorting: false,
    },
    category: {
      columnLabel: 'Category',
      cell: text('category'),
      meta: { columnClassName: 'min-w-[140px]' },
      enableSorting: true,
    },
    unit: {
      columnLabel: 'Unit',
      cell: text('unit'),
      meta: { columnClassName: 'min-w-[100px]' },
      enableSorting: true,
    },
    type: {
      columnLabel: 'Type',
      cell: text('type'),
      meta: { columnClassName: 'min-w-[120px]' },
      enableSorting: true,
    },
    productCount: {
      columnLabel: 'Products',
      cell: text('productCount'),
      meta: { columnClassName: 'min-w-[120px]' },
      enableSorting: true,
    },
    rate: {
      columnLabel: 'Rate',
      cell: text('rate'),
      meta: { columnClassName: 'min-w-[120px]' },
      enableSorting: true,
    },
    status: {
      columnLabel: 'Status',
      cell: status,
      meta: { columnClassName: 'min-w-[120px]' },
      enableSorting: true,
    },
  };

  return Object.fromEntries(
    config.map((col) => [
      col.id,
      base[col.id] ?? { columnLabel: col.columnLabel, cell: text(col.id) },
    ]),
  );
}

export function buildProductsColumnDefsForTab(tabId, options = {}) {
  if (productsTabIsCatalogListTab(tabId)) {
    return buildCatalogListTabColumnDefs(tabId, options);
  }

  if (tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
    return buildProductPackageTabColumnDefs(options);
  }

  return buildLegacyTabColumnDefs(tabId, options);
}
