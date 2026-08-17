export function formatPackageGstRate(value) {
  if (value == null || value === '') return '--';
  const normalized = String(value).trim();
  return normalized.endsWith('%') ? normalized : `${normalized}%`;
}

export function formatPackageMoq(product) {
  if (product.moq == null || product.moq === '') return '--';
  const moq = String(product.moq).trim();
  const uom = String(product.uom || 'Nos').trim();
  if (!uom || moq.toLowerCase().includes(uom.toLowerCase())) return moq;
  return `${moq} ${uom}`;
}

export function getProductCategoryFieldValues(product = {}) {
  const category = product.category || {};

  return {
    categoryGroup: product.categoryGroup || category.categoryGroup || '',
    categoryType: product.categoryType || category.categoryType || '',
    productGroup: product.productGroup || category.productGroup || '',
    productType: product.productType || category.productType || '',
  };
}

export function buildPackageMetaLabel(product) {
  return [product.packageCode || product.productCode, product.categoryGroup, product.productGroup]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function buildPackageCategoryFilters(product) {
  return getProductCategoryFieldValues(product);
}

export function createPackageDraftItemRow() {
  return {
    id: `draft-${crypto.randomUUID()}`,
    isDraft: true,
    name: '',
    productCode: '',
    brand: '',
    categoryGroup: '',
    categoryType: '',
    productGroup: '',
    productType: '',
    quantity: '1',
    uom: '',
    purchasePrice: '',
    sellingPrice: '',
    status: '',
    imageUrl: null,
  };
}

export function toBundleItemsPayload(rows = []) {
  return rows
    .filter((row) => !row.isDraft && row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
    }));
}
