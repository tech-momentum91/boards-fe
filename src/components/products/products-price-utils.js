import {
  isJobProductType,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';

function parseNumericPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replaceAll('₹', '').replaceAll(',', '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function hasMeaningfulPrice(value) {
  if (value === null || value === undefined) return false;

  const raw = String(value).trim();
  if (!raw || raw === '--' || raw === '0' || raw === '₹0') return false;

  if (raw.includes('-')) {
    const parts = raw.split('-').map((part) => parseNumericPrice(part.trim()));
    return parts.some((amount) => amount !== null && amount !== 0);
  }

  const amount = parseNumericPrice(raw);
  return amount !== null && amount !== 0;
}

export function formatPriceDisplay(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '--') return '--';
  if (raw.includes('₹')) return raw;
  return `₹${raw}`;
}

function resolvePriceFields(entity = {}, purchase = true) {
  return {
    fallback: purchase ? entity.purchasePrice : entity.sellingPrice,
    min: purchase ? entity.minPurchasePrice : entity.minSellingPrice,
    max: purchase ? entity.maxPurchasePrice : entity.maxSellingPrice,
    rate: entity.rate,
  };
}

export function formatPriceRangeFromEntity(entity = {}, purchase = true) {
  const { fallback, min, max, rate } = resolvePriceFields(entity, purchase);

  if (hasMeaningfulPrice(fallback)) return formatPriceDisplay(fallback);

  const minOk = hasMeaningfulPrice(min);
  const maxOk = hasMeaningfulPrice(max);

  if (minOk && maxOk && String(min) !== String(max)) {
    return `${formatPriceDisplay(min)} - ${formatPriceDisplay(max)}`;
  }
  if (minOk) return formatPriceDisplay(min);
  if (maxOk) return formatPriceDisplay(max);
  if (hasMeaningfulPrice(rate)) return formatPriceDisplay(rate);

  return '--';
}

export function shouldUseParentPrices(parentProduct = {}) {
  return Boolean(parentProduct.applyPriceToAllVariations);
}

export function formatProductPrice(product = {}, purchase = true) {
  return formatPriceRangeFromEntity(product, purchase);
}

export function formatVariationPrice(variation = {}, parentProduct = {}, purchase = true) {
  return formatPriceRangeFromEntity(getEffectivePriceEntity(variation, parentProduct), purchase);
}

export function getParentPriceFields(parentProduct = {}) {
  const rates = {
    materialBasicRate:
      parentProduct.materialBasicRate ??
      parentProduct.materialBasicRateMin ??
      parentProduct.materialBasicRateMax ??
      '',
    labourBaseRate:
      parentProduct.labourBaseRate ??
      parentProduct.labourBaseRateMin ??
      parentProduct.labourBaseRateMax ??
      '',
  };

  return {
    minPurchasePrice: parentProduct.minPurchasePrice ?? '',
    maxPurchasePrice: parentProduct.maxPurchasePrice ?? '',
    minSellingPrice: parentProduct.minSellingPrice ?? '',
    maxSellingPrice: parentProduct.maxSellingPrice ?? '',
    materialBasicRate: rates.materialBasicRate,
    labourBaseRate: rates.labourBaseRate,
  };
}

function coalescePriceField(variationValue, parentValue) {
  if (hasMeaningfulPrice(variationValue)) return String(variationValue).trim();
  if (hasMeaningfulPrice(parentValue)) return String(parentValue).trim();
  return String(variationValue ?? '').trim() || String(parentValue ?? '').trim();
}

export function applyParentPricesToVariation(variation = {}, parentProduct = {}) {
  if (!shouldUseParentPrices(parentProduct)) return variation;

  const parent = getParentPriceFields(parentProduct);
  const merged = {
    ...variation,
    minPurchasePrice: coalescePriceField(variation.minPurchasePrice, parent.minPurchasePrice),
    maxPurchasePrice: coalescePriceField(variation.maxPurchasePrice, parent.maxPurchasePrice),
    minSellingPrice: coalescePriceField(variation.minSellingPrice, parent.minSellingPrice),
    maxSellingPrice: coalescePriceField(variation.maxSellingPrice, parent.maxSellingPrice),
    materialBasicRate: coalescePriceField(variation.materialBasicRate, parent.materialBasicRate),
    labourBaseRate: coalescePriceField(variation.labourBaseRate, parent.labourBaseRate),
  };

  return isJobProductType(parentProduct.devxProductType) ? syncJobPurchasePrices(merged) : merged;
}

