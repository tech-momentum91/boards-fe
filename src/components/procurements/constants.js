import {
  RiShoppingCartLine,
  RiFileList3Line,
  RiFileSettingsLine,
  RiMoneyDollarCircleLine,
  RiPieChartFill,
  RiPieChartLine,
} from 'react-icons/ri';

const CRORE = 1_00_00_000;

export const PROCUREMENTS_PAGE_META = {
  title: 'Procurements',
  description: 'Manage project procurements, purchase orders, and vendor payments',
};

export const PROJECT_PROCUREMENTS_PAGE_META = {
  title: 'Project Procurements',
  description: 'Manage all your projects procurements from here.',
};

export const ProcurementPageIcon = RiShoppingCartLine;

export const PROCUREMENTS_SECTION_IDS = {
  PROJECT_PROCUREMENTS: 'project-procurements',
  POS: 'pos',
  VENDOR_PAYMENTS: 'vendor-payments',
};

export const PROCUREMENTS_DEFAULT_SECTION = PROCUREMENTS_SECTION_IDS.PROJECT_PROCUREMENTS;

export const VENDOR_PAYMENTS_PAGE_META = {
  title: 'Vendor Payment',
  description: 'Company-wide financial transaction management',
};

export const PROCUREMENTS_SECTIONS = [
  {
    id: PROCUREMENTS_SECTION_IDS.PROJECT_PROCUREMENTS,
    label: 'Project Procurements',
    title: 'Project Procurements',
    description: PROJECT_PROCUREMENTS_PAGE_META.description,
  },
  {
    id: PROCUREMENTS_SECTION_IDS.POS,
    label: "PO's",
    title: "PO's",
  },
  {
    id: PROCUREMENTS_SECTION_IDS.VENDOR_PAYMENTS,
    label: 'Vendor Payments',
    title: VENDOR_PAYMENTS_PAGE_META.title,
    description: VENDOR_PAYMENTS_PAGE_META.description,
  },
];

export const VALID_PROCUREMENTS_SECTION_IDS = new Set(
  PROCUREMENTS_SECTIONS.map((section) => section.id),
);

export const PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID = 'project-procurements-list';
export const PROJECT_PROCUREMENTS_LIST_PREF_DOCTYPE = 'Purchase BOQ';

/** Packages tab column manager — User Listview Preference doctype (same pattern as user list). */
export const PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID =
  'project-procurement-packages-list';
export const PROJECT_PROCUREMENT_PACKAGES_LIST_PREF_DOCTYPE = 'User';

/** Packages column manager defaults — Figma 34432:197163. */
export const PROJECT_PROCUREMENT_PACKAGES_COLUMNS = [
  { id: 'name', label: 'Package Name', visible: true, enableHiding: false },
  { id: 'code', label: 'Code', visible: true },
  { id: 'categories', label: 'Category', visible: true },
  { id: 'itemCount', label: 'Items', visible: true },
  { id: 'packageValue', label: 'Package Value', visible: true },
  { id: 'invitedCount', label: 'Invited', visible: true },
  { id: 'quotes', label: 'Quotes', visible: true },
  { id: 'lowestBidder', label: 'Lowest Bidder', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'lastUpdated', label: 'Last Updated', visible: false },
];

