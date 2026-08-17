import { formatPoListQty } from '@/components/stocks/orders/api/orders-api';
import { STOCKS_STOCK_OUT_STATUS } from '@/components/stocks/constants';
import {
  STOCK_OUT_API_ISSUE_MODE,
  STOCK_OUT_TRANSFER_STATUS,
} from '@/components/stocks/stock-out/constants';
import { mapStockImagesFromApi } from '@/components/stocks/shared/stock-images';
import { normalizeStockCategoryLabels } from '@/components/stocks/shared/stocks-category-badges';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';
import { formatVendorRcDateDisplay } from '@/components/stocks/shared/format';

function parseStockOutQty(value) {
  const n = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  return Number.isNaN(n) ? null : n;
}

export function stockOutIssueModeToApi(issueMode) {
  const key = String(issueMode ?? '')
    .trim()
    .toLowerCase();
  if (
    key === 'transfer' ||
    key === 'transfer-out' ||
    key === STOCK_OUT_API_ISSUE_MODE.TRANSFER.toLowerCase()
  ) {
    return STOCK_OUT_API_ISSUE_MODE.TRANSFER;
  }
  if (key === 'qr scan' || key === 'qr-scan' || key === 'qr based') {
    return STOCK_OUT_API_ISSUE_MODE.QR_SCAN;
  }
  return STOCK_OUT_API_ISSUE_MODE.MANUAL;
}

export function stockOutIsTransferMode(issueMode) {
  return stockOutIssueModeToApi(issueMode) === STOCK_OUT_API_ISSUE_MODE.TRANSFER;
}

/** Parse `get_stock_out_options` response. */
export function parseStockOutOptionsMessage(result) {
  const message = result?.message ?? result ?? {};

  const centers = (Array.isArray(message.centers) ? message.centers : [])
    .map((center) => {
      const id = String(center?.id ?? '').trim();
      if (!id) return null;
      return {
        value: id,
        label: String(center?.name ?? id).trim() || id,
      };
    })
    .filter(Boolean);

  const categories = (Array.isArray(message.categories) ? message.categories : [])
    .map((category) => {
      const value = String(category ?? '').trim();
      if (!value) return null;
      return { value, label: value };
    })
    .filter(Boolean);

  const departments = (Array.isArray(message.departments) ? message.departments : [])
    .map((department) => {
      const value = String(department ?? '').trim();
      if (!value) return null;
      return { value, label: value };
    })
    .filter(Boolean);

  const issuedBy = (Array.isArray(message.issued_by) ? message.issued_by : [])
    .map((person) => {
      const id = String(person?.id ?? '').trim();
      if (!id) return null;
      return {
        value: id,
        label: String(person?.name ?? id).trim() || id,
      };
    })
    .filter(Boolean);

  const destinationCenters = (
    Array.isArray(message.destination_centers) ? message.destination_centers : []
  )
    .map((center) => {
      const id = String(center?.id ?? '').trim();
      if (!id) return null;
      return {
        value: id,
        label: String(center?.name ?? id).trim() || id,
      };
    })
    .filter(Boolean);

  return { centers, categories, departments, issuedBy, destinationCenters };
}

/** Map API line item to stock-out modal row shape. */
export function mapStockOutLineItem(apiRow, index = 0) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const itemCode = String(apiRow.item_code ?? '').trim();
  if (!itemCode) return null;

  const currentStock = parseStockOutQty(apiRow.current_stock);
  const issuedQty = parseStockOutQty(apiRow.issued_qty ?? apiRow.sent_qty);

  return {
    id: `sol-${itemCode}-${index}`,
    itemCode,
    product: apiRow.product ?? itemCode,
    currentStock,
    remainingBalance: parseStockOutQty(apiRow.remaining_balance),
    issued: issuedQty != null && issuedQty > 0 ? formatPoListQty(issuedQty) : '',
    remarks: apiRow.remarks ?? '',
  };
}

/** Parse `get_stock_out_items` response. */
export function parseStockOutItemsMessage(result) {
  const message = result?.message ?? result ?? {};
  const items = (Array.isArray(message.items) ? message.items : [])
    .map(mapStockOutLineItem)
    .filter(Boolean);

  return {
    center: message.center ?? '',
    category: message.category ?? '',
    items,
  };
}

