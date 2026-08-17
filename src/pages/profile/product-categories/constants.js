/** Four levels mapped to ERPNext Item Group hierarchy under "All Item Groups". */
export const PRODUCT_CATEGORY_TAB_IDS = {
  CATEGORY_GROUP: 'category-group',
  PARENT_CATEGORY: 'parent-category',
  CATEGORY: 'category',
  PRODUCT_GROUP: 'product-group',
};

export const PRODUCT_CATEGORY_TABS = [
  { id: PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP, label: 'Category Group' },
  { id: PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY, label: 'Parent Category' },
  { id: PRODUCT_CATEGORY_TAB_IDS.CATEGORY, label: 'Category' },
  { id: PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP, label: 'Product Group' },
];

export const PRODUCT_CATEGORY_DEFAULT_TAB = PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP;

export const PRODUCT_CATEGORY_FIELD_KEYS = {
  NAME: 'name',
  DESCRIPTION: 'description',
  IS_FIXED_ASSET: 'isFixedAsset',
  IS_MAINTAIN_STOCK: 'isMaintainStock',
  HSN_CODE: 'hsnCode',
  CATEGORY_GROUP_ID: 'categoryGroupId',
  PARENT_CATEGORY_ID: 'parentCategoryId',
  CATEGORY_ID: 'categoryId',
};

export const PRODUCT_CATEGORY_ASSET_TYPE = {
  NONE: 'none',
  FIXED_ASSET: 'fixed_asset',
  MAINTAIN_STOCK: 'maintain_stock',
};

export const PRODUCT_CATEGORY_ASSET_TYPE_OPTIONS = [
  { value: PRODUCT_CATEGORY_ASSET_TYPE.NONE, label: 'None' },
  { value: PRODUCT_CATEGORY_ASSET_TYPE.FIXED_ASSET, label: 'Fixed Asset' },
  { value: PRODUCT_CATEGORY_ASSET_TYPE.MAINTAIN_STOCK, label: 'Maintain Stock' },
];

export function getProductCategoryAssetType(row = {}) {
  if (row[PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]) {
    return PRODUCT_CATEGORY_ASSET_TYPE.FIXED_ASSET;
  }
  if (row[PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]) {
    return PRODUCT_CATEGORY_ASSET_TYPE.MAINTAIN_STOCK;
  }
  return PRODUCT_CATEGORY_ASSET_TYPE.NONE;
}

export function productCategoryAssetTypeToFlags(assetType) {
  return {
    [PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]:
      assetType === PRODUCT_CATEGORY_ASSET_TYPE.FIXED_ASSET,
    [PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]:
      assetType === PRODUCT_CATEGORY_ASSET_TYPE.MAINTAIN_STOCK,
  };
}

/** Fixed Asset and Maintain Stock are mutually exclusive. */
export const PRODUCT_CATEGORY_OPPOSITE_FLAG = {
  [PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]: PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK,
  [PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]: PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET,
};

const PARENT_FIELD_CONFIG = [
  {
    key: PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID,
    label: 'Category Group',
    sourceTabId: PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP,
    dependsOn: [],
    sortable: true,
    minWidth: 'min-w-[150px]',
  },
  {
    key: PRODUCT_CATEGORY_FIELD_KEYS.PARENT_CATEGORY_ID,
    label: 'Parent Category',
    sourceTabId: PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY,
    dependsOn: [PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID],
    sortable: true,
    minWidth: 'min-w-[150px]',
  },
  {
    key: PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_ID,
    label: 'Category',
    sourceTabId: PRODUCT_CATEGORY_TAB_IDS.CATEGORY,
    dependsOn: [
      PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID,
      PRODUCT_CATEGORY_FIELD_KEYS.PARENT_CATEGORY_ID,
    ],
    sortable: true,
    minWidth: 'min-w-[130px]',
  },
];

const TAB_PARENT_FIELD_COUNT = {
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP]: 0,
  [PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY]: 1,
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY]: 2,
  [PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP]: 3,
};