export const PROJECT_PROCUREMENT_PACKAGES_COLUMN_WIDTHS = {
  name: 'min-w-[222px]',
  code: 'min-w-[129px]',
  categories: 'min-w-[180px]',
  itemCount: 'min-w-[90px]',
  packageValue: 'min-w-[139px]',
  invitedCount: 'min-w-[100px]',
  quotes: 'min-w-[100px]',
  lowestBidder: 'min-w-[190px]',
  status: 'min-w-[200px]',
  lastUpdated: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENTS_COLUMNS = [
  { id: 'name', label: 'Name', visible: true, enableHiding: false },
  { id: 'stage', label: 'Stage', visible: true },
  { id: 'city', label: 'City', visible: true },
  { id: 'internal_boq', label: 'Internal BOQ', visible: true },
  { id: 'purchase_boq', label: 'Purchase BOQ', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'pending_po', label: 'Pending PO', visible: true },
  { id: 'paid_payment', label: 'Paid Payment', visible: true },
  { id: 'pending_payment', label: 'Pending Payment', visible: true },
  { id: 'parent_project', label: 'Parent Project', visible: false },
  { id: 'design_start', label: 'Design Start', visible: false },
  { id: 'design_end', label: 'Design End', visible: false },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const PROJECT_PROCUREMENTS_COLUMN_WIDTHS = {
  name: 'min-w-[149px]',
  stage: 'min-w-[105px]',
  city: 'min-w-[109px]',
  internal_boq: 'min-w-[128px]',
  purchase_boq: 'min-w-[142px]',
  po_value: 'min-w-[110px]',
  pending_po: 'min-w-[122px]',
  paid_payment: 'min-w-[139px]',
  pending_payment: 'min-w-[155px]',
  parent_project: 'min-w-[166px]',
  design_start: 'min-w-[140px]',
  design_end: 'min-w-[140px]',
  last_updated: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENTS_LIST_DEFAULT_SORTING = [{ id: 'name', desc: false }];

export const PROJECT_PROCUREMENTS_LIST_SORT_FIELD_MAP = {
  name: 'project_name',
  stage: 'custom_project_stage',
  city: 'custom_city',
  internal_boq: 'internal_boq_value',
  purchase_boq: 'purchase_boq_value',
  po_value: 'po_value',
  pending_po: 'pending_po_value',
  paid_payment: 'paid_payment',
  pending_payment: 'pending_payment',
  parent_project: 'custom_parent_project',
  design_start: 'custom_design_start_date',
  design_end: 'custom_design_end_date',
  last_updated: 'modified',
};

export const PROJECT_PROCUREMENTS_CITY_FILTER_ALL = { value: 'all', label: 'All Cities' };

export function buildProjectProcurementCityFilterOptions(cities = []) {
  return [
    PROJECT_PROCUREMENTS_CITY_FILTER_ALL,
    ...(Array.isArray(cities) ? cities : []).map(({ value, label }) => ({
      value,
      label: label || value,
    })),
  ];
}

export function buildProjectProcurementListOrderBy(sorting = []) {
  if (!Array.isArray(sorting) || sorting.length === 0) {
    return 'project_name asc';
  }

  const { id, desc } = sorting[0] ?? {};
  const backendField = PROJECT_PROCUREMENTS_LIST_SORT_FIELD_MAP[id];
  if (!backendField) return 'project_name asc';
  return `${backendField} ${desc ? 'desc' : 'asc'}`;
}

export const PROJECT_PROCUREMENT_DETAIL_TAB_IDS = {
  OVERVIEW: 'overview',
  INTERNAL_BOQ: 'internal-boq',
  PURCHASE_BOQ: 'purchase-boq',
  PACKAGES: 'packages',
  POS: 'pos',
  VENDORS: 'vendors',
  BILLING_QC: 'billing-qc',
  PAYMENT_PLANNING: 'payment-planning',
};

export const PROJECT_PROCUREMENT_DETAIL_DEFAULT_TAB =
  PROJECT_PROCUREMENT_DETAIL_TAB_IDS.INTERNAL_BOQ;

export const PROJECT_PROCUREMENT_DETAIL_TABS = [
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.OVERVIEW, label: 'Overview' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.INTERNAL_BOQ, label: 'Internal BOQ' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PURCHASE_BOQ, label: 'Purchase BOQ' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PACKAGES, label: 'Packages' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.POS, label: 'POs' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.VENDORS, label: 'Vendors' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.BILLING_QC, label: 'Billing & QC' },
  { id: PROJECT_PROCUREMENT_DETAIL_TAB_IDS.PAYMENT_PLANNING, label: 'Payment Planning' },
];

export const PROJECT_PROCUREMENT_PURCHASE_BOQ_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Name', visible: true, enableHiding: true, width: '249px' },
  { id: 'itemCode', columnLabel: 'BOQ ID', visible: true, enableHiding: true, width: '113px' },
  { id: 'boqType', columnLabel: 'BOQ Type', visible: true, enableHiding: true, width: '113px' },
  {
    id: 'areaLocation',
    columnLabel: 'Area/ location',
    visible: true,
    enableHiding: true,
    width: '151px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: true,
    enableHiding: true,
    width: 'minmax(280px,340px)',
  },
  { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true, width: '139px' },
  {
    id: 'boqCategory',
    columnLabel: 'BOQ Category',
    visible: true,
    enableHiding: true,
    width: '181px',
  },
  {
    id: 'purchaseCategory',
    columnLabel: 'Purchase Category',
    visible: true,
    enableHiding: true,
    width: '181px',
  },
  {
    id: 'quantity',
    columnLabel: 'Quantity',
    visible: true,
    enableHiding: true,
    width: '129px',
  },
  { id: 'units', columnLabel: 'Units', visible: true, enableHiding: true, width: '100px' },
  {
    id: 'purchaseRate',
    columnLabel: 'Rate',
    visible: true,
    enableHiding: true,
    width: '94px',
  },
  {
    id: 'lineValue',
    columnLabel: 'Value',
    visible: true,
    enableHiding: true,
    width: '95px',
  },
  {
    id: 'packageCode',
    columnLabel: 'Packages',
    visible: true,
    enableHiding: true,
    width: '133px',
  },
  {
    id: 'vendors',
    columnLabel: 'Vendor',
    visible: true,
    enableHiding: true,
    width: '221px',
  },
  {
    id: 'journey',
    columnLabel: 'Journey',
    visible: true,
    enableHiding: true,
    width: '476px',
  },
  {
    id: 'procurementStatus',
    columnLabel: 'Status',
    visible: true,
    enableHiding: true,
    width: '168px',
  },
];

/** Package detail Items full table — Figma 34662:623910. */
export const PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Name', visible: true, enableHiding: true, width: '249px' },
  { id: 'itemCode', columnLabel: 'BOQ ID', visible: true, enableHiding: true, width: '113px' },
  { id: 'boqType', columnLabel: 'BOQ Type', visible: true, enableHiding: true, width: '113px' },
  {
    id: 'procurementStatus',
    columnLabel: 'Status',
    visible: true,
    enableHiding: true,
    width: '168px',
  },
  {
    id: 'areaLocation',
    columnLabel: 'Area/ location',
    visible: true,
    enableHiding: true,
    width: '151px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: true,
    enableHiding: true,
    width: 'minmax(280px,340px)',
  },
];

export const PROJECT_PROCUREMENT_PACKAGE_ITEMS_COLUMN_TABLE_ID =
  'project-procurement-package-items';

/** Raise PO drawer Step 2 line items — Figma 34834:119526. */
export const PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_CONFIG = [
  { id: 'product', columnLabel: 'Name', visible: true, enableHiding: false, width: '275px' },
  { id: 'brand', columnLabel: 'Brand', visible: true, enableHiding: true, width: '106px' },
  { id: 'units', columnLabel: 'UOM', visible: true, enableHiding: true, width: '84px' },
  { id: 'quantity', columnLabel: 'Quantity', visible: true, enableHiding: true, width: '250px' },
  {
    id: 'vendorRate',
    columnLabel: 'Vendor Rate',
    visible: false,
    enableHiding: true,
    width: '131px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: false,
    enableHiding: true,
    width: 'minmax(280px,340px)',
  },
  { id: 'lineValue', columnLabel: 'Value', visible: false, enableHiding: true, width: '106px' },
  {
    id: 'discPercent',
    columnLabel: 'Disc. (%)',
    visible: false,
    enableHiding: true,
    width: '104px',
  },
  {
    id: 'discValue',
    columnLabel: 'Disc. Value',
    visible: false,
    enableHiding: true,
    width: '125px',
  },
  { id: 'remarks', columnLabel: 'Remarks', visible: false, enableHiding: true, width: '161px' },
];

export const PROJECT_PROCUREMENT_RAISE_PO_LINE_ITEMS_COLUMN_TABLE_ID =
  'project-procurement-raise-po-line-items';

export const PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_TABLE_ID =
  'project-procurement-vendor-comparison';

/** Packages tab statuses — Figma 34432:189910 / 34423:194547. */
export const PROJECT_PROCUREMENT_PACKAGE_STATUS = {
  READY_FOR_COMPARISON: 'ready-for-comparison',
  QUOTES_PENDING: 'quotes-pending',
  RFQ_DRAFT: 'rfq-draft',
  PO_PARTIAL: 'po-partial',
  PO_RELEASED: 'po-released',
};

