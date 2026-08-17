import {
  RiArrowLeftDownLine,
  RiArrowRightUpLine,
  RiBox3Fill,
  RiBox3Line,
  RiBriefcaseLine,
  RiBuildingFill,
  RiArmchairFill,
  RiComputerFill,
  RiDeleteBinFill,
  RiErrorWarningFill,
  RiCalendarCheckLine,
  RiCalendarScheduleLine,
  RiMoneyRupeeCircleFill,
  RiTaskLine,
  RiToolsFill,
} from 'react-icons/ri';

import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';

export { STOCKS_FILTER_VALUE_ALL as AUM_FILTER_VALUE_ALL };

export const AUM_LIST_PAGE_SIZE = 20;

/** Debounce delay for AUM list toolbar search (matches Stocks list pages). */
export const AUM_SEARCH_DEBOUNCE_MS = 400;

export const AUM_PAGE_META = {
  title: 'AUM',
  description: 'Manage assets, inventory movements, product master data, and maintenance records.',
};

export const AumPageIcon = RiBriefcaseLine;

export const AUM_TAB_IDS = {
  ASSET: 'asset',
  IN: 'in',
  OUT: 'out',
  MAINTENANCE_SCHEDULER: 'maintenance-scheduler',
  PREVENTIVE_CHECKS: 'preventive-checks',
  MAINTENANCE_TASK: 'maintenance-task',
};

export const AUM_TABS = [
  {
    id: AUM_TAB_IDS.ASSET,
    label: 'Asset',
    IconLine: RiBox3Line,
    IconFill: RiBox3Fill,
  },
  {
    id: AUM_TAB_IDS.IN,
    label: 'In',
    IconLine: RiArrowLeftDownLine,
    IconFill: RiArrowLeftDownLine,
  },
  {
    id: AUM_TAB_IDS.OUT,
    label: 'Out',
    IconLine: RiArrowRightUpLine,
    IconFill: RiArrowRightUpLine,
  },
  {
    id: AUM_TAB_IDS.MAINTENANCE_SCHEDULER,
    label: 'Maintenance Scheduler',
    IconLine: RiCalendarScheduleLine,
    IconFill: RiCalendarScheduleLine,
  },
  {
    id: AUM_TAB_IDS.PREVENTIVE_CHECKS,
    label: 'Preventive Checks',
    IconLine: RiCalendarCheckLine,
    IconFill: RiCalendarCheckLine,
  },
  {
    id: AUM_TAB_IDS.MAINTENANCE_TASK,
    label: 'Maintenance Task',
    IconLine: RiTaskLine,
    IconFill: RiTaskLine,
  },
];

export const AUM_DEFAULT_ACTIVE_TAB = AUM_TAB_IDS.ASSET;

export const AUM_STAT_CARDS_CONFIG = [
  { valueKey: 'totalAssets', label: 'Total Assets', Icon: RiBox3Fill, color: '#3B82F6' },
  {
    valueKey: 'totalAssetValue',
    label: 'Total Asset Value',
    Icon: RiMoneyRupeeCircleFill,
    color: '#1DAF61',
  },
  { valueKey: 'totalCenters', label: 'Total Centers', Icon: RiBuildingFill, color: '#6E3FF3' },
  {
    valueKey: 'totalWorkstations',
    label: 'Total Workstations',
    Icon: RiComputerFill,
    color: '#4F46E5',
  },
  { valueKey: 'totalChairs', label: 'Total Chairs', Icon: RiArmchairFill, color: '#0D9488' },
  { valueKey: 'underMaintenance', label: 'Under Maintenance', Icon: RiToolsFill, color: '#F17B2C' },
  {
    valueKey: 'damagedAssets',
    label: 'Damaged Assets',
    Icon: RiErrorWarningFill,
    color: '#DF1C41',
  },
  { valueKey: 'retiredAssets', label: 'Retired Assets', Icon: RiDeleteBinFill, color: '#667085' },
];

export const AUM_FILTER_TABS = [
  { value: 'center', label: 'Centers' },
  { value: 'productGroup', label: 'Product Group' },
  { value: 'productCategory', label: 'Product Category' },
  { value: 'brand', label: 'Brand' },
];

export const AUM_DEFAULT_APPLIED_FILTERS = {
  center: [],
  productGroup: [],
  productCategory: [],
  brand: [],
};

