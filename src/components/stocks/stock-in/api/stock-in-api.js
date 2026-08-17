import {
  mapStockGrnDocumentFromApi,
  mapStockImagesFromApi,
} from '@/components/stocks/shared/stock-images';
import { normalizeStockCategoryLabels } from '@/components/stocks/shared/stocks-category-badges';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import {
  STOCKS_STOCK_IN_SOURCE,
  STOCKS_STOCK_IN_STATUS,
} from '@/components/stocks/stock-in/constants';
import { formatRupeeAmount } from '@/components/stocks/shared/api/core-api';
import {
  formatPoListDateDisplay,
  formatPoListQty,
  formatPoNumericDisplay,
  formatPoRateDisplay,
  mapPoSelectOption,
  mapVendorRcSelectOption,
  parsePoRateNumber,
} from '@/components/stocks/orders/api';

const STOCK_IN_API_SOURCE_MANUAL = 'Manual Entry';
const STOCK_IN_API_SOURCE_PO = 'Purchase Order';
const STOCK_IN_API_SOURCE_TRANSFER = 'Transfer';

/** Map UI source type to API `source_type`. */
export function stockInSourceToApi(sourceType) {
  const key = String(sourceType ?? '')
    .trim()
    .toLowerCase();
  if (key === 'purchase-order' || key === 'purchase order' || key === 'po') {
    return STOCK_IN_API_SOURCE_PO;
  }
  if (key === 'transfer-in' || key === 'transfer') {
    return STOCK_IN_API_SOURCE_TRANSFER;
  }
  return STOCK_IN_API_SOURCE_MANUAL;
}

export function stockInSourceIsPurchaseOrder(sourceType) {
  return stockInSourceToApi(sourceType) === STOCK_IN_API_SOURCE_PO;
}

export function stockInSourceIsTransfer(sourceType) {
  return stockInSourceToApi(sourceType) === STOCK_IN_API_SOURCE_TRANSFER;
}

/** Human-readable PO option for Stock In (vendor + category + date + receipt %). */
export function formatStockInPurchaseOrderOption(po) {
  if (!po || typeof po !== 'object') return { label: '', primaryLabel: '', secondaryLabel: '' };

  const supplierName = String(po.supplier_name ?? po.supplier ?? '').trim();
  const category = String(po.category ?? '').trim();
  const dateLabel = formatPoListDateDisplay(po.order_date);
  const received = Number(po.per_received);

  let receivedLabel = '';
  if (Number.isFinite(received)) {
    if (received >= 100) receivedLabel = 'Fully received';
    else if (received > 0) receivedLabel = `${Math.round(received)}% received`;
    else receivedLabel = 'Not received';
  }

  const primaryParts = [supplierName, category].filter(Boolean);
  const primaryLabel = primaryParts.join(' · ') || String(po.name ?? po.id ?? '').trim();
  const secondaryLabel = [dateLabel, receivedLabel].filter(Boolean).join(' · ');

  return {
    label: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
    primaryLabel,
    secondaryLabel,
  };
}

/** Single-line label for the PO select trigger (category in brackets, ellipsis via CSS). */
export function formatStockInPurchaseOrderTriggerLabel(po) {
  if (!po || typeof po !== 'object') return '';

  const supplierName = String(po.supplier_name ?? po.supplier ?? '').trim();
  const category = String(po.category ?? '').trim();
  const dateLabel = formatPoListDateDisplay(po.order_date);
  const received = Number(po.per_received);

  let receivedLabel = '';
  if (Number.isFinite(received)) {
    if (received >= 100) receivedLabel = 'Fully received';
    else if (received > 0) receivedLabel = `${Math.round(received)}% received`;
    else receivedLabel = 'Not received';
  }

  const main =
    supplierName && category
      ? `${supplierName} (${category})`
      : supplierName || category || String(po.name ?? po.id ?? '').trim();

  const extras = [dateLabel, receivedLabel].filter(Boolean).join(' · ');
  return extras ? `${main} · ${extras}` : main;
}

