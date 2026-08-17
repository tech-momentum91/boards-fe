import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { STOCKS_ORDER_STATUS, computeOrderLineAmount } from '@/components/stocks/constants';
import { formatRupeeAmount } from '@/components/stocks/shared/api/core-api';

export const PURCHASE_ORDER_STOCK_IN_UPDATE_BLOCKED_MESSAGE =
  'Cannot update: stock inward already created for this order';

export function mapPoSelectOption(row) {
  if (!row || typeof row !== 'object') return null;
  const value = row.id ?? '';
  if (!value) return null;
  return {
    value,
    label: row.name || value,
  };
}

export function formatPoNumericDisplay(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return Number.isInteger(num) ? String(num) : String(num);
}

export function formatPoRateDisplay(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Map `vendor_rcs[]` entry to a select option (vendor, category, contract dates). */
export function mapVendorRcSelectOption(rc) {
  if (!rc || typeof rc !== 'object') return null;
  const value = String(rc.id ?? rc.name ?? '').trim();
  if (!value) return null;

  const supplierName = String(rc.supplier_name ?? '').trim();
  const category = String(rc.category ?? '').trim();
  const from = formatPoListDateDisplay(rc.from_date);
  const to = formatPoListDateDisplay(rc.to_date);
  const range = from && to ? `${from} – ${to}` : from || to || '';

  let primaryLabel = value;
  if (supplierName && category) primaryLabel = `${supplierName} (${category})`;
  else if (supplierName) primaryLabel = supplierName;
  else if (category) primaryLabel = category;

  // Rate / MOQ for the requested item help tell otherwise-identical contracts apart.
  const rateText = rc.rc_rate != null ? `Rate ${formatPoRateDisplay(rc.rc_rate)}` : '';
  const moqText = rc.moq != null ? `MOQ ${formatPoNumericDisplay(rc.moq)}` : '';
  const secondaryLabel = [range, rateText, moqText].filter(Boolean).join(' · ');
  const label = secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel;
  const triggerLabel = label;
  // Compact label without rate/MOQ — used where only contract identity matters.
  const summaryLabel = range ? `${primaryLabel} · ${range}` : primaryLabel;

  return {
    value,
    label,
    primaryLabel,
    secondaryLabel,
    summaryLabel,
    triggerLabel,
    fromDate: rc.from_date ?? '',
    toDate: rc.to_date ?? '',
    rcRate: rc.rc_rate ?? null,
    moq: rc.moq ?? null,
  };
}

/** Parse `get_po_line_items` message (items, optional RC picker, warehouse). */
export function parsePoLineItemsMessage(message) {
  const data = message?.message ?? message ?? {};
  const requiresVendorRc = Boolean(data.requires_vendor_rc);
  const vendorRcOptions = (Array.isArray(data.vendor_rcs) ? data.vendor_rcs : [])
    .map(mapVendorRcSelectOption)
    .filter(Boolean);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.map((item, index) => mapPoLineItemFromApi(item, index)).filter(Boolean);

  return {
    items,
    vendorRc: String(data.vendor_rc ?? '').trim(),
    warehouse: data.warehouse ?? '',
    requiresVendorRc,
    vendorRcOptions,
  };
}

/** Map `get_po_line_items` row to create-order form line item. */
export function mapPoLineItemFromApi(item, index) {
  if (!item || typeof item !== 'object') return null;
  const itemCode = item.item_code ?? '';
  const rcRate = formatPoRateDisplay(item.rc_rate);
  const quantity =
    item.order_qty != null && Number(item.order_qty) !== 0
      ? formatPoNumericDisplay(item.order_qty)
      : '';
  return {
    id: `oli-${itemCode || index}-${index}`,
    itemCode,
    product: item.product || itemCode,
    currentStock: formatPoNumericDisplay(item.current_stock),
    minStock: formatPoNumericDisplay(item.min_qty),
    maxStock: formatPoNumericDisplay(item.max_qty),
    rcRate,
    orderRate: rcRate,
    quantity,
    remark: item.remark ?? '',
    unit: '',
    unitPrice: rcRate,
    amount: '',
  };
}

/** Overlay saved draft qty / rates onto API line items (matched by item_code). */
export function mergePoLineItemsWithDraft(apiLines, draftLines) {
  const draftByCode = new Map();
  for (const row of draftLines ?? []) {
    const key = String(row.itemCode ?? row.product ?? '').trim();
    if (key) draftByCode.set(key, row);
  }
  return (apiLines ?? []).map((line) => {
    const draft = draftByCode.get(line.itemCode) ?? draftByCode.get(line.product);
    if (!draft) return line;
    const quantity =
      draft.quantity != null && String(draft.quantity).trim() ? draft.quantity : line.quantity;
    const orderRate =
      draft.orderRate != null && String(draft.orderRate).trim() ? draft.orderRate : line.orderRate;
    return {
      ...line,
      quantity,
      orderRate,
      unitPrice: orderRate,
      remark: draft.remark ?? line.remark,
    };
  });
}

export function parsePurchaseOrderOptionsMessage(result) {
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
  };
}

