import { BOQ_PRODUCT_SOURCE, PROJECT_BOQ_DEFAULT_AREA_LOCATION } from '@/components/boq/constants';

function resolveProjectBoqAreaLocation(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || PROJECT_BOQ_DEFAULT_AREA_LOCATION;
}

export function buildBoqTemplateProductApiPayload(product = {}, { section } = {}) {
  const purchaseRate = Number(product.purchaseRate) || 0;
  const sellingRate = Number(product.sellingRate) || 0;
  const isCustomLine = product.productSource === BOQ_PRODUCT_SOURCE.CUSTOM;
  const itemCode = isCustomLine
    ? String(product.product ?? product.item ?? product.itemCode ?? '').trim()
    : (product.item || product.itemCode || '').trim();

  const payload = {
    item: itemCode,
    itemCode,
    categoryGroup: product.categoryGroup || '',
    categoryType: product.categoryType || product.categoryId || '',
    productGroup: product.productGroup || product.section || section || '',
    productCategory: product.productCategory || product.productType || product.itemGroup || '',
    description: product.description || '',
    brand: product.brand || '',
    units: product.units || '',
    sqft: product.sqft ?? '',
    make: product.make || '',
    notes: product.notes || '',
    minPurchasePrice: product.minPurchasePrice ?? purchaseRate,
    maxPurchasePrice: product.maxPurchasePrice ?? purchaseRate,
    minSellingPrice: product.minSellingPrice ?? sellingRate,
    maxSellingPrice: product.maxSellingPrice ?? sellingRate,
    purchaseRate,
    sellingRate,
    areaLocation: resolveProjectBoqAreaLocation(
      product.areaLocation || product.area_location || '',
    ),
    quantity: product.quantity ?? '',
    quantityByFloor: Array.isArray(product.quantityByFloor) ? product.quantityByFloor : [],
    productSource: product.productSource || BOQ_PRODUCT_SOURCE.PRODUCT,
    boqCategory: product.boqCategory ?? '',
    purchaseCategory: product.purchaseCategory ?? '',
  };

  if (product._lumpsumQuantitySync) {
    payload.lumpsum_quantity_sync = 1;
  }

  return payload;
}

function resolvePositiveRate(...candidates) {
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) return String(candidate);
  }
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    return String(candidate);
  }
  return '';
}

export function applyBoqMasterProductToForm(product = {}) {
  const purchaseRate = resolvePositiveRate(
    product.purchaseRate,
    product.minPurchasePrice,
    product.maxPurchasePrice,
  );
  const sellingRate = resolvePositiveRate(
    product.sellingRate,
    product.maxSellingPrice,
    product.minSellingPrice,
  );
  const itemCode = (product.itemCode || product.item || product.id || '').trim();
  const imageUrl = String(product.imageUrl ?? product.image ?? '').trim();

  return {
    product: product.product || '',
    areaLocation: resolveProjectBoqAreaLocation(product.areaLocation),
    description: product.description ?? '',
    brand: product.brand ?? '',
    units: product.units ?? '',
    sqft: product.sqft == null || product.sqft === '' ? '' : String(product.sqft),
    purchaseRate,
    sellingRate,
    make: product.make ?? '',
    notes: product.notes ?? '',
    itemCode,
    item: itemCode,
    categoryGroup: product.categoryGroup || '',
    categoryType: product.categoryType || product.categoryId || '',
    productGroup: product.productGroup || product.section || '',
    productCategory: product.productCategory || product.productType || product.itemGroup || '',
    minPurchasePrice: product.minPurchasePrice,
    maxPurchasePrice: product.maxPurchasePrice,
    minSellingPrice: product.minSellingPrice,
    maxSellingPrice: product.maxSellingPrice,
    quantity: product.quantity ?? '',
    quantityByFloor: Array.isArray(product.quantityByFloor) ? product.quantityByFloor : [],
    productSource: product.productSource || BOQ_PRODUCT_SOURCE.PRODUCT,
    imageUrl,
  };
}

export function normalizeBoqTemplateProductRow(row = {}, { section } = {}) {
  const itemCode = (row.itemCode || row.item || '').trim();
  const productName = (row.product || row.itemName || row.item_name || '').trim();
  const boqId = (row.boqId || row.sourceProjectBoq || '').trim();

  return {
    ...row,
    id: row.id || row.name,
    section: row.section || row.productGroup || section || '',
    product: productName || itemCode,
    item: itemCode,
    itemCode,
    isLinkedToProduct: row.isLinkedToProduct,
    productSource: row.productSource ?? row.product_source ?? '',
    boqId: boqId || undefined,
    sourceProjectBoq: (row.sourceProjectBoq || '').trim() || undefined,
    sourceBoqItem: (row.sourceBoqItem || '').trim() || undefined,
    areaLocation: resolveProjectBoqAreaLocation(row.areaLocation ?? row.area_location),
    quantity: row.quantity ?? '',
    sqft: row.sqft == null || row.sqft === '' ? '' : Number(row.sqft) || '',
    quantityByFloor: Array.isArray(row.quantityByFloor) ? row.quantityByFloor : [],
    purchaseRate: Number(row.purchaseRate ?? row.minPurchasePrice) || 0,
    sellingRate: Number(row.sellingRate ?? row.maxSellingPrice ?? row.minSellingPrice) || 0,
    imageUrl: String(row.imageUrl ?? row.image ?? '').trim(),
    lineValue:
      row.lineValue != null && row.lineValue !== '' ? Number(row.lineValue) || 0 : undefined,
    poQuantity: row.poQuantity != null && row.poQuantity !== '' ? Number(row.poQuantity) || 0 : 0,
    poRate: row.poRate != null && row.poRate !== '' ? Number(row.poRate) || 0 : 0,
    poValue: row.poValue != null && row.poValue !== '' ? Number(row.poValue) || 0 : 0,
    poQuantityLabel: row.poQuantityLabel ?? '',
  };
}

export function mapBoqTemplateMasterApiRow(row = {}) {
  return applyBoqMasterProductToForm({
    ...row,
    product: row.product || row.item_name || row.name,
    itemCode: row.itemCode || row.id || row.name,
  });
}

export function extractBoqTemplateProductMutationResult(result = {}) {
  const product = result.product && typeof result.product === 'object' ? result.product : result;
  return {
    product: normalizeBoqTemplateProductRow(product),
    summary: result.summary,
    productCount: result.productCount,
  };
}

/** Map product-master modal rows to the shared add-products API payload. */
export function buildBoqMasterSelectionPayload(selectedProducts = []) {
  return selectedProducts.map((row) =>
    buildBoqTemplateProductApiPayload(row, { section: row.section }),
  );
}

/** Map previous-project modal rows to the shared add-products API payload. */
export function buildBoqPreviousProjectSelectionPayload(selectedProducts = []) {
  return selectedProducts.map((row) =>
    buildBoqTemplateProductApiPayload(
      { ...row, productSource: BOQ_PRODUCT_SOURCE.PREVIOUS_PROJECT },
      { section: row.section || row.productGroup },
    ),
  );
}
