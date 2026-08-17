import { extractErrorMessage } from '@/utils/error-utils';
import apiClient from './axios';

const CREATE_PRODUCT_METHOD = '/method/devx.product.api.products.create_product';
const UPDATE_PRODUCT_METHOD = '/method/devx.product.api.products.update_product';
const DELETE_PRODUCT_METHOD = '/method/devx.product.api.products.delete_product';
const GET_PRODUCT_METHOD = '/method/devx.product.api.products.get_product';
import {
  computeJobTotalRate,
  formatJobRate,
  isJobProductType,
  syncJobPurchasePrices,
} from '@/components/products/products-job-pricing';
import {
  getProductFileSizeError,
  normalizeProductUploadError,
} from '@/components/products/product-upload-utils';
import { applyVariationMediaUpdate } from '@/components/products/variation-media';

const LIST_PRODUCTS_METHOD = '/method/devx.product.api.products.get_product_list';

const PRODUCT_LIST_GROUP_BY_API = {
  categoryGroup: 'category_group',
  categoryType: 'category_type',
  productGroup: 'product_group',
  productType: 'product_type',
  status: 'status',
};

export const PRODUCTS_GROUP_LIST_LIMIT = 5;
export const PRODUCTS_GROUP_ITEMS_LIMIT = 20;
const CREATE_PRODUCT_PACKAGE_METHOD =
  '/method/devx.product.api.product_packages.create_product_package';
const UPDATE_PRODUCT_PACKAGE_METHOD =
  '/method/devx.product.api.product_packages.update_product_package';
const DELETE_PRODUCT_PACKAGE_METHOD =
  '/method/devx.product.api.product_packages.delete_product_package';
const DUPLICATE_PRODUCT_PACKAGE_METHOD =
  '/method/devx.product.api.product_packages.duplicate_product_package';
const GET_PRODUCT_PACKAGE_METHOD = '/method/devx.product.api.product_packages.get_product_package';
const UPLOAD_FILE_METHOD = '/method/upload_file';

function unwrapMessage(data) {
  return data?.message ?? data ?? {};
}

function assertNoExc(result) {
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
}

function trimOptionalText(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || undefined;
}

function getUploadedFileUrl(result) {
  const message = result?.message ?? result ?? {};
  if (typeof message === 'string' && message.trim()) return message.trim();
  const fileUrl =
    message?.file_url ??
    message?.fileUrl ??
    message?.url ??
    message?.file ??
    result?.file_url ??
    result?.fileUrl ??
    result?.url;
  return typeof fileUrl === 'string' ? fileUrl.trim() : '';
}

async function uploadFrappeFile(file, { doctype, docname } = {}) {
  if (!(file instanceof File)) {
    throw new TypeError('Invalid file.');
  }

  const sizeError = getProductFileSizeError(file);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_private', '0');
  if (doctype && docname) {
    formData.append('doctype', doctype);
    formData.append('docname', String(docname));
  }

  try {
    const { data: response } = await apiClient.post(UPLOAD_FILE_METHOD, formData);

    if (response?.exc_type) {
      throw {
        message:
          typeof response?.message === 'string'
            ? response.message
            : 'File upload failed. Please try again.',
        exc_type: response.exc_type,
        response: { data: response },
      };
    }

    const fileUrl = getUploadedFileUrl(response);
    if (!fileUrl) {
      throw new Error(`Upload succeeded for "${file.name}" but no file URL was returned.`);
    }

    return fileUrl;
  } catch (error) {
    if (error instanceof Error && !error.response && !error.exc_type) {
      throw error;
    }

    throw new Error(normalizeProductUploadError(error));
  }
}

async function uploadProductFile(file) {
  return uploadFrappeFile(file);
}

/**
 * Upload product images/documents one file at a time to avoid 413 payload limits.
 */
async function uploadCategoryFiles(categoryFiles = {}, { allowMissingDocumentType = false } = {}) {
  const tasks = [];

  for (const entry of categoryFiles.productImages || []) {
    if (entry?.file instanceof File) {
      tasks.push(
        uploadProductFile(entry.file).then((url) => ({
          kind: 'image',
          url,
        })),
      );
    }
  }

  for (const entry of categoryFiles.brochures || []) {
    if (entry?.file instanceof File) {
      tasks.push(
        uploadProductFile(entry.file).then((url) => ({
          kind: 'document',
          row: {
            document_type: 'Brochure',
            document_file: url,
            file_name: entry.fileName || entry.file.name,
          },
        })),
      );
    }
  }

  Object.entries(categoryFiles).forEach(([documentType, fileList]) => {
    if (documentType === 'productImages' || documentType === 'brochures') return;
    const resolvedDocumentType =
      documentType === 'documents' && allowMissingDocumentType ? '' : documentType;
    for (const entry of fileList || []) {
      if (entry?.file instanceof File) {
        tasks.push(
          uploadProductFile(entry.file).then((url) => ({
            kind: 'document',
            row: {
              ...(resolvedDocumentType ? { document_type: resolvedDocumentType } : {}),
              document_file: url,
              file_name: entry.fileName || entry.file.name,
            },
          })),
        );
      }
    }
  });

  const results = await Promise.all(tasks);
  return {
    productImages: results.filter((row) => row.kind === 'image').map((row) => ({ image: row.url })),
    documents: results.filter((row) => row.kind === 'document').map((row) => row.row),
  };
}

