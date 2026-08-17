import {
  RiBox3Line,
  RiGroupLine,
  RiMicrosoftLine,
  RiPantoneLine,
  RiSuitcaseLine,
} from 'react-icons/ri';

export const PRODUCTS_TAB_IDS = {
  PRODUCT: 'product',
  PRODUCT_PACKAGE: 'product-package',
  MATERIAL: 'material',
  LABOUR: 'labour',
  JOB: 'job',
};

export const PRODUCTS_TABS = [
  {
    id: PRODUCTS_TAB_IDS.PRODUCT,
    label: 'Product',
    icon: RiBox3Line,
  },
  {
    id: PRODUCTS_TAB_IDS.PRODUCT_PACKAGE,
    label: 'Product Package',
    icon: RiMicrosoftLine,
  },
  {
    id: PRODUCTS_TAB_IDS.MATERIAL,
    label: 'Material',
    icon: RiPantoneLine,
  },
  {
    id: PRODUCTS_TAB_IDS.LABOUR,
    label: 'Labour',
    icon: RiGroupLine,
  },
  {
    id: PRODUCTS_TAB_IDS.JOB,
    label: 'Job',
    icon: RiSuitcaseLine,
  },
];

export const PRODUCTS_DEFAULT_ACTIVE_TAB = PRODUCTS_TAB_IDS.PRODUCT;

const PRODUCTS_VALID_TAB_IDS = new Set(Object.values(PRODUCTS_TAB_IDS));

/** Resolve active products tab from URL `?tab=` (falls back to default). */
export function getProductsTabFromSearchParams(searchParams) {
  const id = searchParams.get('tab');
  return PRODUCTS_VALID_TAB_IDS.has(id) ? id : PRODUCTS_DEFAULT_ACTIVE_TAB;
}

/** Tabs that use the Product-style group-by dropdown and multi-filter popover. */
export const PRODUCTS_TABS_WITH_GROUP_AND_FILTER = [
  PRODUCTS_TAB_IDS.PRODUCT,
  PRODUCTS_TAB_IDS.PRODUCT_PACKAGE,
  PRODUCTS_TAB_IDS.JOB,
];

export function productsTabSupportsGroupAndFilter(tabId) {
  return PRODUCTS_TABS_WITH_GROUP_AND_FILTER.includes(tabId);
}

export const PRODUCTS_GROUP_BY_IDS = {
  CATEGORY_GROUP: 'categoryGroup',
  CATEGORY_TYPE: 'categoryType',
  PRODUCT_GROUP: 'productGroup',
  PRODUCT_TYPE: 'productType',
  STATUS: 'status',
};

export const PRODUCTS_GROUP_BY_DEFAULT = PRODUCTS_GROUP_BY_IDS.CATEGORY_GROUP;

export const PRODUCTS_PACKAGE_GROUP_BY_DEFAULT = PRODUCTS_GROUP_BY_IDS.CATEGORY_TYPE;

export const PRODUCTS_GROUP_BY_OPTIONS = [
  { value: PRODUCTS_GROUP_BY_IDS.CATEGORY_GROUP, label: 'Category Group' },
  { value: PRODUCTS_GROUP_BY_IDS.CATEGORY_TYPE, label: 'Category Type' },
  { value: PRODUCTS_GROUP_BY_IDS.PRODUCT_GROUP, label: 'Product Group' },
  { value: PRODUCTS_GROUP_BY_IDS.PRODUCT_TYPE, label: 'Product Type' },
  { value: PRODUCTS_GROUP_BY_IDS.STATUS, label: 'Status' },
];

export const PRODUCTS_PACKAGE_GROUP_BY_OPTIONS = [
  { value: PRODUCTS_GROUP_BY_IDS.CATEGORY_GROUP, label: 'Category Group' },
  { value: PRODUCTS_GROUP_BY_IDS.CATEGORY_TYPE, label: 'Category Type' },
  { value: PRODUCTS_GROUP_BY_IDS.PRODUCT_GROUP, label: 'Product Group' },
  { value: PRODUCTS_GROUP_BY_IDS.PRODUCT_TYPE, label: 'Product Type' },
  { value: PRODUCTS_GROUP_BY_IDS.STATUS, label: 'Status' },
];

export function getProductsGroupByOptions(tabId) {
  if (tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
    return PRODUCTS_PACKAGE_GROUP_BY_OPTIONS;
  }
  return PRODUCTS_GROUP_BY_OPTIONS;
}