/** Compute remaining balance label from current stock and issued qty string. */
export function formatStockOutRemainingBalance(currentStock, issuedStr) {
  if (currentStock == null || Number.isNaN(currentStock)) return '—';
  const issued = parseStockOutQty(issuedStr);
  if (issued == null) return formatPoListQty(currentStock);
  const rem = Math.max(0, currentStock - issued);
  return formatPoListQty(rem);
}

/** Format current stock for display. */
export function formatStockOutCurrentStockLabel(currentStock) {
  if (currentStock == null || Number.isNaN(currentStock)) return '—';
  return formatPoListQty(currentStock);
}

/** True only for explicit submit signals (avoids truthy "0" / "false" strings). */
export function stockOutShouldSubmit(isSubmit) {
  return isSubmit === true || isSubmit === 1 || isSubmit === '1';
}

/** Build body for `save_stock_out` (draft, direct submit, or submit existing draft). */
export function buildSaveStockOutPayload(form, { isSubmit = false, submitOnly = false } = {}) {
  if (!form || typeof form !== 'object') return null;

  const name = String(form.name ?? '').trim();
  const submitting = stockOutShouldSubmit(isSubmit);

  if (submitting && submitOnly && name) {
    return { is_submit: 1, name };
  }

  const center = String(form.center ?? '').trim();
  const issueMode = stockOutIssueModeToApi(form.issueMode);
  const isTransfer = issueMode === STOCK_OUT_API_ISSUE_MODE.TRANSFER;

  const items = [];
  for (const row of form.lineItems ?? []) {
    const itemCode = String(row.itemCode ?? '').trim();
    const issuedQty = parseStockOutQty(row.issued);
    if (!itemCode || issuedQty == null || issuedQty <= 0) continue;
    items.push({
      item_code: itemCode,
      issued_qty: issuedQty,
      remarks: String(row.remarks ?? '').trim(),
    });
  }

  if (items.length === 0) return null;

  if (isTransfer) {
    const destinationCenter = String(form.destinationCenter ?? '').trim();
    if (!center || !destinationCenter) return null;

    const body = {
      is_submit: submitting ? 1 : 0,
      center,
      destination_center: destinationCenter,
      issue_mode: issueMode,
      posting_date: String(form.entryDate ?? '').trim() || new Date().toISOString().slice(0, 10),
      items,
    };
    const notes = String(form.notes ?? '').trim();
    if (notes) body.notes = notes;
    if (name) body.name = name;
    return body;
  }

  const department = String(form.department ?? '').trim();
  const category = String(form.category ?? '').trim();
  const issuedBy = String(form.issuedBy ?? '').trim();
  if (!center || !department || !category || !issuedBy) return null;

  const body = {
    is_submit: submitting ? 1 : 0,
    center,
    department,
    category,
    issued_by: issuedBy,
    issue_mode: issueMode,
    posting_date: String(form.entryDate ?? '').trim() || new Date().toISOString().slice(0, 10),
    items,
  };

  const notes = String(form.notes ?? '').trim();
  if (notes) body.notes = notes;
  if (name) body.name = name;

  return body;
}

/** Build body for stock-out notes-only updates (`update_stock_out`). */
export function buildStockOutNotesUpdatePayload(entryName, notes) {
  const name = String(entryName ?? '').trim();
  if (!name) return null;
  return {
    name,
    notes: String(notes ?? '').trim(),
  };
}

function resolveStockOutApiStatusRaw(data) {
  if (!data || typeof data !== 'object') return '';
  const summary = data.send_summary ?? data._summary ?? null;
  return (
    data.transfer_status ??
    data.status ??
    (summary && typeof summary === 'object' ? (summary.status ?? summary.transfer_status) : '') ??
    ''
  );
}

