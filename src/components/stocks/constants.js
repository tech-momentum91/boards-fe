import {
  RiAlertFill,
  RiArrowLeftDownLine,
  RiArrowRightUpLine,
  RiBox3Line,
  RiFileTextLine,
  RiMoneyDollarCircleFill,
  RiPriceTag3Fill,
  RiShoppingCartLine,
  RiStockLine,
  RiTimeFill,
  RiTimeLine,
  RiSettings3Line,
} from 'react-icons/ri';

import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { getTodayIsoDate } from '@/components/stocks/shared/format';

export { STOCKS_FILTER_VALUE_ALL };

/** ----- Page (route shell) ----- */

export const STOCKS_PAGE_META = {
  title: 'Stocks',
  description: 'View and manage your stocks',
};

/** Icon component for `PageLayout` / headers — re-export for single import site. */
export const StocksPageIcon = RiStockLine;

/** ----- Tabs ----- */

export const STOCKS_TAB_IDS = {
  CURRENT_STOCK: 'current-stock',
  STOCK_IN: 'stock-in',
  STOCK_OUT: 'stock-out',
  ORDERS: 'orders',
  PRODUCT_MASTER: 'product-master',
  STOCK_RULES: 'stock-rules',
  VENDOR_RC: 'vendor-rc',
};

export const STOCKS_TABS = [
  {
    id: STOCKS_TAB_IDS.CURRENT_STOCK,
    label: 'Current Stock',
    IconLine: RiTimeLine,
    IconFill: RiTimeFill,
  },
  {
    id: STOCKS_TAB_IDS.STOCK_IN,
    label: 'In',
    IconLine: RiArrowLeftDownLine,
    IconFill: RiArrowLeftDownLine,
  },
  {
    id: STOCKS_TAB_IDS.STOCK_OUT,
    label: 'Out',
    IconLine: RiArrowRightUpLine,
    IconFill: RiArrowRightUpLine,
  },
  {
    id: STOCKS_TAB_IDS.ORDERS,
    label: 'Orders',
    IconLine: RiShoppingCartLine,
    IconFill: RiShoppingCartLine,
  },
  {
    id: STOCKS_TAB_IDS.PRODUCT_MASTER,
    label: 'Product Master',
    IconLine: RiBox3Line,
    IconFill: RiBox3Line,
  },
  {
    id: STOCKS_TAB_IDS.STOCK_RULES,
    label: 'Stock Rules',
    IconLine: RiSettings3Line,
    IconFill: RiSettings3Line,
  },
  {
    id: STOCKS_TAB_IDS.VENDOR_RC,
    label: 'Vendor RC',
    IconLine: RiFileTextLine,
    IconFill: RiFileTextLine,
  },
];

export const STOCKS_DEFAULT_ACTIVE_TAB = STOCKS_TAB_IDS.CURRENT_STOCK;

/** ----- Filters (toolbar + row matching) ----- */

/** `useColumnConfig` / localStorage key for inventory column preferences */
export const STOCKS_COLUMN_CONFIG_TABLE_ID = 'stocks-inventory-table';

/** Inventory table grouping (toolbar “Group by”) */
export const STOCKS_GROUP_BY_IDS = {
  CATEGORY: 'category',
  CENTER: 'center',
  STATUS: 'status',
};

export const STOCKS_GROUP_BY_DEFAULT = STOCKS_GROUP_BY_IDS.CATEGORY;

export const STOCKS_GROUP_BY_OPTIONS = [
  { value: STOCKS_GROUP_BY_IDS.CATEGORY, label: 'Category' },
  { value: STOCKS_GROUP_BY_IDS.CENTER, label: 'Center' },
  { value: STOCKS_GROUP_BY_IDS.STATUS, label: 'Status' },
];

export const STOCKS_CATEGORY_FILTER_VALUES = {
  ALL: STOCKS_FILTER_VALUE_ALL,
  CLEANING: 'cleaning',
  PANTRY: 'pantry',
  STATIONERY: 'stationery',
};

export const STOCKS_CENTER_FILTER_VALUES = {
  ALL: STOCKS_FILTER_VALUE_ALL,
  SKYLINE: 'skyline',
  NOVA: 'nova',
};

export const STOCKS_STATUS_FILTER_VALUES = {
  ALL: STOCKS_FILTER_VALUE_ALL,
  HEALTHY: 'healthy',
  CRITICAL: 'critical',
};

/** Substrings matched against `row.center` when center filter is set (lowercase compare). */
export const STOCKS_CENTER_FILTER_CENTER_SUBSTRING = {
  [STOCKS_CENTER_FILTER_VALUES.SKYLINE]: 'skyline',
  [STOCKS_CENTER_FILTER_VALUES.NOVA]: 'nova',
};

/**
 * Toolbar select options — value/label pairs for Align UI Select items.
 */
export const STOCKS_TOOLBAR_CATEGORY_OPTIONS = [
  { value: STOCKS_CATEGORY_FILTER_VALUES.ALL, label: 'All Categories' },
  { value: STOCKS_CATEGORY_FILTER_VALUES.CLEANING, label: 'Cleaning & Housekeeping' },
  { value: STOCKS_CATEGORY_FILTER_VALUES.PANTRY, label: 'Pantry & Coffee' },
  { value: STOCKS_CATEGORY_FILTER_VALUES.STATIONERY, label: 'Stationery' },
];

export const STOCKS_TOOLBAR_CENTER_OPTIONS = [
  { value: STOCKS_CENTER_FILTER_VALUES.ALL, label: 'All Centers' },
  { value: STOCKS_CENTER_FILTER_VALUES.SKYLINE, label: 'Skyline Hub' },
  { value: STOCKS_CENTER_FILTER_VALUES.NOVA, label: 'Nova Campus' },
];

export const STOCKS_TOOLBAR_STATUS_OPTIONS = [
  { value: STOCKS_STATUS_FILTER_VALUES.ALL, label: 'All Statuses' },
  { value: STOCKS_STATUS_FILTER_VALUES.HEALTHY, label: 'Healthy' },
  { value: STOCKS_STATUS_FILTER_VALUES.CRITICAL, label: 'Critical' },
];

/** ----- Empty / copy ----- */

export const STOCKS_EMPTY_STATES = {
  default: {
    title: 'No data yet',
    description: 'Create your first entry to get started.',
  },
  search: {
    title: 'No data match these filters',
    description: 'Try adjusting filters or clearing search.',
  },
};

/** @deprecated Use STOCKS_EMPTY_STATES */
export const STOCKS_EMPTY_LIST_MESSAGE = STOCKS_EMPTY_STATES.default.title;

/** @deprecated Use STOCKS_EMPTY_STATES.search.description */
export const STOCKS_EMPTY_FILTER_HINT = STOCKS_EMPTY_STATES.search.description;

/** @deprecated Use STOCKS_EMPTY_STATES.search */
export const STOCKS_EMPTY_FILTER_MESSAGE = `${STOCKS_EMPTY_STATES.search.title}. ${STOCKS_EMPTY_STATES.search.description}`;

/** ----- Summary stat cards ----- */

export const STOCKS_STAT_CARD_LABELS = {
  TOTAL_SKU: 'Total SKU',
  TOTAL_STOCK_VALUE: 'Total stock value',
  CRITICAL_ITEMS: 'critical items',
};

/**
 * Card column config: `valueKey` selects which prop `StocksStatCards` reads for the main number/text.
 */
