import {
  formatBoqRupeeAmount,
  groupBoqProductMasterProductsBySection,
} from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import {
  BOQ_DEFAULT_PRODUCT_SECTION,
  PROJECT_BOQ_DEFAULT_AREA_LOCATION,
} from '@/components/boq/constants';
import { resolveProjectBoqAreaLocation } from '@/components/boq/boq-helper';
import { getProductCategoryGroupLabel } from '@/components/products/product-category-utils';

const CATEGORY_META = {
  'civil-works': { label: 'Civil Works', letter: 'A' },
  'plumbing-works': { label: 'Plumbing Works', letter: 'B' },
  'loose-furniture': { label: 'Loose Furniture', letter: 'C' },
  'electrical-works': { label: 'Electrical Works', letter: 'D' },
};

function parseBoqTemplateQuantityString(quantity) {
  const raw = String(quantity ?? '').trim();
  const separatorIndex = raw.lastIndexOf(' - ');
  if (separatorIndex === -1) return { floor: '', total: 0 };

  const floor = raw.slice(0, separatorIndex).trim();
  const total = Number.parseFloat(raw.slice(separatorIndex + 3).replaceAll(',', '')) || 0;

  return { floor, total };
}

export function getBoqTemplateQuantityByFloor(row) {
  if (Array.isArray(row?.quantityByFloor) && row.quantityByFloor.length > 0) {
    return row.quantityByFloor.map((entry) => ({
      floor: String(entry.floor ?? '').trim(),
      value: entry.value ?? entry.quantity ?? '',
    }));
  }

  const { floor, total } = parseBoqTemplateQuantityString(row?.quantity);
  if (!floor) return [];

  return [{ floor, value: total }];
}

export function mergeProjectFloorsWithQuantity(projectFloors = [], quantityByFloor = []) {
  const existing = new Map();
  for (const entry of Array.isArray(quantityByFloor) ? quantityByFloor : []) {
    const floor = String(entry?.floor ?? '').trim();
    if (!floor) continue;
    existing.set(floor, entry.value ?? entry.quantity ?? '');
  }

  const floors = Array.isArray(projectFloors) ? projectFloors : [];
  if (floors.length === 0) {
    return [...existing.entries()].map(([floor, value]) => ({ floor, value }));
  }

  return floors.map((floor) => {
    const label = String(floor ?? '').trim();
    return { floor: label, value: existing.get(label) ?? '' };
  });
}

export function buildProjectBoqAreaLocationOptions(projectAreas = []) {
  const labels = new Set([PROJECT_BOQ_DEFAULT_AREA_LOCATION]);

  for (const area of Array.isArray(projectAreas) ? projectAreas : []) {
    const label = String(area?.areaLabel ?? area?.area_label ?? area?.label ?? '').trim();
    if (label) labels.add(label);
  }

  return [...labels].map((label) => ({ value: label, label }));
}

export function parseProjectBoqAreaLocations(value) {
  if (Array.isArray(value)) {
    const areas = value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
    return areas.length > 0 ? areas : [PROJECT_BOQ_DEFAULT_AREA_LOCATION];
  }

  const trimmed = String(value ?? '').trim();
  if (!trimmed) return [PROJECT_BOQ_DEFAULT_AREA_LOCATION];

  const areas = trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return areas.length > 0 ? areas : [PROJECT_BOQ_DEFAULT_AREA_LOCATION];
}

export function formatProjectBoqAreaLocations(areas) {
  const list = (Array.isArray(areas) ? areas : [])
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean);

  if (list.length === 0) return PROJECT_BOQ_DEFAULT_AREA_LOCATION;

  const withoutDefault = list.filter((entry) => entry !== PROJECT_BOQ_DEFAULT_AREA_LOCATION);
  if (withoutDefault.length > 0) return withoutDefault.join(', ');
  return PROJECT_BOQ_DEFAULT_AREA_LOCATION;
}

/** Item codes already present on a BOQ (for product-master modal disable logic). */
export function buildBoqExistingItemCodeSet(products = []) {
  const codes = new Set();
  for (const row of Array.isArray(products) ? products : []) {
    for (const key of [row?.itemCode, row?.item, row?.id]) {
      const code = String(key ?? '').trim();
      if (code) codes.add(code);
    }
  }
  return codes;
}

export function isBoqProductAlreadyAdded(row = {}, existingItemCodes = new Set()) {
  if (!(existingItemCodes instanceof Set) || existingItemCodes.size === 0) return false;
  for (const key of [row?.itemCode, row?.item, row?.id]) {
    const code = String(key ?? '').trim();
    if (code && existingItemCodes.has(code)) return true;
  }
  return false;
}

export { resolveProjectBoqAreaLocation };

export function computeBoqTemplateQuantityTotal(floors) {
  return (Array.isArray(floors) ? floors : []).reduce((sum, entry) => {
    const numeric = Number.parseFloat(String(entry?.value ?? '').replaceAll(',', ''));
    return sum + (Number.isNaN(numeric) ? 0 : numeric);
  }, 0);
}