/** Normalize API/list status to UI label (Material Issue + Transfer send). */
export function mapStockOutApiStatusLabel(apiStatus, { issueMode } = {}) {
  const raw = String(apiStatus ?? '').trim();
  const normalized = raw.toLowerCase();
  if (normalized === 'draft') return STOCKS_STOCK_OUT_STATUS.DRAFT;
  if (normalized === 'in transit') return STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT;
  if (normalized === 'partially transferred' || normalized === 'partially received') {
    return STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED;
  }
  if (normalized === 'transferred' || normalized === 'completed') {
    return STOCK_OUT_TRANSFER_STATUS.TRANSFERRED;
  }
  if (normalized === 'issued' || normalized === 'pending') {
    return STOCKS_STOCK_OUT_STATUS.ISSUED;
  }
  if (stockOutIsTransferMode(issueMode) && !raw) {
    return STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT;
  }
  if (raw === STOCKS_STOCK_OUT_STATUS.ISSUED) return STOCKS_STOCK_OUT_STATUS.ISSUED;
  if (raw === STOCKS_STOCK_OUT_STATUS.DRAFT) return STOCKS_STOCK_OUT_STATUS.DRAFT;
  if (raw === STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT) return STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT;
  if (raw === STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED) {
    return STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED;
  }
  if (raw === STOCK_OUT_TRANSFER_STATUS.TRANSFERRED) return STOCK_OUT_TRANSFER_STATUS.TRANSFERRED;
  return raw || STOCKS_STOCK_OUT_STATUS.DRAFT;
}

/** Map `get_stock_out_detail` payload to create/edit form state. */
export function mapStockOutDetailToForm(detailPayload) {
  const data = detailPayload?.data ?? detailPayload ?? {};
  const postingDate = data.date != null ? String(data.date).slice(0, 10) : '';

  const issueMode = data.issue_mode ?? 'Manual';
  const lineItems = (Array.isArray(data.items) ? data.items : [])
    .map((item, index) => mapStockOutLineItem(item, index))
    .filter(Boolean);

  return {
    name: data.id ?? data.name ?? '',
    center: data.source_center ?? data.center ?? '',
    centerLabel: data.source_center_name ?? data.center_name ?? data.center ?? '',
    destinationCenter: data.destination_center ?? '',
    destinationCenterLabel: data.destination_center_name ?? data.destination_center ?? '',
    department: data.department ?? '',
    category: normalizeStockCategoryLabels(data.category),
    issuedBy: data.issued_by ?? '',
    issuedByLabel: data.issued_by_name ?? data.issued_by ?? '',
    issueMode,
    entryDate: postingDate,
    notes: data.notes ?? '',
    status: mapStockOutApiStatusLabel(resolveStockOutApiStatusRaw(data), {
      issueMode: data.issue_mode,
    }),
    lineItems,
    stockImages: mapStockImagesFromApi(data.stock_images),
    files: [],
  };
}

/** Normalize save_stock_out response for UI + list row updates. */
export function mapStockOutSaveResponse(message, form) {
  const payload = message && typeof message === 'object' ? message : {};
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const id = String(payload.name ?? data.id ?? form?.name ?? '').trim();
  const status = mapStockOutApiStatusLabel(
    resolveStockOutApiStatusRaw(data) || payload.transfer_status || payload.status,
    {
      issueMode: data.issue_mode ?? form?.issueMode,
    },
  );
  const postingDate = data.date != null ? String(data.date).slice(0, 10) : (form?.entryDate ?? '');

  const stockImages = mapStockImagesFromApi(
    data.stock_images ?? payload.stock_images ?? form?.stockImages,
  );

  const detail = {
    ...form,
    name: id || form?.name || '',
    center: data.center ?? form?.center ?? '',
    department: data.department ?? form?.department ?? '',
    category: normalizeStockCategoryLabels(data.category ?? form?.category),
    issuedBy: data.issued_by ?? form?.issuedBy ?? '',
    issueMode: data.issue_mode ?? form?.issueMode ?? 'Manual',
    entryDate: postingDate,
    notes: form?.notes ?? '',
    status,
    lineItems: Array.isArray(form?.lineItems) ? form.lineItems : [],
    stockImages,
    files: [],
  };

  return {
    id,
    status,
    detail,
    data,
    isSubmit: Boolean(payload.isSubmit),
  };
}