/** Map API list status label to UI status. */
export function mapPurchaseOrderApiStatus(status) {
  const key = String(status ?? '').trim();
  if (key === 'Ordered') return 'Ordered';
  if (key === 'Draft') return 'Draft';
  if (key === 'Partial') return 'Partial';
  if (key === 'Fully Received') return 'Fully Received';
  if (key === 'Cancelled') return 'Cancelled';
  return key || '—';
}

/** Whether a PO can be edited per docstatus, inward receipts, and optional API flags. */
export function resolvePurchaseOrderCanUpdate(data = {}, status) {
  const resolvedStatus = status ?? mapPurchaseOrderApiStatus(data.status);

  if (data.can_update === false) return false;
  if (data.can_update === true) return true;

  if (resolvePurchaseOrderHasStockIn(data, resolvedStatus)) return false;

  if (resolvedStatus === STOCKS_ORDER_STATUS.CANCELLED) return false;
  if (resolvedStatus === STOCKS_ORDER_STATUS.PARTIAL) return false;
  if (resolvedStatus === STOCKS_ORDER_STATUS.FULLY_RECEIVED) return false;
  if (resolvedStatus === STOCKS_ORDER_STATUS.DRAFT) return true;
  if (resolvedStatus === STOCKS_ORDER_STATUS.ORDERED) return true;

  return false;
}

/** True when any non-cancelled Purchase Receipt (Stock In) is linked to the PO. */
export function resolvePurchaseOrderHasStockIn(data = {}, status) {
  if (data.has_stock_in === true || data.stock_in_exists === true || data.has_inward === true) {
    return true;
  }
  const stockInCount = Number(data.stock_in_count ?? data.inward_count ?? Number.NaN);
  if (Number.isFinite(stockInCount) && stockInCount > 0) return true;

  const resolvedStatus = status ?? mapPurchaseOrderApiStatus(data.status);
  return (
    resolvedStatus === STOCKS_ORDER_STATUS.PARTIAL ||
    resolvedStatus === STOCKS_ORDER_STATUS.FULLY_RECEIVED
  );
}

/** Map UI status filter value to API `status` filter token. */
export function mapOrderStatusFilterToApi(status) {
  if (status === 'Ordered') return 'ordered';
  if (status === 'Fully Received') return 'fully_received';
  return String(status ?? '')
    .toLowerCase()
    .replaceAll(' ', '_');
}

export function formatPoListDateDisplay(iso) {
  if (!iso) return '';
  const normalized = String(iso).slice(0, 10);
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatPoListQty(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return Number.isInteger(num) ? String(num) : String(num);
}

/** Map listview API row to orders table shape. */
export function mapPurchaseOrderListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const orderDateIso = apiRow.order_date != null ? String(apiRow.order_date).slice(0, 10) : '';
  const expectedDeliveryIso =
    apiRow.expected_delivery != null ? String(apiRow.expected_delivery).slice(0, 10) : '';
  const id = apiRow.id ?? apiRow.name ?? '';
  const status = mapPurchaseOrderApiStatus(apiRow.status);

  return {
    id,
    orderNo: id,
    name: id,
    center: apiRow.center ?? '',
    vendor: apiRow.vendor ?? '',
    category: apiRow.category ?? '',
    requestDate: formatPoListDateDisplay(orderDateIso),
    expectedDelivery: formatPoListDateDisplay(expectedDeliveryIso),
    orderDateIso,
    expectedDeliveryIso,
    status,
    canUpdate: resolvePurchaseOrderCanUpdate(apiRow, status),
    hasStockIn: resolvePurchaseOrderHasStockIn(apiRow, status),
    lineItemCount: apiRow.products ?? 0,
    totalQty: formatPoListQty(apiRow.total_qty),
    totalAmountLabel: formatRupeeAmount(apiRow.order_value),
    lineItems: [],
    notes: '',
  };
}