export function parseStockInOptionsMessage(result) {
  const message = result?.message ?? result ?? {};
  return {
    centers: (Array.isArray(message.centers) ? message.centers : [])
      .map(mapPoSelectOption)
      .filter(Boolean),
    suppliers: (Array.isArray(message.suppliers) ? message.suppliers : [])
      .map(mapPoSelectOption)
      .filter(Boolean),
    categories: (Array.isArray(message.categories) ? message.categories : [])
      .map(mapPoSelectOption)
      .filter(Boolean),
    purchaseOrders: (Array.isArray(message.purchase_orders) ? message.purchase_orders : [])
      .map((po) => {
        if (!po || typeof po !== 'object') return null;
        const value = po.id ?? po.name ?? '';
        if (!value) return null;
        const display = formatStockInPurchaseOrderOption(po);
        return {
          value,
          label: display.label,
          triggerLabel: formatStockInPurchaseOrderTriggerLabel(po),
          primaryLabel: display.primaryLabel,
          secondaryLabel: display.secondaryLabel,
          supplier: po.supplier ?? '',
          supplierName: po.supplier_name ?? po.supplier ?? '',
          category: po.category ?? '',
          orderDate: po.order_date ?? '',
          perReceived: po.per_received,
        };
      })
      .filter(Boolean),
    pendingTransfers: (Array.isArray(message.pending_transfers) ? message.pending_transfers : [])
      .map((transfer) => {
        if (!transfer || typeof transfer !== 'object') return null;
        const value = String(transfer.id ?? '').trim();
        if (!value) return null;
        const sourceName = String(
          transfer.source_center_name ?? transfer.source_center ?? '',
        ).trim();
        const dateLabel = formatPoListDateDisplay(transfer.date);
        const pendingQty = formatPoListQty(transfer.pending_qty);
        const itemsCount = transfer.items_count ?? 0;
        const primaryLabel = sourceName || value;
        const secondaryLabel = [
          dateLabel,
          `${itemsCount} items`,
          pendingQty ? `${pendingQty} pending` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return {
          value,
          label: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
          primaryLabel,
          secondaryLabel,
          triggerLabel: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
          sourceCenter: transfer.source_center ?? '',
          sourceCenterName: transfer.source_center_name ?? '',
          date: transfer.date ?? '',
          itemsCount,
          pendingQty: transfer.pending_qty,
          perTransferred: transfer.per_transferred,
        };
      })
      .filter(Boolean),
    requiresTransferSelection: Boolean(message.requires_transfer_selection),
  };
}

/** Build a pending-transfer select option (list row or pre-filled receive form). */
export function buildStockInPendingTransferOption({
  id,
  sourceCenterName = '',
  sourceCenter = '',
  date = '',
  itemsCount = 0,
  pendingQty = '',
} = {}) {
  const value = String(id ?? '').trim();
  if (!value) return null;
  const sourceName = String(sourceCenterName || sourceCenter || '').trim();
  const dateLabel = date ? formatPoListDateDisplay(String(date).slice(0, 10)) : '';
  const pendingLabel =
    pendingQty != null && String(pendingQty).trim() !== ''
      ? `${formatPoListQty(pendingQty)} pending`
      : '';
  const itemsLabel = itemsCount > 0 ? `${itemsCount} items` : '';
  const primaryLabel = sourceName || value;
  const secondaryLabel = [dateLabel, itemsLabel, pendingLabel].filter(Boolean).join(' · ');
  return {
    value,
    label: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
    primaryLabel,
    secondaryLabel,
    triggerLabel: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
    sourceCenter,
    sourceCenterName: sourceCenterName || sourceCenter,
    date,
    itemsCount,
    pendingQty,
  };
}

function stockInQtyDisplay(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return '';
  return formatPoNumericDisplay(num);
}

/** Read-only qty display — preserves zero (transfer detail tables). */
export function formatStockTransferQtyDisplay(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  if (num === 0) return '0';
  return formatPoNumericDisplay(num);
}

function stockInQtyDisplayReadOnly(value) {
  return formatStockTransferQtyDisplay(value);
}

function stockInRateDisplay(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return '';
  return formatPoRateDisplay(num);
}

function stockInAmountDisplay(qty, rate) {
  const q = Number(qty);
  const r = Number(rate);
  if (!Number.isFinite(q) || !Number.isFinite(r) || q <= 0 || r <= 0) return '';
  return formatPoRateDisplay(q * r);
}

/** Manual inward line: product + RC rate from API; qty fields entered by user. */
export function mapStockInManualLineFromApi(item, index) {
  if (!item || typeof item !== 'object') return null;
  const itemCode = String(item.item_code ?? '').trim();
  if (!itemCode) return null;
  const rate = stockInRateDisplay(item.order_rate ?? item.rc_rate);
  return {
    id: `sili-m-${itemCode}-${index}`,
    itemCode,
    product: item.product || itemCode,
    ordered: '',
    received: '',
    accepted: '',
    rejected: '',
    rate,
    total: '',
    remarks: String(item.description ?? '').trim(),
    fromPurchaseOrder: false,
    rateFromContract: Boolean(rate),
    currentStock: formatPoNumericDisplay(item.current_stock),
    minStock: formatPoNumericDisplay(item.min_qty),
    maxStock: formatPoNumericDisplay(item.max_qty),
  };
}

/** PO inward line: prefilled from API; rows are not deletable. */
export function mapStockInPoLineFromApi(item, index) {
  if (!item || typeof item !== 'object') return null;
  const itemCode = String(item.item_code ?? '').trim();
  if (!itemCode) return null;
  const ordered = stockInQtyDisplay(item.ordered_qty);
  const pending = stockInQtyDisplay(item.pending_qty);
  const accepted =
    item.accepted_qty != null && Number(item.accepted_qty) > 0
      ? stockInQtyDisplay(item.accepted_qty)
      : pending;
  const received =
    item.received_qty != null && Number(item.received_qty) > 0
      ? stockInQtyDisplay(item.received_qty)
      : accepted;
  const rejected = stockInQtyDisplay(item.rejected_qty) || '';
  const rate = stockInRateDisplay(item.order_rate);
  const acceptedN = Number.parseFloat(String(accepted).replaceAll(',', ''));
  const rateN = parsePoRateNumber(rate);
  const total =
    item.amount != null && Number(item.amount) > 0
      ? stockInRateDisplay(item.amount)
      : stockInAmountDisplay(acceptedN, rateN);

  return {
    id: `sili-po-${itemCode}-${index}`,
    itemCode,
    product: item.product || itemCode,
    purchaseOrder: item.purchase_order ?? '',
    purchaseOrderItem: item.purchase_order_item ?? '',
    ordered,
    received,
    accepted,
    rejected,
    rate,
    total,
    remarks: String(item.description ?? '').trim(),
    fromPurchaseOrder: true,
  };
}

export function mapStockInManualItemsMessage(result) {
  const message = result?.message ?? result ?? {};
  const requiresVendorRc = Boolean(message.requires_vendor_rc);
  const vendorRcOptions = (Array.isArray(message.vendor_rcs) ? message.vendor_rcs : [])
    .map(mapVendorRcSelectOption)
    .filter(Boolean);
  const items = (Array.isArray(message.items) ? message.items : [])
    .map(mapStockInManualLineFromApi)
    .filter(Boolean);
  return {
    sourceType: message.source_type ?? STOCK_IN_API_SOURCE_MANUAL,
    vendorRc: String(message.vendor_rc ?? '').trim(),
    requiresVendorRc,
    vendorRcOptions,
    center: message.center ?? null,
    supplier: message.supplier ?? null,
    category: message.category ?? '',
    items,
  };
}

export function mapStockInPoItemsMessage(result) {
  const message = result?.message ?? result ?? {};
  const purchaseOrder = message.purchase_order ?? '';
  const items = (Array.isArray(message.items) ? message.items : [])
    .map(mapStockInPoLineFromApi)
    .filter(Boolean);
  return { purchaseOrder, items };
}

/** Transfer receive line from `get_stock_in_transfer_items` / detail API. */
export function mapStockInTransferLineFromApi(item, index) {
  if (!item || typeof item !== 'object') return null;
  const itemCode = String(item.item_code ?? '').trim();
  if (!itemCode) return null;
  const fmt = formatStockTransferQtyDisplay;
  const pending = fmt(item.pending_qty);
  const hasAcceptedQty = item.accepted_qty != null && item.accepted_qty !== '';
  const accepted = hasAcceptedQty ? fmt(item.accepted_qty) : fmt(item.pending_qty);
  return {
    id: `sili-tr-${itemCode}-${index}`,
    itemCode,
    product: item.product || itemCode,
    ordered: fmt(item.sent_qty),
    received: fmt(item.received_qty),
    accepted,
    rate: '',
    total: '',
    remarks: String(item.description ?? '').trim(),
    fromPurchaseOrder: false,
    fromTransfer: true,
    pendingQty: pending,
  };
}

/** Parse `get_stock_in_transfer_items` response. */
export function mapStockInTransferItemsMessage(message) {
  const data = message?.message ?? message ?? {};
  const items = (Array.isArray(data.items) ? data.items : [])
    .map(mapStockInTransferLineFromApi)
    .filter(Boolean);
  return {
    outgoingStockEntry: String(data.outgoing_stock_entry ?? '').trim(),
    sourceCenter: data.source_center ?? '',
    sourceCenterName: data.source_center_name ?? data.source_center ?? '',
    center: data.center ?? '',
    centerName: data.center_name ?? data.center ?? '',
    items,
  };
}

/** Map API `source_type` to form source key. */
export function stockInApiSourceToForm(apiSource) {
  const key = String(apiSource ?? '')
    .trim()
    .toLowerCase();
  if (key === 'purchase order' || key === 'po') {
    return STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER;
  }
  if (key === 'transfer') {
    return STOCKS_STOCK_IN_SOURCE.TRANSFER_IN;
  }
  return STOCKS_STOCK_IN_SOURCE.MANUAL_ENTRY;
}

/** Human-readable source label from API `source_type`. */
export function stockInApiSourceLabel(apiSource) {
  const key = String(apiSource ?? '')
    .trim()
    .toLowerCase();
  if (key === 'purchase order' || key === 'po') return 'Purchase Order';
  if (key === 'transfer') return 'Transfer';
  if (key === 'manual entry' || key === 'manual') return 'Manual Entry';
  return String(apiSource ?? '').trim() || '—';
}

function mapStockInSavedLineFromApi(item, index) {
  if (!item || typeof item !== 'object') return null;
  const itemCode = String(item.item_code ?? '').trim();
  if (!itemCode) return null;
  const ordered = stockInQtyDisplay(item.ordered_qty);
  const accepted = stockInQtyDisplay(item.accepted_qty);
  const rejected = stockInQtyDisplay(item.rejected_qty) || '';
  const received = stockInQtyDisplay(item.received_qty);
  const rate = stockInRateDisplay(item.order_rate);
  const acceptedN = Number.parseFloat(String(accepted).replaceAll(',', ''));
  const rateN = parsePoRateNumber(rate);
  const total =
    item.amount != null && Number(item.amount) > 0
      ? stockInRateDisplay(item.amount)
      : stockInAmountDisplay(acceptedN, rateN);

  return {
    id: `sili-saved-${itemCode}-${index}`,
    itemCode,
    product: item.product || itemCode,
    purchaseOrder: item.purchase_order ?? '',
    purchaseOrderItem: item.purchase_order_item ?? '',
    ordered,
    received: received || accepted,
    accepted,
    rejected,
    rate,
    total,
    remarks: String(item.description ?? '').trim(),
    fromPurchaseOrder: Boolean(item.purchase_order || item.purchase_order_item),
  };
}

/** Overlay saved draft line qty/rates onto freshly loaded API line items. */
export function mergeStockInLineItemsWithDraft(apiLines, draftLines) {
  const draftByCode = new Map();
  for (const row of draftLines ?? []) {
    const key = String(row.itemCode ?? '').trim();
    if (key) draftByCode.set(key, row);
  }
  return (apiLines ?? []).map((line) => {
    const draft = draftByCode.get(line.itemCode);
    if (!draft) return line;
    return {
      ...line,
      ordered: draft.ordered != null && String(draft.ordered).trim() ? draft.ordered : line.ordered,
      received:
        draft.received != null && String(draft.received).trim() ? draft.received : line.received,
      accepted:
        draft.accepted != null && String(draft.accepted).trim() ? draft.accepted : line.accepted,
      rejected:
        draft.rejected != null && String(draft.rejected).trim() ? draft.rejected : line.rejected,
      rate: draft.rate != null && String(draft.rate).trim() ? draft.rate : line.rate,
      total: draft.total != null && String(draft.total).trim() ? draft.total : line.total,
      remarks: draft.remarks ?? line.remarks,
    };
  });
}

/** Map `get_stock_in_detail` payload to view/edit form state. */
export function mapStockInDetailToForm(detailPayload) {
  const data = detailPayload?.data ?? detailPayload ?? {};
  const sourceType = stockInApiSourceToForm(data.source_type);
  const isPo = sourceType === STOCKS_STOCK_IN_SOURCE.PURCHASE_ORDER;
  const isTransfer = sourceType === STOCKS_STOCK_IN_SOURCE.TRANSFER_IN;
  const postingDate =
    data.date != null
      ? typeof data.date === 'string'
        ? data.date.slice(0, 10)
        : String(data.date)
      : '';

  const lineItems = (Array.isArray(data.items) ? data.items : [])
    .map((item, index) =>
      isTransfer
        ? mapStockInTransferLineFromApi(item, index)
        : mapStockInSavedLineFromApi(item, index),
    )
    .filter(Boolean);

  const grnDocument = mapStockGrnDocumentFromApi(data.custom_document);
  const attachments =
    grnDocument.length > 0 ? grnDocument : mapStockImagesFromApi(data.attachments);

  const stockImages = mapStockImagesFromApi(data.stock_images);

  return {
    name: data.id ?? '',
    center: data.center ?? '',
    centerLabel: data.center_name ?? data.center ?? '',
    sourceType,
    sourceLabel: stockInApiSourceLabel(data.source_type),
    vendor: data.supplier ?? data.source_center ?? '',
    vendorLabel: data.supplier_name ?? data.source_center_name ?? data.supplier ?? '',
    category: normalizeStockCategoryLabels(data.category),
    poReference: isPo ? (data.purchase_order ?? '') : (data.ref_purchase_order_no ?? ''),
    outgoingStockEntry: data.outgoing_stock_entry ?? '',
    sourceCenter: data.source_center ?? '',
    sourceCenterLabel: data.source_center_name ?? data.source_center ?? '',
    poDate: postingDate,
    expectedDelivery: '',
    notes: data.notes ?? '',
    status: mapStockInApiStatusLabel(data.status),
    isPartial: Boolean(data.is_partial),
    acceptedQtyTotal: formatPoListQty(data.accepted_qty),
    totalValueLabel: formatRupeeAmount(data.total_value),
    itemCount: lineItems.length,
    lineItems: lineItems.length > 0 ? lineItems : [],
    attachments,
    stockImages,
  };
}

function parseStockInLineQty(value) {
  const n = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  return Number.isNaN(n) ? 0 : n;
}

/** True only for explicit submit signals (avoids truthy "0" / "false" strings). */
export function stockInShouldSubmit(isSubmit) {
  return isSubmit === true || isSubmit === 1 || isSubmit === '1';
}

/** Map API / summary status to stock-in list label. */
export function mapStockInApiStatusLabel(apiStatus) {
  const raw = String(apiStatus ?? '').trim();
  const normalized = raw.toLowerCase().replaceAll(/\s+/g, '_');
  if (normalized === 'draft') return STOCKS_STOCK_IN_STATUS.DRAFT;
  if (normalized === 'transfer_request') return STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST;
  if (normalized === 'partially_received') return STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED;
  if (normalized === 'received') return STOCKS_STOCK_IN_STATUS.RECEIVED;
  if (normalized === 'completed') return STOCKS_STOCK_IN_STATUS.COMPLETED;
  if (normalized === 'partially_completed') return STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED;
  if (normalized === 'cancelled') return STOCKS_STOCK_IN_STATUS.CANCELLED;
  if (normalized === 'pending' || normalized === 'in_transit') {
    return STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST;
  }
  if (raw === STOCKS_STOCK_IN_STATUS.DRAFT) return STOCKS_STOCK_IN_STATUS.DRAFT;
  if (raw === STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST)
    return STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST;
  if (raw === STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED)
    return STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED;
  if (raw === STOCKS_STOCK_IN_STATUS.RECEIVED) return STOCKS_STOCK_IN_STATUS.RECEIVED;
  if (raw === STOCKS_STOCK_IN_STATUS.COMPLETED) return STOCKS_STOCK_IN_STATUS.COMPLETED;
  if (raw === STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED) {
    return STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED;
  }
  if (raw === STOCKS_STOCK_IN_STATUS.PENDING) return STOCKS_STOCK_IN_STATUS.PENDING;
  if (raw === STOCKS_STOCK_IN_STATUS.CANCELLED) return STOCKS_STOCK_IN_STATUS.CANCELLED;
  return raw || STOCKS_STOCK_IN_STATUS.DRAFT;
}

/** Map UI status filter value to API `status` filter (exact backend labels). */
export function mapStockInStatusFilterToApi(status) {
  const key = String(status ?? '').trim();
  if (!key) return key;
  if (key === STOCKS_STOCK_IN_STATUS.DRAFT) return STOCKS_STOCK_IN_STATUS.DRAFT;
  if (key === STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST)
    return STOCKS_STOCK_IN_STATUS.TRANSFER_REQUEST;
  if (key === STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED)
    return STOCKS_STOCK_IN_STATUS.PARTIALLY_RECEIVED;
  if (key === STOCKS_STOCK_IN_STATUS.RECEIVED) return STOCKS_STOCK_IN_STATUS.RECEIVED;
  if (key === STOCKS_STOCK_IN_STATUS.PENDING) return STOCKS_STOCK_IN_STATUS.PENDING;
  if (key === STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED) {
    return STOCKS_STOCK_IN_STATUS.PARTIALLY_COMPLETED;
  }
  if (key === STOCKS_STOCK_IN_STATUS.COMPLETED) return STOCKS_STOCK_IN_STATUS.COMPLETED;
  if (key === STOCKS_STOCK_IN_STATUS.CANCELLED) return STOCKS_STOCK_IN_STATUS.CANCELLED;
  return key;
}

/** Map listview API row to stock-in table shape. */
export function mapStockInListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const id = String(apiRow.id ?? '').trim();
  if (!id) return null;

  const dateIso = apiRow.date != null ? String(apiRow.date).slice(0, 10) : '';
  const sourceLabel = String(apiRow.source ?? '').trim() || '—';
  const isTransferRequest = Boolean(apiRow.is_transfer_request);
  const centerLabel = String(apiRow.center ?? '').trim();
  const vendorLabel = String(apiRow.vendor ?? '').trim();

  return {
    id,
    name: id,
    center: centerLabel || (isTransferRequest ? '—' : ''),
    centerLabel,
    vendor: vendorLabel || String(apiRow.source_center_name ?? '').trim(),
    date: formatPoListDateDisplay(dateIso),
    dateIso,
    source: sourceLabel,
    sourceKey: stockInApiSourceToForm(apiRow.source),
    purchaseOrder: apiRow.purchase_order ?? '',
    category: normalizeStockCategoryLabels(apiRow.category).join(', '),
    items: apiRow.items ?? 0,
    acceptedQty: formatPoListQty(apiRow.accepted_qty),
    pendingQty: apiRow.pending_qty != null ? formatPoListQty(apiRow.pending_qty) : '',
    totalValue: formatRupeeAmount(apiRow.total_value),
    status: mapStockInApiStatusLabel(apiRow.status),
    outgoingStockEntry: String(apiRow.outgoing_stock_entry ?? '').trim() || id,
    sourceCenter: apiRow.source_center ?? '',
    sourceCenterName: apiRow.source_center_name ?? '',
    isTransferRequest,
    canReceive: Boolean(apiRow.can_receive),
    perTransferred: apiRow.per_transferred ?? null,
    stockImages: mapStockImagesFromApi(apiRow.stock_images),
  };
}