/** Map UI status filter value to API `status` filter (exact backend labels). */
export function mapStockOutStatusFilterToApi(status) {
  const key = String(status ?? '').trim();
  if (key === STOCKS_STOCK_OUT_STATUS.DRAFT) return STOCKS_STOCK_OUT_STATUS.DRAFT;
  if (key === STOCKS_STOCK_OUT_STATUS.ISSUED) return STOCKS_STOCK_OUT_STATUS.ISSUED;
  if (key === STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT) return STOCK_OUT_TRANSFER_STATUS.IN_TRANSIT;
  if (key === STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED) {
    return STOCK_OUT_TRANSFER_STATUS.PARTIALLY_TRANSFERRED;
  }
  if (key === STOCK_OUT_TRANSFER_STATUS.TRANSFERRED) return STOCK_OUT_TRANSFER_STATUS.TRANSFERRED;
  return key;
}

/** Map listview API row to stock-out table shape. */
export function mapStockOutListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const id = String(apiRow.id ?? '').trim();
  if (!id) return null;

  const dateIso = apiRow.date != null ? String(apiRow.date).slice(0, 10) : '';

  return {
    id,
    name: id,
    center: apiRow.source_center_name ?? apiRow.center ?? '',
    destinationCenter: apiRow.destination_center_name ?? apiRow.destination_center ?? '',
    department: apiRow.department ?? '',
    date: formatVendorRcDateDisplay(dateIso),
    dateIso,
    category: normalizeStockCategoryLabels(apiRow.category).join(', '),
    items: apiRow.items ?? 0,
    issuedQty: formatPoListQty(apiRow.issued_qty),
    issueMode: apiRow.issue_mode ?? '',
    perTransferred: apiRow.per_transferred ?? null,
    status: mapStockOutApiStatusLabel(resolveStockOutApiStatusRaw(apiRow), {
      issueMode: apiRow.issue_mode,
    }),
    stockImages: mapStockImagesFromApi(apiRow.stock_images),
  };
}

/** Build multipart form-data for stock-out listview. */
export function buildStockOutListFormData({
  keyword = '',
  centerFilter = [],
  departmentFilter = [],
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

  const departments = (Array.isArray(departmentFilter) ? departmentFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (departments.length === 1) {
    filters.push(['department', '=', departments[0]]);
  } else if (departments.length > 1) {
    filters.push(['department', 'in', departments]);
  }

  const statuses = (Array.isArray(statusFilter) ? statusFilter : []).filter(
    (value) => value && value !== STOCKS_FILTER_VALUE_ALL,
  );
  if (statuses.length === 1) {
    filters.push(['status', '=', mapStockOutStatusFilterToApi(statuses[0])]);
  } else if (statuses.length > 1) {
    filters.push(['status', 'in', statuses.map(mapStockOutStatusFilterToApi)]);
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

/** Parse grouped or flat listview response for Redux + table. */
export function parseStockOutListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = message?.group_by ?? '';

  if (groupBy && results.length > 0 && Array.isArray(results[0]?.entries)) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.entries) ? group.entries : [])
        .map(mapStockOutListItem)
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

  const rows = results.map(mapStockOutListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}

/** Build stock-out list table row from save response + form fallback. */
export function mapStockOutSaveToListRow(result, form) {
  if (!result?.id) return null;

  const data = result.data ?? {};
  const detail = result.detail ?? form ?? {};
  const entryDateIso =
    data.date != null
      ? String(data.date).slice(0, 10)
      : String(detail.entryDate ?? '').slice(0, 10);
  const filled = (detail.lineItems ?? []).filter((line) => String(line.product ?? '').trim());
  let issuedSum = Number(data.issued_qty);
  if (!Number.isFinite(issuedSum)) {
    issuedSum = 0;
    for (const line of filled) {
      const q = parseStockOutQty(line.issued);
      if (q != null) issuedSum += q;
    }
  }

  const issuedQty = issuedSum > 0 ? formatPoListQty(issuedSum) : '0';

  return {
    id: result.id,
    name: result.id,
    center: data.center_name ?? detail.center ?? '',
    department: data.department ?? detail.department ?? '',
    date: formatVendorRcDateDisplay(entryDateIso),
    dateIso: entryDateIso,
    category: normalizeStockCategoryLabels(data.category ?? detail.category).join(', '),
    items: data.items ?? filled.length,
    issuedQty,
    issueMode: data.issue_mode ?? detail.issueMode ?? '',
    status: result.status ?? STOCKS_STOCK_OUT_STATUS.DRAFT,
    detail: {
      ...detail,
      name: result.id,
      entryDate: entryDateIso,
    },
  };
}
