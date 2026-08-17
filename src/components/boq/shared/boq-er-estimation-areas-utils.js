const normalizeFloor = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export const resolveErProductName = (product) =>
  String(product?.product || product?.item || '').trim();

const floorsMatch = (left, right) => normalizeFloor(left) === normalizeFloor(right);

export function filterProjectAreasForFloor(projectAreas = [], floor) {
  if (!floor) return [];
  return (Array.isArray(projectAreas) ? projectAreas : []).filter((area) =>
    floorsMatch(area?.floor ?? area?.floorLabel, floor),
  );
}

function buildAreaGroupKey(subareaName) {
  return String(subareaName || '')
    .trim()
    .toLowerCase();
}

/**
 * Match a floor-plan layout annotation to an ER accordion area section.
 * Prefers stable ids, then falls back to normalized area labels.
 */
export function matchErAreaFromLayoutAnnotation(areas = [], annotation) {
  if (!annotation || !Array.isArray(areas) || areas.length === 0) return null;

  const candidateIds = [
    annotation.area_ref,
    annotation.area?.area_id,
    annotation.area?.name,
    annotation.id,
    annotation.task?.area_id,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  for (const candidateId of candidateIds) {
    const matchedById = areas.find((area) => String(area.id ?? '').trim() === candidateId);
    if (matchedById) return matchedById;
  }

  const labelKey = buildAreaGroupKey(
    annotation.area_label ??
      annotation.label ??
      annotation.area?.area_label ??
      annotation.task?.area_label ??
      '',
  );
  if (!labelKey) return null;

  return (
    areas.find(
      (area) => buildAreaGroupKey(area.subareaName || area.areaLabel || area.name) === labelKey,
    ) ?? null
  );
}

export const BOQ_ER_LAYOUT_AREA_COLOR = '#2563eb';

function groupEstimationItemsBySubarea(record) {
  const map = new Map();
  // Record is already one product row — label filtering hid valid lines.
  for (const item of record?.items || []) {
    const subareaName = (item.subareaName || item.subarea_name || '').trim();
    const key = buildAreaGroupKey(subareaName);
    if (!subareaName) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function resolveErProductImageUrl(product, estItem) {
  const fromItem = String(estItem?.itemImageUrl ?? estItem?.imageUrl ?? '').trim();
  if (fromItem) return fromItem;
  return String(product?.imageUrl ?? product?.image ?? '').trim() || null;
}

function mapEstimationItemToRow(subareaName, estItem, product, recordName) {
  const productName = resolveErProductName(product);
  return {
    id: estItem?.name || `${subareaName}-${estItem?.idx ?? 0}`,
    recordName: recordName || '',
    subareaName,
    areaType: String(estItem?.areaType ?? estItem?.area_type ?? ''),
    item: (estItem?.item || productName || '').trim(),
    itemImageUrl: resolveErProductImageUrl(product, estItem),
    uom: estItem?.uom || product?.units || '',
    length: String(estItem?.length ?? 0),
    breadth: String(estItem?.breadth ?? 0),
    height: String(estItem?.height ?? 0),
    qty: String(estItem?.qty ?? 0),
  };
}

function buildAreaSection({
  subareaName,
  areaId,
  estItems = [],
  product,
  floor,
  recordName,
  index,
}) {
  return {
    id: areaId || buildAreaGroupKey(subareaName) || `${subareaName}-${index}`,
    name: subareaName,
    subareaName,
    areaLabel: subareaName,
    floor,
    recordName,
    expanded: index === 0,
    items: estItems.map((estItem) =>
      mapEstimationItemToRow(subareaName, estItem, product, recordName),
    ),
  };
}

/**
 * Build ER estimation accordion areas for a floor.
 * Grouped by subarea name; subarea name (area_type) is edited in the table.
 */
export function buildErAreasForFloor(records = [], floor, product = null, projectAreas = []) {
  const record = findErEstimationRecordForFloor(records, floor, product);
  const itemsByGroup = groupEstimationItemsBySubarea(record);
  const floorAreas = filterProjectAreasForFloor(projectAreas, floor);

  if (floorAreas.length === 0) {
    return buildErAreasFromEstimationRecord(record, product, floor);
  }

  const areas = floorAreas.map((area, index) => {
    const subareaName =
      String(area.areaLabel || area.area_label || area.label || '').trim() || 'Area';
    const areaId = area.areaId || area.area_id || area.name || buildAreaGroupKey(subareaName);
    const estItems = itemsByGroup.get(buildAreaGroupKey(subareaName)) || [];

    return buildAreaSection({
      subareaName,
      areaId,
      estItems,
      product,
      floor,
      recordName: record?.name || '',
      index,
    });
  });

  const knownKeys = new Set(
    areas.map((area) => buildAreaGroupKey(area.subareaName || area.areaLabel || area.name)),
  );

  // Include ER subareas not yet in project layout (e.g. Lumpsum created from product-table qty).
  for (const [key, estItems] of itemsByGroup.entries()) {
    if (knownKeys.has(key) || estItems.length === 0) continue;

    const subareaName = String(estItems[0]?.subareaName || estItems[0]?.subarea_name || '').trim();
    if (!subareaName) continue;

    areas.push(
      buildAreaSection({
        subareaName,
        areaId: buildAreaGroupKey(subareaName),
        estItems,
        product,
        floor,
        recordName: record?.name || '',
        index: areas.length,
      }),
    );
    knownKeys.add(key);
  }

  return areas;
}

/**
 * Fallback when project areas are unavailable — uses estimation record items.
 */
export function buildErAreasFromEstimationRecord(record, product = null, floor = '') {
  const items = Array.isArray(record?.items) ? record.items : [];
  if (items.length === 0) return [];

  const grouped = new Map();
  for (const item of items) {
    const subareaName = (item.subareaName || item.subarea_name || '').trim() || 'Area';
    const key = buildAreaGroupKey(subareaName);
    if (!grouped.has(key)) grouped.set(key, { subareaName, items: [] });
    grouped.get(key).items.push(item);
  }

  return [...grouped.values()].map((group, index) =>
    buildAreaSection({
      subareaName: group.subareaName,
      areaId: group.items[0]?.name || buildAreaGroupKey(group.subareaName),
      estItems: group.items,
      product,
      floor: floor || record?.floor || '',
      recordName: record?.name || '',
      index,
    }),
  );
}

export function findErEstimationRecordForFloor(records = [], floor, product = null) {
  if (!floor) return null;
  const productRowId = String(product?.id || product?.name || '').trim();
  return (
    (Array.isArray(records) ? records : []).find((record) => {
      if (!floorsMatch(record.floor, floor)) return false;
      if (!productRowId) return true;
      const recordRowId = String(record.boqItemRowId || record.boq_item_row_id || '').trim();
      return !recordRowId || recordRowId === productRowId;
    }) ?? null
  );
}

export function sumEstimationItemQty(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0,
  );
}

export function parseErDimensionNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** True when L, B, and H are all empty/zero — Qty may be entered directly. */
export function areErItemDimensionsEmpty(item) {
  return (
    parseErDimensionNumber(item?.length) === 0 &&
    parseErDimensionNumber(item?.breadth) === 0 &&
    parseErDimensionNumber(item?.height) === 0
  );
}

/** Qty is derived as length × breadth × height when any dimension is set; missing dimensions count as 1. */
export function computeErItemQtyFromDimensions(length, breadth, height) {
  const parsedLength = parseErDimensionNumber(length);
  const parsedBreadth = parseErDimensionNumber(breadth);
  const parsedHeight = parseErDimensionNumber(height);

  if (parsedLength === 0 && parsedBreadth === 0 && parsedHeight === 0) {
    return 0;
  }

  const effectiveLength = parsedLength === 0 ? 1 : parsedLength;
  const effectiveBreadth = parsedBreadth === 0 ? 1 : parsedBreadth;
  const effectiveHeight = parsedHeight === 0 ? 1 : parsedHeight;

  return effectiveLength * effectiveBreadth * effectiveHeight;
}

export function getErMeasurementLineQty(item) {
  if (areErItemDimensionsEmpty(item)) {
    return parseErDimensionNumber(item?.qty);
  }
  return computeErItemQtyFromDimensions(item?.length, item?.breadth, item?.height);
}

/** True when the line has no PO item selected yet. */
export function isMrLineItemEmpty(item) {
  const purchaseOrderItem = String(item?.purchaseOrderItem ?? '').trim();
  const poItemName = String(item?.poItemName ?? '').trim();
  return !purchaseOrderItem && !poItemName;
}

/** True when ER/MR line has no quantity entered (direct qty or derived from dimensions). */
export function isErMeasurementLineItemEmpty(item) {
  return getErMeasurementLineQty(item) === 0;
}

export function hasIncompleteMeasurementLineItems(items = [], { variant = 'er' } = {}) {
  const isEmpty = variant === 'mr' ? isMrLineItemEmpty : isErMeasurementLineItemEmpty;
  return (Array.isArray(items) ? items : []).some(isEmpty);
}

export function computeErEstimationAllQty(record) {
  if (!record) return 0;
  const items = record.items || [];
  if (items.length > 0) return sumEstimationItemQty(items);
  return Number(record.allQty ?? record.all_qty) || 0;
}

export function formatErQuantityNumber(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return Math.round(amount).toLocaleString('en-IN');
}

export function buildErFloorQuantityLabel(floor, records = [], product = null) {
  const floorLabel = String(floor || '').trim() || 'Floor';
  const record = findErEstimationRecordForFloor(records, floor, product);
  const total = computeErEstimationAllQty(record);
  return `${floorLabel} - ${formatErQuantityNumber(total)}`;
}

export function withUpdatedEstimationAllQty(record) {
  if (!record) return record;
  const items = record.items || [];
  return {
    ...record,
    allQty: sumEstimationItemQty(items),
  };
}

/**
 * Build product-table quantityByFloor entries from ER records (floor → all_qty).
 * Used when closing the ER modal so the products table shows fresh totals.
 */
export function buildQuantityByFloorFromEstimationRecords(
  records = [],
  floors = [],
  product = null,
) {
  const floorLabels =
    Array.isArray(floors) && floors.length > 0
      ? floors
      : (Array.isArray(records) ? records : []).map((record) => record?.floor);

  const uniqueFloors = [];
  const seen = new Set();
  for (const floor of floorLabels) {
    const label = String(floor ?? '').trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueFloors.push(label);
  }

  return uniqueFloors.map((floor) => ({
    floor,
    value: computeErEstimationAllQty(findErEstimationRecordForFloor(records, floor, product)),
  }));
}

export function mergeEstimationRecord(records = [], nextRecord) {
  if (!nextRecord?.name) return records;
  const next = Array.isArray(records) ? [...records] : [];
  const index = next.findIndex((record) => record.name === nextRecord.name);
  if (index === -1) next.push(nextRecord);
  else next[index] = nextRecord;
  return next;
}