/** Build multipart form-data for stock-in listview. */
export function buildStockInListFormData({
  keyword = '',
  centerFilter = [],
  vendorFilter = [],
  statusFilter = [],
  page = 1,
  pageSize = 20,
  groupBy = '',
  groupOrder = 'asc',
  orderBy = 'modified desc',
}) {
  const formData = new FormData();
  formData.append('page', String(page));
  formData.append('limit_page_length', String(pageSize));

  const kw = String(keyword ?? '').trim();
  if (kw) {
    formData.append('keyword', kw);
  }

  const filters = [];

  const centers = (Array.isArray(centerFilter) ? centerFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (centers.length === 1) {
    filters.push(['center', '=', centers[0]]);
  } else if (centers.length > 1) {
    filters.push(['center', 'in', centers]);
  }

  const vendors = (Array.isArray(vendorFilter) ? vendorFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (vendors.length === 1) {
    filters.push(['supplier', '=', vendors[0]]);
  } else if (vendors.length > 1) {
    filters.push(['supplier', 'in', vendors]);
  }

  const statuses = (Array.isArray(statusFilter) ? statusFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (statuses.length === 1) {
    filters.push(['status', '=', mapStockInStatusFilterToApi(statuses[0])]);
  } else if (statuses.length > 1) {
    filters.push(['status', 'in', statuses.map(mapStockInStatusFilterToApi)]);
  }

  if (filters.length > 0) {
    formData.append('filters', JSON.stringify(filters));
  }

  const groupField = String(groupBy ?? '').trim();
  if (groupField) {
    const direction = groupOrder === 'desc' ? 'desc' : 'asc';
    formData.append('group_by', `${groupField} ${direction}`);
  }

  formData.append('order_by', String(orderBy || 'modified desc').trim() || 'modified desc');

  return formData;
}

export function parseStockInListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = message?.group_by ?? '';

  if (groupBy && results.length > 0 && Array.isArray(results[0]?.entries)) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.entries) ? group.entries : [])
        .map(mapStockInListItem)
        .filter(Boolean);
      return {
        id: `${groupBy}-${String(group.group_key ?? index)
          .toLowerCase()
          .replaceAll(/\s+/g, '-')}`,
        groupName: String(groupName),
        rows,
        count: group.entry_count ?? rows.length,
      };
    });
    return {
      rows: groups.flatMap((section) => section.rows),
      groups,
      isGrouped: true,
    };
  }

  const rows = results.map(mapStockInListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}

