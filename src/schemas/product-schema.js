import { z } from 'zod';

import { isJobProductType, hasFilledPrice } from '@/components/products/products-job-pricing';

export function hasFilledPriceRange(minPrice, maxPrice) {
  return Boolean(String(minPrice ?? '').trim() || String(maxPrice ?? '').trim());
}

function getJobRatePricingError({
  materialBasicRate = '',
  labourBaseRate = '',
  minPurchasePrice = '',
  maxPurchasePrice = '',
  minSellingPrice = '',
  maxSellingPrice = '',
  requiredMessage = 'Total rate is required.',
  sellingMessage = 'Selling price is required.',
} = {}) {
  const hasComponents = hasFilledPrice(materialBasicRate) || hasFilledPrice(labourBaseRate);
  const hasTotal = hasFilledPriceRange(minPurchasePrice, maxPurchasePrice);

  if (!hasComponents && !hasTotal) {
    return requiredMessage;
  }
  if (!hasFilledPriceRange(minSellingPrice, maxSellingPrice)) {
    return sellingMessage;
  }
  return null;
}

export function getJobPricingValidationError({
  applyPriceToAllVariations = false,
  hasVariations = false,
  materialBasicRate = '',
  labourBaseRate = '',
  minPurchasePrice = '',
  maxPurchasePrice = '',
  minSellingPrice = '',
  maxSellingPrice = '',
  variations = [],
} = {}) {
  const requiresProductLevelPrices = !hasVariations || applyPriceToAllVariations;

  if (requiresProductLevelPrices) {
    return getJobRatePricingError({
      materialBasicRate,
      labourBaseRate,
      minPurchasePrice,
      maxPurchasePrice,
      minSellingPrice,
      maxSellingPrice,
      requiredMessage: hasVariations
        ? 'Total rate is required at the job level when applying price to all variations.'
        : 'Total rate is required.',
      sellingMessage: hasVariations
        ? 'Selling price is required at the job level when applying price to all variations.'
        : 'Selling price is required.',
    });
  }

  for (const variation of variations) {
    const label = variation.name?.trim() || variation.optionKey?.trim() || 'Variation';
    const variationError = getJobRatePricingError({
      materialBasicRate: variation.materialBasicRate,
      labourBaseRate: variation.labourBaseRate,
      minPurchasePrice: variation.minPurchasePrice,
      maxPurchasePrice: variation.maxPurchasePrice,
      minSellingPrice: variation.minSellingPrice,
      maxSellingPrice: variation.maxSellingPrice,
      requiredMessage: `Total rate is required for "${label}".`,
      sellingMessage: `Selling price is required for "${label}".`,
    });
    if (variationError) {
      return variationError;
    }
  }

  return null;
}

/** Stock add drawer — single price required; no selling price range. */
export function getStockPricingValidationError({
  minPurchasePrice = '',
  maxPurchasePrice = '',
} = {}) {
  if (!hasFilledPriceRange(minPurchasePrice, maxPurchasePrice)) {
    return 'Price is required.';
  }
  return null;
}

export function getPricingValidationError({ devxProductType, stockMode = false, ...rest } = {}) {
  if (stockMode) {
    return getStockPricingValidationError(rest);
  }
  if (isJobProductType(devxProductType)) {
    return getJobPricingValidationError(rest);
  }
  return getProductPricingValidationError(rest);
}

export function getProductPricingValidationError({
  applyPriceToAllVariations = false,
  hasVariations = false,
  minPurchasePrice = '',
  maxPurchasePrice = '',
  minSellingPrice = '',
  maxSellingPrice = '',
  variations = [],
} = {}) {
  const requiresProductLevelPrices = !hasVariations || applyPriceToAllVariations;

  if (requiresProductLevelPrices) {
    if (!hasFilledPriceRange(minPurchasePrice, maxPurchasePrice)) {
      return hasVariations
        ? 'Purchase price is required at the product level when applying price to all variations.'
        : 'Purchase price is required.';
    }
    if (!hasFilledPriceRange(minSellingPrice, maxSellingPrice)) {
      return hasVariations
        ? 'Selling price is required at the product level when applying price to all variations.'
        : 'Selling price is required.';
    }
    return null;
  }

  for (const variation of variations) {
    const label = variation.name?.trim() || variation.optionKey?.trim() || 'Variation';
    if (!hasFilledPriceRange(variation.minPurchasePrice, variation.maxPurchasePrice)) {
      return `Purchase price is required for "${label}".`;
    }
    if (!hasFilledPriceRange(variation.minSellingPrice, variation.maxSellingPrice)) {
      return `Selling price is required for "${label}".`;
    }
  }

  return null;
}

/** Validate a single variation save — required only when apply-to-all is off. */
export function getVariationSavePricingError(
  variation,
  applyPriceToAllVariations = false,
  devxProductType = 'product',
) {
  if (applyPriceToAllVariations) return null;
  return getPricingValidationError({
    devxProductType,
    applyPriceToAllVariations: false,
    hasVariations: true,
    variations: [variation],
    materialBasicRate: variation.materialBasicRate,
    labourBaseRate: variation.labourBaseRate,
    minPurchasePrice: variation.minPurchasePrice,
    maxPurchasePrice: variation.maxPurchasePrice,
    minSellingPrice: variation.minSellingPrice,
    maxSellingPrice: variation.maxSellingPrice,
  });
}