/** Parse summary cards from listview API. */
export function mapPurchaseOrderListSummary(summary) {
  const counts = { total: 0, draft: 0, partial: 0, fullyReceived: 0 };
  const list = Array.isArray(summary) ? summary : [];
  for (const card of list) {
    const key = String(card?.key ?? '').trim();
    const count = Number(card?.count ?? 0);
    if (key === 'total_orders') counts.total = count;
    else if (key === 'draft') counts.draft = count;
    else if (key === 'partial') counts.partial = count;
    else if (key === 'fully_received') counts.fullyReceived = count;
  }
  return counts;
}

/**
 * Build multipart form-data for PO listview (Postman-style flat fields).
 */
export function buildPurchaseOrderListFormData({
  keyword = '',
  vendorFilter = [],
  categoryFilter = [],
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

  const vendors = (Array.isArray(vendorFilter) ? vendorFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (vendors.length === 1) {
    filters.push(['supplier', '=', vendors[0]]);
  } else if (vendors.length > 1) {
    filters.push(['supplier', 'in', vendors]);
  }

  const categories = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (categories.length === 1) {
    filters.push(['category', '=', categories[0]]);
  } else if (categories.length > 1) {
    filters.push(['category', 'in', categories]);
  }

  const statuses = (Array.isArray(statusFilter) ? statusFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (statuses.length === 1) {
    filters.push(['status', '=', mapOrderStatusFilterToApi(statuses[0])]);
  } else if (statuses.length > 1) {
    filters.push(['status', 'in', statuses.map(mapOrderStatusFilterToApi)]);
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

export function parsePurchaseOrderListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = message?.group_by ?? '';

  if (groupBy && results.length > 0 && Array.isArray(results[0]?.orders)) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.orders) ? group.orders : [])
        .map(mapPurchaseOrderListItem)
        .filter(Boolean);
      return {
        id: `${groupBy}-${String(group.group_key ?? index)
          .toLowerCase()
          .replaceAll(/\s+/g, '-')}`,
        groupName: String(groupName),
        rows,
        count: group.order_count ?? rows.length,
      };
    });
    return {
      rows: groups.flatMap((section) => section.rows),
      groups,
      isGrouped: true,
    };
  }

  const rows = results.map(mapPurchaseOrderListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}

