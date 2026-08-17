export const PRODUCT_CATEGORY_LEVELS = [
  { key: 'categoryGroup', label: 'Category Group' },
  { key: 'categoryType', label: 'Category Type' },
  { key: 'productGroup', label: 'Product Group' },
  { key: 'productType', label: 'Product Type' },
];

export const EMPTY_PRODUCT_CATEGORY = {
  categoryGroup: '',
  categoryType: '',
  productGroup: '',
  productType: '',
  hsnCode: '',
};

export function clearLevelsBelow(values, levelIndex) {
  const next = { ...values };
  for (let i = levelIndex + 1; i < PRODUCT_CATEGORY_LEVELS.length; i += 1) {
    next[PRODUCT_CATEGORY_LEVELS[i].key] = '';
  }
  return next;
}

export function getLevelValue(values, levelIndex) {
  const { key } = PRODUCT_CATEGORY_LEVELS[levelIndex];
  return values[key] || '';
}

/** Level indices to show below the main Product Category field (exclusive of anchor). */
export function getChildLevelIndices(anchorLevelIndex) {
  if (anchorLevelIndex == null || anchorLevelIndex >= PRODUCT_CATEGORY_LEVELS.length - 1) {
    return [];
  }
  const indices = [];
  for (let i = anchorLevelIndex + 1; i < PRODUCT_CATEGORY_LEVELS.length; i += 1) {
    indices.push(i);
  }
  return indices;
}

export function applyMainCategorySelection(option) {
  const levelIndex = option?.selectedLevel ?? PRODUCT_CATEGORY_LEVELS.length - 1;
  const row = option?.row ?? {};
  const next = { ...EMPTY_PRODUCT_CATEGORY };

  for (let i = 0; i <= levelIndex; i += 1) {
    const { key } = PRODUCT_CATEGORY_LEVELS[i];
    next[key] = row[key] || '';
  }
  next.hsnCode = row.hsnCode || '';

  return { values: next, anchorLevel: levelIndex };
}

export function buildMainCategoryOptionId(values, anchorLevel) {
  if (anchorLevel == null) return '';
  const value = getLevelValue(values, anchorLevel);
  if (!value) return '';
  const pathId = PRODUCT_CATEGORY_LEVELS.map(({ key }) => values[key] || '').join('|');
  return `${value}::${pathId}::${anchorLevel}`;
}

export function getMainCategoryDisplayValue(values, anchorLevel) {
  if (anchorLevel == null) return '';
  return getLevelValue(values, anchorLevel);
}

export function isCategorySelectionStarted(values) {
  return PRODUCT_CATEGORY_LEVELS.some(({ key }) => Boolean(values[key]));
}

/** Separator used when persisting a full 4-level category path as a single string. */
export const PRODUCT_CATEGORY_PATH_SEPARATOR = ' > ';

/**
 * Build a persisted category path: Group > Type > Product Group > Product Type.
 * Omits empty trailing levels but keeps order of filled ancestors.
 */
export function formatProductCategoryPath(values = {}) {
  const parts = PRODUCT_CATEGORY_LEVELS.map(({ key }) => String(values?.[key] ?? '').trim()).filter(
    Boolean,
  );
  return parts.join(PRODUCT_CATEGORY_PATH_SEPARATOR);
}

/**
 * Parse a stored category path back into level fields.
 * Supports ` > ` (canonical) and ` / ` (legacy section-style labels).
 */
export function parseProductCategoryPath(raw = '') {
  const text = String(raw ?? '').trim();
  if (!text) {
    return { ...EMPTY_PRODUCT_CATEGORY };
  }

  const parts = text.includes(PRODUCT_CATEGORY_PATH_SEPARATOR)
    ? text
        .split(/\s*>\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
    : text.includes(' / ')
      ? text
          .split(/\s*\/\s*/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [text];

  if (parts.length >= 4) {
    return {
      categoryGroup: parts[0],
      categoryType: parts[1],
      productGroup: parts[2],
      productType: parts[3],
      hsnCode: '',
    };
  }

  if (parts.length === 3) {
    return {
      categoryGroup: parts[0],
      categoryType: parts[1],
      productGroup: parts[2],
      productType: '',
      hsnCode: '',
    };
  }

  if (parts.length === 2) {
    // Legacy "Product Group / Product Type" labels.
    return {
      categoryGroup: '',
      categoryType: '',
      productGroup: parts[0],
      productType: parts[1],
      hsnCode: '',
    };
  }

  return {
    categoryGroup: '',
    categoryType: '',
    productGroup: '',
    productType: parts[0] || '',
    hsnCode: '',
  };
}

/** Resolve a stored 4-level category path from BOQ line row fields. */
export function resolveProductCategoryPathFromRow(row = {}) {
  const fromFields = formatProductCategoryPath({
    categoryGroup: row.categoryGroup,
    categoryType: row.categoryType,
    productGroup: row.productGroup || row.section,
    productType: row.productCategory || row.productType || row.itemGroup,
  });
  if (fromFields) return fromFields;

  return String(row.purchaseCategory || row.boqCategory || '').trim();
}

/** 4th-level label for table cells / triggers. */
export function getProductCategoryDisplayLabel(raw = '') {
  const values = parseProductCategoryPath(raw);
  return (
    values.productType ||
    values.productGroup ||
    values.categoryType ||
    values.categoryGroup ||
    String(raw ?? '').trim()
  );
}

/** 3rd-level label used for Purchase BOQ section grouping. */
export function getProductCategoryGroupLabel(raw = '') {
  const values = parseProductCategoryPath(raw);
  return (
    values.productGroup ||
    values.categoryType ||
    values.productType ||
    values.categoryGroup ||
    String(raw ?? '').trim()
  );
}

/** Option id shape returned by product_type search (`value::path`). */
export function buildProductTypeOptionId(values = {}) {
  const productType = String(values.productType ?? '').trim();
  if (!productType) return '';
  const pathId = PRODUCT_CATEGORY_LEVELS.map(({ key }) => String(values[key] ?? '').trim()).join(
    '|',
  );
  return `${productType}::${pathId}`;
}
