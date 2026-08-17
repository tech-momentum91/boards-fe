import {
  mapProductMasterGroupByToApi,
  mapStockRulesGroupByToApi,
} from '@/components/stocks/hooks/stocks-listview-mappers';
import { STOCKS_FILTER_VALUE_ALL } from '@/components/stocks/shared/constants';

export function formatRupeeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value == null || value === '' ? '--' : String(value);
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Map API list row to table row shape (display keys used by ProductMasterTable). */
export function mapProductMasterListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;
  const disabled = apiRow.disabled;
  const createdAt = apiRow.creation ? new Date(apiRow.creation).toLocaleDateString('en-GB') : '--';
  const modifiedAt = apiRow.modified
    ? new Date(apiRow.modified).toLocaleDateString('en-GB')
    : createdAt;

  return {
    ...apiRow,
    id: apiRow.name ?? apiRow.item_code,
    product: apiRow.item_name,
    category: apiRow.item_group,
    unit: apiRow.stock_uom,
    type: apiRow.custom_type,
    price: formatRupeeAmount(apiRow.price ?? apiRow.purchase_price ?? apiRow.market_price),
    // Legacy aliases — same unified stock price.
    marketPrice: formatRupeeAmount(apiRow.price ?? apiRow.market_price ?? apiRow.purchase_price),
    purchasePrice: formatRupeeAmount(apiRow.price ?? apiRow.purchase_price ?? apiRow.market_price),
    status: Number(disabled) === 1 ? 'Disabled' : 'Active',
    createBy: apiRow.owner || '--',
    createAt: createdAt,
    lastModifiedAt: modifiedAt,
    oemCompany: apiRow.custom_oem || '',
    notes: apiRow.description || '',
    product_images: Array.isArray(apiRow.product_images)
      ? apiRow.product_images
      : Array.isArray(apiRow.custom_product_images)
        ? apiRow.custom_product_images
        : [],
    suppliers: Array.isArray(apiRow.suppliers) ? apiRow.suppliers : [],
  };
}