export const PROJECT_PROCUREMENT_PACKAGE_STATUS_META = {
  [PROJECT_PROCUREMENT_PACKAGE_STATUS.READY_FOR_COMPARISON]: {
    label: 'Ready for Comparison',
    color: 'blue',
  },
  [PROJECT_PROCUREMENT_PACKAGE_STATUS.QUOTES_PENDING]: {
    label: 'Quotes Pending',
    color: 'orange',
  },
  [PROJECT_PROCUREMENT_PACKAGE_STATUS.RFQ_DRAFT]: {
    label: 'RFQ Draft',
    color: 'gray',
  },
  [PROJECT_PROCUREMENT_PACKAGE_STATUS.PO_PARTIAL]: {
    label: 'PO Partial',
    color: 'orange',
  },
  [PROJECT_PROCUREMENT_PACKAGE_STATUS.PO_RELEASED]: {
    label: 'PO Released',
    color: 'green',
  },
};

export function buildProjectProcurementDetailStats(row = {}) {
  const supplierPaymentValue = Number(row.paid_payment) || 0;
  const pendingSupplierPayment = Math.max((Number(row.po_value) || 0) - supplierPaymentValue, 0);

  return [
    {
      value: formatProcurementAmountFromRow(row.internal_boq_value),
      label: 'Internal BOQ',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(row.purchase_boq_value),
      label: 'Purchase BOQ',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(row.po_value),
      label: 'PO Value',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(row.pending_po_value),
      label: 'Pending PO',
      tone: 'orange',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(supplierPaymentValue),
      label: 'Supplier Payment Value',
      tone: 'purple',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(pendingSupplierPayment),
      label: 'Pending Supplier Payment',
      tone: 'red',
      icon: 'money',
    },
  ];
}

/** Purchase BOQ tab stats from Figma (34419:191916). */
export function buildProjectProcurementPurchaseBoqStats(row = {}) {
  const boqValue = Number(row.internal_boq_value) || 2.37 * CRORE;
  const purchaseBoqValue = Number(row.purchase_boq_value) || 2.37 * CRORE;
  const poValue = Number(row.po_value) || 45.8 * 1_00_000;
  const pendingPoValue = Number(row.pending_po_value) || 1.92 * CRORE;
  const packageCount = Number(row.package_count) || 9;
  const totalBillValue = Number(row.total_bill_value) || 54 * 1_00_000;
  const paidPayment = Number(row.paid_payment) || 54 * 1_00_000;
  const pendingPayment =
    Number(row.pending_payment) || Math.max(boqValue - paidPayment, 1.79 * CRORE);

  return [
    {
      value: formatProcurementAmountFromRow(boqValue, { spacedSymbol: true }),
      label: 'BOQ Value',
      tone: 'pink',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(purchaseBoqValue, { spacedSymbol: true }),
      label: 'Purchase BOQ',
      tone: 'teal',
      icon: 'chart',
    },
    {
      value: formatProcurementAmountFromRow(poValue, { spacedSymbol: true }),
      label: 'PO Value',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(pendingPoValue, { spacedSymbol: true }),
      label: 'Pending PO Value',
      tone: 'blue',
      icon: 'money',
    },
    {
      value: String(packageCount).padStart(2, '0'),
      label: 'No. of Packages',
      tone: 'purple',
      icon: 'box',
    },
    {
      value: formatProcurementAmountFromRow(totalBillValue, { spacedSymbol: true }),
      label: 'Total Bill Value',
      tone: 'red',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(paidPayment, { spacedSymbol: true }),
      label: 'Paid Payment',
      tone: 'green',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(pendingPayment, { spacedSymbol: true }),
      label: 'Pending Payment',
      tone: 'orange',
      icon: 'money',
    },
  ];
}

export const PROJECT_PROCUREMENT_PURCHASE_BOQ_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending-procurement', label: 'Pending Procurement' },
  { id: 'package-pending', label: 'Package Created' },
  { id: 'rfq-sent', label: 'RFQ Sent' },
  { id: 'quotation-received', label: 'Quotation Received' },
  { id: 'vendor-finalized', label: 'Vendor Finalized' },
  { id: 'po-released', label: 'PO Released' },
  { id: 'delivered', label: 'Delivered' },
];

export const PROJECT_PROCUREMENT_PURCHASE_BOQ_VIEW_MODES = {
  CARD: 'card',
  LIST: 'list',
};

/** Internal BOQ tab stats from Figma (34396:180401). */
export function buildProjectProcurementInternalBoqStats(row = {}) {
  const mainBoqValue = Number(row.internal_boq_main_value) || 1.18 * CRORE;
  const additionalBoqValue = Number(row.internal_boq_additional_value) || 9.8 * 1_00_000;
  const combinedBoqValue = Number(row.internal_boq_value) || mainBoqValue + additionalBoqValue;

  return [
    {
      value: formatProcurementAmountFromRow(mainBoqValue, { spacedSymbol: true }),
      label: 'Main BOQ',
      tone: 'pink',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(additionalBoqValue, { spacedSymbol: true }),
      label: 'Additional BOQ',
      tone: 'yellow',
      icon: 'money',
    },
    {
      value: formatProcurementAmountFromRow(combinedBoqValue, { spacedSymbol: true }),
      label: 'Combined BOQ',
      tone: 'blue',
      icon: 'money',
    },
  ];
}

