export function buildVendorComparisonItemCategoryMap(categories = []) {
  const map = new Map();

  categories.forEach((category) => {
    category.items?.forEach((item) => {
      map.set(item.id, category.id);
    });
  });

  return map;
}

export function getVendorComparisonSelectableItemIds(category) {
  return (category?.items ?? []).filter((item) => !item.poRaised).map((item) => item.id);
}

/** True when every comparison line already has a PO (or there are no lines). */
export function areAllVendorComparisonItemsPoRaised(categories = []) {
  let itemCount = 0;
  for (const category of categories) {
    for (const item of category.items ?? []) {
      itemCount += 1;
      if (!item.poRaised) return false;
    }
  }
  return itemCount > 0;
}

/** True when any visible comparison line still needs a PO. */
export function hasPendingVendorComparisonItems(categories = []) {
  for (const category of categories) {
    for (const item of category.items ?? []) {
      if (!item.poRaised) return true;
    }
  }
  return false;
}

/** @deprecated Prefer hasPendingVendorComparisonItems / areAll… for menu gates. */
export function hasAnyVendorComparisonItemPoRaised(categories = []) {
  for (const category of categories) {
    for (const item of category.items ?? []) {
      if (item.poRaised) return true;
    }
  }
  return false;
}

export function getVendorComparisonSelectedCategoryIds(selectedItemIds, itemCategoryMap) {
  const categoryIds = new Set();

  selectedItemIds.forEach((itemId) => {
    const categoryId = itemCategoryMap.get(itemId);
    if (categoryId) categoryIds.add(categoryId);
  });

  return categoryIds;
}

export function canRaisePoForVendorComparisonSelection(selectedItemIds, itemCategoryMap) {
  if (!selectedItemIds || selectedItemIds.size === 0) return false;
  return getVendorComparisonSelectedCategoryIds(selectedItemIds, itemCategoryMap).size === 1;
}

export function areVendorComparisonSelectedIdSetsEqual(left, right) {
  if (left === right) return true;
  if (!left || !right || left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

export function buildVendorComparisonSelectedItems(
  categories = [],
  selectedItemIds,
  vendorId = '',
) {
  if (!selectedItemIds || selectedItemIds.size === 0) return [];

  const items = [];
  for (const category of categories) {
    for (const item of category.items ?? []) {
      if (!selectedItemIds.has(item.id)) continue;

      const vendorQuote = vendorId ? item.vendorQuotes?.[vendorId] : null;
      const vendorRate = vendorQuote?.rate;
      items.push({
        id: item.id,
        packageItemName: item.id,
        itemCode: item.itemCode ?? '',
        product: item.name ?? item.itemCode ?? '',
        quantity: item.qty,
        qty: item.qty,
        vendorRate,
        purchaseRate: vendorRate,
        lineValue: vendorQuote?.value,
        units: item.uom,
        description: item.description ?? '',
        sectionLabel: category.name,
      });
    }
  }

  return items;
}

/** All visible comparison lines that still need a PO (for Raise PO empty-selection fallback). */
export function buildVendorComparisonPendingItems(categories = [], vendorId = '') {
  const pendingIds = new Set();
  for (const category of categories) {
    for (const item of category.items ?? []) {
      if (!item.poRaised) pendingIds.add(item.id);
    }
  }
  return buildVendorComparisonSelectedItems(categories, pendingIds, vendorId);
}

/** Overlay latest supplier-quotation rates from vendor comparison onto line items. */
export function applyVendorQuoteRatesToItems(items = [], categories = [], vendorId = '') {
  if (!vendorId || !Array.isArray(items) || items.length === 0) return items;
  if (!Array.isArray(categories) || categories.length === 0) return items;

  const quoteByItemId = new Map();
  for (const category of categories) {
    for (const item of category.items ?? []) {
      const quote = item.vendorQuotes?.[vendorId];
      if (quote) {
        quoteByItemId.set(item.id, quote);
      }
    }
  }

  if (quoteByItemId.size === 0) return items;

  return items.map((item) => {
    const itemId = item.id ?? item.packageItemName ?? item.packageItem;
    const quote = itemId ? quoteByItemId.get(itemId) : null;
    if (!quote) return item;

    const qty = Number(item.quantity ?? item.qty) || 0;
    const vendorRate = quote.rate;
    return {
      ...item,
      vendorRate,
      purchaseRate: vendorRate,
      lineValue: quote.value ?? (qty > 0 ? vendorRate * qty : undefined),
    };
  });
}