export const STOCKS_STAT_CARDS_CONFIG = [
  {
    valueKey: 'totalSku',
    label: STOCKS_STAT_CARD_LABELS.TOTAL_SKU,
    Icon: RiPriceTag3Fill,
    color: '#6E3FF3',
  },
  {
    valueKey: 'totalStockValueLabel',
    label: STOCKS_STAT_CARD_LABELS.TOTAL_STOCK_VALUE,
    Icon: RiMoneyDollarCircleFill,
    color: '#F17B2C',
  },
  {
    valueKey: 'criticalCount',
    label: STOCKS_STAT_CARD_LABELS.CRITICAL_ITEMS,
    Icon: RiAlertFill,
    color: '#DF1C41',
  },
];

/** ----- Toolbar (copy + icon metadata only) ----- */

export const STOCKS_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search stock',
  categoryPlaceholder: 'All Categories',
  centerPlaceholder: 'All Centers',
  statusPlaceholder: 'All Statuses',
  filterSearchPlaceholder: 'Search...',
  groupByMenuLabel: 'Group by',
  groupByClear: 'Clear',
  viewOptionsAriaLabel: 'Group by',
  viewOptionsTooltip: 'Group by',
  downloadAriaLabel: 'Download',
  downloadTooltip: 'Download',
  columnsAriaLabel: 'Column settings',
  columnsTooltip: 'Columns',
};

/** ----- Category section (copy only) ----- */

export const STOCKS_CATEGORY_SECTION_COPY = {
  itemsSuffix: ' Items',
  criticalSuffix: ' Critical',
  reorderCategory: 'Reorder Category',
  collapseAriaLabel: 'Collapse section',
  expandAriaLabel: 'Expand section',
};

export const STOCKS_CATEGORY_REORDER_BUTTON_PROPS = {
  variant: 'primary',
  mode: 'ghost',
  size: 'small',
};

export const STOCKS_CATEGORY_PANEL_ID_PREFIX = 'stocks-panel-';

/** ----- Product master (shared module-level constants) ----- */

export const STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID = 'stocks-product-master-table';

export const STOCKS_PRODUCT_MASTER_CATEGORY_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Categories' },
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Pantry', label: 'Pantry' },
  { value: 'Stationary', label: 'Stationary' },
  { value: 'IT', label: 'IT' },
];

export const STOCKS_PRODUCT_MASTER_GROUP_BY_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
];

export const STOCKS_ADD_PRODUCT_CATEGORY_OPTIONS = [
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Pantry', label: 'Pantry' },
  { value: 'Stationary', label: 'Stationary' },
  { value: 'IT', label: 'IT' },
];

export const STOCKS_ADD_PRODUCT_UNIT_OPTIONS = [
  { value: 'Nos', label: 'Pcs' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Litre', label: 'Litre' },
  { value: 'Box', label: 'Box' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Set', label: 'Set' },
];

export const STOCKS_ADD_PRODUCT_TYPE_OPTIONS = [
  { value: 'Bulk', label: 'Bulk' },
  { value: 'Tagged', label: 'Tagged' },
];

export const STOCKS_ADD_PRODUCT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Disabled', label: 'Disabled' },
];

/** ----- Stock Rules ----- */

/** Toolbar “Group by” keys; `pattern` maps to row `consumption` (High / Medium / Low). */
export const STOCKS_RULE_GROUP_BY_IDS = {
  CENTER: 'center',
  CATEGORY: 'category',
  PATTERN: 'pattern',
  FREQUENCY: 'frequency',
};

export const STOCKS_RULE_GROUP_BY_OPTIONS = [
  { value: STOCKS_RULE_GROUP_BY_IDS.CENTER, label: 'Center' },
  { value: STOCKS_RULE_GROUP_BY_IDS.CATEGORY, label: 'Category' },
  { value: STOCKS_RULE_GROUP_BY_IDS.PATTERN, label: 'Pattern' },
  { value: STOCKS_RULE_GROUP_BY_IDS.FREQUENCY, label: 'Frequency' },
];

export const STOCKS_RULE_CONSUMPTION_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const STOCKS_RULE_FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

export const STOCKS_RULE_CENTER_OPTIONS = [
  { value: 'skyline-hub', label: 'Skyline Hub (BOM)' },
  { value: 'orion-tech-park', label: 'Orion Tech Park (AMD)' },
  { value: 'harbour-view', label: 'Harbour View (RJT)' },
];

export const STOCKS_RULE_CATEGORY_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Categories' },
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Pantry', label: 'Pantry' },
  { value: 'Stationary', label: 'Stationary' },
  { value: 'IT', label: 'IT' },
];

export const STOCKS_RULE_CATEGORY_SELECT_OPTIONS = STOCKS_RULE_CATEGORY_OPTIONS.filter(
  (option) => option.value !== STOCKS_FILTER_VALUE_ALL,
);

export const STOCKS_RULE_PRODUCT_CATALOG = {
  Cleaning: [
    { value: 'floor-cleaner-5l', label: 'Floor Cleaner (5L)', unit: 'liter' },
    { value: 'glass-cleaner-spray', label: 'Glass Cleaner Spray', unit: 'pcs' },
    { value: 'mop-set', label: 'Mop Set', unit: 'set' },
    { value: 'garbage-bags', label: 'Garbage Bags', unit: 'roll' },
  ],
  Pantry: [
    { value: 'coffee-powder', label: 'Coffee Powder', unit: 'pack' },
    { value: 'tea-bags', label: 'Tea Bags', unit: 'box' },
    { value: 'sugar-sachets', label: 'Sugar Sachets', unit: 'box' },
    { value: 'milk-packets', label: 'Milk Packets', unit: 'set' },
  ],
  Stationary: [
    { value: 'a4-paper-ream', label: 'A4 Paper Ream', unit: 'box' },
    { value: 'ball-pens', label: 'Ball Pens', unit: 'set' },
    { value: 'sticky-notes', label: 'Sticky Notes', unit: 'pack' },
  ],
  Safety: [{ value: 'fire-extinguisher', label: 'Fire Extinguisher', unit: 'pcs' }],
  IT: [{ value: 'hdmi-cable', label: 'HDMI Cable (1.5m)', unit: 'pack' }],
};

/** Draft line for create-stock-rule modal (`draftKey` is stable row id for React/updates). */
export function createStockRuleDraftRowsFromCategory(category) {
  const list = STOCKS_RULE_PRODUCT_CATALOG[category];
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((productOption) => ({
    draftKey: productOption.value,
    product: productOption.label,
    productValue: productOption.value,
    category,
    unit: productOption.unit,
    min: '',
    trigger: '',
    target: '',
    consumption: '',
    frequency: '',
    critical: false,
    fifo: false,
  }));
}

export function createEmptyStockRuleDraftRow(category) {
  return {
    draftKey: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    product: '',
    productValue: '',
    category: category || '',
    unit: '',
    min: '',
    trigger: '',
    target: '',
    consumption: '',
    frequency: '',
    critical: false,
    fifo: false,
  };
}

export const STOCKS_RULE_ROWS = [
  {
    id: 'rule-1',
    center: 'Skyline Hub (BOM)',
    category: 'Cleaning',
    product: 'Floor Cleaner (5L)',
    unit: 'liter',
    min: 10,
    trigger: 6,
    target: 24,
    consumption: 'High',
    frequency: 'Weekly',
    critical: true,
    notes: 'Powerful floor cleaner that removes dirt and stains, leaving a fresh, hygienic finish.',
  },
  {
    id: 'rule-2',
    center: 'Orion Tech Park (AMD)',
    category: 'Cleaning',
    product: 'Glass Cleaner Spray',
    unit: 'pcs',
    min: 6,
    trigger: 4,
    target: 20,
    consumption: 'Medium',
    frequency: 'Weekly',
    critical: false,
    notes: '',
  },
  {
    id: 'rule-3',
    center: 'Skyline Hub (BOM)',
    category: 'Pantry',
    product: 'Coffee Powder',
    unit: 'pack',
    min: 7,
    trigger: 3,
    target: 46,
    consumption: 'Low',
    frequency: 'Weekly',
    critical: false,
    notes: '',
  },
  {
    id: 'rule-4',
    center: 'Harbour View (RJT)',
    category: 'Pantry',
    product: 'Milk Packets',
    unit: 'set',
    min: 12,
    trigger: 4,
    target: 30,
    consumption: 'Medium',
    frequency: 'Weekly',
    critical: true,
    notes: '',
  },
  {
    id: 'rule-5',
    center: 'Orion Tech Park (AMD)',
    category: 'Stationary',
    product: 'A4 Paper Ream',
    unit: 'box',
    min: 4,
    trigger: 5,
    target: 40,
    consumption: 'Low',
    frequency: 'Daily',
    critical: false,
    notes: '',
  },
];

