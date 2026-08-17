import { PRODUCTS_TAB_IDS } from '@/components/products/constants';
import { formatPriceDisplay } from '@/components/products/products-price-utils';

export function isJobProductType(type) {
  return type === PRODUCTS_TAB_IDS.JOB || type === 'job';
}

export function getSpecificationSectionTitle(devxProductType) {
  return isJobProductType(devxProductType) ? 'Job Specifications' : 'Product Specification';
}

export function hasFilledPrice(value) {
  return Boolean(String(value ?? '').trim());
}

export function hasJobComponentRates(materialBasicRate, labourBaseRate) {
  return hasFilledPrice(materialBasicRate) || hasFilledPrice(labourBaseRate);
}

export function areJobRatesEqual(a, b) {
  const amountA = parseNumericPrice(a);
  const amountB = parseNumericPrice(b);
  if (amountA === null && amountB === null) return true;
  return amountA === amountB;
}

export function parseNumericPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replaceAll('₹', '').replaceAll(',', '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatPriceInputValue(value) {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString('en-IN');
}

export function normalizeJobRateFields(entity = {}) {
  const materialBasicRate =
    entity.materialBasicRate ??
    entity.material_base_rate ??
    entity.materialBaseRate ??
    entity.material_basic_rate ??
    entity.custom_material_base_rate ??
    entity.materialBasicRateMin ??
    entity.material_basic_rate_min ??
    entity.materialBasicRateMax ??
    entity.material_basic_rate_max ??
    '';

  const labourBaseRate =
    entity.labourBaseRate ??
    entity.labour_base_rate ??
    entity.labourBaseRate ??
    entity.custom_labour_base_rate ??
    entity.labourBaseRateMin ??
    entity.labour_base_rate_min ??
    entity.labourBaseRateMax ??
    entity.labour_base_rate_max ??
    '';

  return {
    materialBasicRate: String(materialBasicRate ?? '').trim(),
    labourBaseRate: String(labourBaseRate ?? '').trim(),
  };
}

export function computeJobTotalRate(materialBasicRate, labourBaseRate) {
  const materialValue = parseNumericPrice(materialBasicRate);
  const labourValue = parseNumericPrice(labourBaseRate);

  if (materialValue === null && labourValue === null) {
    return '';
  }

  const total = (materialValue ?? 0) + (labourValue ?? 0);
  if (total === 0) {
    return '';
  }

  return formatPriceInputValue(total);
}

/** @deprecated Use computeJobTotalRate */
export function computeJobTotalRates(materialMin, materialMax, labourMin, labourMax) {
  const material = materialMin || materialMax;
  const labour = labourMin || labourMax;
  const total = computeJobTotalRate(material, labour);
  return { min: total, max: total };
}

export function formatJobRate(value) {
  const text = String(value ?? '').trim();
  if (!text) return '--';
  return formatPriceDisplay(text);
}

/** @deprecated Use formatJobRate */
export function formatJobRateRange(min, max) {
  return formatJobRate(min || max);
}

export function getJobRateFields(entity = {}) {
  return normalizeJobRateFields(entity);
}

export function syncJobPurchasePrices(entity = {}) {
  const rates = normalizeJobRateFields(entity);
  const hasComponents = hasJobComponentRates(rates.materialBasicRate, rates.labourBaseRate);
  const manualTotal = String(entity.minPurchasePrice ?? entity.maxPurchasePrice ?? '').trim();

  if (!hasComponents) {
    if (manualTotal) {
      return {
        ...entity,
        ...rates,
        minPurchasePrice: manualTotal,
        maxPurchasePrice: manualTotal,
      };
    }

    return {
      ...entity,
      ...rates,
    };
  }

  const total = computeJobTotalRate(rates.materialBasicRate, rates.labourBaseRate);
  if (!total) {
    return {
      ...entity,
      ...rates,
    };
  }

  return {
    ...entity,
    ...rates,
    minPurchasePrice: total,
    maxPurchasePrice: total,
  };
}

export function buildJobVariationPricePatch(variant = {}, patch = {}) {
  return syncJobPurchasePrices({ ...variant, ...patch });
}