function stockInLineHasQuantity(row) {
  const accepted = parseStockInLineQty(row?.accepted);
  const rejected = parseStockInLineQty(row?.rejected);
  return accepted > 0 || rejected > 0;
}

function buildStockInSaveLineRow(row, { isPo, isDraft, isTransfer }) {
  const itemCode = String(row?.itemCode ?? '').trim();
  if (!itemCode) return null;

  if (isTransfer) {
    const accepted = parseStockInLineQty(row.accepted);
    if (!isDraft && accepted <= 0) return null;
    return {
      item_code: itemCode,
      accepted_qty: accepted,
      description: String(row.remarks ?? row.remark ?? '').trim(),
    };
  }

  const ordered = parseStockInLineQty(row.ordered);
  const accepted = parseStockInLineQty(row.accepted);
  const rejected = parseStockInLineQty(row.rejected);
  const rate = parsePoRateNumber(row.rate);

  if (!isDraft && !stockInLineHasQuantity(row)) return null;
  if (!isPo && !isDraft && accepted > 0 && rate == null) return null;
  if (!isPo && isDraft && rate == null) return null;

  const apiRow = {
    item_code: itemCode,
    accepted_qty: accepted,
    rejected_qty: rejected,
    description: String(row.remarks ?? row.remark ?? '').trim(),
  };
  if (ordered > 0) apiRow.ordered_qty = ordered;
  if (rate != null) apiRow.order_rate = rate;
  return apiRow;
}