/** ----- Vendor RC ----- */

export const STOCKS_VENDOR_RC_STATUS = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export const STOCKS_VENDOR_RC_CATEGORY_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Categories' },
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'IT', label: 'IT' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Pantry', label: 'Pantry' },
  { value: 'Stationary', label: 'Stationary' },
];

export const STOCKS_VENDOR_RC_STATUS_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Status' },
  { value: STOCKS_VENDOR_RC_STATUS.ACTIVE, label: 'Active' },
  { value: STOCKS_VENDOR_RC_STATUS.EXPIRING_SOON, label: 'Expiring Soon' },
  { value: STOCKS_VENDOR_RC_STATUS.EXPIRED, label: 'Expired' },
  { value: STOCKS_VENDOR_RC_STATUS.CANCELLED, label: 'Cancelled' },
];

export const STOCKS_VENDOR_RC_CATEGORY_SELECT_OPTIONS = STOCKS_VENDOR_RC_CATEGORY_OPTIONS.filter(
  (option) => option.value !== STOCKS_FILTER_VALUE_ALL,
);

export const STOCKS_VENDOR_RC_STATUS_SELECT_OPTIONS = STOCKS_VENDOR_RC_STATUS_FILTER_OPTIONS.filter(
  (option) => option.value !== STOCKS_FILTER_VALUE_ALL,
);

/** Center labels for Vendor RC multi-select (value === label). */
export const STOCKS_VENDOR_RC_CENTER_OPTIONS = [
  { value: 'Midtown CoLab (HYD)', label: 'Midtown CoLab (HYD)' },
  { value: 'Skyline Hub (BOM)', label: 'Skyline Hub (BOM)' },
  { value: 'Nova Campus', label: 'Nova Campus' },
  { value: 'Harbour View', label: 'Harbour View' },
  { value: 'MetroPoint Workspace (AMD)', label: 'MetroPoint Workspace (AMD)' },
  { value: 'Midtown CoLab (STV)', label: 'Midtown CoLab (STV)' },
  { value: 'Orion Tech Park (AMD)', label: 'Orion Tech Park (AMD)' },
  { value: 'Harbour View (RJT)', label: 'Harbour View (RJT)' },
];

/** Preset vendors for contract forms (value === label). */
export const STOCKS_VENDOR_RC_VENDOR_SELECT_OPTIONS = [
  { value: 'CleanCo Supplies', label: 'CleanCo Supplies' },
  { value: 'PrintPro', label: 'PrintPro' },
  { value: 'SafeGuard India', label: 'SafeGuard India' },
  { value: 'FreshPantry Co.', label: 'FreshPantry Co.' },
  { value: 'OfficeMart', label: 'OfficeMart' },
  { value: 'TechLink Distributors', label: 'TechLink Distributors' },
];

export function createEmptyVendorRcLineItem() {
  return {
    id: `vrc-li-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    itemCode: '',
    product: '',
    rcRate: '',
    taxPercent: '',
    effectiveRate: '',
    moq: '',
    remark: '',
  };
}

/** Product pick-list options for line items, keyed by contract category label. */
export const STOCKS_VENDOR_RC_PRODUCTS_BY_CATEGORY = {
  Cleaning: [
    { value: 'Floor Cleaner (5L)', label: 'Floor Cleaner (5L)' },
    { value: 'Glass Cleaner Spray', label: 'Glass Cleaner Spray' },
    { value: 'Mop Set', label: 'Mop Set' },
  ],
  IT: [
    { value: 'A4 Paper Ream', label: 'A4 Paper Ream' },
    { value: 'Wireless Mouse', label: 'Wireless Mouse' },
    { value: 'USB-C Hub', label: 'USB-C Hub' },
  ],
  Safety: [
    { value: 'Hand Sanitizer (500ml)', label: 'Hand Sanitizer (500ml)' },
    { value: 'First Aid Kit', label: 'First Aid Kit' },
  ],
  Pantry: [
    { value: 'Coffee Powder (500g)', label: 'Coffee Powder (500g)' },
    { value: 'Tea Bags (100 pcs)', label: 'Tea Bags (100 pcs)' },
  ],
  Stationary: [
    { value: 'A4 Paper Ream', label: 'A4 Paper Ream' },
    { value: 'Ballpoint Pens (Box)', label: 'Ballpoint Pens (Box)' },
  ],
};

export function getVendorRcProductSelectOptions(category) {
  if (!category) return [];
  const list = STOCKS_VENDOR_RC_PRODUCTS_BY_CATEGORY[category];
  return Array.isArray(list) ? list : [];
}

/** One line item per catalog product for the category (or a single empty row if none). */
export function createVendorRcLineItemsFromCategory(category) {
  const options = getVendorRcProductSelectOptions(category);
  if (options.length === 0) {
    return [createEmptyVendorRcLineItem()];
  }
  return options.map((opt, index) => ({
    id: `vrc-li-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
    product: opt.value,
    rcRate: '',
    taxPercent: '',
    effectiveRate: '',
    moq: '',
    remark: '',
  }));
}

export const STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG = [
  { id: 'act-default-1', message: 'Contract record viewed', at: '12 Nov 2025, 8:40 AM' },
  { id: 'act-default-2', message: 'Line items synced from catalog', at: '10 Nov 2025, 2:15 PM' },
];

export const STOCKS_VENDOR_RC_GROUP_BY_IDS = {
  VENDOR: 'vendor',
  CATEGORY: 'category',
  CENTER: 'center',
  STATUS: 'status',
};

export const STOCKS_VENDOR_RC_GROUP_BY_OPTIONS = [
  { value: STOCKS_VENDOR_RC_GROUP_BY_IDS.VENDOR, label: 'Vendor' },
  { value: STOCKS_VENDOR_RC_GROUP_BY_IDS.CATEGORY, label: 'Category' },
  { value: STOCKS_VENDOR_RC_GROUP_BY_IDS.CENTER, label: 'Center' },
  { value: STOCKS_VENDOR_RC_GROUP_BY_IDS.STATUS, label: 'Status' },
];

