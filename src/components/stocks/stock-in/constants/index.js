/**
 * Stock In constants (canonical definitions for this section).
 * Filter sentinel `'all'` is inlined to avoid circular init with root `constants.js`.
 */
const STOCKS_FILTER_VALUE_ALL = 'all';

/** ----- Stock In (Inward) ----- */

export const STOCKS_STOCK_IN_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  TRANSFER_REQUEST: 'Transfer Request',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  PARTIALLY_COMPLETED: 'Partially Completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STOCKS_STOCK_IN_DEFAULT_CENTER_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Centers' },
];

export const STOCKS_STOCK_IN_DEFAULT_VENDOR_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Vendors' },
];

export const STOCKS_STOCK_IN_STATUS_FILTER_OPTIONS = [
  { value: STOCKS_FILTER_VALUE_ALL, label: 'All Status' },
  { value: STOCKS_STOCK_IN_STATUS.DRAFT, label: STOCKS_STOCK_IN_STATUS.DRAFT },
  {
    value: STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST,
    label: STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST,
  },
  {
    value: STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED,
    label: STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED,
  },
  { value: STOCKS_STOCK_IN_STATUS.RECEIVED, label: STOCKS_STOCK_IN_STATUS.RECEIVED },
  { value: STOCKS_STOCK_IN_STATUS.PENDING, label: STOCKS_STOCK_IN_STATUS.PENDING },
  {
    value: STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED,
    label: STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED,
  },
  { value: STOCKS_STOCK_IN_STATUS.COMPLETED, label: STOCKS_STOCK_IN_STATUS.COMPLETED },
  { value: STOCKS_STOCK_IN_STATUS.CANCELLED, label: STOCKS_STOCK_IN_STATUS.CANCELLED },
];

export const STOCKS_STOCK_IN_SOURCE = {
  PURCHASE_ORDER: 'purchase-order',
  TRANSFER_IN: 'transfer-in',
  MANUAL_ENTRY: 'manual-entry',
  RETURN: 'return',
};

export const STOCKS_STOCK_IN_SOURCE_TYPE_FORM_OPTIONS = [
  { value: STOCKS_STOCK_IN_SOURCE.MANUAL_ENTRY, label: 'Manual Entry' },
  { value: STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER, label: 'Purchase Order' },
  { value: STOCKS_STOCK_IN_SOURCE.TRANSFER_IN, label: 'Transfer' },
];

export const STOCKS_STOCK_IN_SOURCE_LABELS = {
  [STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER]: 'Purchase Order',
  [STOCKS_STOCK_IN_SOURCE.TRANSFER_IN]: 'Transfer In',
  [STOCKS_STOCK_IN_SOURCE.MANUAL_ENTRY]: 'Manual Entry',
  [STOCKS_STOCK_IN_SOURCE.RETURN]: 'Return',
};

export const STOCKS_STOCK_IN_GROUP_BY_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
];

export const STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID = 'stocks-stock-in-table';

export const STOCKS_STOCK_IN_COLUMN_CONFIG = [
  { id: 'center', columnLabel: 'Center', visible: true, enableHiding: false },
  { id: 'vendor', columnLabel: 'Vendor', visible: true, enableHiding: true },
  { id: 'date', columnLabel: 'Date', visible: true, enableHiding: true },
  { id: 'source', columnLabel: 'Source', visible: true, enableHiding: true },
  { id: 'items', columnLabel: 'Items', visible: true, enableHiding: true },
  { id: 'acceptedQty', columnLabel: 'Accepted Qty', visible: true, enableHiding: true },
  { id: 'totalValue', columnLabel: 'Total Value', visible: true, enableHiding: true },
  { id: 'status', columnLabel: 'Status', visible: true, enableHiding: true },
];

export function createEmptyStockInLineItem() {
  return {
    id: `sili-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    product: '',
    ordered: '',
    received: '',
    accepted: '',
    rejected: '',
    rate: '',
    total: '',
    remarks: '',
    fromPurchaseOrder: false,
  };
}

export function createDefaultStockInFormState() {
  return {
    name: '',
    center: '',
    sourceType: STOCKS_STOCK_IN_SOURCE.MANUAL_ENTRY,
    vendor: '',
    category: '',
    poReference: '',
    outgoingStockEntry: '',
    sourceCenter: '',
    sourceCenterLabel: '',
    vendorRc: '',
    poDate: '',
    expectedDelivery: '',
    notes: '',
    lineItems: [createEmptyStockInLineItem()],
    status: STOCKS_STOCK_IN_STATUS.DRAFT,
    stockImages: [],
    files: [],
    attachments: [],
    documents: [],
  };
}

/** Built from order mock rows — lazy to avoid importing root `constants.js` (circular). */
export function getStockInPurchaseOrderOptions(orderRows) {
  const rows = Array.isArray(orderRows) ? orderRows : [];
  return rows.map((row) => ({
    value: row.id,
    label: row.orderNo,
  }));
}
