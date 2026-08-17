import { PRODUCT_CATEGORY_LEVELS } from '@/components/products/product-category-utils';

const optionValue = (levelKey, path) => `${levelKey}:${path.join(' > ')}`;

function getHierarchyRows(pkg = {}) {
  if (Array.isArray(pkg.categoryHierarchy) && pkg.categoryHierarchy.length > 0) {
    return pkg.categoryHierarchy;
  }
  return (pkg.categories ?? []).map((productGroup) => ({ productGroup }));
}

export function getPackageCategoryFilterKeys(pkg = {}) {
  const keys = new Set();
  for (const hierarchy of getHierarchyRows(pkg)) {
    const path = [];
    for (const { key } of PRODUCT_CATEGORY_LEVELS) {
      const value = String(hierarchy?.[key] ?? '').trim();
      if (!value) continue;
      path.push(value);
      keys.add(optionValue(key, path));
    }
  }
  return keys;
}

export function buildPackageCategoryFilterKey(values = {}, levelIndex) {
  const resolvedLevel = Number(levelIndex);
  if (
    !Number.isInteger(resolvedLevel) ||
    resolvedLevel < 0 ||
    resolvedLevel >= PRODUCT_CATEGORY_LEVELS.length
  ) {
    return '';
  }
  const path = PRODUCT_CATEGORY_LEVELS.slice(0, resolvedLevel + 1)
    .map(({ key }) => String(values?.[key] ?? '').trim())
    .filter(Boolean);
  if (path.length === 0) return '';
  return optionValue(PRODUCT_CATEGORY_LEVELS[resolvedLevel].key, path);
}