export const STOCKS_VENDOR_RC_ROWS = [
  {
    id: 'vrc-1',
    vendor: 'CleanCo Supplies',
    category: 'Cleaning',
    centers: ['Midtown CoLab (HYD)', 'Skyline Hub (BOM)', 'Nova Campus', 'Harbour View'],
    productCount: 4,
    startDate: '2026-01-01',
    endDate: '2026-04-01',
    status: STOCKS_VENDOR_RC_STATUS.ACTIVE,
    notes: 'Primary cleaning vendor for multi-center pantry and housekeeping SKUs.',
    contractFileName: 'cleanco-rc-signed.pdf',
    activityLog: [
      { id: 'vrc-1-a1', message: 'End date extended by Procurement', at: '12 Nov 2025, 8:40 AM' },
      { id: 'vrc-1-a2', message: 'RC rates updated for Q1 block', at: '12 Nov 2025, 8:40 AM' },
      { id: 'vrc-1-a3', message: 'Download signed PDF', at: '', type: 'link', href: '#' },
    ],
    lineItems: [
      {
        id: 'vrc-1-li-1',
        product: 'Floor Cleaner (5L)',
        rcRate: '320',
        taxPercent: '18',
        effectiveRate: '377.60',
        moq: '10',
        remark: 'Pantry block',
      },
      {
        id: 'vrc-1-li-2',
        product: 'Glass Cleaner Spray',
        rcRate: '180',
        taxPercent: '18',
        effectiveRate: '212.40',
        moq: '24',
        remark: '',
      },
    ],
  },
  {
    id: 'vrc-2',
    vendor: 'PrintPro',
    category: 'IT',
    centers: ['MetroPoint Workspace (AMD)'],
    productCount: 2,
    startDate: '2026-01-01',
    endDate: '2026-04-01',
    status: STOCKS_VENDOR_RC_STATUS.EXPIRING_SOON,
    notes: '',
    contractFileName: '',
    activityLog: STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG,
    lineItems: [
      {
        id: 'vrc-2-li-1',
        product: 'A4 Paper Ream',
        rcRate: '710',
        taxPercent: '18',
        effectiveRate: '837.80',
        moq: '5',
        remark: 'IT supplies',
      },
    ],
  },
  {
    id: 'vrc-3',
    vendor: 'SafeGuard India',
    category: 'Safety',
    centers: ['Midtown CoLab (STV)', 'Orion Tech Park (AMD)', 'Harbour View (RJT)'],
    productCount: 1,
    startDate: '2026-01-01',
    endDate: '2026-04-01',
    status: STOCKS_VENDOR_RC_STATUS.EXPIRED,
    notes: 'Renewal required before placing new safety equipment orders.',
    contractFileName: 'safeguard-rc-2025.pdf',
    activityLog: STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG,
    lineItems: [
      {
        id: 'vrc-3-li-1',
        product: 'Hand Sanitizer (500ml)',
        rcRate: '175',
        taxPercent: '12',
        effectiveRate: '196.00',
        moq: '50',
        remark: 'Safety SKU',
      },
    ],
  },
  {
    id: 'vrc-4',
    vendor: 'FreshPantry Co.',
    category: 'Pantry',
    centers: ['Skyline Hub (BOM)', 'Midtown CoLab (HYD)'],
    productCount: 8,
    startDate: '2025-12-15',
    endDate: '2026-06-15',
    status: STOCKS_VENDOR_RC_STATUS.ACTIVE,
    notes: '',
    contractFileName: '',
    activityLog: STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG,
    lineItems: [],
  },
  {
    id: 'vrc-5',
    vendor: 'OfficeMart',
    category: 'Stationary',
    centers: ['Orion Tech Park (AMD)'],
    productCount: 12,
    startDate: '2026-02-01',
    endDate: '2026-08-01',
    status: STOCKS_VENDOR_RC_STATUS.ACTIVE,
    notes: '',
    contractFileName: '',
    activityLog: STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG,
    lineItems: [],
  },
  {
    id: 'vrc-6',
    vendor: 'TechLink Distributors',
    category: 'IT',
    centers: ['MetroPoint Workspace (AMD)', 'Midtown CoLab (HYD)'],
    productCount: 3,
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    status: STOCKS_VENDOR_RC_STATUS.EXPIRING_SOON,
    notes: '',
    contractFileName: '',
    activityLog: STOCKS_VENDOR_RC_DEFAULT_ACTIVITY_LOG,
    lineItems: [],
  },
];

/** ----- Mock inventory (replace with API data) ----- */

export const STOCKS_SUMMARY = {
  totalSku: 20,
  totalStockValueLabel: '₹51.2K',
  criticalCount: 1,
};

export const STOCK_CATEGORIES = [
  {
    id: 'cleaning',
    name: 'Cleaning & Housekeeping',
    itemCount: 8,
    valueLabel: '₹9,475',
    criticalCount: 1,
    rows: [
      {
        id: 'c1',
        product: 'Floor Cleaner (5L)',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'litre',
        qty: '12',
        min: '10',
        trigger: '6',
        target: '24',
        reorderQty: '12',
        reorderQtyCritical: true,
        rate: '₹280',
        stockValue: '₹3,360',
        lastIn: '10th Feb 2025',
        lastOut: '2nd Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'c2',
        product: 'Glass Cleaner Spray',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'bottle',
        qty: '24',
        min: '15',
        trigger: '10',
        target: '30',
        reorderQty: '6',
        reorderQtyCritical: false,
        rate: '₹145',
        stockValue: '₹3,480',
        lastIn: '5th Feb 2025',
        lastOut: '28th Feb 2025',
        status: 'Healthy',
      },
      {
        id: 'c3',
        product: 'Disinfectant (2L)',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'litre',
        qty: '18',
        min: '12',
        trigger: '8',
        target: '28',
        reorderQty: '10',
        reorderQtyCritical: false,
        rate: '₹320',
        stockValue: '₹5,760',
        lastIn: '12th Feb 2025',
        lastOut: '1st Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'c4',
        product: 'Mop Heads (Pack)',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'pack',
        qty: '9',
        min: '10',
        trigger: '5',
        target: '20',
        reorderQty: '11',
        reorderQtyCritical: true,
        rate: '₹890',
        stockValue: '₹8,010',
        lastIn: '8th Jan 2025',
        lastOut: '15th Feb 2025',
        status: 'Healthy',
      },
      {
        id: 'c5',
        product: 'Trash Bags (Roll)',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'roll',
        qty: '40',
        min: '20',
        trigger: '12',
        target: '48',
        reorderQty: '8',
        reorderQtyCritical: false,
        rate: '₹210',
        stockValue: '₹8,400',
        lastIn: '20th Feb 2025',
        lastOut: '4th Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'c6',
        product: 'Air Freshener Refill',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'unit',
        qty: '14',
        min: '10',
        trigger: '6',
        target: '22',
        reorderQty: '8',
        reorderQtyCritical: false,
        rate: '₹175',
        stockValue: '₹2,450',
        lastIn: '3rd Mar 2025',
        lastOut: '5th Mar 2025',
        status: 'Healthy',
      },
    ],
  },
  {
    id: 'pantry',
    name: 'Pantry & Coffee',
    itemCount: 4,
    valueLabel: '₹14,200',
    criticalCount: 0,
    rows: [
      {
        id: 'p1',
        product: 'Arabica Beans (1kg)',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'kg',
        qty: '30',
        min: '20',
        trigger: '12',
        target: '48',
        reorderQty: '18',
        reorderQtyCritical: false,
        rate: '₹1,050',
        stockValue: '₹31,500',
        lastIn: '1st Mar 2025',
        lastOut: '6th Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'p2',
        product: 'Oat Milk (Carton)',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'carton',
        qty: '22',
        min: '18',
        trigger: '10',
        target: '36',
        reorderQty: '14',
        reorderQtyCritical: false,
        rate: '₹220',
        stockValue: '₹4,840',
        lastIn: '25th Feb 2025',
        lastOut: '5th Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'p3',
        product: 'Paper Cups (100)',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'pack',
        qty: '55',
        min: '40',
        trigger: '24',
        target: '80',
        reorderQty: '25',
        reorderQtyCritical: false,
        rate: '₹180',
        stockValue: '₹9,900',
        lastIn: '18th Feb 2025',
        lastOut: '2nd Mar 2025',
        status: 'Healthy',
      },
      {
        id: 'p4',
        product: 'Tea Bags (Assorted)',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'box',
        qty: '16',
        min: '14',
        trigger: '8',
        target: '28',
        reorderQty: '12',
        reorderQtyCritical: false,
        rate: '₹260',
        stockValue: '₹4,160',
        lastIn: '10th Feb 2025',
        lastOut: '4th Mar 2025',
        status: 'Healthy',
      },
    ],
  },
  {
    id: 'stationery',
    name: 'Stationery',
    itemCount: 6,
    valueLabel: '₹6,890',
    criticalCount: 0,
    rows: [
      {
        id: 's1',
        product: 'A4 Paper Ream',
        center: 'Skyline Hub',
        centerTag: 'BOM',
        unit: 'ream',
        qty: '48',
        min: '36',
        trigger: '20',
        target: '72',
        reorderQty: '24',
        reorderQtyCritical: false,
        rate: '₹420',
        stockValue: '₹20,160',
        lastIn: '22nd Feb 2025',
        lastOut: '6th Mar 2025',
        status: 'Healthy',
      },
      {
        id: 's2',
        product: 'Ballpoint Pens (Box)',
        center: 'Nova Campus',
        centerTag: 'OPS',
        unit: 'box',
        qty: '20',
        min: '15',
        trigger: '8',
        target: '32',
        reorderQty: '12',
        reorderQtyCritical: false,
        rate: '₹330',
        stockValue: '₹6,600',
        lastIn: '15th Feb 2025',
        lastOut: '3rd Mar 2025',
        status: 'Healthy',
      },
    ],
  },
];