function formatProcurementAmountFromRow(value, { spacedSymbol = false } = {}) {
  const CRORE_LOCAL = 1_00_00_000;
  const symbol = spacedSymbol ? '₹ ' : '₹';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return `${symbol}0`;
  if (amount >= CRORE_LOCAL) return `${symbol}${(amount / CRORE_LOCAL).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `${symbol}${(amount / 1_00_000).toFixed(1)} L`;
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
}

export const DEFAULT_PROJECT_PROCUREMENT_VENDOR_COMPARISON_VENDOR_IDS = [
  'abc-interiors',
  'hilti-corp',
  'knauf-partner-works',
];

export function withVendorComparisonLowestFlag(vendors) {
  const submittedAmounts = vendors
    .filter(
      (vendor) => vendor.quoteStatus === 'quote-submitted' && Number.isFinite(vendor.quoteAmount),
    )
    .map((vendor) => vendor.quoteAmount);
  const lowestAmount = submittedAmounts.length > 0 ? Math.min(...submittedAmounts) : null;

  return vendors.map((vendor) => ({
    ...vendor,
    isLowest:
      lowestAmount != null &&
      vendor.quoteStatus === 'quote-submitted' &&
      vendor.quoteAmount === lowestAmount,
  }));
}

/** Vendor comparison table columns — Figma 34727:60763 (column manager). */
export const PROJECT_PROCUREMENT_VENDOR_COMPARISON_COLUMN_CONFIG = [
  { id: 'item', columnLabel: 'Name', visible: true, enableHiding: false, width: '275px' },
  { id: 'uom', columnLabel: 'UOM', visible: true, enableHiding: true, width: '72px' },
  { id: 'qty', columnLabel: 'Qty.', visible: true, enableHiding: true, width: '96px' },
  {
    id: 'internalRate',
    columnLabel: 'Int. Rate',
    visible: true,
    enableHiding: true,
    width: '100px',
  },
  {
    id: 'internalValue',
    columnLabel: 'Int. Value',
    visible: true,
    enableHiding: true,
    width: '134px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: false,
    enableHiding: true,
    width: '249px',
  },
  { id: 'remarks', columnLabel: 'Remarks', visible: false, enableHiding: true, width: '180px' },
  {
    id: 'lastUpdated',
    columnLabel: 'Last Updated',
    visible: false,
    enableHiding: true,
    width: '140px',
  },
];

export const PROJECT_PROCUREMENT_VENDOR_QUOTES_COLUMN_TABLE_ID =
  'project-procurement-vendor-quotes';

/** Vendor quotes table columns — Figma 34853:77981. */
export const PROJECT_PROCUREMENT_VENDOR_QUOTES_COLUMN_CONFIG = [
  { id: 'item', columnLabel: 'Name', visible: true, enableHiding: false, width: '275px' },
  { id: 'uom', columnLabel: 'UOM', visible: true, enableHiding: true, width: '72px' },
  { id: 'qty', columnLabel: 'Qty.', visible: true, enableHiding: true, width: '96px' },
  {
    id: 'internalRate',
    columnLabel: 'Int. Rate',
    visible: true,
    enableHiding: true,
    width: '100px',
  },
  {
    id: 'internalValue',
    columnLabel: 'Int. Value',
    visible: true,
    enableHiding: true,
    width: '134px',
  },
  {
    id: 'description',
    columnLabel: 'Description',
    visible: false,
    enableHiding: true,
    width: '249px',
  },
  { id: 'remarks', columnLabel: 'Remarks', visible: false, enableHiding: true, width: '180px' },
];

/* --- feat/work-order-integration additions --- */

export const PROCUREMENT_POS_STATUS_TAB_IDS = {
  ALL: 'all',
  RELEASED: 'released',
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending-approval',
};

export const PROCUREMENT_POS_DEFAULT_STATUS_TAB = PROCUREMENT_POS_STATUS_TAB_IDS.ALL;

export const PROCUREMENT_POS_STATUS_TABS = [
  { id: PROCUREMENT_POS_STATUS_TAB_IDS.ALL, label: 'All' },
  { id: PROCUREMENT_POS_STATUS_TAB_IDS.RELEASED, label: 'Released' },
  { id: PROCUREMENT_POS_STATUS_TAB_IDS.DRAFT, label: 'Draft' },
  { id: PROCUREMENT_POS_STATUS_TAB_IDS.PENDING_APPROVAL, label: 'Pending Approval' },
];

export const PROCUREMENT_POS_RELEASE_STATUS_BY_TAB = {
  [PROCUREMENT_POS_STATUS_TAB_IDS.RELEASED]: 'Released',
  [PROCUREMENT_POS_STATUS_TAB_IDS.DRAFT]: 'Draft',
  [PROCUREMENT_POS_STATUS_TAB_IDS.PENDING_APPROVAL]: 'Pending Approval',
};

export const PROCUREMENT_POS_COLUMN_TABLE_ID = 'procurement-pos-list';

/** Company-wide PO's list column prefs — User Listview Preference doctype. */
export const PROCUREMENT_POS_LIST_PREF_DOCTYPE = 'User';

export const PROCUREMENT_POS_COLUMNS = [
  { id: 'po_number', label: 'PO Number', visible: true, enableHiding: false },
  { id: 'project', label: 'Project', visible: true },
  { id: 'vendor_name', label: 'Vendor Name', visible: true },
  { id: 'package', label: 'Package', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'po_date', label: 'PO Date', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'paid_amt', label: 'Paid Amt.', visible: true },
  { id: 'pending_amt', label: 'Pending Amt.', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'stage', label: 'Stage', visible: false },
  { id: 'internal_boq', label: 'Internal BOQ', visible: false },
  { id: 'purchase_boq', label: 'Purchase BOQ', visible: false },
  { id: 'boq_po_value', label: 'PO Value', visible: false },
  { id: 'pending_po', label: 'Pending PO', visible: false },
  { id: 'paid_payment', label: 'Paid Payment', visible: false },
  { id: 'parent_project', label: 'Parent Project', visible: false },
  { id: 'design_start', label: 'Design Start', visible: false },
  { id: 'design_end', label: 'Design End', visible: false },
  { id: 'milestone_end', label: 'Design End', visible: false },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'updated_by', label: 'Updated By', visible: false },
];

export const PROCUREMENT_POS_COLUMN_WIDTHS = {
  po_number: 'min-w-[146px]',
  project: 'min-w-[163px]',
  vendor_name: 'min-w-[163px]',
  package: 'min-w-[129px]',
  category: 'min-w-[129px]',
  po_date: 'min-w-[120px]',
  type: 'min-w-[146px]',
  po_value: 'min-w-[127px]',
  paid_amt: 'min-w-[125px]',
  pending_amt: 'min-w-[139px]',
  status: 'min-w-[105px]',
  stage: 'min-w-[171px]',
  internal_boq: 'min-w-[128px]',
  purchase_boq: 'min-w-[142px]',
  boq_po_value: 'min-w-[110px]',
  pending_po: 'min-w-[122px]',
  paid_payment: 'min-w-[122px]',
  parent_project: 'min-w-[166px]',
  design_start: 'min-w-[140px]',
  design_end: 'min-w-[140px]',
  milestone_end: 'min-w-[140px]',
  created_by: 'min-w-[140px]',
  updated_by: 'min-w-[140px]',
};

export const PROCUREMENT_POS_LIST_DEFAULT_SORTING = [{ id: 'po_number', desc: false }];

export const PROCUREMENT_POS_VENDOR_FILTER_ALL = { value: 'all', label: 'All Vendors' };

export const PROCUREMENT_POS_VENDOR_FILTER_OPTIONS = [
  PROCUREMENT_POS_VENDOR_FILTER_ALL,
  { value: 'ABC Interiors', label: 'ABC Interiors' },
  { value: 'Gulf Electric', label: 'Gulf Electric' },
  { value: 'Sabic Materials', label: 'Sabic Materials' },
  { value: 'Jaguar Group', label: 'Jaguar Group' },
  { value: 'Bluestar Ltd', label: 'Bluestar Ltd' },
  { value: 'Metro Furnishings Inc.', label: 'Metro Furnishings Inc.' },
  { value: 'Smart Electricals', label: 'Smart Electricals' },
  { value: 'Zenith Contractors', label: 'Zenith Contractors' },
];

export const PROCUREMENT_POS_PACKAGE_FILTER_ALL = { value: 'all', label: 'All Packages' };

export const PROCUREMENT_POS_PACKAGE_FILTER_OPTIONS = [
  PROCUREMENT_POS_PACKAGE_FILTER_ALL,
  { value: 'PKG-GYP-001', label: 'PKG-GYP-001' },
  { value: 'PKG-CVL-001', label: 'PKG-CVL-001' },
  { value: 'PKG-FRN-002', label: 'PKG-FRN-002' },
  { value: 'PKG-ELC-003', label: 'PKG-ELC-003' },
  { value: 'PKG-PLM-004', label: 'PKG-PLM-004' },
];

export const PROCUREMENT_POS_CATEGORY_FILTER_ALL = {
  value: 'all',
  label: 'All Categories',
};

export const PROCUREMENT_POS_CATEGORY_FILTER_OPTIONS = [
  PROCUREMENT_POS_CATEGORY_FILTER_ALL,
  { value: 'Electric Works', label: 'Electric Works' },
  { value: 'Gypsum Works', label: 'Gypsum Works' },
  { value: 'Civil Works', label: 'Civil Works' },
  { value: 'Glass Works', label: 'Glass Works' },
  { value: 'Ceiling Works', label: 'Ceiling Works' },
  { value: 'Plumbing Works', label: 'Plumbing Works' },
];

export const PROCUREMENT_POS_GROUP_BY_OPTIONS = ['Vendor', 'Package', 'Category', 'Project'];

/** Figma tab menu 34464:67994 */
export const VENDOR_PAYMENTS_TAB_IDS = {
  ANALYTICS: 'analytics',
  VENDOR_PAYMENTS: 'vendor-payments',
  MASTER_PAYMENT_SHEETS: 'master-payment-sheets',
  BILL_AND_INVOICE: 'bill-and-invoice',
};

export const VENDOR_PAYMENTS_DEFAULT_TAB = VENDOR_PAYMENTS_TAB_IDS.VENDOR_PAYMENTS;

export const VENDOR_PAYMENTS_TABS = [
  {
    id: VENDOR_PAYMENTS_TAB_IDS.ANALYTICS,
    label: 'Analytics',
    IconLine: RiPieChartLine,
    IconFill: RiPieChartFill,
  },
  {
    id: VENDOR_PAYMENTS_TAB_IDS.VENDOR_PAYMENTS,
    label: 'Vendor Payments',
    IconLine: RiMoneyDollarCircleLine,
    IconFill: RiMoneyDollarCircleLine,
  },
  {
    id: VENDOR_PAYMENTS_TAB_IDS.MASTER_PAYMENT_SHEETS,
    label: 'Master Payment Sheets',
    IconLine: RiFileSettingsLine,
    IconFill: RiFileSettingsLine,
  },
  {
    id: VENDOR_PAYMENTS_TAB_IDS.BILL_AND_INVOICE,
    label: 'Bill & Invoice',
    IconLine: RiFileList3Line,
    IconFill: RiFileList3Line,
  },
];

export const VALID_VENDOR_PAYMENTS_TAB_IDS = new Set(VENDOR_PAYMENTS_TABS.map((tab) => tab.id));

export const VendorPaymentsPageIcon = RiMoneyDollarCircleLine;

/** Vendor Payments list — Figma 34464:70661 / 34464:70676 / 34466:81545 */
export const VENDOR_PAYMENTS_LIST_COLUMN_TABLE_ID = 'vendor-payments-list';

export const VENDOR_PAYMENTS_LIST_COLUMNS = [
  { id: 'vendor_name', label: 'Vendor Name', visible: true, enableHiding: false },
  { id: 'project', label: 'Project', visible: true },
  { id: 'payment_date', label: 'Payment Date', visible: true },
  { id: 'po_no', label: 'PO No.', visible: true },
  { id: 'invoice_no', label: 'Invoice No.', visible: true },
  { id: 'gross_amt', label: 'Gross Amt.', visible: true },
  { id: 'tds', label: 'TDS', visible: true },
  { id: 'net_paid', label: 'Net Paid', visible: true },
  { id: 'bill_received', label: 'Bill Received', visible: true },
  { id: 'bill_no', label: 'Bill No.', visible: true },
  { id: 'status', label: 'Status', visible: false },
  { id: 'procurement_stage', label: 'Stage', visible: false },
  { id: 'internal_boq', label: 'Internal BOQ', visible: false },
  { id: 'purchase_boq', label: 'Purchase BOQ', visible: false },
  { id: 'po_value', label: 'PO Value', visible: false },
  { id: 'pending_po', label: 'Pending PO', visible: false },
  { id: 'paid_payment', label: 'Paid Payment', visible: false },
  { id: 'parent_project', label: 'Parent Project', visible: false },
  { id: 'design_start', label: 'Design Start', visible: false },
  { id: 'design_end', label: 'Design End', visible: false },
  { id: 'milestone_end', label: 'Design End', visible: false },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const VENDOR_PAYMENTS_LIST_COLUMN_WIDTHS = {
  vendor_name: 'min-w-[163px]',
  project: 'min-w-[163px]',
  payment_date: 'min-w-[146px]',
  po_no: 'min-w-[122px]',
  invoice_no: 'min-w-[128px]',
  gross_amt: 'min-w-[120px]',
  tds: 'min-w-[88px]',
  net_paid: 'min-w-[113px]',
  bill_received: 'min-w-[139px]',
  bill_no: 'min-w-[183px]',
  status: 'min-w-[105px]',
  procurement_stage: 'min-w-[171px]',
  internal_boq: 'min-w-[128px]',
  purchase_boq: 'min-w-[142px]',
  po_value: 'min-w-[110px]',
  pending_po: 'min-w-[122px]',
  paid_payment: 'min-w-[122px]',
  parent_project: 'min-w-[166px]',
  design_start: 'min-w-[140px]',
  design_end: 'min-w-[140px]',
  milestone_end: 'min-w-[140px]',
  created_by: 'min-w-[140px]',
  last_updated: 'min-w-[140px]',
};

export const VENDOR_PAYMENTS_LIST_DEFAULT_SORTING = [{ id: 'vendor_name', desc: false }];

export const VENDOR_PAYMENTS_GROUP_BY_OPTIONS = ['Vendor Name', 'Project', 'Bill Received'];

/** Bill & Invoice list — Figma 34471:222020 / 34471:222035 / 34472:223404 / 34472:221074 */
export const BILL_AND_INVOICE_LIST_COLUMN_TABLE_ID = 'bill-and-invoice-list';

export const BILL_AND_INVOICE_LIST_COLUMNS = [
  { id: 'invoice_no', label: 'Invoice No.', visible: true, enableHiding: false },
  { id: 'vendor', label: 'Vendor', visible: true },
  { id: 'project', label: 'Project', visible: true },
  { id: 'po_no', label: 'PO No.', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'bill_date', label: 'Bill Date', visible: true },
  { id: 'bill_amt', label: 'Bill Amt.', visible: true },
  { id: 'gst_amt', label: 'GST Amt.', visible: true },
  { id: 'linked_bill', label: 'Linked Bill', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const BILL_AND_INVOICE_LIST_COLUMN_WIDTHS = {
  invoice_no: 'min-w-[167px]',
  vendor: 'min-w-[139px]',
  project: 'min-w-[202px]',
  po_no: 'min-w-[144px]',
  po_value: 'min-w-[120px]',
  bill_date: 'min-w-[120px]',
  bill_amt: 'min-w-[100px]',
  gst_amt: 'min-w-[120px]',
  linked_bill: 'min-w-[202px]',
  status: 'min-w-[194px]',
  created_by: 'min-w-[140px]',
  last_updated: 'min-w-[140px]',
};

export const BILL_AND_INVOICE_LIST_DEFAULT_SORTING = [{ id: 'vendor', desc: false }];

export const BILL_AND_INVOICE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Submitted for approval', label: 'Submitted for approval' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Closed', label: 'Closed' },
];

export const BILL_AND_INVOICE_GROUP_BY_OPTIONS = ['Vendor', 'Project', 'Status'];

export const BILL_AND_INVOICE_STATUS_BADGE_STYLES = {
  'Submitted for approval': 'bg-[#fbdfb1] text-[#693d11]',
  Draft: 'bg-bg-weak-100 text-text-sub-500',
  Paid: 'bg-[#b5dfcc] text-[#045933]',
  Closed: 'bg-[#b5dfcc] text-[#045933]',
};

export const PROJECT_PROCUREMENT_VENDORS_COLUMN_TABLE_ID = 'project-procurement-vendors-list';

export const PROJECT_PROCUREMENT_VENDORS_COLUMNS = [
  { id: 'vendor_name', label: 'Vendor Name', visible: true, enableHiding: false },
  { id: 'type', label: 'Type', visible: true },
  { id: 'packages', label: 'Packages', visible: true },
  { id: 'quotes', label: 'Quotes', visible: true },
  { id: 'pos', label: 'POS', visible: true },
  { id: 'quote_value', label: 'Quote Value', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'paid_amt', label: 'Paid Amt.', visible: true },
  { id: 'pending_amt', label: 'Pending Amt.', visible: true },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const PROJECT_PROCUREMENT_VENDORS_COLUMN_WIDTHS = {
  vendor_name: 'min-w-[222px]',
  type: 'min-w-[120px]',
  packages: 'min-w-[120px]',
  quotes: 'min-w-[120px]',
  pos: 'min-w-[120px]',
  quote_value: 'min-w-[139px]',
  po_value: 'min-w-[139px]',
  paid_amt: 'min-w-[139px]',
  pending_amt: 'min-w-[139px]',
  last_updated: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENT_VENDORS_LIST_DEFAULT_SORTING = [
  { id: 'vendor_name', desc: false },
];

export const PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_ALL = { value: 'all', label: 'All Types' };

export const PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_VENDORS_TYPE_FILTER_ALL,
  { value: 'Contractor', label: 'Contractor' },
  { value: 'Supplier', label: 'Supplier' },
  { value: 'Consultant', label: 'Consultant' },
];

export const PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_ALL = {
  value: 'all',
  label: 'All Categories',
};

export const PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_VENDORS_CATEGORY_FILTER_ALL,
  { value: 'Glass', label: 'Glass' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Civil', label: 'Civil' },
  { value: 'Ceiling', label: 'Ceiling' },
];

export const PROJECT_PROCUREMENT_VENDORS_GROUP_BY_OPTIONS = ['Type', 'Category'];

export const PROJECT_PROCUREMENT_POS_COLUMN_TABLE_ID = 'project-procurement-pos-list';

/** Column set aligned with vendors-tab table UI (Figma 34428:187240). */
export const PROJECT_PROCUREMENT_POS_COLUMNS = [
  { id: 'po_number', label: 'PO Number', visible: true, enableHiding: false },
  { id: 'vendor_name', label: 'Vendor Name', visible: true },
  { id: 'package', label: 'Package', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'po_date', label: 'PO Date', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'paid_amt', label: 'Paid Amt.', visible: true },
  { id: 'pending_amt', label: 'Pending Amt.', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'updated_by', label: 'Updated By', visible: false },
];

export const PROJECT_PROCUREMENT_POS_COLUMN_WIDTHS = {
  po_number: 'min-w-[173px]',
  vendor_name: 'min-w-[163px]',
  package: 'min-w-[160px]',
  category: 'min-w-[140px]',
  po_date: 'min-w-[120px]',
  type: 'min-w-[146px]',
  po_value: 'min-w-[139px]',
  paid_amt: 'min-w-[139px]',
  pending_amt: 'min-w-[139px]',
  status: 'min-w-[120px]',
  created_by: 'min-w-[140px]',
  updated_by: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENT_POS_LIST_DEFAULT_SORTING = [{ id: 'po_number', desc: false }];

export const PROJECT_PROCUREMENT_POS_GROUP_BY_OPTIONS = ['Vendor', 'Package', 'Category'];

/** Status badges for project POs tab (Figma 34428:187275 + release statuses). */
export const PROJECT_PROCUREMENT_POS_STATUS_BADGE_STYLES = {
  s1: 'bg-[#c2d6ff] text-[#162664]',
  s2: 'bg-[#cac2ff] text-[#2b1664]',
  s3: 'bg-[#ffdac2] text-[#6e330c]',
  draft: 'bg-[#fbdfb1] text-[#693d11]',
  released: 'bg-[#c2d6ff] text-[#162664]',
  'pending approval': 'bg-[#cac2ff] text-[#2b1664]',
  cancelled: 'bg-bg-weak-100 text-text-sub-500',
};

export const PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS = {
  BASIC_DETAILS: 'basic-details',
  LINE_ITEMS: 'line-items',
  SCOPE_COMMERCIAL: 'scope-commercial',
  APPROVAL: 'approval',
};

export const PROJECT_PROCUREMENT_PO_DETAIL_TABS = [
  { id: PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.BASIC_DETAILS, label: 'Basic Details' },
  { id: PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.LINE_ITEMS, label: 'Line Items' },
  {
    id: PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.SCOPE_COMMERCIAL,
    label: 'Scope & Commercial Terms',
  },
  { id: PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.APPROVAL, label: 'Approval' },
];

export const PROJECT_PROCUREMENT_PO_DETAIL_DEFAULT_TAB =
  PROJECT_PROCUREMENT_PO_DETAIL_TAB_IDS.BASIC_DETAILS;

/** Temporary placeholder PO PDF until live preview generation is wired up. */
export const DUMMY_PO_PREVIEW_PDF_URL =
  'https://devx-erp-app.s3.ap-south-1.amazonaws.com/uat/PO26-270562.pdf';

/** Hide browser PDF sidebar/toolbar when embedded in our preview chrome. */
export function buildPoPreviewEmbedUrl(pdfUrl = DUMMY_PO_PREVIEW_PDF_URL) {
  if (!pdfUrl) return '';
  const base = String(pdfUrl).split('#')[0];
  return `${base}#navpanes=0&toolbar=0&pagemode=none&view=FitH`;
}