/** Parse display or raw amount to number for API (Item Price). */
export function parseProductMasterPrice(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const s = String(value).replaceAll('₹', '').replaceAll(',', '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function buildProductMasterSuppliersPayload(suppliers) {
  if (!Array.isArray(suppliers)) return [];
  return suppliers
    .map((supplier) => {
      const supplierId = String(supplier?.supplier ?? '').trim();
      if (!supplierId) return null;
      return {
        supplier: supplierId,
        custom_default: Number(supplier?.custom_default) === 1 ? 1 : 0,
      };
    })
    .filter(Boolean);
}

/**
 * Build JSON body for `update_product_master` from view-drawer display fields.
 * `name` is the Item name / item_code (mandatory).
 */
export function buildProductMasterUpdatePayload(itemCode, updates) {
  const name = String(itemCode ?? '').trim();
  if (!name || !updates || typeof updates !== 'object') return null;

  const body = { name };
  if (updates.product != null) body.item_name = String(updates.product).trim();
  if (updates.category != null) body.item_group = updates.category;
  if (updates.unit != null) body.stock_uom = updates.unit;
  if (updates.brand != null) body.brand = String(updates.brand).trim();
  if (updates.oemCompany != null) body.custom_oem = String(updates.oemCompany).trim();
  if (updates.notes != null) body.description = String(updates.notes).trim();
  if (updates.type != null) body.custom_type = updates.type;
  if (updates.status != null) {
    const normalizedStatus = String(updates.status).trim().toLowerCase();
    body.disabled = normalizedStatus === 'disabled' || normalizedStatus === 'inactive' ? 1 : 0;
  }

  const price = parseProductMasterPrice(
    updates.price ?? updates.marketPrice ?? updates.purchasePrice,
  );
  if (price !== undefined) {
    body.price = price;
    body.market_price = price;
    body.purchase_price = price;
  }
  if (updates.suppliers != null) {
    body.suppliers = buildProductMasterSuppliersPayload(updates.suppliers);
  }

  return body;
}

/** ERPNext Check / int flag → boolean (handles 0, 1, "0", "1"). */
export function parseStockRuleBooleanFlag(value) {
  return Number(value) === 1;
}

/** UI / API boolean flag → ERPNext Check int (0 or 1). */
export function toStockRuleBooleanApiFlag(value) {
  return parseStockRuleBooleanFlag(value) ? 1 : 0;
}

/** Resolve center label for stock rule list/detail rows. */
export function getStockRuleCenterLabel(row = {}) {
  const centerName = String(row.center_name ?? '').trim();
  const warehouseName = String(row.warehouse_name ?? '').trim();
  const mappedCenter = String(row.center ?? '').trim();
  if (centerName) return centerName;
  if (mappedCenter && mappedCenter !== '--') return mappedCenter;
  if (warehouseName) return warehouseName;
  return '';
}

/** Map listview API row to table row shape used by StockRulesTable. */
export function mapStockRuleListItem(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null;
  const centerLabel = getStockRuleCenterLabel(apiRow);
  return {
    ...apiRow,
    row_id: apiRow.row_id,
    id: apiRow.row_id ?? apiRow.name,
    center: centerLabel || '--',
    center_name: apiRow.center_name || centerLabel || '',
    category: apiRow.item_group || '--',
    product: apiRow.item_name || apiRow.item_code || apiRow.item || '--',
    unit: apiRow.stock_uom || '--',
    min: apiRow.custom_min_level ?? '',
    trigger: apiRow.warehouse_reorder_level ?? '',
    target: apiRow.custom_max_value ?? '',
    reorderQty: apiRow.warehouse_reorder_qty ?? '',
    consumption: apiRow.custom_consumption || '',
    frequency: apiRow.custom_frequency || '',
    critical: parseStockRuleBooleanFlag(apiRow.custom_critical),
    fifo: parseStockRuleBooleanFlag(apiRow.custom_fifo),
    notes: apiRow.description || '',
  };
}

/** Map `get_items_of_category` row to create-modal draft line. */
export function mapCategoryItemToStockRuleDraftRow(item, category) {
  const itemId = item?.name ?? item?.item_code ?? '';
  return {
    draftKey: itemId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    product: item?.item_name || itemId,
    productValue: itemId,
    category: category || '',
    unit: item?.stock_uom || '',
    min: '',
    trigger: '',
    target: '',
    consumption: '',
    frequency: '',
    critical: false,
    fifo: false,
  };
}

/** Build body for `save_stock_rules` from create-modal state. */
export function buildSaveStockRulesPayload({ centers, itemGroup, ruleRows }) {
  const centerList = (Array.isArray(centers) ? centers : [])
    .map((c) => String(c).trim())
    .filter(Boolean);
  const group = String(itemGroup ?? '').trim();
  if (centerList.length === 0 || !group) return null;

  const items = (Array.isArray(ruleRows) ? ruleRows : [])
    .filter((row) => String(row?.productValue ?? '').trim())
    .map((row) => ({
      item: String(row.productValue).trim(),
      custom_min_level: Number(row.min) || 0,
      warehouse_reorder_level: Number(row.trigger) || 0,
      custom_max_value: Number(row.target) || 0,
      warehouse_reorder_qty: Number(row.reorderQty ?? row.target) || 0,
      custom_consumption: String(row.consumption ?? '').trim(),
      custom_frequency: String(row.frequency ?? '').trim(),
      custom_critical: toStockRuleBooleanApiFlag(row.critical),
      custom_fifo: toStockRuleBooleanApiFlag(row.fifo),
    }));

  if (items.length === 0) return null;

  return {
    centers: centerList,
    item_group: group,
    items,
  };
}

/** Build body for `update_stock_rule` from view-drawer display fields (`row_id` required). */
export function buildStockRuleUpdatePayload(rowId, updates) {
  const id = String(rowId ?? '').trim();
  if (!id || !updates || typeof updates !== 'object') return null;

  const body = { row_id: id };

  if (updates.min != null) body.custom_min_level = Number(updates.min) || 0;
  if (updates.trigger != null) body.warehouse_reorder_level = Number(updates.trigger) || 0;
  if (updates.target != null) body.custom_max_value = Number(updates.target) || 0;
  if (updates.reorderQty != null) body.warehouse_reorder_qty = Number(updates.reorderQty) || 0;
  if (updates.consumption != null) {
    body.custom_consumption = String(updates.consumption).trim();
  }
  if (updates.frequency != null) body.custom_frequency = String(updates.frequency).trim();
  if (updates.critical != null) body.custom_critical = toStockRuleBooleanApiFlag(updates.critical);
  if (updates.fifo != null) body.custom_fifo = toStockRuleBooleanApiFlag(updates.fifo);
  if (updates.notes != null) body.description = String(updates.notes).trim();

  if (Object.keys(body).length <= 1) return null;
  return body;
}

export function buildStockRulesListRequestBody({
  keyword = '',
  categoryFilter,
  page,
  pageSize,
  orderBy,
  groupBy = '',
  groupOrder = 'asc',
}) {
  const body = { page, page_size: pageSize };
  const kw = String(keyword ?? '').trim();
  if (kw) body.keyword = kw;
  const groups = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (v) => v && v !== STOCKS_FILTER_VALUE_ALL,
  );
  if (groups.length === 1) {
    body.filters = JSON.stringify([['item_group', '=', groups[0]]]);
  } else if (groups.length > 1) {
    body.filters = JSON.stringify([['item_group', 'in', groups]]);
  }
  const apiGroup = mapStockRulesGroupByToApi(groupBy);
  if (apiGroup) {
    const direction = groupOrder === 'desc' ? 'desc' : 'asc';
    body.group_by = `${apiGroup} ${direction}`;
  }
  const order = String(orderBy ?? '').trim();
  if (order) body.order_by = order;
  return body;
}