export function getEffectivePriceEntity(variation = {}, parentProduct = {}) {
  if (!shouldUseParentPrices(parentProduct)) return variation;

  const parent = getParentPriceFields(parentProduct);
  const merged = {
    ...parentProduct,
    purchasePrice: variation.purchasePrice || parentProduct.purchasePrice,
    sellingPrice: variation.sellingPrice || parentProduct.sellingPrice,
    minPurchasePrice: coalescePriceField(variation.minPurchasePrice, parent.minPurchasePrice),
    maxPurchasePrice: coalescePriceField(variation.maxPurchasePrice, parent.maxPurchasePrice),
    minSellingPrice: coalescePriceField(variation.minSellingPrice, parent.minSellingPrice),
    maxSellingPrice: coalescePriceField(variation.maxSellingPrice, parent.maxSellingPrice),
    materialBasicRate: coalescePriceField(variation.materialBasicRate, parent.materialBasicRate),
    labourBaseRate: coalescePriceField(variation.labourBaseRate, parent.labourBaseRate),
  };

  return isJobProductType(parentProduct.devxProductType) ? syncJobPurchasePrices(merged) : merged;
}

export function parsePriceRange(value) {
  if (value === null || value === undefined || value === '') {
    return { min: null, max: null };
  }

  const parts = String(value)
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      min: parseNumericPrice(parts[0]),
      max: parseNumericPrice(parts[1]),
    };
  }

  const single = parseNumericPrice(value);
  return { min: single, max: single };
}

function resolveDraftRange(entity = {}, purchase = true) {
  const minKey = purchase ? 'minPurchasePrice' : 'minSellingPrice';
  const maxKey = purchase ? 'maxPurchasePrice' : 'maxSellingPrice';
  const rangeKey = purchase ? 'purchasePrice' : 'sellingPrice';

  const minRaw = entity[minKey];
  const maxRaw = entity[maxKey];
  if (String(minRaw ?? '').trim() || String(maxRaw ?? '').trim()) {
    return {
      min: minRaw ?? '',
      max: maxRaw ?? '',
    };
  }

  const parsed = parsePriceRange(entity[rangeKey]);
  if (parsed.min === null && parsed.max === null) {
    return { min: '', max: '' };
  }
  if (parsed.min !== null && parsed.max !== null && parsed.min !== parsed.max) {
    return { min: String(parsed.min), max: String(parsed.max) };
  }

  const single = parsed.min ?? parsed.max;
  return { min: single != null ? String(single) : '', max: '' };
}

/** Resolve min/max price inputs for inline detail editing. */
export function getPriceRangeDraftValues(entity = {}) {
  const purchase = resolveDraftRange(entity, true);
  const selling = resolveDraftRange(entity, false);

  return {
    minPurchasePrice: purchase.min,
    maxPurchasePrice: purchase.max,
    minSellingPrice: selling.min,
    maxSellingPrice: selling.max,
  };
}

function getProductPriceRange(product, type = 'purchase') {
  const minKey = type === 'purchase' ? 'minPurchasePrice' : 'minSellingPrice';
  const maxKey = type === 'purchase' ? 'maxPurchasePrice' : 'maxSellingPrice';
  const rangeKey = type === 'purchase' ? 'purchasePrice' : 'sellingPrice';

  const minDirect = parseNumericPrice(product?.[minKey]);
  const maxDirect = parseNumericPrice(product?.[maxKey]);

  if (minDirect !== null || maxDirect !== null) {
    return {
      min: minDirect ?? maxDirect,
      max: maxDirect ?? minDirect,
    };
  }

  return parsePriceRange(product?.[rangeKey]);
}

export function formatPriceInputValue(value) {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString('en-IN');
}

export function sumSelectedProductPrices(products = [], type = 'purchase') {
  let minSum = 0;
  let maxSum = 0;
  let hasAny = false;

  products.forEach((product) => {
    const { min, max } = getProductPriceRange(product, type);
    if (min !== null) {
      minSum += min;
      hasAny = true;
    }
    if (max !== null) {
      maxSum += max;
      hasAny = true;
    }
  });

  if (!hasAny) {
    return { min: '', max: '' };
  }

  return {
    min: formatPriceInputValue(minSum),
    max: formatPriceInputValue(maxSum),
  };
}