const CATEGORY_GROUP_SEED = [
  {
    id: 'office-interiors',
    name: 'Office Interiors',
    description: 'Workspace furniture and storage solutions.',
  },
  {
    id: 'white-goods',
    name: 'White Goods',
    description: 'Chairs and seating solutions for workspaces.',
  },
  {
    id: 'network-goods',
    name: 'Network Goods',
    description: 'Functional and decorative lighting fixtures.',
  },
];

const PARENT_CATEGORY_SEED = [
  {
    id: 'seating',
    name: 'Seating',
    description: 'Comfortable seating solutions for every workspace and collaboration area.',
    categoryGroupId: 'office-interiors',
  },
  {
    id: 'workstations',
    name: 'Workstations',
    description: 'Modern workstation solutions built for focused and collaborative work.',
    categoryGroupId: 'office-interiors',
  },
  {
    id: 'desking',
    name: 'Desking',
    description: 'Monitor center operations, occupancy, and utilization.',
    categoryGroupId: 'office-interiors',
  },
  {
    id: 'storage',
    name: 'Storage',
    description: 'Track revenue, costs, and profitability performance.',
    categoryGroupId: 'office-interiors',
  },
  {
    id: 'refrigeration',
    name: 'Refrigeration',
    description: 'Analyze leads, conversions, and customer engagement.',
    categoryGroupId: 'white-goods',
  },
];

const CATEGORY_SEED = [
  {
    id: 'office-chairs',
    name: 'Office Chairs',
    description: 'Comfortable and ergonomic seating solutions for everyday work.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
  },
  {
    id: 'reception-chairs',
    name: 'Reception Chairs',
    description: 'Comfortable and stylish seating for reception and waiting areas.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
  },
  {
    id: 'lounge-seating',
    name: 'Lounge Seating',
    description: 'Monitor center operations, occupancy, and utilization.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
  },
  {
    id: 'work-desks',
    name: 'Work Desks',
    description: 'Track revenue, costs, and profitability performance.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'desking',
  },
  {
    id: 'filing-cabinets',
    name: 'Filing Cabinets',
    description: 'Analyze leads, conversions, and customer engagement.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'storage',
  },
];

const PRODUCT_GROUP_SEED = [
  {
    id: 'ergo-series',
    name: 'Ergo Series',
    description: 'Ergonomic furniture designed for comfort, support, and everyday performance.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
    categoryId: 'office-chairs',
  },
  {
    id: 'prestige-series',
    name: 'Prestige Series',
    description: 'Premium furniture crafted for modern, sophisticated workspaces.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
    categoryId: 'office-chairs',
  },
  {
    id: 'comfort-series',
    name: 'Comfort Series',
    description: 'Monitor center operations, occupancy, and utilization.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
    categoryId: 'office-chairs',
  },
  {
    id: 'modular-sofa',
    name: 'Modular Sofa',
    description: 'Track revenue, costs, and profitability performance.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'seating',
    categoryId: 'lounge-seating',
  },
  {
    id: 'height-adjustable',
    name: 'Height Adjustable',
    description: 'Analyze leads, conversions, and customer engagement.',
    categoryGroupId: 'office-interiors',
    parentCategoryId: 'desking',
    categoryId: 'work-desks',
  },
];

const SEED_BY_TAB = {
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP]: CATEGORY_GROUP_SEED,
  [PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY]: PARENT_CATEGORY_SEED,
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY]: CATEGORY_SEED,
  [PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP]: PRODUCT_GROUP_SEED,
};

const PLACEHOLDER_BY_TAB = {
  [PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY]: {
    name: 'Enter parent category name',
    description: 'Enter description',
  },
  [PRODUCT_CATEGORY_TAB_IDS.CATEGORY]: {
    name: 'Enter category name',
    description: 'Enter description',
  },
  [PRODUCT_CATEGORY_TAB_IDS.PRODUCT_GROUP]: {
    name: 'Enter product group name',
    description: 'Enter description',
  },
};

export function getProductCategoryTabPlaceholders(tabId) {
  return (
    PLACEHOLDER_BY_TAB[tabId] ?? {
      name: 'Enter category group name',
      description: 'Enter description',
    }
  );
}