async function uploadVariationAssets(variations = []) {
  const uploaded = [];
  for (const variation of variations) {
    const productImages = [];
    for (const entry of variation.files || []) {
      if (entry?.file instanceof File) {
        productImages.push({ image: await uploadProductFile(entry.file) });
      } else if (entry?.fileUrl && !entry.fileUrl.startsWith('blob:')) {
        productImages.push({ image: entry.fileUrl });
      }
    }
    uploaded.push({
      name: variation.name,
      option_key: variation.optionKey || variation.name,
      attribute_value: variation.optionKey || variation.name,
      ...(trimOptionalText(variation.description)
        ? { description: trimOptionalText(variation.description) }
        : {}),
      min_purchase_price: variation.minPurchasePrice,
      max_purchase_price: variation.maxPurchasePrice,
      material_basic_rate: variation.materialBasicRate,
      labour_base_rate: variation.labourBaseRate,
      min_selling_price: variation.minSellingPrice,
      max_selling_price: variation.maxSellingPrice,
      product_images: productImages,
    });
  }
  return uploaded;
}

/**
 * Build JSON payload from add-item drawer submit values (files uploaded separately).
 */
export { uploadFrappeFile };

export function buildProductFormPayload(formValues = {}) {
  const category = formValues.category || {
    categoryGroup: formValues.categoryGroup,
    categoryType: formValues.categoryType,
    productGroup: formValues.productGroup,
    productType: formValues.productType,
  };

  const isJob = isJobProductType(formValues.devxProductType || 'product');
  const pricingValues = isJob
    ? syncJobPurchasePrices({
        minPurchasePrice: formValues.minPurchasePrice,
        maxPurchasePrice: formValues.maxPurchasePrice,
        materialBasicRate: formValues.materialBasicRate,
        labourBaseRate: formValues.labourBaseRate,
      })
    : {
        minPurchasePrice: formValues.minPurchasePrice,
        maxPurchasePrice: formValues.maxPurchasePrice,
      };

  const description = trimOptionalText(formValues.description);
  const specificationNotes = trimOptionalText(formValues.specificationNotes);

  return {
    product_name: formValues.productName,
    brand: formValues.brand,
    make: formValues.make,
    vendors: Array.isArray(formValues.vendors)
      ? formValues.vendors.filter(Boolean)
      : formValues.vendor
        ? [formValues.vendor]
        : [],
    vendor: (Array.isArray(formValues.vendors) ? formValues.vendors[0] : formValues.vendor) || '',
    product_website_link: formValues.productWebsiteLink,
    category,
    unit_of_measure: formValues.unitOfMeasure,
    ...(description ? { description } : {}),
    ...(specificationNotes ? { specificationNotes } : {}),
    manufacturer: formValues.manufacturer,
    modelNumber: formValues.modelNumber,
    widthMm: formValues.widthMm,
    depthMm: formValues.depthMm,
    heightMm: formValues.heightMm,
    dimensions: formValues.dimensions,
    material: formValues.material,
    finish: formValues.finish,
    colourFinishOptions: formValues.colourFinishOptions,
    warranty: formValues.warranty,
    expectedLifeYears: formValues.expectedLifeYears,
    loadCapacity: formValues.loadCapacity,
    seatingCapacity: formValues.seatingCapacity,
    powerRequirement: formValues.powerRequirement,
    connectivity: formValues.connectivity,
    installationRequirement: formValues.installationRequirement,
    maintenanceNotes: formValues.maintenanceNotes,
    technicalNotes: formValues.technicalNotes,
    min_purchase_price: pricingValues.minPurchasePrice,
    max_purchase_price: pricingValues.maxPurchasePrice,
    material_basic_rate: formValues.materialBasicRate,
    material_base_rate: formValues.materialBasicRate,
    materialBasicRate: formValues.materialBasicRate,
    labour_base_rate: formValues.labourBaseRate,
    labourBaseRate: formValues.labourBaseRate,
    min_selling_price: formValues.minSellingPrice,
    max_selling_price: formValues.maxSellingPrice,
    gstRate: formValues.gstRate,
    devx_product_type: formValues.devxProductType || 'product',
    hsn_code: formValues.hsnCode,
    gst_hsn_code: formValues.hsnCode,
    moq: formValues.moq,
    pricingNotes: formValues.pricingNotes,
    apply_price_to_all_variations: formValues.applyPriceToAllVariations,
    tags: formValues.tags,
    has_variants: Boolean(formValues.hasVariations),
    variation_options: formValues.variationOptions || [],
    ...(formValues.customType
      ? { custom_type: formValues.customType, customType: formValues.customType }
      : {}),
  };
}