export function getProductsGroupByDefault(tabId) {
  if (tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
    return PRODUCTS_PACKAGE_GROUP_BY_DEFAULT;
  }
  return PRODUCTS_GROUP_BY_DEFAULT;
}

/** Sidebar keys for the Product / Product Package multi-filter popover (Figma). */
export const PRODUCTS_FILTER_FIELD_KEYS = {
  CATEGORY_GROUP: 'categoryGroup',
  CATEGORY_TYPE: 'categoryType',
  PRODUCT_GROUP: 'productGroup',
  PRODUCT_TYPE: 'productType',
  BRAND: 'brand',
  HSN_CODE: 'hsnCode',
};

export const PRODUCTS_FILTER_TABS = [
  { value: PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP, label: 'Category Group' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE, label: 'Category Type' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP, label: 'Product Group' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_TYPE, label: 'Product Type' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.BRAND, label: 'Brand' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.HSN_CODE, label: 'HSN Code' },
];

export const PRODUCTS_PACKAGE_FILTER_TABS = [
  { value: PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP, label: 'Category Group' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE, label: 'Category Type' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP, label: 'Product Group' },
  { value: PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_TYPE, label: 'Product Type' },
];

export function getProductsFilterTabs(tabId) {
  if (tabId === PRODUCTS_TAB_IDS.PRODUCT_PACKAGE) {
    return PRODUCTS_PACKAGE_FILTER_TABS;
  }
  return PRODUCTS_FILTER_TABS;
}

/** Maps filter sidebar keys to product form options API field names. */
export const PRODUCTS_FILTER_TAB_API_FIELDS = {
  [PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_GROUP]: 'category_group',
  [PRODUCTS_FILTER_FIELD_KEYS.CATEGORY_TYPE]: 'category_type',
  [PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_GROUP]: 'product_group',
  [PRODUCTS_FILTER_FIELD_KEYS.PRODUCT_TYPE]: 'product_type',
  [PRODUCTS_FILTER_FIELD_KEYS.BRAND]: 'brand',
  [PRODUCTS_FILTER_FIELD_KEYS.HSN_CODE]: 'hsn_code',
};

export function createEmptyProductsFilters(tabId) {
  return getProductsFilterTabs(tabId).reduce((accumulator, tab) => {
    accumulator[tab.value] = [];
    return accumulator;
  }, {});
}