export const PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS = {
  PAYMENT_REGISTER: 'payment-register',
  PAYMENT_PLANNING: 'payment-planning',
};

export const PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TABS = [
  {
    id: PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS.PAYMENT_REGISTER,
    label: 'Payment Register',
  },
  {
    id: PROJECT_PROCUREMENT_PAYMENT_PLANNING_SUB_TAB_IDS.PAYMENT_PLANNING,
    label: 'Payment Planning',
  },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_TABLE_ID =
  'project-procurement-payment-register-list';

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMNS = [
  { id: 'vendor', label: 'Vendor', visible: true, enableHiding: false },
  { id: 'po_no', label: 'PO No.', visible: true },
  { id: 'package', label: 'Package', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'paid_amt', label: 'Paid Amt.', visible: true },
  { id: 'pending_amt', label: 'Pending Amt.', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'created_at', label: 'Create At', visible: false },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_COLUMN_WIDTHS = {
  vendor: 'min-w-[133px]',
  po_no: 'min-w-[129px]',
  package: 'min-w-[129px]',
  category: 'min-w-[129px]',
  po_value: 'min-w-[102px]',
  paid_amt: 'min-w-[132px]',
  pending_amt: 'min-w-[152px]',
  status: 'min-w-[125px]',
  created_at: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_LIST_DEFAULT_SORTING = [
  { id: 'vendor', desc: false },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_VENDOR_FILTER_ALL = {
  value: 'all',
  label: 'All Vendors',
};

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_VENDOR_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_PAYMENT_REGISTER_VENDOR_FILTER_ALL,
  { value: 'ABC Interiors', label: 'ABC Interiors' },
  { value: 'Gulf Electric', label: 'Gulf Electric' },
  { value: 'Sabic Materials', label: 'Sabic Materials' },
  { value: 'Jaguar Group', label: 'Jaguar Group' },
  { value: 'Bluestar Ltd', label: 'Bluestar Ltd' },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_CATEGORY_FILTER_ALL = {
  value: 'all',
  label: 'All Categories',
};

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_CATEGORY_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_PAYMENT_REGISTER_CATEGORY_FILTER_ALL,
  { value: 'Electric Works', label: 'Electric Works' },
  { value: 'Gypsum Works', label: 'Gypsum Works' },
  { value: 'Civil Works', label: 'Civil Works' },
  { value: 'Glass Works', label: 'Glass Works' },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_STATUS_FILTER_ALL = {
  value: 'all',
  label: 'All Status',
};

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_STATUS_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_PAYMENT_REGISTER_STATUS_FILTER_ALL,
  { value: 'Partially paid', label: 'Partially paid' },
  { value: 'Done', label: 'Done' },
  { value: 'Pending', label: 'Pending' },
];

export const PROJECT_PROCUREMENT_PAYMENT_REGISTER_GROUP_BY_OPTIONS = [
  'Vendor',
  'Category',
  'Status',
];

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_TABLE_ID =
  'project-procurement-payment-sheets-list';

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMNS = [
  { id: 'sheet_name', label: 'Sheet Name', visible: true, enableHiding: false },
  { id: 'sheet_no', label: 'Sheet No.', visible: true },
  { id: 'master_sheet', label: 'Master Sheet', visible: true },
  { id: 'expected_payment_date', label: 'Expected Payment Date', visible: true },
  { id: 'requested_budget', label: 'Requested Budget', visible: true },
  { id: 'allocated_budget', label: 'Allocated Budget', visible: true },
  { id: 'vendors', label: 'Vendors', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'created_at', label: 'Created At', visible: false },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_COLUMN_WIDTHS = {
  sheet_name: 'min-w-[180px]',
  sheet_no: 'min-w-[130px]',
  master_sheet: 'min-w-[150px]',
  expected_payment_date: 'min-w-[180px]',
  requested_budget: 'min-w-[150px]',
  allocated_budget: 'min-w-[150px]',
  vendors: 'min-w-[100px]',
  status: 'min-w-[150px]',
  created_by: 'min-w-[140px]',
  created_at: 'min-w-[140px]',
  last_updated: 'min-w-[140px]',
};

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_LIST_DEFAULT_SORTING = [
  { id: 'sheet_name', desc: false },
];

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_STATUS_FILTER_ALL = {
  value: 'all',
  label: 'All Status',
};

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_STATUS_FILTER_OPTIONS = [
  PROJECT_PROCUREMENT_PAYMENT_SHEETS_STATUS_FILTER_ALL,
  { value: 'Submitted for approval', label: 'Submitted for approval' },
  { value: 'Sent to accounts', label: 'Sent to accounts' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Pending', label: 'Pending' },
];

export const PROJECT_PROCUREMENT_PAYMENT_SHEETS_GROUP_BY_OPTIONS = ['Status', 'Master Sheet'];

export const PROJECT_PROCUREMENT_PAYMENT_SHEET_DETAIL_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'Planned', label: 'Planned' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Pending', label: 'Pending' },
];

export const PROJECT_PROCUREMENT_PAYMENT_SHEET_PO_STATUS_BADGE_STYLES = {
  Planned: 'bg-[#c2d6ff] text-[#162664]',
  Approved: 'bg-[#b5dfcc] text-[#045933]',
  Pending: 'bg-[#fbdfb1] text-[#693d11]',
};

export const MASTER_PAYMENT_SHEETS_LIST_COLUMN_TABLE_ID = 'master-payment-sheets-list';

export const MASTER_PAYMENT_SHEETS_LIST_COLUMNS = [
  { id: 'sheet_name', label: 'Sheet Name', visible: true, enableHiding: false },
  { id: 'month', label: 'Month', visible: true },
  { id: 'budgeted', label: 'Budget', visible: true },
  { id: 'requested', label: 'Requested', visible: true },
  { id: 'difference', label: 'Difference', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'vendors', label: 'Vendors', visible: true },
  { id: 'projects', label: 'Projects', visible: true },
  { id: 'created_by', label: 'Created By', visible: false },
  { id: 'last_updated', label: 'Last Updated', visible: false },
];

export const MASTER_PAYMENT_SHEETS_LIST_COLUMN_WIDTHS = {
  sheet_name: 'min-w-[226px]',
  month: 'min-w-[108px]',
  budgeted: 'min-w-[100px]',
  requested: 'min-w-[122px]',
  difference: 'min-w-[120px]',
  status: 'min-w-[194px]',
  vendors: 'min-w-[118.5px]',
  projects: 'min-w-[118.5px]',
  created_by: 'min-w-[140px]',
  last_updated: 'min-w-[140px]',
};

export const MASTER_PAYMENT_SHEETS_LIST_DEFAULT_SORTING = [{ id: 'sheet_name', desc: false }];

export const MASTER_PAYMENT_SHEETS_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted for approval', label: 'Submitted for approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Awaiting vendor bill', label: 'Awaiting vendor bill' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Closed', label: 'Closed' },
];

export const MASTER_PAYMENT_SHEETS_GROUP_BY_OPTIONS = ['Status', 'Month'];

export const MASTER_PAYMENT_SHEETS_STATUS_BADGE_STYLES = {
  'Submitted for approval': 'bg-[#fbdfb1] text-[#693d11]',
  Draft: 'bg-bg-weak-100 text-text-sub-500',
  Approved: 'bg-[#b5dfcc] text-[#045933]',
  'Awaiting vendor bill': 'bg-[#dbeafe] text-[#1e3a8a]',
  Pending: 'bg-[#fbdfb1] text-[#693d11]',
  Closed: 'bg-[#b5dfcc] text-[#045933]',
};

export const MASTER_PAYMENT_SHEET_MONTH_OPTIONS = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
];

export const MASTER_PAYMENT_SHEET_DETAIL_COLUMN_TABLE_ID = 'master-payment-sheet-detail';

export const MASTER_PAYMENT_SHEET_DETAIL_COLUMNS = [
  { id: 'project', label: 'Project', visible: true, enableHiding: false },
  { id: 'vendor', label: 'Vendor', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'po_no', label: 'PO No.', visible: true },
  { id: 'po_value', label: 'PO Value', visible: true },
  { id: 'paid_amt', label: 'Paid Amt.', visible: true },
  { id: 'pending_amt', label: 'Pending Amt.', visible: true },
  { id: 'requested_amt', label: 'Requested Amt.', visible: true },
  { id: 'allocated_amt', label: 'Allocated Amt.', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true },
];

export const MASTER_PAYMENT_SHEET_DETAIL_COLUMN_WIDTHS = {
  project: 'min-w-[226px] max-w-[260px]',
  vendor: 'min-w-[129px] max-w-[180px]',
  category: 'min-w-[129px] max-w-[180px]',
  po_no: 'min-w-[143px] whitespace-nowrap',
  po_value: 'min-w-[114px]',
  paid_amt: 'min-w-[114px]',
  pending_amt: 'min-w-[132px]',
  requested_amt: 'min-w-[222px]',
  allocated_amt: 'min-w-[222px]',
  remarks: 'min-w-[170px] max-w-[220px]',
};

export const MASTER_PAYMENT_SHEET_DETAIL_DEFAULT_SORTING = [{ id: 'project', desc: false }];

export const MASTER_PAYMENT_SHEET_DETAIL_PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Projects' },
  { value: 'Skyline Towers Phase 2', label: 'Skyline Towers Phase 2' },
  { value: 'Pinnacle Residences', label: 'Pinnacle Residences' },
  { value: 'Topgrip Corporate Office', label: 'Topgrip Corporate Office' },
  { value: 'Catalyst Innovation Lab', label: 'Catalyst Innovation Lab' },
];

export const MASTER_PAYMENT_SHEET_DETAIL_VENDOR_FILTER_OPTIONS = [
  { value: 'all', label: 'All Vendors' },
  { value: 'Daikin India', label: 'Daikin India' },
  { value: 'Godrej Interio', label: 'Godrej Interio' },
  { value: 'Cisco Systems', label: 'Cisco Systems' },
];

export const MASTER_PAYMENT_SHEET_DETAIL_CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Networking', label: 'Networking' },
];