export function mapBundleProductRow(item = {}) {
  const category = item.category || {};

  return {
    id: item.id || item.name || item.item_code,
    name: item.name || item.item_name,
    productCode: item.productCode || item.product_code || item.item_code,
    brand: item.brand,
    categoryGroup: item.categoryGroup || category.categoryGroup,
    categoryType: item.categoryType || category.categoryType,
    productGroup: item.productGroup || category.productGroup,
    productType: item.productType || category.productType,
    hsnCode: item.gst_hsn_code || item.hsn_code || item.hsnCode || '',
    quantity: item.quantity ?? String(item.qty ?? 1),
    uom: item.uom || item.stock_uom,
    purchasePrice: item.purchasePrice || item.purchase_price,
    sellingPrice: item.sellingPrice || item.selling_price,
    status: item.status || (item.disabled ? 'Inactive' : 'Active'),
    imageUrl: item.imageUrl || item.image,
  };
}

export function mapVariantListRow(item = {}) {
  const templateName = item.detail_name || item.template_name || item.variant_of || item.name;

  return {
    id: item.name,
    detailId: templateName,
    name: item.item_name,
    productCode: item.item_code,
    jobCode: item.item_code,
    brand: item.brand,
    categoryGroup: item.categoryGroup,
    categoryType: item.categoryType,
    productGroup: item.productGroup,
    productType: item.productType,
    hsnCode: item.gst_hsn_code || item.hsn_code || '',
    devxProductType: item.devx_product_type || 'product',
    variantOf: item.variant_of || null,
    isVariant: true,
    hasVariants: false,
    attributeValue: item.attribute_value || '',
    uom: item.stock_uom,
    moq: item.moq ?? '',
    minOrderQty: item.min_order_qty,
    purchasePrice: item.purchase_price,
    minPurchasePrice: item.min_purchase_price,
    maxPurchasePrice: item.max_purchase_price,
    minSellingPrice: item.min_selling_price,
    maxSellingPrice: item.max_selling_price,
    ...mapJobRateFields(item),
    sellingPrice: item.selling_price,
    status: item.status || (item.disabled ? 'Inactive' : 'Active'),
    imageUrl: item.image,
    variations: [],
  };
}

function mapListVendors(item = {}) {
  if (Array.isArray(item.vendors)) {
    return item.vendors.map((value) => String(value || '').trim()).filter(Boolean);
  }
  const supplier = String(item.supplier || '').trim();
  return supplier ? [supplier] : [];
}

function mapJobRateFields(item = {}) {
  const materialBasicRate = formatJobRate(
    item.material_basic_rate ?? item.materialBasicRate ?? item.material_basic_rate_min,
  );
  const labourBaseRate = formatJobRate(
    item.labour_base_rate ?? item.labourBaseRate ?? item.labour_base_rate_min,
  );

  return {
    materialBasicRate,
    labourBaseRate,
    totalRate: formatJobRate(
      computeJobTotalRate(
        item.material_basic_rate ?? item.materialBasicRate ?? item.material_basic_rate_min,
        item.labour_base_rate ?? item.labourBaseRate ?? item.labour_base_rate_min,
      ),
    ),
  };
}

export function mapProductListRow(item = {}) {
  const templateName = item.detail_name || item.template_name || item.variant_of || item.name;
  const bundleItems = item.products || item.bundle_items || [];
  const variationItems = item.variations || [];
  const category = item.category || {};

  return {
    id: item.name,
    detailId: templateName,
    name: item.item_name,
    productCode: item.item_code,
    jobCode: item.item_code,
    packageCode: item.packageCode || item.item_code,
    brand: item.brand,
    categoryGroup: item.categoryGroup || category.categoryGroup,
    categoryType: item.categoryType || category.categoryType,
    productGroup: item.productGroup || category.productGroup,
    productType: item.productType || category.productType,
    hsnCode: item.gst_hsn_code || item.hsn_code || '',
    devxProductType: item.devx_product_type || 'product',
    variantOf: item.variant_of || null,
    isVariant: Boolean(item.is_variant || item.variant_of),
    hasVariants: Boolean(item.has_variants),
    attributeValue: item.attribute_value || '',
    uom: item.stock_uom,
    moq: item.moq ?? '',
    minOrderQty: item.min_order_qty,
    purchasePrice: item.purchase_price,
    minPurchasePrice: item.min_purchase_price,
    maxPurchasePrice: item.max_purchase_price,
    minSellingPrice: item.min_selling_price,
    maxSellingPrice: item.max_selling_price,
    ...mapJobRateFields(item),
    sellingPrice: item.selling_price,
    status: item.status || (item.disabled ? 'Inactive' : 'Active'),
    imageUrl: item.image,
    products: bundleItems.map(mapBundleProductRow),
    variations: variationItems.map(mapVariantListRow),
  };
}