export const AUM_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search assets',
  centerPlaceholder: 'All Centers',
  productGroupPlaceholder: 'All Product Groups',
  productCategoryPlaceholder: 'All Product Categories',
  brandPlaceholder: 'All Brands',
  groupByMenuLabel: 'Group by',
  groupByClear: 'Clear',
  viewOptionsAriaLabel: 'Group by',
  columnsAriaLabel: 'Column settings',
  columnsTooltip: 'Columns',
  hierarchyFieldsLabel: '1 field',
  addMoreGroupLabel: 'Add More Group',
  expandAllGroupsAriaLabel: 'Expand all groups',
  collapseAllGroupsAriaLabel: 'Collapse all groups',
};

/** Single group-by options for Asset In / Asset Out list pages (Stocks-style). */
export const AUM_TRANSACTION_GROUP_BY_IDS = {
  CENTER: 'centerName',
  STATUS: 'status',
  REASON: 'reason',
};

export const AUM_TRANSACTION_GROUP_BY_OPTIONS = [
  { value: AUM_TRANSACTION_GROUP_BY_IDS.CENTER, label: 'Center' },
  { value: AUM_TRANSACTION_GROUP_BY_IDS.STATUS, label: 'Status' },
];

export const AUM_ASSET_OUT_GROUP_BY_OPTIONS = [
  ...AUM_TRANSACTION_GROUP_BY_OPTIONS,
  { value: AUM_TRANSACTION_GROUP_BY_IDS.REASON, label: 'Reason' },
];

export const AUM_MULTI_GROUP_BY_FIELD_IDS = {
  PRODUCT_TYPE: 'productType',
  PRODUCT_GROUP: 'productGroup',
  PRODUCT_CATEGORY: 'productCategory',
  CATEGORY_GROUP: 'categoryGroup',
  CENTER: 'centerName',
  AREA: 'area',
  BRAND: 'brand',
  CONDITION: 'condition',
};

export const AUM_MULTI_GROUP_BY_OPTIONS = [
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_TYPE, label: 'Product Type' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_GROUP, label: 'Product Group' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_CATEGORY, label: 'Category Type' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.CATEGORY_GROUP, label: 'Category Group' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.CENTER, label: 'Center' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.AREA, label: 'Area' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.BRAND, label: 'Brand' },
  { value: AUM_MULTI_GROUP_BY_FIELD_IDS.CONDITION, label: 'Condition' },
];

export const AUM_DEFAULT_GROUP_BY_RULES = [
  { id: 'group-1', field: AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_GROUP, order: 'asc' },
];

export const AUM_ASSET_LIST_COLUMN_CONFIG = [
  { id: 'name', columnLabel: 'Name', visible: true, enableHiding: false },
  { id: 'serialNumber', columnLabel: 'Serial Number', visible: true, enableHiding: true },
  { id: 'productCode', columnLabel: 'Product Code', visible: true, enableHiding: true },
  { id: 'barcode', columnLabel: 'Barcode', visible: true, enableHiding: true },
  { id: 'condition', columnLabel: 'Condition', visible: true, enableHiding: true },
  { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true },
  { id: 'area', columnLabel: 'Area', visible: true, enableHiding: true },
  { id: 'center', columnLabel: 'Center', visible: true, enableHiding: true },
  { id: 'productType', columnLabel: 'Product Type', visible: true, enableHiding: true },
  { id: 'productGroup', columnLabel: 'Product Group', visible: true, enableHiding: true },
  { id: 'productCategory', columnLabel: 'Category Type', visible: true, enableHiding: true },
  { id: 'categoryGroup', columnLabel: 'Category Group', visible: true, enableHiding: true },
  { id: 'purchaseDate', columnLabel: 'Purchase Date', visible: true, enableHiding: true },
  {
    id: 'availableForUseDate',
    columnLabel: 'Available for Use Date',
    visible: true,
    enableHiding: true,
  },
  { id: 'warrantyDueDate', columnLabel: 'Warranty Due Date', visible: true, enableHiding: true },
  { id: 'originalValue', columnLabel: 'Original Value', visible: true, enableHiding: true },
  { id: 'currentValue', columnLabel: 'Current Value', visible: true, enableHiding: true },
  { id: 'lastMaintenanceDate', columnLabel: 'Last Maintenance', visible: true, enableHiding: true },
  {
    id: 'totalMaintenanceValue',
    columnLabel: 'Total Maintenance Value',
    visible: true,
    enableHiding: true,
  },
];

