/** Shared helpers for BOQ product master and template product grouping. */

import { BOQ_DEFAULT_PRODUCT_SECTION } from '@/components/boq/constants';

export function filterBoqProductMasterCategories(groups, searchQuery) {
  const query = String(searchQuery ?? '')
    .trim()
    .toLowerCase();
  if (!query) return groups;

  return groups
    .map((group) => {
      const parentMatches = group.label.toLowerCase().includes(query);
      const children = (group.children ?? []).filter(
        (child) =>
          parentMatches ||
          child.label.toLowerCase().includes(query) ||
          child.value.toLowerCase().includes(query),
      );
      return children.length > 0 ? { ...group, children } : null;
    })
    .filter(Boolean);
}

export function groupBoqProductMasterProductsBySection(products) {
  const groups = new Map();
  for (const row of products) {
    const key = String(row?.section ?? '').trim() || BOQ_DEFAULT_PRODUCT_SECTION;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([section, items]) => ({ section, products: items }));
}

export function computeBoqProductMasterSelectionSummary(selectedProducts) {
  const items = Array.isArray(selectedProducts) ? selectedProducts : [];
  const categoryIds = new Set(items.map((row) => row.categoryId).filter(Boolean));
  const totalBuy = items.reduce((sum, row) => sum + (Number(row.purchaseRate) || 0), 0);
  const totalSell = items.reduce((sum, row) => sum + (Number(row.sellingRate) || 0), 0);
  const avgMargin = totalSell > 0 ? Math.round(((totalSell - totalBuy) / totalSell) * 100) : 0;

  return {
    categoryCount: categoryIds.size,
    totalBuy,
    totalSell,
    avgMargin,
  };
}

export function formatBoqRupeeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatBoqCompactRupeeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';

  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }

  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }

  return formatBoqRupeeAmount(amount);
}

/** Purchase BOQ table rate column — `₹ 1,450`. */
export function formatBoqTableRupeeRate(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ 0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Purchase BOQ table value column — compact `₹ 54.0K`. */
export function formatBoqTableRupeeValue(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹ 0';

  if (amount >= 1_00_00_000) {
    return `₹ ${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }

  if (amount >= 1_00_000) {
    return `₹ ${(amount / 1_00_000).toFixed(1)} L`;
  }

  if (amount >= 1000) {
    return `₹ ${(amount / 1000).toFixed(1)}K`;
  }

  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatBoqPriceRangeTooltip(min, max) {
  const minAmount = Number(min) || 0;
  const maxAmount = Number(max) || 0;

  if (!minAmount && !maxAmount) return 'No price available';
  if (minAmount === maxAmount) {
    return `Min price is ${formatBoqRupeeAmount(minAmount)} · Max price is ${formatBoqRupeeAmount(maxAmount)}`;
  }

  return `Min price is ${formatBoqRupeeAmount(minAmount)} · Max price is ${formatBoqRupeeAmount(maxAmount)}`;
}

export function resolveBoqPurchasePriceBounds(row = {}) {
  const min = Number(row.minPurchasePrice ?? row.purchaseRate) || 0;
  const max = Number(row.maxPurchasePrice ?? row.purchaseRate) || min;
  return { min, max };
}

export function resolveBoqSellingPriceBounds(row = {}) {
  const min = Number(row.minSellingPrice ?? row.sellingRate) || 0;
  const max = Number(row.maxSellingPrice ?? row.sellingRate) || min;
  return { min, max };
}

export function isBoqRateOutOfRange(value, min, max) {
  const numeric = Number.parseFloat(String(value ?? '').replaceAll(',', ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return false;

  const minBound = Number(min) || 0;
  const maxBound = Number(max) || 0;
  if (!minBound && !maxBound) return false;

  const effectiveMin = Math.min(minBound || maxBound, maxBound || minBound);
  const effectiveMax = Math.max(minBound || maxBound, maxBound || minBound);

  return numeric < effectiveMin || numeric > effectiveMax;
}