export function mapProductDetail(item = {}) {
  const specification = item.specification || {};
  const details = item.product_details || item.custom_product_details || {};
  const category = item.category || {};
  const brochureDoc = (item.documents || []).find(
    (doc) => String(doc.document_type || '').toLowerCase() === 'brochure',
  );

  return {
    id: item.name,
    name: item.item_name,
    productCode: item.item_code,
    packageCode: item.packageCode || item.item_code,
    brand: item.brand,
    categoryGroup: item.categoryGroup || category.categoryGroup,
    categoryType: item.categoryType || category.categoryType,
    productGroup: item.productGroup || category.productGroup,
    productType: item.productType || category.productType,
    devxProductType: item.devx_product_type || 'product',
    uom: item.stock_uom,
    purchasePrice: item.purchase_price,
    sellingPrice: item.selling_price,
    status: item.status || (item.disabled ? 'Inactive' : 'Active'),
    imageUrl: item.image,
    galleryImages: item.gallery_images || [],
    manufacturer: item.manufacturer,
    make: item.make,
    customType: item.custom_type || item.customType || '',
    vendors: mapListVendors(item),
    supplierItems: (item.supplier_items || []).map((row) => ({
      supplier: row.supplier,
      supplierPartNo: row.supplier_part_no || '',
      isDefault: Boolean(row.custom_default),
    })),
    modelNumber: item.model_number,
    website: item.product_website_link,
    tags: item.tags || [],
    description: item.description ?? '',
    specificationNotes: item.specification_notes,
    specification: {
      width: specification.widthMm,
      depth: specification.depthMm,
      height: specification.heightMm,
      dimensions: specification.dimensions,
      material: specification.material,
      finish: specification.finish,
      colorOptions: specification.colourFinishOptions || specification.colorOptions,
      warranty: specification.warranty,
    },
    brochure: brochureDoc ? { name: brochureDoc.file_name, url: brochureDoc.document_file } : null,
    gstRate: item.gst_rate,
    hsnCode: item.gst_hsn_code || item.hsn_code,
    hsnDescription: item.hsn_description,
    hsnLabel: item.hsn_label,
    moq: item.moq,
    minOrderQty: item.min_order_qty,
    pricingNotes: item.pricing_notes,
    applyPriceToAllVariations: Boolean(item.apply_price_to_all_variations),
    metaFields: (item.meta_fields || item.metaFields || [])
      .map((row) => ({
        label: String(row?.label || '').trim(),
        field: String(row?.field || '').trim(),
        value: String(row?.value ?? '').trim(),
      }))
      .filter((row) => row.label && row.value !== ''),
    documents: (item.documents || []).map((doc) => ({
      name: doc.file_name,
      url: doc.document_file,
      documentType: doc.document_type,
      otherType: doc.other_type,
      size: doc.file_size,
    })),
    minPurchasePrice: item.min_purchase_price,
    maxPurchasePrice: item.max_purchase_price,
    materialBasicRate:
      item.material_base_rate ??
      item.material_basic_rate ??
      item.materialBasicRate ??
      item.custom_material_base_rate ??
      details.materialBasicRate ??
      item.material_basic_rate_min ??
      item.materialBasicRateMin ??
      '',
    labourBaseRate:
      item.labour_base_rate ??
      item.labourBaseRate ??
      item.custom_labour_base_rate ??
      details.labourBaseRate ??
      item.labour_base_rate_min ??
      item.labourBaseRateMin ??
      '',
    minSellingPrice: item.min_selling_price,
    maxSellingPrice: item.max_selling_price,
    hasVariations: Boolean(item.has_variants),
    variantAttribute: item.variant_attribute,
    variationOptions: item.variation_options || [],
    variations: (item.variations || []).map((variation) => {
      const galleryImages = variation.gallery_images || [];
      const imageUrl =
        variation.image ||
        galleryImages[0]?.url ||
        (typeof galleryImages[0] === 'string' ? galleryImages[0] : '');

      return {
        id: variation.name,
        name: variation.item_name,
        productCode: variation.item_code,
        attributeValue: variation.attribute_value,
        description: variation.description ?? '',
        purchasePrice: variation.purchase_price,
        sellingPrice: variation.selling_price,
        imageUrl,
        galleryImages,
        minPurchasePrice: variation.min_purchase_price,
        maxPurchasePrice: variation.max_purchase_price,
        materialBasicRate: variation.material_basic_rate ?? variation.materialBasicRate,
        labourBaseRate: variation.labour_base_rate ?? variation.labourBaseRate,
        minSellingPrice: variation.min_selling_price,
        maxSellingPrice: variation.max_selling_price,
      };
    }),
    products: (item.products || item.bundle_items || []).map(mapBundleProductRow),
  };
}

export function mapProductListGroup(group = {}) {
  const rows = Array.isArray(group.rows) ? group.rows.map(mapProductListRow) : [];
  const count = group.count ?? rows.length;
  const loadedCount = group.loaded_count ?? rows.length;
  return {
    id: group.id,
    groupName: group.name ?? '',
    count,
    loadedCount,
    hasMore: group.has_more ?? loadedCount < count,
    rows,
  };
}

export function mapGroupedProductListResponse(payload = {}) {
  const groups = Array.isArray(payload.groups) ? payload.groups.map(mapProductListGroup) : [];
  return {
    rows: [],
    groups,
    total: payload.total ?? 0,
    totalGroups: payload.total_groups ?? groups.length,
    isGrouped: true,
    hasMoreGroups: Boolean(payload.has_more_groups),
    groupLimitStart: payload.group_limit_start ?? 0,
    appendGroupItems: Boolean(payload.append_group_items),
    groupValue: payload.group_value ?? '',
  };
}

