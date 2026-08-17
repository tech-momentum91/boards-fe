/** Stock Product Master detail — same scope as ProductsAddItemDrawer `mode="stock"`. */

export function isStockProductDetailView(viewMode) {
  return viewMode === 'stock';
}

function parseStockPriceAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replaceAll('₹', '').replaceAll(',', '').trim();
  if (!normalized || normalized === '--') return null;
  // Ignore pre-formatted ranges like "230 - 230" — stock shows a single amount.
  if (normalized.includes('-')) {
    const first = normalized.split('-')[0]?.trim();
    const amount = Number(first);
    return Number.isFinite(amount) ? amount : null;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Stock-only single price display.
 * Source of truth: Min Purchase Price (matches Product Master purchase price).
 */
export function formatStockProductPrice(product = {}) {
  const amount =
    parseStockPriceAmount(product.minPurchasePrice) ??
    parseStockPriceAmount(product.min_purchase_price) ??
    parseStockPriceAmount(product.maxPurchasePrice) ??
    parseStockPriceAmount(product.max_purchase_price) ??
    parseStockPriceAmount(product.price);

  if (amount === null) return '--';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Draft value for stock single-price editor (min purchase). */
export function getStockPriceDraftValue(product = {}) {
  const amount =
    parseStockPriceAmount(product.minPurchasePrice) ??
    parseStockPriceAmount(product.min_purchase_price) ??
    parseStockPriceAmount(product.maxPurchasePrice) ??
    parseStockPriceAmount(product.max_purchase_price);
  return amount === null ? '' : String(amount);
}
