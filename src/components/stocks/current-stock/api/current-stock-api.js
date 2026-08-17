import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { computeOrderLineAmount } from '@/components/stocks/constants';
import { formatRupeeAmount } from '@/components/stocks/shared/api/core-api';
import {
  formatPoListQty,
  mapPoLineItemFromApi,
  mapVendorRcSelectOption,
} from '@/components/stocks/orders/api/orders-api';
import { formatVendorRcDateDisplay, getTodayIsoDate } from '@/components/stocks/shared/format';
import { formatInrCompact } from '@/utils/inr-format';

function formatCurrentStockGroupLabel(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Unassigned';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Map API list row to current-stock table shape. */
export function mapCurrentStockListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const id = String(apiRow.row_id ?? '').trim();
  if (!id) return null;

  const statusRaw = String(apiRow.status ?? '')
    .trim()
    .toLowerCase();
  const isCritical = statusRaw === 'critical';

  return {
    id,
    rowId: id,
    itemCode: apiRow.item_code ?? '',
    product: apiRow.product ?? '',
    category: apiRow.category ?? '',
    center: apiRow.center ?? '',
    centerId: apiRow.center_id ?? '',
    centerTag: apiRow.center_id ?? '',
    unit: apiRow.unit ?? '',
    qty: formatPoListQty(apiRow.qty),
    min: formatPoListQty(apiRow.min),
    trigger: formatPoListQty(apiRow.trigger),
    target: formatPoListQty(apiRow.target),
    reorderQty: formatPoListQty(apiRow.reorder_qty),
    reorderQtyCritical: isCritical,
    rate: formatRupeeAmount(apiRow.rate),
    stockValue: formatRupeeAmount(apiRow.stock_value),
    lastIn: formatVendorRcDateDisplay(apiRow.last_in),
    lastOut: formatVendorRcDateDisplay(apiRow.last_out),
    status: statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) : '--',
    statusKey: statusRaw,
  };
}

/** Map listview stats block to stat-card props. */
export function mapCurrentStockStats(message) {
  const stats = message?.stats ?? {};
  return {
    totalSku: message?.total_count ?? 0,
    totalStockValueLabel: formatInrCompact(stats.total_stock_value),
    criticalCount: stats.critical_items ?? 0,
    outOfStock: stats.out_of_stock ?? 0,
  };
}

/** Map reorder `suppliers[]` entry to a select option. */
export function mapReorderSupplierOption(supplier) {
  if (!supplier || typeof supplier !== 'object') return null;
  const value = String(supplier.id ?? '').trim();
  if (!value) return null;
  const name = String(supplier.name ?? value).trim();
  const rcCount = supplier.vendor_rc_count;
  const suffix = rcCount != null ? ` (${rcCount} contract${Number(rcCount) === 1 ? '' : 's'})` : '';
  return {
    value,
    label: `${name}${suffix}`,
    primaryLabel: name,
  };
}

/** Parse `get_stock_reorder` message (items, optional supplier/RC pickers, center/supplier/category). */
export function parseStockReorderMessage(message) {
  const data = message?.message ?? message ?? {};
  const requiresSupplier = Boolean(data.requires_supplier);
  const requiresVendorRc = Boolean(data.requires_vendor_rc);
  const supplierOptions = (Array.isArray(data.suppliers) ? data.suppliers : [])
    .map(mapReorderSupplierOption)
    .filter(Boolean);
  const vendorRcOptions = (Array.isArray(data.vendor_rcs) ? data.vendor_rcs : [])
    .map(mapVendorRcSelectOption)
    .filter(Boolean);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems
    .map((item, index) => {
      const line = mapPoLineItemFromApi(item, index);
      if (!line) return null;
      return {
        ...line,
        amount: computeOrderLineAmount(line.quantity, line.orderRate),
      };
    })
    .filter(Boolean);

  return {
    mode: String(data.mode ?? '').trim(),
    items,
    vendorRc: String(data.vendor_rc ?? '').trim(),
    warehouse: data.warehouse ?? '',
    requiresSupplier,
    requiresVendorRc,
    supplierOptions,
    vendorRcOptions,
    center: data.center?.id ?? '',
    centerLabel: data.center?.name ?? data.center?.id ?? '',
    supplier: data.supplier?.id ?? '',
    supplierLabel: data.supplier?.name ?? data.supplier?.id ?? '',
    category: data.category ?? '',
    categoryLabel: data.category ?? '',
    itemCode: String(data.item_code ?? '').trim(),
  };
}