export function buildListRequestBody({
  keyword,
  categoryFilter,
  page,
  pageSize,
  orderBy,
  groupBy = '',
  groupOrder = 'asc',
}) {
  const body = {
    keyword: (keyword ?? '').trim(),
    page,
    page_size: pageSize,
  };

  const groups = (Array.isArray(categoryFilter) ? categoryFilter : []).filter(
    (v) => v && v !== STOCKS_FILTER_VALUE_ALL,
  );

  if (groups.length === 1) {
    body.item_group = groups[0];
  } else if (groups.length > 1) {
    body.filters = JSON.stringify([['item_group', 'in', groups]]);
  }

  const apiGroup = mapProductMasterGroupByToApi(groupBy);
  if (apiGroup) {
    const direction = groupOrder === 'desc' ? 'desc' : 'asc';
    body.group_by = `${apiGroup} ${direction}`;
  }

  const order = String(orderBy ?? '').trim();
  if (order) body.order_by = order;

  return body;
}

function slugifyGroupKey(groupKey, index) {
  return String(groupKey ?? index)
    .toLowerCase()
    .replaceAll(/\s+/g, '-');
}

/** Parse grouped or flat Product Master listview response. */
export function parseProductMasterListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  // Backend grouped payloads may omit `group_by`; detect by nested `items`.
  const groupBy = String(message?.group_by ?? message?.group_field ?? '').trim() || 'group';
  const isGroupedPayload =
    Boolean(message?.grouped) || (results.length > 0 && Array.isArray(results[0]?.items));

  if (isGroupedPayload) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.items) ? group.items : [])
        .map(mapProductMasterListItem)
        .filter(Boolean);
      return {
        id: `${groupBy}-${slugifyGroupKey(group.group_key, index)}`,
        groupName: String(groupName),
        rows,
        count: group.item_count ?? rows.length,
      };
    });
    return {
      rows: groups.flatMap((section) => section.rows),
      groups,
      isGrouped: true,
    };
  }

  const rows = results.map(mapProductMasterListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}

/** Parse grouped or flat Stock Rules listview response. */
export function parseStockRulesListMessage(message) {
  const results = Array.isArray(message?.results) ? message.results : [];
  const groupBy = String(message?.group_by ?? message?.group_field ?? '').trim() || 'group';
  const isGroupedPayload =
    Boolean(message?.grouped) || (results.length > 0 && Array.isArray(results[0]?.items));

  if (isGroupedPayload) {
    const groups = results.map((group, index) => {
      const groupName = group.group_label ?? group.group_key ?? 'Unassigned';
      const rows = (Array.isArray(group.items) ? group.items : [])
        .map(mapStockRuleListItem)
        .filter(Boolean);
      return {
        id: `${groupBy}-${slugifyGroupKey(group.group_key, index)}`,
        groupName: String(groupName),
        rows,
        count: group.item_count ?? rows.length,
      };
    });
    return {
      rows: groups.flatMap((section) => section.rows),
      groups,
      isGrouped: true,
    };
  }

  const rows = results.map(mapStockRuleListItem).filter(Boolean);
  return { rows, groups: [], isGrouped: false };
}