function slugifyProductGroupId(value) {
  const slug = String(value || 'other')
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return slug || 'other';
}

const PRODUCT_LIST_CLIENT_GROUP_FIELDS = {
  categoryGroup: 'categoryGroup',
  categoryType: 'categoryType',
  productGroup: 'productGroup',
  productType: 'productType',
  status: 'status',
};

/**
 * Build accordion sections from a flat product list when the API does not return
 * `is_grouped` / `groups` (e.g. develop get_product_list without group_by).
 */
export function groupProductListRowsClient(
  rows = [],
  groupBy = 'categoryGroup',
  groupOrder = 'asc',
) {
  const field = PRODUCT_LIST_CLIENT_GROUP_FIELDS[groupBy] ?? 'categoryGroup';
  const buckets = new Map();

  for (const row of rows) {
    const label = String(row?.[field] ?? '').trim() || 'Other';
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(row);
  }

  const groups = [...buckets.entries()].map(([groupName, groupRows]) => ({
    id: slugifyProductGroupId(groupName),
    groupName,
    count: groupRows.length,
    loadedCount: groupRows.length,
    hasMore: false,
    rows: groupRows,
  }));

  groups.sort((left, right) => {
    const cmp = left.groupName.localeCompare(right.groupName, undefined, { sensitivity: 'base' });
    return groupOrder === 'desc' ? -cmp : cmp;
  });

  return groups;
}

export async function listProducts(params = {}) {
  const groupByApi = params.groupBy ? PRODUCT_LIST_GROUP_BY_API[params.groupBy] : undefined;
  const { data } = await apiClient.get(LIST_PRODUCTS_METHOD, {
    params: {
      keyword: params.keyword,
      devx_product_type: params.devxProductType,
      limit_start: params.limitStart ?? 0,
      limit_page_length: params.limitPageLength ?? 100,
      order_by: params.orderBy,
      ...(params.excludeTemplates ? { exclude_templates: 1 } : {}),
      ...(params.filters ? { filters: JSON.stringify(params.filters) } : {}),
      ...(groupByApi
        ? {
            group_by: groupByApi,
            group_order: params.groupOrder ?? 'asc',
            group_limit_start: params.groupLimitStart ?? 0,
            group_limit: params.groupLimit ?? PRODUCTS_GROUP_LIST_LIMIT,
            group_items: params.groupItems ?? PRODUCTS_GROUP_ITEMS_LIMIT,
            ...(params.groupValue
              ? {
                  group_value: params.groupValue,
                  group_item_start: params.groupItemStart ?? 0,
                }
              : {}),
          }
        : {}),
    },
  });
  const payload = unwrapMessage(data);
  assertNoExc(payload);
  if (payload?.is_grouped && Array.isArray(payload?.groups)) {
    return mapGroupedProductListResponse(payload);
  }
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    rows: rows.map(mapProductListRow),
    groups: [],
    total: payload.total ?? rows.length,
    totalGroups: 0,
    isGrouped: false,
  };
}

export async function getProduct(name) {
  if (!name) return null;
  const { data } = await apiClient.get(GET_PRODUCT_METHOD, { params: { name } });
  const payload = unwrapMessage(data);
  const record = payload?.data ?? payload;
  if (!record?.name) return null;

  const mapped = mapProductDetail(record);
  if (mapped.devxProductType === 'product-package') {
    const packageDetail = await getProductPackage(name);
    return packageDetail ?? mapped;
  }
  return mapped;
}

async function postProductPayload(method, payload) {
  const { data: response } = await apiClient.post(method, { data: JSON.stringify(payload) });
  const result = unwrapMessage(response);
  return {
    name: result.name,
    product: mapProductDetail(result.data ?? result),
  };
}

export async function createProduct(formValues) {
  const data = buildProductFormPayload(formValues);
  const allowMissingDocumentType = formValues.devxProductType === 'job';
  const assets = await uploadCategoryFiles(formValues.categoryFiles, { allowMissingDocumentType });

  if (assets.productImages.length > 0) {
    data.product_images = assets.productImages;
  }
  if (assets.documents.length > 0) {
    data.documents = assets.documents;
  }
  if (formValues.hasVariations) {
    data.variations = await uploadVariationAssets(formValues.variations || []);
    if (!data.product_images?.length) {
      delete data.product_images;
    }
  }

  return postProductPayload(CREATE_PRODUCT_METHOD, data);
}

export async function updateProduct(name, formValues) {
  const data = buildProductFormPayload(formValues);
  const allowMissingDocumentType = formValues.devxProductType === 'job';
  const assets = await uploadCategoryFiles(formValues.categoryFiles, { allowMissingDocumentType });

  if (assets.productImages.length > 0) {
    data.product_images = assets.productImages;
  }
  if (assets.documents.length > 0) {
    data.documents = assets.documents;
  }

  return postProductPayload(UPDATE_PRODUCT_METHOD, { name, ...data });
}