export const productAddItemSchema = z.object({
  productName: z.string().trim().min(1, 'Product name is required'),
  productType: z.string().min(1, 'Product category is required'),
  brand: z.string().trim().optional(),
  make: z.string().trim().optional(),
  vendors: z.array(z.string().trim().min(1)).optional().default([]),
  productWebsiteLink: z.string().trim().optional(),
  categoryGroup: z.string().optional(),
  categoryType: z.string().optional(),
  productGroup: z.string().optional(),
  manufacturer: z.string().trim().optional(),
  modelNumber: z.string().trim().optional(),
  unitOfMeasure: z.string().trim().min(1, 'UOM is required'),
  description: z.string().trim().optional(),
  specificationNotes: z.string().trim().optional(),
  widthMm: z.string().trim().optional(),
  depthMm: z.string().trim().optional(),
  heightMm: z.string().trim().optional(),
  dimensions: z.string().trim().optional(),
  material: z.string().trim().optional(),
  finish: z.string().trim().optional(),
  colourFinishOptions: z.string().trim().optional(),
  warranty: z.string().trim().optional(),
  expectedLifeYears: z.string().trim().optional(),
  loadCapacity: z.string().trim().optional(),
  seatingCapacity: z.string().trim().optional(),
  powerRequirement: z.string().trim().optional(),
  connectivity: z.string().trim().optional(),
  installationRequirement: z.string().trim().optional(),
  maintenanceNotes: z.string().trim().optional(),
  technicalNotes: z.string().trim().optional(),
  purchasePrice: z.string().trim().optional(),
  sellingPrice: z.string().trim().optional(),
  minPurchasePrice: z.string().trim().optional(),
  maxPurchasePrice: z.string().trim().optional(),
  materialBasicRate: z.string().trim().optional(),
  labourBaseRate: z.string().trim().optional(),
  minSellingPrice: z.string().trim().optional(),
  maxSellingPrice: z.string().trim().optional(),
  gstRate: z.string().trim().optional(),
  hsnCode: z.string().trim().min(1, 'HSN code is required'),
  moq: z.string().trim().optional(),
  pricingNotes: z.string().trim().optional(),
  customType: z.string().trim().optional(),
  applyPriceToAllVariations: z.boolean().optional(),
});

export const defaultProductAddItemValues = {
  productName: '',
  productType: '',
  customType: '',
  brand: '',
  make: '',
  vendors: [],
  productWebsiteLink: '',
  categoryGroup: '',
  categoryType: '',
  productGroup: '',
  manufacturer: '',
  modelNumber: '',
  unitOfMeasure: '',
  description: '',
  specificationNotes: '',
  widthMm: '',
  depthMm: '',
  heightMm: '',
  dimensions: '',
  material: '',
  finish: '',
  colourFinishOptions: '',
  warranty: '',
  expectedLifeYears: '',
  loadCapacity: '',
  seatingCapacity: '',
  powerRequirement: '',
  connectivity: '',
  installationRequirement: '',
  maintenanceNotes: '',
  technicalNotes: '',
  purchasePrice: '',
  sellingPrice: '',
  minPurchasePrice: '',
  maxPurchasePrice: '',
  materialBasicRate: '',
  labourBaseRate: '',
  minSellingPrice: '',
  maxSellingPrice: '',
  gstRate: '',
  hsnCode: '',
  moq: '',
  pricingNotes: '',
  applyPriceToAllVariations: false,
};

export const productPackageAddItemSchema = z.object({
  productName: z.string().trim().min(1, 'Package name is required'),
  productType: z.string().min(1, 'Product category is required'),
  categoryGroup: z.string().optional(),
  categoryType: z.string().optional(),
  productGroup: z.string().optional(),
  description: z.string().trim().optional(),
  specificationNotes: z.string().trim().optional(),
  minPurchasePrice: z.string().trim().optional(),
  maxPurchasePrice: z.string().trim().optional(),
  minSellingPrice: z.string().trim().optional(),
  maxSellingPrice: z.string().trim().optional(),
  gstRate: z.string().trim().optional(),
  moq: z.string().trim().optional(),
  pricingNotes: z.string().trim().optional(),
});

const productDocumentTypeFields = {
  documentType: z.string().min(1, 'Document type is required'),
  otherDocumentType: z.string().optional(),
};

function refineProductOtherDocumentType(data, ctx) {
  if (data.documentType === 'Other' && !data.otherDocumentType?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['otherDocumentType'],
      message: 'Other type is required',
    });
  }
}

export const addProductDocumentSchema = z
  .object({
    ...productDocumentTypeFields,
    file: z.any().optional(),
  })
  .superRefine(refineProductOtherDocumentType);

export const editProductDocumentSchema = z
  .object({
    ...productDocumentTypeFields,
    file: z.any().optional(),
  })
  .superRefine(refineProductOtherDocumentType);

export const defaultProductPackageAddItemValues = {
  productName: '',
  productType: '',
  categoryGroup: '',
  categoryType: '',
  productGroup: '',
  description: '',
  specificationNotes: '',
  minPurchasePrice: '',
  maxPurchasePrice: '',
  minSellingPrice: '',
  maxSellingPrice: '',
  gstRate: '',
  moq: '',
  pricingNotes: '',
};
