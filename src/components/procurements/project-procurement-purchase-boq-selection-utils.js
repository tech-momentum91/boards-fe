import {
  EMPTY_PRODUCT_CATEGORY,
  formatProductCategoryPath,
  getProductCategoryGroupLabel,
  parseProductCategoryPath,
} from '@/components/products/product-category-utils';
import { selectionHasNonProductLines } from '@/components/boq/boq-line-product-utils';

export const PURCHASE_BOQ_RAISE_PO_DISABLED_REASON =
  'Raise Direct PO is only available when selected items belong to the same purchase category.';

export const PURCHASE_BOQ_NON_PRODUCT_DISABLED_REASON =
  'Convert all selected items to products before adding to a package or raising a PO.';

/** L3 product group item group — Category dropdown in Raise PO. */
export function resolveRaisePoCategoryLabel(item = {}) {
  return String(
    item.productGroup ??
      item.section ??
      item.purchaseCategory ??
      item.boqCategory ??
      item.sectionLabel ??
      '',
  ).trim();
}

/** L4 product type item group — stored on PO as sub_category. */
export function resolveRaisePoSubCategoryLabel(item = {}) {
  return String(
    item.productType ?? item.productCategory ?? item.itemGroup ?? item.item_group ?? '',
  ).trim();
}

/** Full 4-level category path from a line item (Group > Type > Product Group > Product Type). */
export function resolveRaisePoCategoryPathFromItem(item = {}) {
  const purchaseCategory = String(item.purchaseCategory ?? item.boqCategory ?? '').trim();
  if (purchaseCategory.includes(' > ')) {
    return purchaseCategory;
  }

  const fromFields = formatProductCategoryPath({
    categoryGroup: item.categoryGroup ?? '',
    categoryType: item.categoryType ?? '',
    productGroup: resolveRaisePoCategoryLabel(item),
    productType: resolveRaisePoSubCategoryLabel(item),
  });
  if (fromFields) return fromFields;

  return purchaseCategory;
}

/** Default category path when opening Raise PO (single shared path across items). */
export function resolveDefaultRaisePoCategoryPath(lineItems = [], packageCategories = []) {
  const paths = lineItems.map(resolveRaisePoCategoryPathFromItem).filter(Boolean);
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 1) return uniquePaths[0];

  const packageCategory = String(packageCategories[0] ?? '').trim();
  if (packageCategory) {
    const parsed = parseProductCategoryPath(packageCategory);
    if (parsed.productType) return formatProductCategoryPath(parsed);
    return packageCategory;
  }

  return '';
}

/** Default 4-level category values when opening Raise PO. */
export function resolveDefaultRaisePoCategoryValues(lineItems = [], packageCategories = []) {
  const path = resolveDefaultRaisePoCategoryPath(lineItems, packageCategories);
  return path ? parseProductCategoryPath(path) : { ...EMPTY_PRODUCT_CATEGORY };
}

/** Map form category values to PO header fields and item-group (L4 product type). */
export function splitRaisePoCategoryValuesForPayload(values = {}) {
  const productGroup = String(values.productGroup ?? '').trim();
  const productType = String(values.productType ?? '').trim();
  return {
    category: productGroup,
    subCategory: productType,
    productType,
  };
}

/** Split a stored category path into PO custom_po_category (L3) and custom_po_sub_category (L4). */
export function splitRaisePoCategoryPathForPayload(categoryPath = '') {
  const path = String(categoryPath ?? '').trim();
  const values = parseProductCategoryPath(path);
  return {
    category: values.productGroup || getProductCategoryGroupLabel(path) || path,
    subCategory: values.productType || '',
  };
}

/** Overlay package item taxonomy onto comparison-built rows (same package item id). */
export function enrichRaisePoLineItemsWithPackageTaxonomy(items = [], packageItems = []) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const byId = new Map();
  for (const row of packageItems) {
    const id = row?.id ?? row?.packageItemName ?? row?.name;
    if (id) byId.set(String(id), row);
  }
  if (byId.size === 0) return items;

  return items.map((item) => {
    const id = item?.id ?? item?.packageItemName ?? item?.name;
    const pkg = id ? byId.get(String(id)) : null;
    return pkg ? { ...pkg, ...item } : item;
  });
}

/** 3rd-level purchase category key used for grouping / Raise PO validation. */
export function resolvePurchaseBoqRaisePoCategoryKey(product = {}) {
  const raw =
    product.purchaseCategory ||
    product.boqCategory ||
    product.section ||
    product.productGroup ||
    '';
  return getProductCategoryGroupLabel(raw) || String(raw).trim() || '';
}