/** Build body for `save_stock_in` (draft, direct submit, or submit existing draft). */
export function buildSaveStockInPayload(form, { isSubmit = false, submitOnly = false } = {}) {
  if (!form || typeof form !== 'object') return null;

  const name = String(form.name ?? '').trim();
  const submitting = stockInShouldSubmit(isSubmit);

  if (submitting && submitOnly && name) {
    return { is_submit: 1, name };
  }

  const center = String(form.center ?? '').trim();
  const sourceType = stockInSourceToApi(form.sourceType);
  const isTransfer = sourceType === STOCK_IN_API_SOURCE_TRANSFER;
  const isPo = sourceType === STOCK_IN_API_SOURCE_PO;

  if (isTransfer) {
    const outgoingStockEntry = String(form.outgoingStockEntry ?? '').trim();
    if (!center || !outgoingStockEntry) return null;

    const isDraft = !submitting;
    const items = [];
    for (const row of form.lineItems ?? []) {
      const apiRow = buildStockInSaveLineRow(row, { isPo: false, isDraft, isTransfer: true });
      if (apiRow) items.push(apiRow);
    }
    if (items.length === 0) return null;

    const body = {
      is_submit: submitting ? 1 : 0,
      center,
      source_type: sourceType,
      outgoing_stock_entry: outgoingStockEntry,
      items,
    };
    const notes = String(form.notes ?? '').trim();
    if (notes) body.notes = notes;
    const postingDate = String(form.poDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    body.posting_date = postingDate;
    if (name) body.name = name;
    return body;
  }

  const supplier = String(form.vendor ?? '').trim();
  if (!center || !supplier) return null;

  const purchaseOrder = isPo ? String(form.poReference ?? '').trim() : '';
  if (isPo && !purchaseOrder) return null;

  const isDraft = !submitting;
  const items = [];
  for (const row of form.lineItems ?? []) {
    const apiRow = buildStockInSaveLineRow(row, { isPo, isDraft, isTransfer: false });
    if (apiRow) items.push(apiRow);
  }

  if (items.length === 0) return null;

  const body = {
    is_submit: submitting ? 1 : 0,
    center,
    supplier,
    source_type: sourceType,
    items,
  };

  if (isPo) {
    body.purchase_order = purchaseOrder;
  } else {
    const ref = String(form.poReference ?? '').trim();
    if (ref) body.ref_purchase_order_no = ref;
  }

  const notes = String(form.notes ?? '').trim();
  if (notes) body.notes = notes;

  const postingDate = String(form.poDate ?? '').trim() || new Date().toISOString().slice(0, 10);
  body.posting_date = postingDate;

  if (name) body.name = name;

  return body;
}

/** Build body for stock-in notes-only updates (`update_stock_in`). */
export function buildStockInNotesUpdatePayload(entryName, notes) {
  const name = String(entryName ?? '').trim();
  if (!name) return null;
  return {
    name,
    notes: String(notes ?? '').trim(),
  };
}

/** List row + detail patch after save_stock_in. */
export function mapStockInSaveResponse(message, form) {
  const payload = message && typeof message === 'object' ? message : {};
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const id = String(payload.name ?? data.id ?? form?.name ?? '').trim();
  const status = mapStockInApiStatusLabel(data.status);
  const postingDate = data.date ?? form?.poDate ?? '';
  const stockImages = mapStockImagesFromApi(
    data.stock_images ?? payload.stock_images ?? form?.stockImages,
  );
  const grnDocument = mapStockGrnDocumentFromApi(data.custom_document ?? payload.custom_document);
  const attachments =
    grnDocument.length > 0
      ? grnDocument
      : mapStockImagesFromApi(data.attachments ?? payload.attachments ?? form?.attachments);

  const detail = {
    ...form,
    name: id || form?.name || '',
    poDate: postingDate || form?.poDate || '',
    status,
    purchaseOrder: data.purchase_order ?? form?.poReference ?? '',
    poReference: data.purchase_order ?? form?.poReference ?? '',
    stockImages,
    attachments,
    files: [],
    documents: [],
  };
  return { id, status, detail, data, isSubmit: Boolean(payload.isSubmit) };
}
