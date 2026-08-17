import {
  filterStocksUploadFiles,
  postStocksMultipartRequest,
} from '@/components/stocks/shared/api/multipart-api';
import { mapStockActivityToHistory } from '@/components/stocks/shared/stock-activity';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';

import { STOCKS_VENDOR_RC_STATUS } from '@/components/stocks/constants';

const VENDOR_RC_EXPIRING_SOON_DAYS = 14;

function resolveVendorRcStatus(apiRow) {
  const fromApi = String(apiRow?.status ?? '').trim();
  if (fromApi) return fromApi;
  return deriveVendorRcStatus(apiRow?.from_date, apiRow?.to_date);
}

function deriveVendorRcStatus(fromDate, toDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = toDate ? new Date(String(toDate)) : null;
  if (!end || Number.isNaN(end.getTime())) {
    return STOCKS_VENDOR_RC_STATUS.ACTIVE;
  }
  end.setHours(0, 0, 0, 0);
  if (end < today) return STOCKS_VENDOR_RC_STATUS.EXPIRED;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((end - today) / msPerDay);
  if (daysLeft <= VENDOR_RC_EXPIRING_SOON_DAYS) return STOCKS_VENDOR_RC_STATUS.EXPIRING_SOON;
  return STOCKS_VENDOR_RC_STATUS.ACTIVE;
}

export function mapVendorRcGroupByToApi(groupBy) {
  if (!groupBy) return '';
  if (groupBy === 'category') return 'item_group';
  return groupBy;
}

export function filterVendorRcUploadFiles(files) {
  return filterStocksUploadFiles(files);
}

export async function postVendorRcRequest(endpoint, payload, files) {
  return postStocksMultipartRequest(endpoint, payload, files);
}

export function parseVendorRcMutationResponse(result) {
  const message = result?.message ?? result ?? {};
  const data = message?.data ?? message;
  const activity = Array.isArray(message?.activity) ? message.activity : [];
  const row = mapVendorRcDetailToRow(data, activity);
  return { row, activity: row?.activityLog ?? [] };
}

