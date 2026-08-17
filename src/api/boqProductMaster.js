import { BOQ_DEFAULT_LIST_LIMIT, BOQ_DEFAULT_PRODUCT_SECTION } from '@/components/boq/constants';
import { fetchProductCategories, fetchProductCountsByCategoryType } from '@/api/productCategories';
import { listProducts } from '@/api/products';
import { PRODUCT_CATEGORY_TAB_IDS } from '@/pages/profile/product-categories/constants';
import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import {
  isJobProductType,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';

/** Page size for products under a selected L2 category (grouped by L3 in the UI). */
const BOQ_PRODUCT_MASTER_PAGE_SIZE = BOQ_DEFAULT_LIST_LIMIT;

const BOQ_SUPPORTED_PRODUCT_TYPES = new Set([
  PRODUCTS_TAB_IDS.PRODUCT,
  PRODUCTS_TAB_IDS.PRODUCT_PACKAGE,
  PRODUCTS_TAB_IDS.JOB,
]);

function parseNumericPrice(value) {
  if (value === '' || value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replaceAll('₹', '').replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function readProductMasterNumericField(product = {}, camelKey, snakeKey) {
  const camelValue = product[camelKey];
  if (camelValue != null && camelValue !== '') return parseNumericPrice(camelValue);
  const snakeValue = product[snakeKey];
  if (snakeValue != null && snakeValue !== '') return parseNumericPrice(snakeValue);
  return 0;
}

function resolveProductMasterPurchaseRate(product = {}) {
  const min = readProductMasterNumericField(product, 'minPurchasePrice', 'min_purchase_price');
  if (min > 0) return min;
  return parseNumericPrice(product.purchasePrice ?? product.purchase_price);
}

function resolveProductMasterSellingRate(product = {}) {
  const max = readProductMasterNumericField(product, 'maxSellingPrice', 'max_selling_price');
  if (max > 0) return max;
  return parseNumericPrice(product.sellingPrice ?? product.selling_price);
}

function resolveProductMasterPriceBounds(product = {}, type = 'purchase') {
  const isPurchase = type === 'purchase';
  const minKey = isPurchase ? 'minPurchasePrice' : 'minSellingPrice';
  const maxKey = isPurchase ? 'maxPurchasePrice' : 'maxSellingPrice';
  const minSnakeKey = isPurchase ? 'min_purchase_price' : 'min_selling_price';
  const maxSnakeKey = isPurchase ? 'max_purchase_price' : 'max_selling_price';
  const rangeKey = isPurchase ? 'purchasePrice' : 'sellingPrice';
  const rangeSnakeKey = isPurchase ? 'purchase_price' : 'selling_price';

  let min = readProductMasterNumericField(product, minKey, minSnakeKey);
  let max = readProductMasterNumericField(product, maxKey, maxSnakeKey);

  if (!min && !max) {
    const fallback = parseNumericPrice(product[rangeKey] ?? product[rangeSnakeKey]);
    min = fallback;
    max = fallback;
  } else {
    if (!min) min = max;
    if (!max) max = min;
  }

  return { min, max };
}

function resolveJobProductPurchaseBounds(product = {}) {
  const synced = syncJobPurchasePrices(product);
  const total =
    parseNumericPrice(synced.minPurchasePrice) ||
    parseNumericPrice(synced.maxPurchasePrice) ||
    parseNumericPrice(product.totalRate);

  if (total > 0) {
    return { min: total, max: total };
  }

  return null;
}

export function mapProductToBoqMasterRow(product = {}) {
  const devxProductType = product.devxProductType || PRODUCTS_TAB_IDS.PRODUCT;
  if (!BOQ_SUPPORTED_PRODUCT_TYPES.has(devxProductType)) return null;

  let purchaseBounds = resolveProductMasterPriceBounds(product, 'purchase');

  if (isJobProductType(devxProductType)) {
    const jobBounds = resolveJobProductPurchaseBounds(product);
    if (jobBounds) {
      purchaseBounds = jobBounds;
    }
  }

  const sellingBounds = resolveProductMasterPriceBounds(product, 'selling');
  const purchaseRate =
    purchaseBounds.min > 0 ? purchaseBounds.min : resolveProductMasterPurchaseRate(product);

  return {
    id: product.id,
    categoryId: product.categoryType || product.categoryGroup || '',
    categoryGroup: product.categoryGroup || '',
    categoryType: product.categoryType || '',
    productGroup: product.productGroup || '',
    productCategory: product.productType || '',
    section: String(product.productGroup ?? '').trim() || BOQ_DEFAULT_PRODUCT_SECTION,
    product: product.name || product.productCode || product.id,
    description: product.description ?? '',
    brand: product.brand || '',
    make: product.make || '',
    units: product.uom || product.stock_uom || '',
    suppliers: Array.isArray(product.vendors) ? product.vendors.filter(Boolean).join(', ') : '',
    minPurchasePrice: purchaseBounds.min,
    maxPurchasePrice: purchaseBounds.max,
    minSellingPrice: sellingBounds.min,
    maxSellingPrice: sellingBounds.max,
    purchaseRate,
    sellingRate: resolveProductMasterSellingRate(product),
    devxProductType,
    imageUrl: product.imageUrl || '',
    itemCode: product.productCode || product.packageCode || product.jobCode || product.id,
  };
}

/** Build sidebar groups: category group → parent category (category type). */
export function buildBoqProductMasterCategoryGroups(rowsByTab = {}) {
  const categoryGroups = rowsByTab[PRODUCT_CATEGORY_TAB_IDS.CATEGORY_GROUP] ?? [];
  const parentCategories = rowsByTab[PRODUCT_CATEGORY_TAB_IDS.PARENT_CATEGORY] ?? [];

  return categoryGroups
    .map((group) => {
      const children = parentCategories
        .filter((row) => row.categoryGroupId === group.id)
        .map((row) => ({
          value: row.id,
          label: row.name,
          filterField: 'category_type',
          filterValue: row.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

      return children.length > 0
        ? {
            parent: group.id,
            label: group.name,
            children,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function buildBoqProductMasterCategoryLookup(groups = []) {
  const lookup = {};
  for (const group of groups) {
    for (const child of group.children ?? []) {
      lookup[child.value] = child;
    }
  }
  return lookup;
}

export function buildBoqProductMasterListFilters(selectedCategoryMeta) {
  if (!selectedCategoryMeta?.filterField || !selectedCategoryMeta?.filterValue) return undefined;
  return { [selectedCategoryMeta.filterField]: [selectedCategoryMeta.filterValue] };
}

export async function fetchBoqProductMasterCategories() {
  // Sidebar only shows L1 (Category Group) + L2 (Parent Category).
  const rowsByTab = await fetchProductCategories({ maxDepth: 1 });
  const groups = buildBoqProductMasterCategoryGroups(rowsByTab);
  return { groups, lookup: buildBoqProductMasterCategoryLookup(groups) };
}

export async function fetchBoqProductMasterProducts({
  selectedCategoryMeta,
  keyword = '',
  limitStart = 0,
  limitPageLength = BOQ_PRODUCT_MASTER_PAGE_SIZE,
} = {}) {
  const filters = buildBoqProductMasterListFilters(selectedCategoryMeta);
  const { rows, total } = await listProducts({
    keyword: keyword.trim() || undefined,
    limitStart,
    limitPageLength,
    filters,
  });

  const products = rows.map(mapProductToBoqMasterRow).filter(Boolean);
  const filteredOut = rows.length - products.length;
  const adjustedTotal =
    filteredOut > 0 ? Math.max(products.length, (total ?? rows.length) - filteredOut) : total;

  return {
    products,
    total: adjustedTotal,
  };
}

/**
 * Sidebar counts keyed by L2 category id (same keys as categoryLookup).
 * Replaces the old full-catalog listProducts scan.
 */
export async function fetchBoqProductMasterCategoryCounts(groups = []) {
  const { countsById, counts } = await fetchProductCountsByCategoryType();
  const lookup = buildBoqProductMasterCategoryLookup(groups);
  const result = {};

  for (const [categoryId, meta] of Object.entries(lookup)) {
    const byId = countsById[categoryId];
    if (byId != null) {
      result[categoryId] = byId;
      continue;
    }
    const byLabel = meta.filterValue ? counts[meta.filterValue] : undefined;
    result[categoryId] = byLabel ?? 0;
  }

  return result;
}
