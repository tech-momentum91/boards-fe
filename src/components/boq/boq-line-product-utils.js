import { BOQ_PRODUCT_SOURCE } from '@/components/boq/constants';

export function isBoqLineNonProduct(row = {}) {
  if (row?.isLinkedToProduct === true) return false;
  if (row?.isLinkedToProduct === false) return true;
  if (row?.productSource === BOQ_PRODUCT_SOURCE.CUSTOM) return true;
  const code = String(row?.itemCode ?? row?.item ?? '').trim();
  return !code;
}

export function getNonProductLinesFromSelection(selectedProducts = []) {
  if (!Array.isArray(selectedProducts)) return [];
  return selectedProducts.filter((row) => isBoqLineNonProduct(row));
}

export function selectionHasNonProductLines(selectedProducts = []) {
  return getNonProductLinesFromSelection(selectedProducts).length > 0;
}