export function parsePoRateNumber(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replaceAll('₹', '').replaceAll(',', '').trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** True only for explicit submit signals (avoids truthy "0" / "false" strings). */
export function purchaseOrderShouldSubmit(isSubmit) {
  return isSubmit === true || isSubmit === 1 || isSubmit === '1';
}

/** Build body for `save_purchase_order` (draft or submit). */
export function buildSavePurchaseOrderPayload(form, { isSubmit = false } = {}) {
  if (!form || typeof form !== 'object') return null;

  const items = [];

  for (const row of form.lineItems ?? []) {
    const itemCode = String(row.itemCode ?? '').trim();
    const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
    if (!itemCode || Number.isNaN(qty) || qty <= 0) continue;

    const rate =
      parsePoRateNumber(row.orderRate) ??
      parsePoRateNumber(row.rcRate) ??
      parsePoRateNumber(row.unitPrice);
    if (rate == null) continue;

    items.push({
      item_code: itemCode,
      order_qty: qty,
      order_rate: rate,
      remark: String(row.remark ?? '').trim(),
    });
  }

  const center = String(form.center ?? '').trim();
  const supplier = String(form.vendor ?? '').trim();
  const category = String(form.category ?? '').trim();
  const transactionDate = String(form.orderDate ?? '').trim();
  const scheduleDate = String(form.expectedDelivery ?? '').trim();

  if (!center || !supplier || !category || !transactionDate || !scheduleDate) {
    return null;
  }

  const body = {
    is_submit: purchaseOrderShouldSubmit(isSubmit) ? 1 : 0,
    center,
    supplier,
    category,
    transaction_date: transactionDate,
    schedule_date: scheduleDate,
    items,
  };

  const notes = String(form.notes ?? '').trim();
  if (notes) body.notes = notes;

  const name = String(form.name ?? '').trim();
  if (name) body.name = name;

  const vendorRc = String(form.vendorRc ?? '').trim();
  if (vendorRc) body.vendor_rc = vendorRc;

  return body;
}

/** Normalize `save_purchase_order` API message to a stable `{ name, data, isSubmit }` shape. */
export function parsePurchaseOrderSaveMessage(message, isSubmit = false) {
  const payload = message && typeof message === 'object' ? message : {};
  const data = payload?.data ?? {};
  const name = String(payload?.name ?? data?.id ?? '').trim();
  return { ...payload, name, data, isSubmit };
}

function normalizePoNotes(notes) {
  return String(notes ?? '').trim();
}

function lineItemToPatchRow(row) {
  const itemCode = String(row.itemCode ?? '').trim();
  const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
  if (!itemCode || Number.isNaN(qty) || qty <= 0) return null;

  const rate =
    parsePoRateNumber(row.orderRate) ??
    parsePoRateNumber(row.rcRate) ??
    parsePoRateNumber(row.unitPrice);
  if (rate == null) return null;

  return {
    item_code: itemCode,
    order_qty: qty,
    order_rate: rate,
    remark: String(row.remark ?? '').trim(),
  };
}

function lineItemPatchEqual(left, right) {
  if (!left || !right) return false;
  return (
    left.item_code === right.item_code &&
    left.order_qty === right.order_qty &&
    left.order_rate === right.order_rate &&
    left.remark === right.remark
  );
}

/**
 * Build payload for `update_purchase_order_items`.
 * Header fields are sent only when changed. When any line changes, `items` is the
 * full replace list (all current lines) — the backend deletes omitted children.
 * Returns null when nothing changed. Throws if a product line cannot be serialized
 * (missing qty/rate), so callers can toast instead of sending a partial list.
 */
export function buildPurchaseOrderUpdatePayload(baseline, current) {
  if (!baseline || !current) return null;

  const name = String(current.name ?? baseline.name ?? '').trim();
  if (!name) return null;

  const patch = { name };
  let hasChanges = false;

  const baseOrderDate = String(baseline.orderDate ?? '').trim();
  const nextOrderDate = String(current.orderDate ?? '').trim();
  if (baseOrderDate !== nextOrderDate && nextOrderDate) {
    patch.transaction_date = nextOrderDate;
    hasChanges = true;
  }

  const baseExpectedDelivery = String(baseline.expectedDelivery ?? '').trim();
  const nextExpectedDelivery = String(current.expectedDelivery ?? '').trim();
  if (baseExpectedDelivery !== nextExpectedDelivery && nextExpectedDelivery) {
    patch.expected_delivery = nextExpectedDelivery;
    hasChanges = true;
  }

  if (normalizePoNotes(baseline.notes) !== normalizePoNotes(current.notes)) {
    patch.notes = normalizePoNotes(current.notes);
    hasChanges = true;
  }

  const baselineByCode = new Map(
    (Array.isArray(baseline.lineItems) ? baseline.lineItems : [])
      .map((row) => {
        const snapshot = lineItemToPatchRow(row);
        return snapshot ? [snapshot.item_code, snapshot] : null;
      })
      .filter(Boolean),
  );

  const allItems = [];
  let anyItemChanged = false;
  for (const row of Array.isArray(current.lineItems) ? current.lineItems : []) {
    const itemCode = String(row?.itemCode ?? '').trim();
    const hasProduct = Boolean(itemCode || String(row?.product ?? '').trim());
    if (!hasProduct) continue;

    const nextRow = lineItemToPatchRow(row);
    if (!nextRow) {
      const error = new Error(
        'One or more line items need a valid quantity and rate before saving.',
      );
      error.code = 'PO_LINE_ITEMS_INCOMPLETE';
      throw error;
    }

    const previousRow = baselineByCode.get(nextRow.item_code);
    if (!lineItemPatchEqual(previousRow, nextRow)) {
      anyItemChanged = true;
    }
    allItems.push(nextRow);
  }

  if (anyItemChanged) {
    // Full replace: omitting a sibling line would delete it on the backend.
    patch.items = allItems;
    hasChanges = true;
  }

  return hasChanges ? patch : null;
}

function totalQtyFromLines(form) {
  let sum = 0;
  for (const row of form?.lineItems ?? []) {
    const n = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
    if (!Number.isNaN(n)) sum += n;
  }
  return sum > 0 ? (Number.isInteger(sum) ? String(sum) : sum.toFixed(2)) : '';
}

function orderValueFromLines(form) {
  let total = 0;
  for (const row of form?.lineItems ?? []) {
    const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
    const rate = parsePoRateNumber(row.orderRate) ?? parsePoRateNumber(row.rcRate);
    if (!Number.isNaN(qty) && qty > 0 && rate != null) total += qty * rate;
  }
  return total;
}

/** Map API save response + form to orders table row shape. */
export function mapPurchaseOrderSaveToTableRow(result, form, labelHints = {}) {
  const data = result?.data ?? {};
  const name = result?.name ?? data?.id ?? form?.name ?? '';
  const statusKey = String(data?.status ?? '').trim();
  let status = 'Submitted';
  if (statusKey === 'Draft') status = 'Draft';
  else if (statusKey === 'Partial') status = 'Partial';
  else if (statusKey === 'Fully Received') status = 'Fully Received';
  else if (statusKey === 'Ordered') status = 'Submitted';

  const orderDateIso = data?.order_date ?? form?.orderDate ?? '';
  const expectedIso = data?.expected_delivery ?? form?.expectedDelivery ?? '';
  const formatIso = (iso) => {
    if (!iso) return '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filledLines = (form?.lineItems ?? []).filter((row) => {
    const qty = Number.parseFloat(String(row.quantity ?? '').replaceAll(',', ''));
    return !Number.isNaN(qty) && qty > 0;
  });

  const lineItems = filledLines.map((row) => ({
    id: row.id,
    itemCode: row.itemCode,
    product: row.product,
    quantity: String(row.quantity ?? ''),
    unit: row.unit ?? '',
    unitPrice: row.orderRate ?? row.unitPrice ?? '',
    amount: row.amount ?? '',
    currentStock: row.currentStock,
    minStock: row.minStock,
    maxStock: row.maxStock,
    rcRate: row.rcRate,
    orderRate: row.orderRate,
    remark: row.remark,
  }));

  const draftForm = {
    name,
    center: form?.center ?? '',
    vendor: form?.vendor ?? '',
    category: form?.category ?? '',
    orderDate: orderDateIso,
    expectedDelivery: expectedIso,
    notes: form?.notes ?? '',
    vendorRc: form?.vendorRc ?? '',
    warehouse: form?.warehouse ?? '',
    lineItems: Array.isArray(form?.lineItems) ? form.lineItems.map((row) => ({ ...row })) : [],
  };

  const base = {
    id: name,
    orderNo: name,
    name,
    center: data?.center_name || labelHints.centerLabel || '',
    vendor: data?.supplier_name || labelHints.vendorLabel || '',
    category: data?.category || labelHints.categoryLabel || '',
    requestDate: formatIso(orderDateIso),
    expectedDelivery: formatIso(expectedIso),
    orderDateIso,
    expectedDeliveryIso: expectedIso,
    status,
    lineItemCount: data?.products ?? lineItems.length,
    totalQty: String(data?.total_qty ?? totalQtyFromLines(form)),
    totalAmountLabel: formatRupeeAmount(data?.order_value ?? orderValueFromLines(form)),
    notes: form?.notes?.trim() ? form.notes : '',
    lineItems,
  };

  if (status === 'Draft') {
    return { ...base, draftForm };
  }
  return base;
}

