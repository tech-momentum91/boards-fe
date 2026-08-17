import {
  STOCKS_STOCK_IN_SOURCE,
  STOCKS_STOCK_IN_STATUS,
  createDefaultStockInFormState,
} from '@/components/stocks/stock-in/constants';

/** Grid template for create-modal line table and view-drawer line table. */
export const STOCK_IN_LINE_GRID =
  'pl-2 grid min-h-11 items-center gap-1 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(140px,1.35fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(72px,0.60fr)_minmax(72px,0.60fr)_minmax(88px,0.85fr)_40px]';

export const STOCK_IN_LINE_GRID_READONLY =
  'grid min-h-11 items-center gap-1 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(140px,1.35fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(52px,0.60fr)_minmax(72px,0.60fr)_minmax(72px,0.60fr)_minmax(88px,0.85fr)]';

export const STOCK_IN_TRANSFER_LINE_GRID =
  'pl-2 grid min-h-11 items-center gap-1 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(150px,1.3fr)_repeat(4,minmax(72px,0.5fr))_minmax(120px,1fr)]';

/** Read-only transfer line grid (view drawer): Product, Sent, Received, Pending, Accepted, Remarks. */
export const STOCK_IN_TRANSFER_LINE_GRID_READONLY =
  'grid min-h-11 w-max min-w-full items-center gap-1 border-b border-stroke-soft-200 last:border-b-0 [grid-template-columns:minmax(180px,1.3fr)_repeat(4,88px)_minmax(200px,1.1fr)]';

export function stockInStatusBadgeColor(status) {
  if (status === STOCKS_STOCK_IN_STATUS.DRAFT) return 'gray';
  if (status === STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST) return 'orange';
  if (status === STOCKS_STOCK_IN_STATUS.PENDING) return 'orange';
  if (status === STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED) return 'yellow';
  if (status === STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED) return 'yellow';
  if (status === STOCKS_STOCK_IN_STATUS.RECEIVED) return 'green';
  if (status === STOCKS_STOCK_IN_STATUS.COMPLETED) return 'green';
  if (status === STOCKS_STOCK_IN_STATUS.CANCELLED) return 'red';
  return 'gray';
}

export function isStockInPurchaseOrderRow(row) {
  if (row?.sourceKey === STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER) return true;
  const label = String(row?.source ?? '')
    .trim()
    .toLowerCase();
  return label === 'purchase order' || label === 'po';
}

export function isStockInTransferRow(row) {
  if (row?.sourceKey === STOCKS_STOCK_IN_SOURCE.TRANSFER_IN) return true;
  const label = String(row?.source ?? '')
    .trim()
    .toLowerCase();
  return label === 'transfer' || label === 'transfer in';
}

/** Purchase order = yellow; transfer = blue; manual entry = green. */
export function stockInSourceBadgeColor(row) {
  if (isStockInPurchaseOrderRow(row)) return 'yellow';
  if (isStockInTransferRow(row)) return 'blue';
  return 'green';
}

export function cloneStockInFormState(source) {
  if (!source) return createDefaultStockInFormState();
  return {
    center: source.center ?? '',
    sourceType: source.sourceType ?? STOCKS_STOCK_IN_SOURCE.MANUAL_ENTRY,
    vendor: source.vendor ?? '',
    category: source.category ?? '',
    poReference: source.poReference ?? '',
    outgoingStockEntry: source.outgoingStockEntry ?? '',
    sourceCenter: source.sourceCenter ?? '',
    sourceCenterLabel: source.sourceCenterLabel ?? '',
    pendingTransferOption: source.pendingTransferOption ?? null,
    vendorRc: source.vendorRc ?? '',
    name: source.name ?? '',
    poDate: source.poDate ?? '',
    expectedDelivery: source.expectedDelivery ?? '',
    notes: source.notes ?? '',
    status: source.status ?? '',
    lineItems:
      Array.isArray(source.lineItems) && source.lineItems.length > 0
        ? source.lineItems.map((row) => ({ ...row }))
        : [],
    stockImages: Array.isArray(source.stockImages) ? [...source.stockImages] : [],
    files: Array.isArray(source.files) ? [...source.files] : [],
    attachments: Array.isArray(source.attachments) ? [...source.attachments] : [],
    documents: Array.isArray(source.documents) ? [...source.documents] : [],
  };
}

/** After center options load, drop vendor/category if they are no longer valid. */
export function sanitizeStockInDraftVendors(draft, suppliers) {
  const list = Array.isArray(suppliers) ? suppliers : [];
  if (list.length === 0) {
    return { ...draft, vendor: '', category: '' };
  }
  const vendorValid = list.some((option) => option.value === draft.vendor);
  if (!vendorValid) {
    return { ...draft, vendor: '', category: '' };
  }
  return draft;
}

export function stockInDigitsFromAmount(value) {
  const digits = String(value ?? '').replaceAll(/\D/g, '');
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function stockInFormatRupeeFromNumber(n) {
  if (!n || n <= 0) return '';
  return `₹${n.toLocaleString('en-IN')}`;
}