/** Partial field updates for product detail inline editing. */
export async function updateProductFields(name, fields = {}) {
  if (!name) throw new Error('Product name is required');
  return postProductPayload(UPDATE_PRODUCT_METHOD, { name, ...fields });
}

export function collectMainProductImageUrls(product = {}) {
  const urls = [];
  const seen = new Set();

  const appendUrl = (url) => {
    const normalized = String(url || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  appendUrl(product.imageUrl);
  (product.galleryImages ?? []).forEach((item) => {
    appendUrl(typeof item === 'string' ? item : item?.url);
  });

  return urls;
}

export async function addProductImages(productId, fileList, existingProduct = {}) {
  if (!productId) throw new Error('Product name is required');

  const files = [...(fileList || [])].filter((file) => file instanceof File);
  if (files.length === 0) return null;

  const uploadedUrls = await Promise.all(files.map((file) => uploadProductFile(file)));
  const product_images = collectMainProductImageUrls(existingProduct).map((url) => ({
    image: url,
  }));

  uploadedUrls.forEach((url) => {
    if (!product_images.some((row) => row.image === url)) {
      product_images.push({ image: url });
    }
  });

  return postProductPayload(UPDATE_PRODUCT_METHOD, {
    name: productId,
    product_images,
  });
}

export async function removeProductImage(productId, imageUrl, existingProduct = {}) {
  if (!productId) throw new Error('Product name is required');

  const urlToRemove = String(imageUrl || '').trim();
  const product_images = collectMainProductImageUrls(existingProduct)
    .filter((url) => url !== urlToRemove)
    .map((url) => ({ image: url }));

  return postProductPayload(UPDATE_PRODUCT_METHOD, {
    name: productId,
    product_images,
  });
}

function variationFilesFromApiVariation(variation = {}) {
  const files = [];

  if (variation.imageUrl) {
    files.push({
      id: `${variation.id}-main`,
      fileName: 'Image',
      fileUrl: variation.imageUrl,
    });
  }

  (variation.galleryImages ?? []).forEach((item, index) => {
    const url = typeof item === 'string' ? item : item?.url;
    if (!url || url === variation.imageUrl) return;
    files.push({
      id: `${variation.id}-gallery-${index}`,
      fileName: `Image ${index + 1}`,
      fileUrl: url,
      isVideo: typeof item === 'object' ? Boolean(item?.isVideo) : false,
    });
  });

  return files;
}

export async function removeVariationImage(variantId, imageUrl, variation = {}) {
  if (!variantId) throw new Error('Variant id is required');

  const urlToRemove = String(imageUrl || '').trim();
  const files = variationFilesFromApiVariation(variation).filter(
    (file) => file.fileUrl !== urlToRemove,
  );

  return updateProductVariation(variantId, {
    id: variation.id,
    name: variation.name || variation.attributeValue || '',
    optionKey: variation.attributeValue || variation.name || '',
    description: String(variation.description ?? '').trim(),
    minPurchasePrice: variation.minPurchasePrice ?? '',
    maxPurchasePrice: variation.maxPurchasePrice ?? '',
    minSellingPrice: variation.minSellingPrice ?? '',
    maxSellingPrice: variation.maxSellingPrice ?? '',
    files,
  });
}

function buildVariationUpdatePayload(variation) {
  const synced = syncJobPurchasePrices(variation);
  return {
    name: variation.name,
    optionKey: variation.optionKey || variation.name,
    description: String(variation.description ?? '').trim(),
    minPurchasePrice: synced.minPurchasePrice ?? '',
    maxPurchasePrice: synced.maxPurchasePrice ?? '',
    materialBasicRate: variation.materialBasicRate ?? '',
    labourBaseRate: variation.labourBaseRate ?? '',
    minSellingPrice: variation.minSellingPrice ?? '',
    maxSellingPrice: variation.maxSellingPrice ?? '',
    files: variation.files || [],
  };
}

export async function updateProductVariation(variantId, variation, parentProduct = {}) {
  const [uploaded] = await uploadVariationAssets([buildVariationUpdatePayload(variation)]);
  const payload = {
    name: variantId,
    product_name: uploaded.name || variation.name,
    description: String(uploaded.description ?? variation.description ?? '').trim(),
    min_purchase_price: uploaded.min_purchase_price ?? '',
    max_purchase_price: uploaded.max_purchase_price ?? '',
    material_basic_rate: uploaded.material_basic_rate ?? '',
    labour_base_rate: uploaded.labour_base_rate ?? '',
    min_selling_price: uploaded.min_selling_price ?? '',
    max_selling_price: uploaded.max_selling_price ?? '',
    ...(parentProduct.devxProductType ? { devx_product_type: parentProduct.devxProductType } : {}),
  };

  payload.product_images = uploaded.product_images ?? [];

  return postProductPayload(UPDATE_PRODUCT_METHOD, payload);
}

/** Refresh template product after a variant update, merging fresh media from the update response. */
export async function syncProductAfterVariationUpdate(
  templateId,
  variantId,
  updateResult,
  fallbackProduct,
) {
  const refreshed = templateId ? await getProduct(templateId) : null;
  const baseProduct = refreshed ?? fallbackProduct ?? null;
  if (!baseProduct) return null;

  const updatedDetail = updateResult?.product;
  if (!updatedDetail) return baseProduct;

  return applyVariationMediaUpdate(baseProduct, variantId, updatedDetail);
}

function mapDocumentsForPayload(documents = [], { allowMissingDocumentType = false } = {}) {
  return documents
    .map((doc) => ({
      document_type: doc.documentType,
      document_file: doc.url,
      file_name: doc.name,
      other_type: doc.otherType,
    }))
    .filter((row) => row.document_file && (allowMissingDocumentType || row.document_type));
}

function matchesProductDocument(left = {}, right = {}) {
  const leftUrl = String(left.url || '').trim();
  const rightUrl = String(right.url || '').trim();
  if (leftUrl && rightUrl) return leftUrl === rightUrl;

  const leftName = String(left.name || '').trim();
  const rightName = String(right.name || '').trim();
  const leftType = String(left.documentType || '')
    .trim()
    .toLowerCase();
  const rightType = String(right.documentType || '')
    .trim()
    .toLowerCase();

  return leftName === rightName && leftType === rightType;
}

async function updateProductDocuments(
  productId,
  documents = [],
  { allowMissingDocumentType = false } = {},
) {
  return postProductPayload(UPDATE_PRODUCT_METHOD, {
    name: productId,
    documents: mapDocumentsForPayload(documents, { allowMissingDocumentType }),
  });
}

export async function removeProductDocument(
  productId,
  documentToRemove,
  existingDocuments = [],
  { allowMissingDocumentType = false } = {},
) {
  if (!productId) throw new Error('Product name is required');

  const documents = existingDocuments.filter(
    (document) => !matchesProductDocument(document, documentToRemove),
  );

  return updateProductDocuments(productId, documents, { allowMissingDocumentType });
}

export async function removeProductBrochure(productId, existingProduct = {}) {
  if (!productId) throw new Error('Product name is required');

  const brochureUrl = String(existingProduct.brochure?.url || '').trim();
  const documents = (existingProduct.documents ?? []).filter((document) => {
    if (brochureUrl && document.url === brochureUrl) return false;
    if (String(document.documentType || '').toLowerCase() === 'brochure') return false;
    return true;
  });

  return updateProductDocuments(productId, documents);
}

export function getProductDocumentTypeLabel(document = {}) {
  const docType = String(document.documentType || '').trim();
  const otherType = String(document.otherType || '').trim();
  if (docType.toLowerCase() === 'other' && otherType) return otherType;
  if (docType) return docType;
  if (otherType) return otherType;
  return document.name || 'Document';
}

export async function updateProductDocumentGroup(
  productId,
  {
    groupDocuments = [],
    documentType,
    otherType,
    removeDocuments = [],
    newFiles = [],
    existingDocuments = [],
  },
) {
  if (!productId) throw new Error('Product name is required');
  if (groupDocuments.length === 0) throw new Error('Document group is required');

  const resolvedOtherType = documentType === 'Other' ? otherType?.trim() : undefined;
  const isGroupDocument = (document) =>
    groupDocuments.some((groupDocument) => matchesProductDocument(document, groupDocument));
  const isRemovedDocument = (document) =>
    removeDocuments.some((removedDocument) => matchesProductDocument(document, removedDocument));

  const documents = existingDocuments
    .filter((document) => !isRemovedDocument(document))
    .map((document) => {
      if (!isGroupDocument(document)) return document;
      return {
        ...document,
        documentType,
        otherType: resolvedOtherType,
      };
    });

  for (const file of newFiles) {
    if (!(file instanceof File)) continue;
    const fileUrl = await uploadProductFile(file);
    documents.push({
      documentType,
      otherType: resolvedOtherType,
      url: fileUrl,
      name: file.name,
    });
  }

  return updateProductDocuments(productId, documents);
}

export async function updateProductDocument(
  productId,
  { documentToUpdate, documentType, otherType, file, existingDocuments = [] },
) {
  if (!productId) throw new Error('Product name is required');
  if (!documentToUpdate) throw new Error('Document is required');

  let url = documentToUpdate.url;
  let name = documentToUpdate.name;

  if (file instanceof File) {
    url = await uploadProductFile(file);
    name = file.name;
  }

  const updatedDocument = {
    ...documentToUpdate,
    documentType,
    otherType: documentType === 'Other' ? otherType?.trim() : undefined,
    url,
    name,
  };

  const documents = existingDocuments.map((document) =>
    matchesProductDocument(document, documentToUpdate) ? updatedDocument : document,
  );

  return updateProductDocuments(productId, documents);
}

export async function addProductDocuments(
  productId,
  { documentType, otherType, files = [], existingDocuments = [], allowMissingDocumentType = false },
) {
  if (!productId) throw new Error('Product name is required');
  if (files.length === 0) throw new Error('At least one file is required');

  let currentDocuments = existingDocuments;
  let latestProduct = null;

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const result = await addProductDocument(productId, {
      documentType,
      otherType,
      file,
      existingDocuments: currentDocuments,
      allowMissingDocumentType,
    });
    latestProduct = result.product;
    currentDocuments = latestProduct?.documents ?? currentDocuments;
  }

  return latestProduct;
}

export async function addProductDocument(
  productId,
  { documentType, otherType, file, existingDocuments = [], allowMissingDocumentType = false },
) {
  if (!productId) throw new Error('Product name is required');
  if (!(file instanceof File)) throw new Error('File is required');

  const fileUrl = await uploadProductFile(file);
  const newRow = {
    ...(documentType ? { document_type: documentType } : {}),
    other_type: documentType === 'Other' ? otherType?.trim() : undefined,
    document_file: fileUrl,
    file_name: file.name,
  };

  const documents = [
    ...mapDocumentsForPayload(existingDocuments, { allowMissingDocumentType }),
    newRow,
  ];

  return postProductPayload(UPDATE_PRODUCT_METHOD, {
    name: productId,
    documents,
  });
}

export async function addProductVariations(templateId, variations, parentProduct = {}) {
  const uploaded = await uploadVariationAssets(
    variations.map((variation) => buildVariationUpdatePayload(variation)),
  );

  const payload = {
    name: templateId,
    variations: uploaded,
    variant_attribute: parentProduct.variantAttribute,
    apply_price_to_all_variations: parentProduct.applyPriceToAllVariations,
    devx_product_type: parentProduct.devxProductType,
  };

  if (parentProduct.applyPriceToAllVariations) {
    Object.assign(payload, {
      min_purchase_price: parentProduct.minPurchasePrice,
      max_purchase_price: parentProduct.maxPurchasePrice,
      material_basic_rate: parentProduct.materialBasicRate,
      labour_base_rate: parentProduct.labourBaseRate,
      min_selling_price: parentProduct.minSellingPrice,
      max_selling_price: parentProduct.maxSellingPrice,
    });
  }

  return postProductPayload(UPDATE_PRODUCT_METHOD, payload);
}

export async function deleteProduct(name) {
  if (!name) throw new Error('Product name is required');
  const { data } = await apiClient.post(DELETE_PRODUCT_METHOD, { name });
  return unwrapMessage(data);
}

export function buildProductPackageFormPayload(formValues = {}) {
  const category = formValues.category || {
    categoryGroup: formValues.categoryGroup,
    categoryType: formValues.categoryType,
    productGroup: formValues.productGroup,
    productType: formValues.productType,
  };

  const packageProducts = (formValues.packageProducts || []).map((product) => ({
    item_code: product.id || product.item_code || product.productCode,
    qty: Number(product.quantity) || 1,
  }));

  const description = trimOptionalText(formValues.description);
  const specificationNotes = trimOptionalText(formValues.specificationNotes);

  return {
    product_name: formValues.productName,
    category,
    ...(description ? { description } : {}),
    ...(specificationNotes ? { specificationNotes } : {}),
    min_purchase_price: formValues.minPurchasePrice,
    max_purchase_price: formValues.maxPurchasePrice,
    min_selling_price: formValues.minSellingPrice,
    max_selling_price: formValues.maxSellingPrice,
    gstRate: formValues.gstRate,
    moq: formValues.moq,
    pricingNotes: formValues.pricingNotes,
    package_products: packageProducts,
  };
}

export async function createProductPackage(formValues) {
  const data = buildProductPackageFormPayload(formValues);
  return postProductPayload(CREATE_PRODUCT_PACKAGE_METHOD, data);
}

export async function updateProductPackageBundleItems(name, packageProducts = []) {
  if (!name) throw new Error('Product package name is required');

  const payload = {
    name,
    package_products: packageProducts.map((product) => ({
      item_code: product.id || product.item_code || product.productCode,
      qty: Number(product.quantity ?? product.qty) || 1,
    })),
  };

  const { data: response } = await apiClient.post(UPDATE_PRODUCT_PACKAGE_METHOD, {
    data: JSON.stringify(payload),
  });
  const result = unwrapMessage(response);
  const record = result.data ?? result;

  return {
    name: result.name,
    product: mapProductDetail({
      ...record,
      products: record.products || record.bundle_items || [],
    }),
  };
}

export async function getProductPackage(name) {
  if (!name) return null;
  const { data } = await apiClient.get(GET_PRODUCT_PACKAGE_METHOD, { params: { name } });
  const payload = unwrapMessage(data);
  const record = payload?.data ?? payload;
  if (!record?.name) return null;
  return mapProductDetail({
    ...record,
    products: record.products || record.bundle_items || [],
  });
}

export async function deleteProductPackage(name) {
  if (!name) throw new Error('Product package name is required');
  const { data } = await apiClient.post(DELETE_PRODUCT_PACKAGE_METHOD, { name });
  return unwrapMessage(data);
}

export async function duplicateProductPackage(name) {
  if (!name) throw new Error('Product package name is required');
  return postProductPayload(DUPLICATE_PRODUCT_PACKAGE_METHOD, { name });
}