/** Map `get_purchase_order_detail` payload to editable form state. */
export function mapPurchaseOrderDetailToForm(detailPayload) {
  const data = detailPayload?.data ?? detailPayload ?? {};
  const orderDate =
    data.order_date != null
      ? typeof data.order_date === 'string'
        ? data.order_date.slice(0, 10)
        : String(data.order_date)
      : '';
  const expectedDelivery =
    data.expected_delivery != null
      ? typeof data.expected_delivery === 'string'
        ? data.expected_delivery.slice(0, 10)
        : String(data.expected_delivery)
      : '';

  const lineItems = (Array.isArray(data.items) ? data.items : [])
    .map((item, index) => {
      const mapped = mapPoLineItemFromApi(
        {
          item_code: item.item_code,
          product: item.product,
          current_stock: item.current_stock,
          min_qty: item.min_qty,
          max_qty: item.max_qty,
          rc_rate: item.rc_rate,
          order_qty: item.order_qty,
          remark: item.remark,
        },
        index,
      );
      if (mapped && item.order_rate != null) {
        mapped.orderRate = formatPoRateDisplay(item.order_rate);
        mapped.unitPrice = mapped.orderRate;
        const apiAmount = Number(item.amount);
        if (Number.isFinite(apiAmount) && apiAmount > 0) {
          mapped.amount = formatPoRateDisplay(apiAmount);
        } else {
          mapped.amount = computeOrderLineAmount(item.order_qty, mapped.orderRate);
        }
      }
      return mapped;
    })
    .filter(Boolean);

  return {
    name: data.id ?? data.name ?? '',
    center: data.center ?? '',
    vendor: data.supplier ?? '',
    category: data.category ?? '',
    orderDate,
    expectedDelivery,
    notes: data.notes ?? '',
    vendorRc: data.vendor_rc ?? '',
    warehouse: '',
    lineItems,
  };
}