/** Map `get_stock_reorder` response to CreateOrderModal initial form state. */
export function mapStockReorderToOrderForm(message, { itemCode } = {}) {
  const parsed = parseStockReorderMessage(message);
  const today = getTodayIsoDate();
  const resolvedItemCode = String(itemCode ?? parsed.itemCode ?? '').trim();

  return {
    name: '',
    center: parsed.center,
    centerLabel: parsed.centerLabel,
    vendor: parsed.supplier,
    vendorLabel: parsed.supplierLabel,
    category: parsed.category,
    categoryLabel: parsed.categoryLabel,
    orderDate: today,
    expectedDelivery: '',
    notes: '',
    vendorRc: parsed.vendorRc,
    warehouse: parsed.warehouse,
    lineItems: parsed.items,
    lockedFromReorder: true,
    reorderItemCode: resolvedItemCode,
  };
}

/** Merge reorder API payload into modal form state. */
export function buildOrderFormFromReorderPayload(draft, payload) {
  const today = getTodayIsoDate();
  return {
    ...draft,
    center: payload.center || draft.center,
    centerLabel: payload.centerLabel || draft.centerLabel,
    vendor: payload.supplier || draft.vendor || '',
    vendorLabel: payload.supplierLabel || draft.vendorLabel || '',
    category: payload.category || draft.category || '',
    categoryLabel: payload.categoryLabel || draft.categoryLabel || '',
    orderDate: draft.orderDate || today,
    expectedDelivery: draft.expectedDelivery ?? '',
    vendorRc: payload.vendorRc ?? '',
    warehouse: payload.warehouse ?? '',
    lineItems: payload.items ?? [],
    lockedFromReorder: true,
    reorderItemCode: draft.reorderItemCode,
  };
}

/** Parse grouped listview response into Redux-friendly groups + flat rows. */
export function parseCurrentStockListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = message?.group_by ?? '';

  const groups = results.map((group, index) => {
    const groupKey = group.group_key ?? group.group_label ?? index;
    const groupName = formatCurrentStockGroupLabel(
      group.group_label ?? group.group_key ?? 'Unassigned',
    );
    const rows = (Array.isArray(group.entries) ? group.entries : [])
      .map(mapCurrentStockListItem)
      .filter(Boolean);

    return {
      id: `${groupBy}-${String(groupKey).toLowerCase().replaceAll(/\s+/g, '-')}-${index}`,
      groupKey: String(groupKey),
      groupName,
      name: groupName,
      itemCount: group.item_count ?? rows.length,
      valueLabel: formatInrCompact(group.stock_value),
      criticalCount: group.critical_count ?? 0,
      rows,
      count: group.item_count ?? rows.length,
    };
  });

  return {
    rows: groups.flatMap((section) => section.rows),
    groups,
    isGrouped: Boolean(groupBy),
    stats: mapCurrentStockStats(message),
  };
}

/** Build multipart form-data for current-stock listview. */
export function buildCurrentStockListFormData({
  keyword = '',
  categoryFilter = [],
  centerFilter = [],
  statusFilter = [],
  page = 1,
  pageSize = 5,
  groupBy = 'category',
  groupOrder = 'asc',
  orderBy = '',
}) {
  const formData = new FormData();
  formData.append('page', String(page));
  formData.append('limit_page_length', String(pageSize));

  const kw = String(keyword ?? '').trim();
  if (kw) {
    formData.append('keyword', kw);
  }

  const filters = [];

  const categories = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (categories.length === 1) {
    filters.push(['category', '=', categories[0]]);
  } else if (categories.length > 1) {
    filters.push(['category', 'in', categories]);
  }

  const centers = (Array.isArray(centerFilter) ? centerFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (centers.length === 1) {
    filters.push(['center', '=', centers[0]]);
  } else if (centers.length > 1) {
    filters.push(['center', 'in', centers]);
  }

  const statuses = (Array.isArray(statusFilter) ? statusFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (statuses.length === 1) {
    filters.push(['status', '=', statuses[0]]);
  } else if (statuses.length > 1) {
    filters.push(['status', 'in', statuses]);
  }

  if (filters.length > 0) {
    formData.append('filters', JSON.stringify(filters));
  }

  const groupField = String(groupBy ?? '').trim() || 'category';
  const direction = groupOrder === 'desc' ? 'desc' : 'asc';
  formData.append('group_by', `${groupField} ${direction}`);

  const order = String(orderBy ?? '').trim();
  if (order) {
    formData.append('order_by', order);
  }

  return formData;
}