export function getProductCategoryTabColumns(tabId) {
  const parentCount = TAB_PARENT_FIELD_COUNT[tabId] ?? 0;
  const parentColumns = PARENT_FIELD_CONFIG.slice(0, parentCount);

  return [
    {
      key: PRODUCT_CATEGORY_FIELD_KEYS.NAME,
      label: 'Name',
      type: 'text',
      sortable: false,
      minWidth: 'min-w-[300px] w-[300px]',
    },
    {
      key: PRODUCT_CATEGORY_FIELD_KEYS.DESCRIPTION,
      label: 'Description',
      type: 'text',
      sortable: false,
      minWidth: 'min-w-0 w-full',
    },
    ...parentColumns.map((column) => ({
      key: column.key,
      label: column.label,
      type: 'parent',
      sortable: column.sortable,
      minWidth: column.minWidth,
      sourceTabId: column.sourceTabId,
      dependsOn: column.dependsOn,
    })),
  ];
}

function getSavedRows(rows = []) {
  return rows.filter((row) => !row.isDraft && row.name);
}

function rowMatchesParentFilters(row, filters = {}) {
  return Object.entries(filters).every(([key, value]) => !value || row[key] === value);
}

export function getProductCategoryParentOptions(rowsByTab, fieldKey, draftRow) {
  const field = PARENT_FIELD_CONFIG.find((item) => item.key === fieldKey);
  if (!field) return [];

  const sourceRows = getSavedRows(rowsByTab?.[field.sourceTabId] ?? []);
  const filters = Object.fromEntries(
    field.dependsOn.map((dependencyKey) => [dependencyKey, draftRow?.[dependencyKey] ?? '']),
  );

  return sourceRows
    .filter((row) => rowMatchesParentFilters(row, filters))
    .map((row) => ({ value: row.id, label: row.name }));
}

export function resolveProductCategoryParentLabel(rowsByTab, fieldKey, rowId) {
  if (!rowId) return '';

  const field = PARENT_FIELD_CONFIG.find((item) => item.key === fieldKey);
  if (!field) return '';

  const sourceRow = getSavedRows(rowsByTab?.[field.sourceTabId] ?? []).find(
    (row) => row.id === rowId,
  );
  return sourceRow?.name ?? '';
}

export function getProductCategoryDependentFieldKeys(changedFieldKey) {
  const changedIndex = PARENT_FIELD_CONFIG.findIndex((item) => item.key === changedFieldKey);
  if (changedIndex === -1) return [];

  return PARENT_FIELD_CONFIG.slice(changedIndex + 1).map((item) => item.key);
}

/** Seed rows per tab until APIs are wired. */
export function getProductCategorySeedRows(tabId) {
  return (SEED_BY_TAB[tabId] ?? []).map((row) => ({ ...row }));
}

/** Local seed data for all tabs (used until API is enabled). */
export function buildProductCategorySeedRowsByTab() {
  const rowsByTab = {};

  PRODUCT_CATEGORY_TABS.forEach((tab) => {
    rowsByTab[tab.id] = getProductCategorySeedRows(tab.id);
  });

  return rowsByTab;
}

/** Stable id for a newly saved category row. */
export function createCategoryIdFromName(name, existingIds = []) {
  const base =
    String(name ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(/[^\da-z]+/g, '-')
      .replaceAll(/^-|-$/g, '') || `category-${Date.now()}`;

  if (!existingIds.includes(base)) return base;

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

/** Client-side draft row (not persisted until saved via API). */
export function createProductCategoryDraftRow() {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    description: '',
    [PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_GROUP_ID]: '',
    [PRODUCT_CATEGORY_FIELD_KEYS.PARENT_CATEGORY_ID]: '',
    [PRODUCT_CATEGORY_FIELD_KEYS.CATEGORY_ID]: '',
    [PRODUCT_CATEGORY_FIELD_KEYS.IS_FIXED_ASSET]: false,
    [PRODUCT_CATEGORY_FIELD_KEYS.IS_MAINTAIN_STOCK]: false,
    [PRODUCT_CATEGORY_FIELD_KEYS.HSN_CODE]: '',
    isDraft: true,
  };
}