/** Total quantity for a BOQ product row (floors first, then plain quantity). */
export function resolveBoqProductQuantityTotal(row = {}) {
  const fromFloors = computeBoqTemplateQuantityTotal(getBoqTemplateQuantityByFloor(row));
  if (fromFloors > 0) return fromFloors;

  const raw = String(row?.quantity ?? '').trim();
  if (!raw) return 0;

  const plain = Number.parseFloat(raw.replaceAll(',', ''));
  return Number.isFinite(plain) && plain > 0 ? plain : 0;
}

/** Line amount = total quantity × unit rate (0 when either side is missing). */
export function computeBoqProductLineAmount(unitRate, row) {
  return (Number(unitRate) || 0) * resolveBoqProductQuantityTotal(row);
}

/** Sum unit rates without quantity — used for overview cost/sq.ft. */
export function computeBoqProductsRateTotals(products) {
  const items = Array.isArray(products) ? products : [];
  const buyTotal = items.reduce((sum, row) => {
    const rate = Number(row.purchaseRate);
    return sum + (Number.isFinite(rate) && rate > 0 ? rate : 0);
  }, 0);
  const sellTotal = items.reduce((sum, row) => {
    const rate = Number(row.sellingRate);
    return sum + (Number.isFinite(rate) && rate > 0 ? rate : 0);
  }, 0);

  return { buyTotal, sellTotal };
}

export function computeBoqProductsFinancialTotals(products) {
  const items = Array.isArray(products) ? products : [];
  const buyTotal = items.reduce(
    (sum, row) => sum + computeBoqProductLineAmount(row.purchaseRate, row),
    0,
  );
  const sellTotal = items.reduce(
    (sum, row) => sum + computeBoqProductLineAmount(row.sellingRate, row),
    0,
  );
  const marginPercent =
    sellTotal > 0 ? Math.round(((sellTotal - buyTotal) / sellTotal) * 10) / 10 : 0;
  const marginTotal = sellTotal - buyTotal;

  return { buyTotal, sellTotal, marginPercent, marginTotal };
}

/** Purchase BOQ section totals — includes raised PO value and pending buy balance. */
export function computePurchaseBoqFinancialTotals(products) {
  const items = Array.isArray(products) ? products : [];
  const base = computeBoqProductsFinancialTotals(items);
  const poTotal = items.reduce((sum, row) => sum + (Number(row.poValue) || 0), 0);
  const pendingTotal = Math.max(base.buyTotal - poTotal, 0);

  return {
    ...base,
    poTotal,
    pendingTotal,
  };
}