export function getPurchaseBoqSelectedCategoryKeys(selectedProducts = []) {
  const keys = new Set();
  for (const product of selectedProducts) {
    const key = resolvePurchaseBoqRaisePoCategoryKey(product);
    if (key) keys.add(key);
    else keys.add('__uncategorized__');
  }
  return keys;
}

export function purchaseBoqSelectionHasSentPo(selectedProducts = []) {
  return selectedProducts.some((product) =>
    ['po-released', 'delivered'].includes(
      String(product?.procurementStatus ?? product?.procurement_status ?? '').toLowerCase(),
    ),
  );
}

/** Raise Direct PO requires at least one selected item, all in the same purchase category. */
export function canRaiseDirectPoForPurchaseBoqSelection(selectedProducts = []) {
  if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) return false;
  if (selectionHasNonProductLines(selectedProducts)) return false;
  if (purchaseBoqSelectionHasSentPo(selectedProducts)) return false;
  return getPurchaseBoqSelectedCategoryKeys(selectedProducts).size === 1;
}

export function canAddPurchaseBoqSelectionToPackage(selectedProducts = []) {
  if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) return false;
  return !selectionHasNonProductLines(selectedProducts);
}

export function resolvePurchaseBoqDirectPoCategoryLabel(selectedProducts = []) {
  const keys = getPurchaseBoqSelectedCategoryKeys(selectedProducts);
  const [categoryKey] = [...keys];
  if (!categoryKey || categoryKey === '__uncategorized__') return '';
  return categoryKey;
}

export function buildAutoDirectPoPackageCode(selectedProducts = []) {
  const category = resolvePurchaseBoqDirectPoCategoryLabel(selectedProducts);
  const slug = String(category || 'direct-po')
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Date.now().toString(36).slice(-4);
  return `DPO-${slug || 'items'}-${suffix}`;
}

/** Map Purchase BOQ product rows into Raise PO drawer line items (direct PO flow). */
export function mapPurchaseBoqProductsToRaisePoLineItems(selectedProducts = []) {
  if (!Array.isArray(selectedProducts)) return [];

  return selectedProducts.map((product) => {
    const purchaseRate = Number(product.purchaseRate ?? product.purchase_rate) || 0;
    const quantity = product.quantity ?? product.qty ?? '';
    const lineValue =
      product.lineValue != null && product.lineValue !== ''
        ? Number(product.lineValue) || 0
        : undefined;

    return {
      ...product,
      id: product.id ?? product.name,
      name: product.id ?? product.name,
      packageItemName: product.id ?? product.name,
      purchaseBoqItem: product.id ?? product.name,
      itemCode: product.itemCode ?? product.item ?? '',
      product: product.product ?? product.itemCode ?? product.item ?? '',
      quantity,
      qty: quantity,
      purchaseRate,
      lineValue,
      productGroup: product.productGroup ?? product.section ?? '',
      productType: product.productType ?? product.productCategory ?? product.itemGroup ?? '',
      productCategory: product.productCategory ?? product.productType ?? product.itemGroup ?? '',
      section: product.productGroup ?? product.section ?? '',
      sectionLabel: resolveRaisePoCategoryLabel(product),
    };
  });
}

/** Overlay submitted vendor quotation rates onto direct PO line items. */
export function applyPurchaseBoqVendorQuoteRatesToItems(items = [], ratesByItemCode = {}) {
  if (!Array.isArray(items) || items.length === 0) return items;

  return items.map((item) => {
    const itemCode = String(item.itemCode ?? item.item ?? '').trim();
    const quotedRate = Number(ratesByItemCode?.[itemCode]);
    if (!itemCode || !Number.isFinite(quotedRate) || quotedRate <= 0) {
      return { ...item, vendorRate: undefined, rate: undefined };
    }

    const qty = Number(item.quantity ?? item.qty) || 0;
    return {
      ...item,
      vendorRate: quotedRate,
      rate: quotedRate,
      purchaseRate: quotedRate,
      lineValue: qty > 0 ? quotedRate * qty : item.lineValue,
    };
  });
}

/** Line items that do not have a submitted vendor quotation rate for the selected vendor. */
export function getDirectPoLineItemsMissingVendorQuotes(items = [], ratesByItemCode = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.filter((item) => {
    const itemCode = String(item.itemCode ?? item.item ?? '').trim();
    if (!itemCode) return true;
    const quotedRate = Number(ratesByItemCode?.[itemCode]);
    return !Number.isFinite(quotedRate) || quotedRate <= 0;
  });
}

export function buildDirectPoPackageDataFromSelection(selectedProducts = [], project = {}) {
  const category = resolvePurchaseBoqDirectPoCategoryLabel(selectedProducts);
  return {
    code: project?.purchase_boq_code || 'Direct PO',
    categories: category ? [category] : [],
    category,
    isDirectPo: true,
    purchaseBoqName: project?.purchase_boq || '',
  };
}