/** ----- Stocks > Orders ----- */

export const STOCKS_ORDER_STATUS = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  PARTIAL: 'Partial',
  FULLY_RECEIVED: 'Fully Received',
  CANCELLED: 'Cancelled',
};

export const STOCKS_ORDER_STATUS_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Status' },
  { value: STOCKS_ORDER_STATUS.DRAFT, label: STOCKS_ORDER_STATUS.DRAFT },
  { value: STOCKS_ORDER_STATUS.ORDERED, label: STOCKS_ORDER_STATUS.ORDERED },
  { value: STOCKS_ORDER_STATUS.PARTIAL, label: STOCKS_ORDER_STATUS.PARTIAL },
  { value: STOCKS_ORDER_STATUS.FULLY_RECEIVED, label: STOCKS_ORDER_STATUS.FULLY_RECEIVED },
  { value: STOCKS_ORDER_STATUS.CANCELLED, label: STOCKS_ORDER_STATUS.CANCELLED },
];

/** Default orders toolbar vendor filter before list rows are loaded. */
export const STOCKS_ORDERS_DEFAULT_VENDOR_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Vendors' },
];

/** Default orders toolbar category filter before list rows are loaded. */
export const STOCKS_ORDERS_DEFAULT_CATEGORY_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Categories' },
];

export const STOCKS_ORDER_GROUP_BY_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
];

/** `useColumnConfig` / list pref API key for purchase orders table */
export const STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID = 'stocks-purchase-orders-table';

export const STOCKS_ORDERS_COLUMN_CONFIG = [
  { id: 'orderNo', columnLabel: 'PO ID', visible: true, enableHiding: true },
  /** `poCenter` avoids global FIRST_COLUMN_NAME pin on id `center`. */
  { id: 'poCenter', columnLabel: 'Center', visible: true, enableHiding: true },
  { id: 'vendor', columnLabel: 'Vendor', visible: true, enableHiding: true },
  { id: 'category', columnLabel: 'Category', visible: true, enableHiding: true },
  { id: 'requestDate', columnLabel: 'Order Date', visible: true, enableHiding: true },
  { id: 'expectedDelivery', columnLabel: 'Expected Delivery', visible: true, enableHiding: true },
  { id: 'products', columnLabel: 'Products', visible: true, enableHiding: true },
  { id: 'totalQty', columnLabel: 'Total Qty', visible: true, enableHiding: true },
  { id: 'orderValue', columnLabel: 'Order Value', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
];

export const STOCKS_ORDER_FORM_CENTER_OPTIONS = STOCKS_RULE_CENTER_OPTIONS;

export const STOCKS_ORDER_VENDOR_OPTIONS = [
  { value: 'cleanco', label: 'CleanCo Supplies' },
  { value: 'printpro', label: 'PrintPro' },
  { value: 'safeguard', label: 'SafeGuard India' },
  { value: 'freshpantry', label: 'FreshPantry Co.' },
];

export const STOCKS_ORDER_CATEGORY_OPTIONS = STOCKS_RULE_CATEGORY_SELECT_OPTIONS;

/** Products available on a purchase order for the selected category (from rule catalog). */
export function getOrderProductSelectOptions(categoryValue) {
  if (!categoryValue || !STOCKS_RULE_PRODUCT_CATALOG[categoryValue]) return [];
  return STOCKS_RULE_PRODUCT_CATALOG[categoryValue];
}

export function findOrderProductMeta(productValue, categoryValue) {
  if (!productValue) return undefined;
  const scoped = getOrderProductSelectOptions(categoryValue);
  const fromScoped = scoped.find((option) => option.value === productValue);
  if (fromScoped) return fromScoped;
  for (const items of Object.values(STOCKS_RULE_PRODUCT_CATALOG)) {
    const hit = items.find((option) => option.value === productValue);
    if (hit) return hit;
  }
  return undefined;
}

export function matchOrderProductValueFromDisplayLabel(productLabel, categoryValue) {
  if (!productLabel) return '';
  const list = getOrderProductSelectOptions(categoryValue);
  const byLabel = list.find((product) => product.label === productLabel);
  if (byLabel) return byLabel.value;
  for (const items of Object.values(STOCKS_RULE_PRODUCT_CATALOG)) {
    const hit = items.find((product) => product.label === productLabel);
    if (hit) return hit.value;
  }
  return productLabel;
}

/** Clone persisted draft form or rebuild a minimal form snapshot from display-only row fields (draft orders). */
export function buildOrderDraftFormSnapshot(order) {
  if (!order || order.status !== STOCKS_ORDER_STATUS.DRAFT) return null;
  if (order.draftForm) {
    return {
      name: order.draftForm.name ?? order.name ?? order.orderNo ?? '',
      center: order.draftForm.center ?? '',
      vendor: order.draftForm.vendor ?? '',
      category: order.draftForm.category ?? '',
      orderDate: order.draftForm.orderDate ?? '',
      expectedDelivery: order.draftForm.expectedDelivery ?? '',
      notes: order.draftForm.notes ?? '',
      vendorRc: order.draftForm.vendorRc ?? '',
      warehouse: order.draftForm.warehouse ?? '',
      lineItems: Array.isArray(order.draftForm.lineItems)
        ? order.draftForm.lineItems.map((row) => ({ ...row }))
        : [],
    };
  }

  const categoryValue =
    STOCKS_ORDER_CATEGORY_OPTIONS.find((option) => option.label === order.category)?.value ??
    rowCategoryValue(order.category);
  const centerValue =
    STOCKS_ORDER_FORM_CENTER_OPTIONS.find((option) => option.label === order.center)?.value ?? '';
  const vendorValue =
    STOCKS_ORDER_VENDOR_OPTIONS.find((option) => option.label === order.vendor)?.value ?? '';

  return {
    name: order.name ?? order.orderNo ?? '',
    center: centerValue,
    vendor: vendorValue,
    category: categoryValue,
    orderDate: order.orderDateIso ?? '',
    expectedDelivery: order.expectedDeliveryIso ?? '',
    notes: order.notes ?? '',
    vendorRc: order.vendorRc ?? '',
    warehouse: order.warehouse ?? '',
    lineItems: (Array.isArray(order.lineItems) ? order.lineItems : []).map((line) => ({
      id: line.id,
      itemCode: line.itemCode ?? '',
      product: matchOrderProductValueFromDisplayLabel(line.product, categoryValue),
      quantity: String(line.quantity ?? ''),
      unit: line.unit ?? '',
      unitPrice: line.unitPrice ?? line.orderRate ?? '',
      amount: line.amount ?? '',
      currentStock: line.currentStock ?? '',
      minStock: line.minStock ?? '',
      maxStock: line.maxStock ?? '',
      rcRate: line.rcRate ?? '',
      orderRate: line.orderRate ?? line.unitPrice ?? '',
      remark: line.remark ?? '',
    })),
  };
}

function rowCategoryValue(categoryLabel) {
  return STOCKS_ORDER_CATEGORY_OPTIONS.some((option) => option.value === categoryLabel)
    ? categoryLabel
    : '';
}

/** Grid columns for PO product line items (Product → Remark), incl. Min / Max (create + reorder). */
export const STOCKS_ORDER_LINE_ITEMS_GRID_TEMPLATE =
  'minmax(140px, 1.4fr) minmax(88px, 1fr) minmax(72px, 0.85fr) minmax(72px, 0.85fr) minmax(88px, 1fr) minmax(104px, 1.05fr) minmax(128px, 1.1fr) minmax(120px, 1.15fr)';

/** PO detail drawer line items (no Min / Max). */
export const STOCKS_ORDER_DETAIL_LINE_ITEMS_GRID_TEMPLATE =
  'minmax(140px, 1.4fr) minmax(88px, 1fr) minmax(88px, 1fr) minmax(104px, 1.05fr) minmax(128px, 1.1fr) minmax(120px, 1.15fr)';

/** Create-order modal grid: line-item columns plus delete action column. */
export const STOCKS_ORDER_CREATE_LINE_ITEMS_GRID_TEMPLATE = `${STOCKS_ORDER_LINE_ITEMS_GRID_TEMPLATE} 40px`;

export function orderFormOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? '';
}