export function mapCategoryItemToVendorRcDraftRow(item) {
  const itemCode = item?.name ?? item?.item_code ?? '';
  return {
    id: `vrc-li-${itemCode || Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    itemCode,
    product: item?.item_name || itemCode,
    rcRate: '',
    taxPercent: '',
    effectiveRate: '',
    moq: '',
    remark: '',
  };
}

/** Map Supplier resource row to select option (`name` = value, `supplier_name` = label). */
export function mapSupplierToVendorRcOption(row) {
  if (!row || typeof row !== 'object') return null;
  const value = row.name ?? '';
  if (!value) return null;
  return {
    value,
    label: row.supplier_name || value,
  };
}

/** Map center listview row to multi-select option. */
export function mapCenterToVendorRcOption(row) {
  if (!row || typeof row !== 'object') return null;
  const value = row.name ?? '';
  if (!value) return null;
  return {
    value,
    label: row.center_name || value,
  };
}

/** Build body for `save_vendor_rate_contract`. */
export function buildSaveVendorRcPayload({
  supplier,
  category,
  centers,
  startDate,
  endDate,
  lineItems,
  notes,
}) {
  const supplierId = String(supplier ?? '').trim();
  const categoryLabel = String(category ?? '').trim();
  const fromDate = String(startDate ?? '').trim();
  const toDate = String(endDate ?? '').trim();
  const centerList = (Array.isArray(centers) ? centers : [])
    .map((c) => String(c).trim())
    .filter(Boolean);

  if (!supplierId || !categoryLabel || !fromDate || !toDate || centerList.length === 0) {
    return null;
  }

  const items = (Array.isArray(lineItems) ? lineItems : [])
    .map((row) => {
      const itemCode = String(row?.itemCode ?? row?.product ?? '').trim();
      if (!itemCode) return null;
      return {
        item_code: itemCode,
        rate: Number(row.rcRate) || 0,
        tax: Number(row.taxPercent) || 0,
        moq: Number(row.moq) || 0,
        remarks: String(row.remark ?? '').trim(),
      };
    })
    .filter(Boolean);

  if (items.length === 0) return null;

  const body = {
    supplier: supplierId,
    custom_categories: categoryLabel,
    from_date: fromDate,
    to_date: toDate,
    center: centerList,
    items,
  };

  const terms = String(notes ?? '').trim();
  if (terms) body.terms = terms;

  return body;
}

/** Map `get_items_of_category` row to create-modal draft line. */
export function mapVendorRcDetailLineItem(apiItem) {
  if (!apiItem || typeof apiItem !== 'object') return null;
  const itemCode = apiItem.item_code ?? '';
  const rowId = apiItem.row_id ?? '';
  return {
    id: rowId || `vrc-li-${itemCode}`,
    rowId,
    itemCode,
    product: apiItem.item_name || itemCode,
    rcRate: apiItem.rate ?? '',
    taxPercent: apiItem.tax ?? '',
    effectiveRate: apiItem.effective_rate ?? '',
    moq: apiItem.moq ?? '',
    remark: apiItem.remarks ?? '',
  };
}

/** Map detail API `data` object to drawer row shape. */
export function mapVendorRcDetailToRow(data, activity = []) {
  if (!data || typeof data !== 'object') return null;

  const centers = Array.isArray(data.center) ? data.center : [];
  const centerIds = centers
    .map((entry) => {
      if (entry == null) return '';
      if (typeof entry === 'object') return entry.id || entry.name || '';
      return String(entry);
    })
    .filter(Boolean);

  const lineItems = (Array.isArray(data.items) ? data.items : [])
    .map(mapVendorRcDetailLineItem)
    .filter(Boolean);

  const documentPath = data.custom_document;
  const contractFileName =
    documentPath && typeof documentPath === 'string'
      ? documentPath.split('/').pop() || documentPath
      : '';

  return {
    ...data,
    id: data.name,
    vendor: data.supplier_name || data.supplier || '--',
    supplier: data.supplier || '',
    category: data.custom_categories || '',
    centerIds,
    centers: centerIds,
    productCount: lineItems.length,
    startDate: data.from_date || '',
    endDate: data.to_date || '',
    notes: data.terms || '',
    contractFileName,
    lineItems,
    activityLog: Array.isArray(activity)
      ? activity.map(mapVendorRcActivityEntry).filter(Boolean)
      : [],
  };
}

export function mapVendorRcActivityEntry(entry) {
  return mapStockActivityToHistory(entry);
}

/** Map UI line items to API `items` array for update. */
export function lineItemsToVendorRcApiItems(lineItems) {
  return (Array.isArray(lineItems) ? lineItems : [])
    .map((row) => {
      const itemCode = String(row?.itemCode ?? row?.product ?? '').trim();
      if (!itemCode) return null;
      const item = {
        item_code: itemCode,
        moq: Number(row.moq) || 0,
        rate: Number(row.rcRate) || 0,
        tax: Number(row.taxPercent) || 0,
        remarks: String(row.remark ?? '').trim(),
      };
      const rowId = String(row?.rowId ?? '').trim();
      if (rowId) item.row_id = rowId;
      return item;
    })
    .filter(Boolean);
}

/** Build body for `update_vendor_rate_contract` from partial UI updates. */
export function buildVendorRcUpdatePayload(contractName, updates) {
  const name = String(contractName ?? '').trim();
  if (!name || !updates || typeof updates !== 'object') return null;

  const body = { name };

  if (updates.category != null) body.custom_categories = String(updates.category).trim();
  if (updates.startDate != null) body.from_date = updates.startDate;
  if (updates.endDate != null) body.to_date = updates.endDate;
  if (updates.notes != null) body.terms = updates.notes;
  if (updates.supplier != null) body.supplier = String(updates.supplier).trim();
  if (updates.centerIds != null) {
    body.center = (Array.isArray(updates.centerIds) ? updates.centerIds : [])
      .map((c) => String(c).trim())
      .filter(Boolean);
  }
  if (updates.lineItems != null) {
    body.items = lineItemsToVendorRcApiItems(updates.lineItems);
    body.replace_items = 1;
  }
  if (updates.custom_document != null) body.custom_document = updates.custom_document;

  if (Object.keys(body).length <= 1) return null;
  return body;
}

/** Map listview API row to Vendor RC table / drawer shape. */
export function mapVendorRcListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;

  const centers = Array.isArray(apiRow.center)
    ? apiRow.center
        .map((entry) => {
          if (entry == null) return '';
          if (typeof entry === 'object') return entry.name || entry.id || '';
          return String(entry);
        })
        .filter(Boolean)
    : [];

  return {
    ...apiRow,
    id: apiRow.name,
    vendor: apiRow.supplier_name || apiRow.supplier || '--',
    category: apiRow.custom_categories || '--',
    centers,
    productCount: apiRow.item_count ?? apiRow.itemCount ?? null,
    startDate: apiRow.from_date || '',
    endDate: apiRow.to_date || '',
    status: resolveVendorRcStatus(apiRow),
    lineItems: [],
    notes: '',
    contractFileName: '',
    activityLog: [],
  };
}

/** Parse grouped or flat Vendor RC listview response. */
export function parseVendorRcListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = String(message?.group_by ?? message?.group_field ?? '').trim() || 'group';
  const isGroupedPayload =
    Boolean(message?.grouped) || (results.length > 0 && Array.isArray(results[0]?.entries));

  if (isGroupedPayload) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.entries) ? group.entries : [])
        .map(mapVendorRcListItem)
        .filter(Boolean);
      return {
        id: `${groupBy}-${String(group.group_key ?? index)
          .toLowerCase()
          .replaceAll(/\s+/g, '-')}`,
        groupName: String(groupName),
        rows,
        count: group.item_count ?? group.entry_count ?? rows.length,
      };
    });
    return {
      rows: groups.flatMap((section) => section.rows),
      groups,
      isGrouped: true,
    };
  }

  const rawData = Array.isArray(message?.data) ? message.data : [];
  const rows = rawData.map(mapVendorRcListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}

/**
 * Build multipart form-data body for vendor RC listview (Postman-style flat fields).
 */
export function buildVendorRcListFormData({
  keyword,
  categoryFilter,
  statusFilter = [],
  page,
  pageSize,
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

  const categories = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (v) => v && v !== STOCKS_FILTER_VALUE_ALL,
  );
  if (categories.length === 1) {
    filters.push(['item_group', '=', categories[0]]);
  } else if (categories.length > 1) {
    filters.push(['item_group', 'in', categories]);
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

  const apiGroupBy = mapVendorRcGroupByToApi(groupBy);
  if (apiGroupBy) {
    const direction = groupOrder === 'desc' ? 'desc' : 'asc';
    formData.append('group_by', `${apiGroupBy} ${direction}`);
  }

  formData.append('order_by', String(orderBy || 'modified desc').trim() || 'modified desc');

  return formData;
}
