import apiClient from './axios';

const FORM_OPTIONS_METHOD =
  '/method/devx.product.api.product_form_options.get_product_form_options';
const CREATE_FORM_OPTION_METHOD =
  '/method/devx.product.api.product_form_options.create_product_form_option_api';
const GET_HSN_CODE_METHOD = '/method/devx.product.api.product_form_options.get_product_hsn_code';

export const PRODUCT_FORM_FIELDS = {
  BRAND: 'brand',
  VENDOR: 'vendor',
  CATEGORY: 'category',
  DOCUMENT_TYPE: 'document_type',
  CATEGORY_GROUP: 'category_group',
  CATEGORY_TYPE: 'category_type',
  PRODUCT_GROUP: 'product_group',
  PRODUCT_TYPE: 'product_type',
  HSN_CODE: 'hsn_code',
  UOM: 'uom',
};

export const PRODUCT_FORM_CREATE_LABELS = {
  [PRODUCT_FORM_FIELDS.BRAND]: 'Create new brand',
  [PRODUCT_FORM_FIELDS.VENDOR]: 'Create new vendor',
  [PRODUCT_FORM_FIELDS.CATEGORY]: 'Create new category',
  [PRODUCT_FORM_FIELDS.CATEGORY_GROUP]: 'Create new category group',
  [PRODUCT_FORM_FIELDS.CATEGORY_TYPE]: 'Create new category',
  [PRODUCT_FORM_FIELDS.PRODUCT_GROUP]: 'Create new product group',
  [PRODUCT_FORM_FIELDS.PRODUCT_TYPE]: 'Create new product type',
  [PRODUCT_FORM_FIELDS.UOM]: 'Create new unit',
  [PRODUCT_FORM_FIELDS.DOCUMENT_TYPE]: 'Create new document type',
};

const CATEGORY_LEVEL_FIELDS = [
  PRODUCT_FORM_FIELDS.CATEGORY_GROUP,
  PRODUCT_FORM_FIELDS.CATEGORY_TYPE,
  PRODUCT_FORM_FIELDS.PRODUCT_GROUP,
  PRODUCT_FORM_FIELDS.PRODUCT_TYPE,
];

function unwrapMessage(data) {
  return data?.message ?? data ?? {};
}

/**
 * Search dropdown options for the product add drawer.
 *
 * @param {Object} params
 * @param {'brand'|'vendor'|'category'|'document_type'|'category_group'|'category_type'|'product_group'|'product_type'} params.field
 * @param {string} [params.search]
 * @param {string} [params.categoryGroup]
 * @param {string} [params.categoryType]
 * @param {string} [params.productGroup]
 * @param {number} [params.limit]
 * @returns {Promise<Array<{ value: string, label: string, id: string, row?: object }>>}
 */
/**
 * Create a new dropdown option for the product form (brand, vendor, category, UOM, etc.).
 *
 * @param {Object} params
 * @param {string} params.field
 * @param {string} params.name
 * @param {string} [params.categoryGroup]
 * @param {string} [params.categoryType]
 * @param {string} [params.productGroup]
 * @returns {Promise<{ value: string, label: string, id: string, row?: object }>}
 */
export async function createProductFormOption(params = {}) {
  const { field, name, categoryGroup, categoryType, productGroup } = params;
  const trimmedName = String(name ?? '').trim();
  if (!field || !trimmedName) {
    throw new Error('Field and name are required to create an option.');
  }

  const { data } = await apiClient.post(CREATE_FORM_OPTION_METHOD, {
    field,
    name: trimmedName,
    ...(categoryGroup ? { category_group: categoryGroup, categoryGroup } : {}),
    ...(categoryType ? { category_type: categoryType, categoryType } : {}),
    ...(productGroup ? { product_group: productGroup, productGroup } : {}),
  });

  const payload = unwrapMessage(data);
  const option = payload?.option ?? payload;
  if (!option?.value) {
    throw new Error('Failed to create option.');
  }
  return option;
}

export async function searchProductFormOptions(params = {}) {
  const {
    field,
    search,
    categoryGroup,
    categoryType,
    productGroup,
    limit,
    assetType,
    excludeOpex,
    excludeRoots,
  } = params;

  const { data } = await apiClient.get(FORM_OPTIONS_METHOD, {
    params: {
      field,
      ...(search?.trim() ? { search: search.trim() } : {}),
      ...(categoryGroup ? { category_group: categoryGroup } : {}),
      ...(categoryType ? { category_type: categoryType } : {}),
      ...(productGroup ? { product_group: productGroup } : {}),
      ...(limit ? { limit } : {}),
      ...(assetType ? { asset_type: assetType, assetType } : {}),
      ...(excludeOpex ? { exclude_opex: 1, excludeOpex: 1 } : {}),
      ...(excludeRoots?.length
        ? {
            exclude_roots: JSON.stringify(excludeRoots),
            excludeRoots: JSON.stringify(excludeRoots),
          }
        : {}),
    },
  });

  const payload = unwrapMessage(data);
  const options = payload?.options ?? payload;
  return Array.isArray(options) ? options : [];
}

export function getCategoryFieldForLevel(levelIndex) {
  return CATEGORY_LEVEL_FIELDS[levelIndex] ?? PRODUCT_FORM_FIELDS.CATEGORY_GROUP;
}

/** Stored form value for dropdown/tags. */
export function getProductFormOptionValue(field, option) {
  return String(option?.value ?? option ?? '').trim();
}

/** Display label for dropdown/tags. */
export function getProductFormOptionLabel(field, option) {
  return String(option?.label ?? option?.value ?? option ?? '').trim();
}

/** Fetch product document type options for the documents upload section. */
export async function listProductDocumentTypes(params = {}) {
  return searchProductFormOptions({
    field: PRODUCT_FORM_FIELDS.DOCUMENT_TYPE,
    ...params,
  });
}

/** Fetch a single GST HSN Code by code (for product form display). */
export async function getProductHsnCode(hsnCode) {
  const code = String(hsnCode ?? '').trim();
  if (!code) return null;
  const { data } = await apiClient.get(GET_HSN_CODE_METHOD, {
    params: { hsn_code: code },
  });
  const payload = unwrapMessage(data);
  return payload?.hsn_code ? payload : null;
}