export function findStockRuleForOrderLine(order, line) {
  return STOCKS_RULE_ROWS.find(
    (rule) =>
      rule.center === order.center &&
      rule.category === order.category &&
      rule.product === line.product,
  );
}

export function orderLineInventoryDisplay(order, line) {
  const rule = findStockRuleForOrderLine(order, line);
  let cur = null;
  if (line.currentStock != null && String(line.currentStock).trim()) {
    cur = String(line.currentStock);
  } else if (rule != null) {
    cur = String(Math.max(rule.min, Math.round(rule.target * 2.4 + rule.min * 8)));
  }

  let min = null;
  if (line.minStock != null && String(line.minStock).trim()) {
    min = String(line.minStock);
  } else if (rule?.min != null) {
    min = String(rule.min);
  }

  let max = null;
  if (line.maxStock != null && String(line.maxStock).trim()) {
    max = String(line.maxStock);
  } else if (rule?.target != null) {
    max = String(rule.target);
  }

  return {
    curStock: cur ?? '—',
    min: min ?? '—',
    max: max ?? '—',
  };
}

export function orderLineRates(line) {
  const rc = line.rcRate != null && String(line.rcRate).trim() ? line.rcRate : line.unitPrice;
  const ord =
    line.orderRate != null && String(line.orderRate).trim() ? line.orderRate : line.unitPrice;
  return {
    rcRate: rc && String(rc).trim() ? rc : '—',
    orderRate: ord && String(ord).trim() ? ord : '—',
  };
}

function formatOrderRupeeFromDigits(digits) {
  if (!digits) return '';
  const n = Number.parseInt(digits, 10);
  if (Number.isNaN(n) || n <= 0) return '';
  return `₹${n.toLocaleString('en-IN')}`;
}

export function computeOrderLineAmount(quantity, orderRate) {
  const q = Number.parseFloat(String(quantity ?? '').replaceAll(',', ''));
  if (Number.isNaN(q) || q <= 0) return '';

  const normalized = String(orderRate ?? '')
    .replaceAll('₹', '')
    .replaceAll(',', '')
    .trim();
  const rate = Number.parseFloat(normalized);
  if (Number.isNaN(rate) || rate <= 0) return '';

  const amount = Math.round(q * rate * 100) / 100;
  if (amount <= 0) return '';
  const hasFraction = Math.abs(amount - Math.round(amount)) > 0.001;
  const formatted = hasFraction
    ? amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : Math.round(amount).toLocaleString('en-IN');
  return `₹${formatted}`;
}

export function findVendorRcRateForOrder(vendorLabel, categoryLabel, productLabel) {
  if (!vendorLabel || !categoryLabel || !productLabel) return '';
  for (const contract of STOCKS_VENDOR_RC_ROWS) {
    if (contract.vendor !== vendorLabel || contract.category !== categoryLabel) continue;
    const hit = (contract.lineItems ?? []).find((line) => line.product === productLabel);
    if (hit?.rcRate) return formatOrderRupeeFromDigits(String(hit.rcRate).replaceAll(/\D/g, ''));
  }
  return '';
}

/** Populate stock, RC rate, and derived amount when a product is chosen on the create form. */
export function enrichOrderLineForForm(row, form) {
  const centerLabel = orderFormOptionLabel(STOCKS_ORDER_FORM_CENTER_OPTIONS, form.center);
  const categoryLabel = orderFormOptionLabel(STOCKS_ORDER_CATEGORY_OPTIONS, form.category);
  const vendorLabel = orderFormOptionLabel(STOCKS_ORDER_VENDOR_OPTIONS, form.vendor);
  const meta = findOrderProductMeta(row.product, form.category);
  const productLabel = meta?.label ?? '';

  const orderContext = {
    center: centerLabel,
    category: categoryLabel,
    categoryValue: form.category,
  };
  const stock = orderLineInventoryDisplay(orderContext, {
    product: productLabel,
    currentStock: row.currentStock,
    minStock: row.minStock,
    maxStock: row.maxStock,
  });

  const rcRate =
    findVendorRcRateForOrder(vendorLabel, categoryLabel, productLabel) ||
    (row.rcRate && String(row.rcRate).trim() ? row.rcRate : '');
  const orderRate =
    row.orderRate && String(row.orderRate).trim() ? row.orderRate : rcRate || row.orderRate || '';

  return {
    ...row,
    unit: meta?.unit ?? row.unit,
    currentStock: stock.curStock === '—' ? '' : stock.curStock,
    minStock: stock.min === '—' ? '' : stock.min,
    maxStock: stock.max === '—' ? '' : stock.max,
    rcRate,
    orderRate,
    unitPrice: orderRate || row.unitPrice,
    amount: computeOrderLineAmount(row.quantity, orderRate),
  };
}