/** Apply an edited PO form onto the open detail order without a full reload. */
export function applyPurchaseOrderFormToDetailOrder(order, form) {
  if (!order || !form) return order;

  const nextForm = clonePurchaseOrderForm(form);
  const lineItems = (nextForm.lineItems ?? []).map((row) => ({ ...row }));
  const formatIso = (iso) => {
    if (!iso) return '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return {
    ...order,
    form: nextForm,
    notes: nextForm.notes ?? order.notes,
    orderDateIso: nextForm.orderDate || order.orderDateIso,
    expectedDeliveryIso: nextForm.expectedDelivery || order.expectedDeliveryIso,
    requestDate: nextForm.orderDate ? formatIso(nextForm.orderDate) : order.requestDate,
    expectedDelivery: nextForm.expectedDelivery
      ? formatIso(nextForm.expectedDelivery)
      : order.expectedDelivery,
    lineItems,
    lineItemCount: lineItems.filter((line) => String(line.product ?? '').trim()).length,
    totalQty: String(totalQtyFromLines(nextForm) || order.totalQty || ''),
    totalAmountLabel: formatRupeeAmount(orderValueFromLines(nextForm)),
  };
}

/** Patch a list/table row from the saved drawer form (no list refetch). */
export function applyPurchaseOrderFormToListItem(listItem, form) {
  if (!listItem || !form) return listItem;

  const formatIso = (iso) => {
    if (!iso) return listItem.requestDate || '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const lineItems = Array.isArray(form.lineItems) ? form.lineItems : [];
  const lineItemCount = lineItems.filter((line) => String(line.product ?? '').trim()).length;
  return {
    ...listItem,
    notes: form.notes ?? listItem.notes,
    orderDateIso: form.orderDate || listItem.orderDateIso,
    expectedDeliveryIso: form.expectedDelivery || listItem.expectedDeliveryIso,
    requestDate: form.orderDate ? formatIso(form.orderDate) : listItem.requestDate,
    expectedDelivery: form.expectedDelivery
      ? formatIso(form.expectedDelivery)
      : listItem.expectedDelivery,
    lineItemCount: lineItemCount > 0 ? lineItemCount : listItem.lineItemCount,
    totalQty: String(totalQtyFromLines(form) || listItem.totalQty || ''),
    totalAmountLabel: formatRupeeAmount(orderValueFromLines(form)),
  };
}

/** Display row + nested `form` for the order view drawer (single detail payload). */
export function mapPurchaseOrderDetail(detailPayload, labelHints = {}) {
  const form = mapPurchaseOrderDetailToForm(detailPayload);
  return { ...mapPurchaseOrderDetailToDisplayRow(detailPayload, labelHints), form };
}

/** Copy PO edit form so drawer edits do not mutate Redux or the save baseline. */
export function clonePurchaseOrderForm(form) {
  if (!form) return null;
  return {
    ...form,
    lineItems: Array.isArray(form.lineItems) ? form.lineItems.map((row) => ({ ...row })) : [],
  };
}

export function mapPurchaseOrderDetailToDisplayRow(detailPayload, labelHints = {}) {
  const form = mapPurchaseOrderDetailToForm(detailPayload);
  const data = detailPayload?.data ?? detailPayload ?? {};
  const formatIso = (iso) => {
    if (!iso) return '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusKey = String(data?.status ?? '').trim();
  let status = 'Ordered';
  if (statusKey === 'Draft') status = 'Draft';
  else if (statusKey === 'Partial') status = 'Partial';
  else if (statusKey === 'Fully Received') status = 'Fully Received';
  else if (statusKey === 'Ordered') status = 'Ordered';
  else if (statusKey === 'Cancelled') status = 'Cancelled';

  const lineItems = form.lineItems.map((row) => ({
    ...row,
    quantity: row.quantity,
  }));

  return {
    id: form.name,
    orderNo: form.name,
    name: form.name,
    center: data.center_name || labelHints.centerLabel || '',
    vendor: data.supplier_name || labelHints.vendorLabel || '',
    category: data.category || labelHints.categoryLabel || '',
    requestDate: formatIso(form.orderDate),
    expectedDelivery: formatIso(form.expectedDelivery),
    orderDateIso: form.orderDate,
    expectedDeliveryIso: form.expectedDelivery,
    status,
    canUpdate: resolvePurchaseOrderCanUpdate(data, status),
    hasStockIn: resolvePurchaseOrderHasStockIn(data, status),
    lineItemCount: data?.products ?? lineItems.length,
    totalQty: String(data?.total_qty ?? totalQtyFromLines(form)),
    totalAmountLabel: formatRupeeAmount(data?.order_value ?? orderValueFromLines(form)),
    notes: form.notes,
    lineItems,
    draftForm: status === 'Draft' ? form : undefined,
  };
}

/** Build editable form from list row (fallback when detail API is not used). */
export function mapOrderRowToEditForm(order) {
  if (!order) return null;
  const draft = order.draftForm;
  const orderDate = order.orderDateIso ?? draft?.orderDate ?? '';
  const expectedDelivery = order.expectedDeliveryIso ?? draft?.expectedDelivery ?? '';
  return {
    name: order.name ?? order.orderNo ?? order.id ?? '',
    center: draft?.center ?? order.centerId ?? '',
    vendor: draft?.vendor ?? order.vendorId ?? '',
    category: draft?.category ?? order.category ?? '',
    orderDate,
    expectedDelivery,
    notes: order.notes ?? draft?.notes ?? '',
    vendorRc: draft?.vendorRc ?? '',
    warehouse: draft?.warehouse ?? '',
    lineItems: (order.lineItems ?? draft?.lineItems ?? []).map((row, index) => ({
      id: row.id ?? `oli-${index}`,
      itemCode: row.itemCode ?? '',
      product: row.product ?? '',
      currentStock: row.currentStock ?? '',
      minStock: row.minStock ?? '',
      maxStock: row.maxStock ?? '',
      rcRate: row.rcRate ?? row.unitPrice ?? '',
      orderRate: row.orderRate ?? row.unitPrice ?? '',
      quantity: String(row.quantity ?? ''),
      remark: row.remark ?? '',
      unit: row.unit ?? '',
      unitPrice: row.unitPrice ?? '',
      amount: row.amount ?? '',
    })),
  };
}