export const AUM_IN_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search asset in transactions',
  centerPlaceholder: 'All Centers',
  exportLabel: 'Export',
  newAssetInLabel: 'Add',
};

export const AUM_IN_COLUMN_CONFIG = [
  { id: 'serialNumber', columnLabel: 'Serial Number', visible: true, enableHiding: false },
  { id: 'inDate', columnLabel: 'In Date', visible: true, enableHiding: true },
  { id: 'center', columnLabel: 'Center', visible: true, enableHiding: true },
  { id: 'floor', columnLabel: 'Floor', visible: true, enableHiding: true },
  { id: 'area', columnLabel: 'Area', visible: true, enableHiding: true },
  { id: 'layout', columnLabel: 'Layout', visible: true, enableHiding: true },
  { id: 'productName', columnLabel: 'Product', visible: true, enableHiding: true },
  { id: 'qty', columnLabel: 'Qty', visible: true, enableHiding: true },
  { id: 'unit_price', columnLabel: 'Unit Price', visible: true, enableHiding: true },
  { id: 'total_value', columnLabel: 'Total Value', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
  { id: 'createdBy', columnLabel: 'Created By', visible: true, enableHiding: true },
];

// ——— Asset Out ———

export const AUM_OUT_TYPES = {
  TRANSFER: 'Asset Transfer',
  SELL: 'Asset Sell',
  SCRAP: 'Asset Scrap',
};

export const AUM_OUT_TYPE_OPTIONS = [
  { value: AUM_OUT_TYPES.TRANSFER, label: 'Asset Transfer' },
  { value: AUM_OUT_TYPES.SELL, label: 'Asset Sell' },
  { value: AUM_OUT_TYPES.SCRAP, label: 'Asset Scrap' },
];

export const AUM_OUT_TOOLBAR_COPY = {
  searchPlaceholder: 'Search here...',
  searchAriaLabel: 'Search asset out transactions',
  centerPlaceholder: 'All Centers',
  newAssetOutLabel: 'Add',
};

export const AUM_OUT_COLUMN_CONFIG = [
  { id: 'outNumber', columnLabel: 'OUT Number', visible: true, enableHiding: false },
  { id: 'outDate', columnLabel: 'Date', visible: true, enableHiding: true },
  { id: 'center', columnLabel: 'Center', visible: true, enableHiding: true },
  { id: 'floor', columnLabel: 'Floor', visible: true, enableHiding: true },
  { id: 'area', columnLabel: 'Area', visible: true, enableHiding: true },
  { id: 'reason', columnLabel: 'Reason', visible: true, enableHiding: true },
  { id: 'qty', columnLabel: 'Qty', visible: true, enableHiding: true },
  { id: 'value', columnLabel: 'Value', visible: true, enableHiding: true },
  { id: 'createdBy', columnLabel: 'Created By', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
];

/** `useColumnConfig` / list pref API keys for AUM list tables */
export const AUM_ASSET_LIST_TABLE_ID = 'aum-asset-list';
export const AUM_ASSET_IN_LIST_TABLE_ID = 'aum-asset-in-list';
export const AUM_ASSET_OUT_LIST_TABLE_ID = 'aum-asset-out-list';
export const AUM_PREVENTIVE_CHECKS_LIST_TABLE_ID = 'aum-preventive-checks-list';
export const AUM_MAINTENANCE_TASK_LIST_TABLE_ID = 'aum-maintenance-task-list';

export const AUM_LIST_PREF_DOCTYPE = {
  ASSET: 'Asset',
  ASSET_IN: 'Asset In',
  ASSET_OUT: 'Asset Out',
  MAINTENANCE_LOG: 'Asset Maintenance Log',
};

/** Sticky first column per AUM list table (overrides global FIRST_COLUMN_NAME heuristics). */
export const AUM_PINNED_COLUMN_ID = {
  [AUM_ASSET_LIST_TABLE_ID]: 'name',
  [AUM_ASSET_IN_LIST_TABLE_ID]: 'serialNumber',
  [AUM_ASSET_OUT_LIST_TABLE_ID]: 'outNumber',
  [AUM_PREVENTIVE_CHECKS_LIST_TABLE_ID]: 'name',
  [AUM_MAINTENANCE_TASK_LIST_TABLE_ID]: 'name',
};
