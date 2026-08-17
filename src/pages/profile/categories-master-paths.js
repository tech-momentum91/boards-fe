export const CATEGORIES_MASTER_ROOT = '/settings/categories-master';

export const CATEGORIES_MASTER_PRODUCT = `${CATEGORIES_MASTER_ROOT}/product`;
export const CATEGORIES_MASTER_OPEX = `${CATEGORIES_MASTER_ROOT}/opex`;
export const CATEGORIES_MASTER_BILLING = `${CATEGORIES_MASTER_ROOT}/billing`;

export const PRODUCT_CATEGORIES_DEFAULT_SECTION = 'category-group';

export function productCategoriesPath(section = PRODUCT_CATEGORIES_DEFAULT_SECTION) {
  return `${CATEGORIES_MASTER_PRODUCT}/${section}`;
}

export function opexCategoriesPath() {
  return CATEGORIES_MASTER_OPEX;
}

export function billingCategoriesPath() {
  return CATEGORIES_MASTER_BILLING;
}
