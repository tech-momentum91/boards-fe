import { BOQ_PRODUCT_SOURCE } from '@/components/boq/constants';
import { createProduct } from '@/api/products';
import {
  buildBoqTemplateProductApiPayload,
  extractBoqTemplateProductMutationResult,
} from '@/api/boqProductPayload';
import { updateProjectBoqProduct } from '@/api/projectBoqs';
import { updatePurchaseBoqProduct } from '@/api/purchaseBoq';

export function mapBoqLineToConvertProductFormValues(lineItem = {}) {
  const purchaseRate = Number(lineItem.purchaseRate ?? lineItem.minPurchasePrice) || 0;
  const sellingRate = Number(lineItem.sellingRate ?? lineItem.minSellingPrice) || 0;
  const priceText = purchaseRate > 0 ? String(purchaseRate) : '';

  return {
    productName: String(lineItem.product ?? lineItem.item ?? '').trim(),
    categoryGroup: lineItem.categoryGroup ?? '',
    categoryType: lineItem.categoryType ?? lineItem.categoryId ?? '',
    productGroup: lineItem.productGroup ?? lineItem.section ?? '',
    productType: lineItem.productCategory ?? lineItem.productType ?? lineItem.itemGroup ?? '',
    unitOfMeasure: lineItem.units ?? '',
    minPurchasePrice: priceText,
    maxPurchasePrice: priceText,
    minSellingPrice: sellingRate > 0 ? String(sellingRate) : priceText,
    maxSellingPrice: sellingRate > 0 ? String(sellingRate) : priceText,
    brand: lineItem.brand ?? '',
    description: lineItem.description ?? '',
    hsnCode: '',
    devxProductType: 'product',
  };
}

function buildUpdatePayloadFromLine(lineItem, itemCode) {
  return buildBoqTemplateProductApiPayload(
    {
      ...lineItem,
      item: itemCode,
      itemCode,
      productSource: BOQ_PRODUCT_SOURCE.PRODUCT,
      isLinkedToProduct: true,
    },
    { section: lineItem.section },
  );
}

export async function convertBoqLineToProduct({ lineItem, formValues, boqContext = {} }) {
  if (!lineItem?.id) {
    throw new Error('Line item is required.');
  }

  const createResult = await createProduct(formValues);
  const itemCode = String(createResult?.name ?? '').trim();
  if (!itemCode) {
    throw new Error('Product was created but no item code was returned.');
  }

  const updatePayload = buildUpdatePayloadFromLine(lineItem, itemCode);
  const { type, boqCode, projectId, purchaseBoqName } = boqContext;
  let updatedLine = lineItem;

  if (type === 'purchase') {
    const result = await updatePurchaseBoqProduct({
      project: projectId,
      purchaseBoq: purchaseBoqName,
      rowName: lineItem.id,
      payload: {
        ...updatePayload,
        boqCategory: lineItem.boqCategory ?? '',
        purchaseCategory: lineItem.purchaseCategory ?? '',
      },
    });
    updatedLine = extractBoqTemplateProductMutationResult(result).product;

    const sourceProjectBoq = String(lineItem.sourceProjectBoq ?? '').trim();
    const sourceBoqItem = String(lineItem.sourceBoqItem ?? '').trim();
    if (sourceProjectBoq && sourceBoqItem) {
      await updateProjectBoqProduct(sourceProjectBoq, sourceBoqItem, updatePayload);
    }
  } else {
    const result = await updateProjectBoqProduct(boqCode, lineItem.id, updatePayload);
    updatedLine = extractBoqTemplateProductMutationResult(result).product;
  }

  return {
    itemCode,
    product: createResult?.product ?? null,
    lineItem: {
      ...updatedLine,
      item: itemCode,
      itemCode,
      productSource: BOQ_PRODUCT_SOURCE.PRODUCT,
      isLinkedToProduct: true,
    },
  };
}