export function createEmptyOrderLineItem() {
  return {
    id: `oli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    itemCode: '',
    product: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    amount: '',
    currentStock: '',
    minStock: '',
    maxStock: '',
    rcRate: '',
    orderRate: '',
    remark: '',
  };
}

export function createDefaultOrderFormState() {
  return {
    name: '',
    center: '',
    vendor: '',
    category: '',
    orderDate: getTodayIsoDate(),
    expectedDelivery: '',
    notes: '',
    vendorRc: '',
    warehouse: '',
    lineItems: [],
  };
}

export const STOCKS_ORDER_ROWS = [
  {
    id: 'ord-1',
    orderNo: 'ORD-2025-0142',
    center: 'Skyline Hub (BOM)',
    vendor: 'CleanCo Supplies',
    category: 'Cleaning',
    requestDate: '12 May 2025',
    expectedDelivery: '18 May 2025',
    status: STOCKS_ORDER_STATUS.DRAFT,
    orderDateIso: '2025-05-12',
    expectedDeliveryIso: '2025-05-18',
    lineItemCount: 4,
    totalQty: '18',
    totalAmountLabel: '₹12,400',
    notes: 'Urgent restock for pantry annex.',
    draftForm: {
      center: 'skyline-hub',
      vendor: 'cleanco',
      category: 'Cleaning',
      orderDate: '2025-05-12',
      expectedDelivery: '2025-05-18',
      notes: 'Urgent restock for pantry annex.',
      lineItems: [
        {
          id: 'l1',
          product: 'floor-cleaner-5l',
          quantity: '10',
          unit: 'liter',
          unitPrice: '₹420',
          amount: '₹4,200',
        },
        {
          id: 'l2',
          product: 'glass-cleaner-spray',
          quantity: '8',
          unit: 'pcs',
          unitPrice: '₹180',
          amount: '₹1,440',
        },
      ],
    },
    lineItems: [
      {
        id: 'l1',
        product: 'Floor Cleaner (5L)',
        quantity: '10',
        unit: 'liter',
        unitPrice: '₹420',
        amount: '₹4,200',
        currentStock: '280',
        minStock: '18',
        maxStock: '330',
        rcRate: '₹234',
        orderRate: '₹234',
      },
      {
        id: 'l2',
        product: 'Glass Cleaner Spray',
        quantity: '8',
        unit: 'pcs',
        unitPrice: '₹180',
        amount: '₹1,440',
        currentStock: '145',
        minStock: '18',
        maxStock: '171',
        rcRate: '₹340',
        orderRate: '₹340',
      },
    ],
  },
  {
    id: 'ord-2',
    orderNo: 'ORD-2025-0141',
    center: 'Orion Tech Park (AMD)',
    vendor: 'PrintPro',
    category: 'Stationary',
    requestDate: '10 May 2025',
    expectedDelivery: '16 May 2025',
    status: STOCKS_ORDER_STATUS.SUBMITTED,
    orderDateIso: '2025-05-10',
    expectedDeliveryIso: '2025-05-16',
    lineItemCount: 3,
    totalQty: '20',
    totalAmountLabel: '₹8,900',
    notes: '',
    lineItems: [
      {
        id: 'l1',
        product: 'A4 Paper Ream',
        quantity: '20',
        unit: 'box',
        unitPrice: '₹445',
        amount: '₹8,900',
        currentStock: '92',
        minStock: '12',
        maxStock: '120',
        rcRate: '₹445',
        orderRate: '₹445',
      },
    ],
  },
  {
    id: 'ord-3',
    orderNo: 'ORD-2025-0138',
    center: 'Harbour View (RJT)',
    vendor: 'FreshPantry Co.',
    category: 'Pantry',
    requestDate: '8 May 2025',
    expectedDelivery: '14 May 2025',
    status: STOCKS_ORDER_STATUS.PARTIAL,
    orderDateIso: '2025-05-08',
    expectedDeliveryIso: '2025-05-14',
    lineItemCount: 6,
    totalQty: '15',
    totalAmountLabel: '₹22,100',
    notes: 'Split delivery approved.',
    lineItems: [
      {
        id: 'l1',
        product: 'Coffee Powder',
        quantity: '15',
        unit: 'pack',
        unitPrice: '₹890',
        amount: '₹13,350',
        receivedQty: '8',
        currentStock: '34',
        minStock: '7',
        maxStock: '46',
        rcRate: '₹890',
        orderRate: '₹890',
      },
    ],
  },
  {
    id: 'ord-4',
    orderNo: 'ORD-2025-0125',
    center: 'Skyline Hub (BOM)',
    vendor: 'SafeGuard India',
    category: 'Safety',
    requestDate: '2 May 2025',
    expectedDelivery: '9 May 2025',
    status: STOCKS_ORDER_STATUS.FULLY_RECEIVED,
    orderDateIso: '2025-05-02',
    expectedDeliveryIso: '2025-05-09',
    lineItemCount: 2,
    totalQty: '2',
    totalAmountLabel: '₹3,200',
    notes: '',
    lineItems: [
      {
        id: 'l1',
        product: 'Fire Extinguisher',
        quantity: '2',
        unit: 'pcs',
        unitPrice: '₹1,600',
        amount: '₹3,200',
        receivedQty: '2',
        currentStock: '6',
        minStock: '2',
        maxStock: '8',
        rcRate: '₹1,600',
        orderRate: '₹1,600',
      },
    ],
  },
];

/** ----- Stock In (Inward) ----- */
export {
  STOCKS_STOCK_IN_STATUS,
  STOCKS_STOCK_IN_DEFAULT_CENTER_FILTER_OPTIONS,
  STOCKS_STOCK_IN_DEFAULT_VENDOR_FILTER_OPTIONS,
  STOCKS_STOCK_IN_STATUS_FILTER_OPTIONS,
  STOCKS_STOCK_IN_SOURCE,
  STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS,
  STOCKS_STOCK_IN_SOURCE_LABELS,
  STOCKS_STOCK_IN_GROUP_BY_OPTIONS,
  STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
  STOCKS_STOCK_IN_COLUMN_CONFIG,
  createEmptyStockInLineItem,
  createDefaultStockInFormState,
} from '@/components/stocks/stock-in/constants';

/** Purchase orders available when Source Type = Purchase Order (`value` = {@link STOCKS_ORDER_ROWS} `id`). */
export const STOCKS_STOCK_IN_PURCHASE_ORDER_OPTIONS = STOCKS_ORDER_ROWS.map((row) => ({
  value: row.id,
  label: row.orderNo,
}));

/** ----- Stock Out (Outward) ----- */

export const STOCKS_STOCK_OUT_STATUS = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
};

export const STOCKS_STOCK_OUT_STATUS_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Status' },
  { value: STOCKS_STOCK_OUT_STATUS.DRAFT, label: STOCKS_STOCK_OUT_STATUS.DRAFT },
  { value: STOCKS_STOCK_OUT_STATUS.ISSUED, label: STOCKS_STOCK_OUT_STATUS.ISSUED },
  { value: 'In Transit', label: 'In Transit' },
  { value: 'Partially Transferred', label: 'Partially Transferred' },
  { value: 'Transferred', label: 'Transferred' },
];

export const STOCKS_STOCK_OUT_ISSUE_MODE = {
  MANUAL: 'manual',
  CONSUMPTION: 'consumption',
  TRANSFER_OUT: 'transfer-out',
  DAMAGE: 'damage',
  SAMPLE: 'sample',
};

export const STOCKS_STOCK_OUT_ISSUE_MODE_OPTIONS = [
  { value: STOCKS_STOCK_OUT_ISSUE_MODE.MANUAL, label: 'Manual' },
  { value: STOCKS_STOCK_OUT_ISSUE_MODE.CONSUMPTION, label: 'Consumption' },
  { value: STOCKS_STOCK_OUT_ISSUE_MODE.TRANSFER_OUT, label: 'Transfer out' },
  { value: STOCKS_STOCK_OUT_ISSUE_MODE.DAMAGE, label: 'Damage / scrap' },
  { value: STOCKS_STOCK_OUT_ISSUE_MODE.SAMPLE, label: 'Sample' },
];

export const STOCKS_STOCK_OUT_DEPARTMENT_OPTIONS = [
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'front-office', label: 'Front office' },
  { value: 'operations', label: 'Operations' },
];

export const STOCKS_STOCK_OUT_ISSUED_BY_OPTIONS = [
  { value: 'rahul-sharma', label: 'Rahul Sharma' },
  { value: 'priya-nair', label: 'Priya Nair' },
  { value: 'amit-patel', label: 'Amit Patel' },
  { value: 'sneha-roy', label: 'Sneha Roy' },
];

export const STOCKS_STOCK_OUT_GROUP_BY_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'department', label: 'Department' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
];

export function createEmptyStockOutLineItem() {
  return {
    id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    product: '',
    unit: '',
    issued: '',
    remarks: '',
  };
}

/** Maps {@link STOCKS_ORDER_CATEGORY_OPTIONS} `value` to {@link STOCK_CATEGORIES} `id` when mock inventory exists. */
const STOCKS_STOCK_OUT_ORDER_CATEGORY_TO_STOCK_BLOCK_ID = {
  Cleaning: 'cleaning',
  Pantry: 'pantry',
  Stationary: 'stationery',
};

function getStockOutCenterNamePrefix(centerValue) {
  const option = STOCKS_ORDER_FORM_CENTER_OPTIONS.find((row) => row.value === centerValue);
  if (!option?.label) return '';
  const openParen = option.label.indexOf(' (');
  return openParen >= 0 ? option.label.slice(0, openParen).trim() : option.label.trim();
}

function stockOutProductMatchesInventoryRow(catalogLabel, inventoryProductLabel) {
  if (!catalogLabel || !inventoryProductLabel) return false;
  const a = String(catalogLabel).trim().toLowerCase();
  const b = String(inventoryProductLabel).trim().toLowerCase();
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

/**
 * One line per catalog SKU for the category after center + category are chosen.
 * `unit` prefers mock inventory (`STOCK_CATEGORIES`) when the row matches center + product; otherwise catalog unit.
 */
export function buildStockOutLineItemsFromCenterAndCategory(centerValue, categoryValue) {
  const products = getOrderProductSelectOptions(categoryValue);
  if (!products?.length) return [createEmptyStockOutLineItem()];

  const centerPrefix = getStockOutCenterNamePrefix(centerValue);
  const stockBlockId = STOCKS_STOCK_OUT_ORDER_CATEGORY_TO_STOCK_BLOCK_ID[categoryValue];
  const stockBlock = stockBlockId
    ? STOCK_CATEGORIES.find((block) => block.id === stockBlockId)
    : null;
  const stockRows = Array.isArray(stockBlock?.rows) ? stockBlock.rows : [];

  return products.map((productOption) => {
    const stockHit = stockRows.find(
      (row) =>
        Boolean(centerPrefix) &&
        String(row.center ?? '').trim() === centerPrefix &&
        stockOutProductMatchesInventoryRow(productOption.label, row.product),
    );
    const unitFromStock = String(stockHit?.unit ?? '').trim();
    const unit = unitFromStock || String(productOption.unit ?? '').trim() || '';

    return {
      id: `sol-${centerValue}-${categoryValue}-${productOption.value}`,
      product: productOption.value,
      unit,
      issued: '',
      remarks: '',
    };
  });
}

/**
 * Mock on-hand quantity for create / view stock-out line items (`STOCK_CATEGORIES` by center + category + product).
 * Returns `null` when unknown (show "—" in UI).
 */
export function getStockOutMockCurrentStockQty(centerValue, categoryValue, productValue) {
  if (!centerValue || !categoryValue || !productValue) return null;
  const meta = findOrderProductMeta(productValue, categoryValue);
  if (!meta?.label) return null;
  const centerPrefix = getStockOutCenterNamePrefix(centerValue);
  const stockBlockId = STOCKS_STOCK_OUT_ORDER_CATEGORY_TO_STOCK_BLOCK_ID[categoryValue];
  const stockBlock = stockBlockId
    ? STOCK_CATEGORIES.find((block) => block.id === stockBlockId)
    : null;
  const stockRows = Array.isArray(stockBlock?.rows) ? stockBlock.rows : [];
  const hit = stockRows.find(
    (row) =>
      Boolean(centerPrefix) &&
      String(row.center ?? '').trim() === centerPrefix &&
      stockOutProductMatchesInventoryRow(meta.label, row.product),
  );
  const raw = String(hit?.qty ?? '')
    .replaceAll(',', '')
    .trim();
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export function createDefaultStockOutFormState() {
  return {
    center: '',
    destinationCenter: '',
    department: '',
    category: '',
    issuedBy: '',
    issueMode: 'Manual',
    entryDate: '',
    notes: '',
    lineItems: [createEmptyStockOutLineItem()],
    status: STOCKS_STOCK_OUT_STATUS.DRAFT,
    stockImages: [],
    files: [],
  };
}

export const STOCKS_STOCK_OUT_ROWS = [
  {
    id: 'sout-1',
    center: 'Skyline Hub (BOM)',
    department: 'Housekeeping',
    date: '10 May 2025',
    dateIso: '2025-05-10',
    category: 'Cleaning',
    items: 2,
    issuedQty: '24',
    issueMode: 'Consumption',
    status: STOCKS_STOCK_OUT_STATUS.ISSUED,
    detail: {
      center: 'skyline-hub',
      department: 'housekeeping',
      category: 'Cleaning',
      issuedBy: 'rahul-sharma',
      issueMode: STOCKS_STOCK_OUT_ISSUE_MODE.CONSUMPTION,
      entryDate: '2025-05-10',
      notes: 'Monthly floor-care kit for Tower A.',
      lineItems: [
        {
          id: 'sout1-li-1',
          product: 'floor-cleaner-5l',
          unit: 'liter',
          issued: '20',
          remarks: '',
        },
        {
          id: 'sout1-li-2',
          product: 'mop-set',
          unit: 'set',
          issued: '4',
          remarks: 'Heavy-duty',
        },
      ],
    },
  },
  {
    id: 'sout-2',
    center: 'Orion Tech Park (AMD)',
    department: 'Pantry',
    date: '8 May 2025',
    dateIso: '2025-05-08',
    category: 'Pantry',
    items: 1,
    issuedQty: '12',
    issueMode: 'Consumption',
    status: STOCKS_STOCK_OUT_STATUS.ISSUED,
    detail: {
      center: 'orion-tech-park',
      department: 'pantry',
      category: 'Pantry',
      issuedBy: 'priya-nair',
      issueMode: STOCKS_STOCK_OUT_ISSUE_MODE.CONSUMPTION,
      entryDate: '2025-05-08',
      notes: '',
      lineItems: [
        {
          id: 'sout2-li-1',
          product: 'coffee-powder',
          unit: 'pack',
          issued: '12',
          remarks: 'Awaiting approval for remainder',
        },
      ],
    },
  },
  {
    id: 'sout-3',
    center: 'Harbour View (RJT)',
    department: 'Operations',
    date: '5 May 2025',
    dateIso: '2025-05-05',
    category: 'IT',
    items: 1,
    issuedQty: '6',
    issueMode: 'Transfer out',
    status: STOCKS_STOCK_OUT_STATUS.ISSUED,
    detail: {
      center: 'harbour-view',
      department: 'operations',
      category: 'IT',
      issuedBy: 'amit-patel',
      issueMode: STOCKS_STOCK_OUT_ISSUE_MODE.TRANSFER_OUT,
      entryDate: '2025-05-05',
      notes: 'Transfer to Orion spare pool.',
      lineItems: [
        {
          id: 'sout3-li-1',
          product: 'hdmi-cable',
          unit: 'pack',
          issued: '6',
          remarks: '',
        },
      ],
    },
  },
  {
    id: 'sout-4',
    center: 'Skyline Hub (BOM)',
    department: 'Maintenance',
    date: '3 May 2025',
    dateIso: '2025-05-03',
    category: 'Safety',
    items: 1,
    issuedQty: '2',
    issueMode: 'Damage / scrap',
    status: STOCKS_STOCK_OUT_STATUS.DRAFT,
    detail: {
      center: 'skyline-hub',
      department: 'maintenance',
      category: 'Safety',
      issuedBy: 'sneha-roy',
      issueMode: STOCKS_STOCK_OUT_ISSUE_MODE.DAMAGE,
      entryDate: '2025-05-03',
      notes: 'Damaged extinguishers from inspection lot.',
      lineItems: [
        {
          id: 'sout4-li-1',
          product: 'fire-extinguisher',
          unit: 'pcs',
          issued: '2',
          remarks: 'Scrap — DO NOT reuse',
        },
      ],
    },
  },
];