export function deriveBoqProductFloorsLabel(products = []) {
  const floorValues = new Set();

  for (const row of products) {
    for (const entry of getBoqTemplateQuantityByFloor(row)) {
      const floor = String(entry.floor ?? '').trim();
      if (floor) floorValues.add(floor);
    }
  }

  if (floorValues.size === 0) return '';

  const sorted = [...floorValues].sort((a, b) => {
    const numA = Number.parseInt(a.replaceAll(/\D/g, ''), 10);
    const numB = Number.parseInt(b.replaceAll(/\D/g, ''), 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const formatFloor = (value) => value.replace(/f$/i, '');

  if (sorted.length === 1) return `Floor ${formatFloor(sorted[0])}`;

  return `Floors ${formatFloor(sorted[0])}-${formatFloor(sorted[sorted.length - 1])}`;
}

export function formatBoqTemplateQuantityNumber(value) {
  const numeric = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  if (Number.isNaN(numeric)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(numeric);
}

export function splitBoqTemplateQuantityLabel(quantity) {
  const raw = String(quantity ?? '').trim();
  if (!raw) return { prefix: '--', suffix: '' };

  const separatorIndex = raw.lastIndexOf(' - ');
  if (separatorIndex === -1) return { prefix: raw, suffix: '' };

  return {
    prefix: raw.slice(0, separatorIndex + 3),
    suffix: raw.slice(separatorIndex + 3),
  };
}

export function formatBoqQuantityTotalLabel(units, total) {
  const unitLabel = String(units ?? 'units').toLowerCase();
  return `Total ${unitLabel} - ${formatBoqTemplateQuantityNumber(total)}`;
}

export function buildBoqTemplateQuantityLabel(floors) {
  const entries = Array.isArray(floors) ? floors.filter((entry) => entry?.floor) : [];
  if (entries.length === 0) return '--';

  const total = computeBoqTemplateQuantityTotal(entries);
  const primaryFloor =
    [...entries].sort(
      (a, b) =>
        (Number.parseFloat(String(b.value).replaceAll(',', '')) || 0) -
        (Number.parseFloat(String(a.value).replaceAll(',', '')) || 0),
    )[0]?.floor ?? entries[0].floor;

  return `${primaryFloor} - ${formatBoqTemplateQuantityNumber(total)}`;
}

function resolveBoqProductSectionKey(row, sectionField = 'section') {
  const fromField = String(row?.[sectionField] ?? '').trim();

  // Purchase BOQ sections group by 3rd-level category (product group).
  if (sectionField === 'purchaseCategory') {
    const groupLabel = getProductCategoryGroupLabel(fromField);
    if (groupLabel) return groupLabel;

    const fallbackPath = String(row?.boqCategory || row?.section || row?.productGroup || '').trim();
    return getProductCategoryGroupLabel(fallbackPath) || BOQ_DEFAULT_PRODUCT_SECTION;
  }

  if (fromField) return fromField;

  const fallback = String(
    row?.purchaseCategory || row?.boqCategory || row?.section || row?.productGroup || '',
  ).trim();
  return fallback || BOQ_DEFAULT_PRODUCT_SECTION;
}

function groupBoqProductsBySectionField(products, sectionField = 'section', totalsFn) {
  const computeTotals = totalsFn ?? computeBoqProductsFinancialTotals;
  const groups = new Map();

  for (const row of Array.isArray(products) ? products : []) {
    const key = resolveBoqProductSectionKey(row, sectionField);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.entries()]
    .map(([section, items]) => ({
      section,
      products: items,
      ...computeTotals(items),
    }))
    .sort((a, b) => a.section.localeCompare(b.section, undefined, { sensitivity: 'base' }));
}

/**
 * Group products for BOQ listings.
 * @param {object} [options]
 * @param {string} [options.sectionField='section'] Field used for collapsible section headers
 *   (e.g. `purchaseCategory` for Purchase BOQ).
 * @param {boolean} [options.groupBySectionOnly=false] Skip outer categoryType buckets and
 *   return a single category with sections only.
 * @param {boolean} [options.usePurchaseBoqTotals=false] Include PO value / pending totals on sections.
 */
export function groupBoqTemplateProductsByCategory(products, options = {}) {
  const sectionField = options.sectionField ?? 'section';
  const groupBySectionOnly = Boolean(options.groupBySectionOnly);
  const usePurchaseBoqTotals = Boolean(options.usePurchaseBoqTotals);
  const totalsFn = usePurchaseBoqTotals
    ? computePurchaseBoqFinancialTotals
    : computeBoqProductsFinancialTotals;
  const items = Array.isArray(products) ? products : [];

  if (groupBySectionOnly) {
    let sections = groupBoqProductsBySectionField(items, sectionField, totalsFn);
    // Empty Purchase BOQ still needs a default section so "Add a product" is available.
    if (sections.length === 0) {
      sections = [
        {
          section: BOQ_DEFAULT_PRODUCT_SECTION,
          products: [],
          ...totalsFn([]),
        },
      ];
    }
    const categoryTotals = totalsFn(items);

    return [
      {
        categoryId: 'all',
        label: 'All',
        letter: 'A',
        products: items,
        marginPercent: categoryTotals.marginPercent,
        marginTotal: categoryTotals.marginTotal,
        buyTotal: categoryTotals.buyTotal,
        sellTotal: categoryTotals.sellTotal,
        poTotal: categoryTotals.poTotal,
        pendingTotal: categoryTotals.pendingTotal,
        sections,
      },
    ];
  }

  const categoryMap = new Map();

  for (const row of items) {
    const categoryId =
      String(row.categoryId || row.categoryType || row.categoryGroup || 'other').trim() || 'other';
    if (!categoryMap.has(categoryId)) {
      const meta = CATEGORY_META[categoryId];
      // Use || (not ??): empty categoryType must fall through to categoryId / API label.
      const label =
        String(
          meta?.label || row.categoryType || row.categoryLabel || categoryId || row.categoryGroup,
        ).trim() || 'Other';
      const letter = String(
        meta?.letter || row.categoryLetter || label.charAt(0) || categoryId.charAt(0) || 'A',
      )
        .charAt(0)
        .toUpperCase();
      categoryMap.set(categoryId, {
        categoryId,
        label,
        letter,
        products: [],
      });
    }
    categoryMap.get(categoryId).products.push(row);
  }

  return [...categoryMap.values()].map((category) => {
    const categoryTotals = computeBoqProductsFinancialTotals(category.products);
    const sections =
      sectionField === 'section'
        ? groupBoqProductMasterProductsBySection(category.products).map((group) => ({
            ...group,
            ...computeBoqProductsFinancialTotals(group.products),
          }))
        : groupBoqProductsBySectionField(category.products, sectionField, totalsFn);

    return {
      ...category,
      marginPercent: categoryTotals.marginPercent,
      marginTotal: categoryTotals.marginTotal,
      buyTotal: categoryTotals.buyTotal,
      sellTotal: categoryTotals.sellTotal,
      sections,
    };
  });
}

export { formatBoqRupeeAmount };