export const PRODUCTS_COLUMN_CONFIG_BY_TAB = {
  [PRODUCTS_TAB_IDS.PRODUCT]: [
    { id: 'name', columnLabel: 'Name', visible: true, enableHiding: true },
    { id: 'productCode', columnLabel: 'Product Code', visible: true, enableHiding: true },
    { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true },
    { id: 'categoryGroup', columnLabel: 'Category Group', visible: true, enableHiding: true },
    { id: 'categoryType', columnLabel: 'Category Type', visible: true, enableHiding: true },
    { id: 'productGroup', columnLabel: 'Product Group', visible: true, enableHiding: true },
    { id: 'productType', columnLabel: 'Product Type', visible: true, enableHiding: true },
    { id: 'hsnCode', columnLabel: 'HSN Code', visible: true, enableHiding: true },
    { id: 'uom', columnLabel: 'UOM', visible: true, enableHiding: true },
    { id: 'moq', columnLabel: 'MOQ', visible: true, enableHiding: true },
    { id: 'purchasePrice', columnLabel: 'Purchase Price', visible: true, enableHiding: true },
    { id: 'sellingPrice', columnLabel: 'Selling Price', visible: true, enableHiding: true },
    { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  ],
  [PRODUCTS_TAB_IDS.PRODUCT_PACKAGE]: [
    { id: 'name', columnLabel: 'Package Name', visible: true, enableHiding: true },
    { id: 'packageCode', columnLabel: 'Package Code', visible: true, enableHiding: true },
    { id: 'categoryGroup', columnLabel: 'Category Group', visible: true, enableHiding: true },
    { id: 'categoryType', columnLabel: 'Category Type', visible: true, enableHiding: true },
    { id: 'productGroup', columnLabel: 'Product Group', visible: true, enableHiding: true },
    { id: 'productType', columnLabel: 'Product Type', visible: true, enableHiding: true },
    {
      id: 'purchasePrice',
      columnLabel: 'Package Purchase Price',
      visible: true,
      enableHiding: true,
    },
    { id: 'sellingPrice', columnLabel: 'Package Selling Price', visible: true, enableHiding: true },
    { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  ],
  [PRODUCTS_TAB_IDS.MATERIAL]: [
    { id: 'name', columnLabel: 'Material', visible: true, enableHiding: true },
    { id: 'category', columnLabel: 'Category', visible: true, enableHiding: true },
    { id: 'unit', columnLabel: 'Unit', visible: true, enableHiding: true },
    { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  ],
  [PRODUCTS_TAB_IDS.LABOUR]: [
    { id: 'name', columnLabel: 'Labour', visible: true, enableHiding: true },
    { id: 'rate', columnLabel: 'Rate', visible: true, enableHiding: true },
    { id: 'unit', columnLabel: 'Unit', visible: true, enableHiding: true },
    { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  ],
  [PRODUCTS_TAB_IDS.JOB]: [
    { id: 'name', columnLabel: 'Name', visible: true, enableHiding: true },
    { id: 'jobCode', columnLabel: 'Job Code', visible: true, enableHiding: true },
    { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true },
    { id: 'uom', columnLabel: 'Unit of Measure', visible: true, enableHiding: true },
    { id: 'categoryGroup', columnLabel: 'Category Group', visible: true, enableHiding: true },
    { id: 'categoryType', columnLabel: 'Category Type', visible: true, enableHiding: true },
    { id: 'productGroup', columnLabel: 'Product Group', visible: true, enableHiding: true },
    { id: 'productType', columnLabel: 'Product Type', visible: true, enableHiding: true },
    { id: 'hsnCode', columnLabel: 'HSN Code', visible: true, enableHiding: true },
    {
      id: 'materialBasicRate',
      columnLabel: 'Material Base Rate',
      visible: true,
      enableHiding: true,
    },
    { id: 'labourBaseRate', columnLabel: 'Labour Base Rate', visible: true, enableHiding: true },
    { id: 'totalRate', columnLabel: 'Total Rate', visible: true, enableHiding: true },
    { id: 'sellingPrice', columnLabel: 'Selling Price', visible: true, enableHiding: true },
    { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  ],
};

export const PRODUCTS_COLUMN_CONFIG_TABLE_ID_PREFIX = 'products-list-table';

/** User Listview Preference `react_table_id` per products tab. */
export function getProductsColumnConfigTableId(tabId) {
  return `${PRODUCTS_COLUMN_CONFIG_TABLE_ID_PREFIX}-${tabId}`;
}

/** sessionStorage key prefix for products list view state (group by + filters) per tab. */
export const PRODUCTS_VIEW_PERSIST_SESSION_KEY_PREFIX = 'products-view-';

export function getProductsViewPersistSessionKey(tabId) {
  return `${PRODUCTS_VIEW_PERSIST_SESSION_KEY_PREFIX}${tabId}`;
}

export function getProductsViewPersistFilterKeys(tabId) {
  return getProductsFilterTabs(tabId).map((tab) => tab.value);
}

export function createDefaultProductsViewState(tabId = PRODUCTS_TAB_IDS.PRODUCT) {
  return {
    groupBy: getProductsGroupByDefault(tabId),
    groupOrder: 'asc',
    ...createEmptyProductsFilters(tabId),
  };
}

export function resolveProductsGroupBy(value, tabId = PRODUCTS_TAB_IDS.PRODUCT) {
  const fallback = getProductsGroupByDefault(tabId);
  const options = getProductsGroupByOptions(tabId);
  const candidate = value || fallback;
  return options.some((option) => option.value === candidate) ? candidate : fallback;
}

export function resolveProductsGroupOrder(value) {
  return value === 'desc' ? 'desc' : 'asc';
}

export function getProductsEmptyLabel(tabId) {
  switch (tabId) {
    case PRODUCTS_TAB_IDS.PRODUCT_PACKAGE:
      return 'No product packages found';
    case PRODUCTS_TAB_IDS.MATERIAL:
      return 'No materials found';
    case PRODUCTS_TAB_IDS.LABOUR:
      return 'No labour records found';
    case PRODUCTS_TAB_IDS.JOB:
      return 'No jobs found';
    default:
      return 'No products found';
  }
}

export function getProductsAddButtonLabel(tabId) {
  switch (tabId) {
    case PRODUCTS_TAB_IDS.PRODUCT_PACKAGE:
      return 'Add Package';
    case PRODUCTS_TAB_IDS.MATERIAL:
      return 'Add Material';
    case PRODUCTS_TAB_IDS.LABOUR:
      return 'Add Labour';
    case PRODUCTS_TAB_IDS.JOB:
      return 'Add Job';
    default:
      return 'Add Product';
  }
}
