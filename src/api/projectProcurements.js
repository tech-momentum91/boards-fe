import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  PROCUREMENT_POS_COLUMN_TABLE_ID,
  PROCUREMENT_POS_LIST_PREF_DOCTYPE,
  PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID,
  PROJECT_PROCUREMENT_PACKAGES_LIST_PREF_DOCTYPE,
  PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID,
  PROJECT_PROCUREMENTS_LIST_PREF_DOCTYPE,
} from '@/components/procurements/constants';
import {
  normalizeProjectProcurementRow,
  normalizeProjectProcurementStats,
  normalizeProjectProcurementPackageRow,
  normalizeProjectProcurementPosRow,
  normalizeProjectProcurementVendorRow,
} from '@/components/procurements/project-procurements-utils';

const API_BASE = '/method/devx.dev_x.api.project_procurements';

const LIST_PATH = `${API_BASE}.get_project_procurements_listview`;
const STATS_PATH = `${API_BASE}.get_project_procurements_stats`;
const FILTER_OPTIONS_PATH = `${API_BASE}.get_project_procurements_filter_options`;
const DETAIL_PATH = `${API_BASE}.get_project_procurement_detail`;

const assertNoExc = (result) => {
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
};

const unwrapMessage = (response) => {
  const result = response?.data;
  assertNoExc(result);
  return result?.message ?? result;
};

export async function fetchProjectProcurementsList({
  keyword = '',
  filters = {},
  fiscalYearStart,
  page = 1,
  pageSize = 20,
  orderBy = 'project_name asc',
} = {}) {
  const response = await apiClient.post(LIST_PATH, {
    keyword: keyword || undefined,
    filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
    fiscal_year_start: fiscalYearStart,
    page,
    page_size: pageSize,
    order_by: orderBy,
  });

  const payload = unwrapMessage(response) ?? {};
  let rows = [];
  if (Array.isArray(payload?.results)) {
    rows = payload.results;
  } else if (Array.isArray(payload?.data)) {
    rows = payload.data;
  }

  return {
    rows: rows.map(normalizeProjectProcurementRow),
    page: Number(payload?.page) || page,
    hasMore: Boolean(payload?.has_more),
    total: Number(payload?.total ?? rows.length),
  };
}

export async function fetchProjectProcurementsStats({ fiscalYearStart, filters = {} } = {}) {
  const response = await apiClient.post(STATS_PATH, {
    fiscal_year_start: fiscalYearStart,
    filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
  });

  const payload = unwrapMessage(response) ?? {};
  return normalizeProjectProcurementStats(payload?.data ?? payload);
}

export async function fetchProjectProcurementsFilterOptions() {
  const response = await apiClient.post(FILTER_OPTIONS_PATH);
  const payload = unwrapMessage(response) ?? {};

  return {
    cities: Array.isArray(payload?.cities) ? payload.cities : [],
  };
}

export async function fetchProjectProcurementDetail(projectId) {
  const response = await apiClient.post(DETAIL_PATH, {
    project: projectId,
  });
  const payload = unwrapMessage(response) ?? {};
  return normalizeProjectProcurementRow(payload);
}

const PACKAGES_PATH = `${API_BASE}.get_project_procurement_packages`;
export async function fetchProjectProcurementPackages(projectId) {
  const response = await apiClient.post(PACKAGES_PATH, {
    project: projectId,
  });
  const payload = unwrapMessage(response) ?? {};
  const packages = Array.isArray(payload.packages) ? payload.packages : [];
  return packages.map(normalizeProjectProcurementPackageRow);
}

const POS_PATH = `${API_BASE}.get_project_procurement_pos`;
const VENDORS_PATH = `${API_BASE}.get_project_procurement_vendors`;
/**
 * @param {string} projectId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchProjectProcurementPos(projectId) {
  const response = await apiClient.post(POS_PATH, {
    project: projectId,
  });
  const payload = unwrapMessage(response) ?? {};
  const rows = Array.isArray(payload.pos) ? payload.pos : [];
  return rows.map(normalizeProjectProcurementPosRow);
}

export async function fetchProjectProcurementVendors(projectId) {
  const response = await apiClient.post(VENDORS_PATH, {
    project: projectId,
  });
  const payload = unwrapMessage(response) ?? {};
  const rows = Array.isArray(payload.vendors) ? payload.vendors : [];
  return rows.map(normalizeProjectProcurementVendorRow);
}

const PO_DETAIL_PATH = `${API_BASE}.get_project_procurement_po_detail`;
/**
 * Live PO detail for project procurement (basic / line items / scope).
 * @param {string} poName
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchProjectProcurementPoDetail(poName) {
  if (!poName) {
    throw new Error('A purchase order is required.');
  }
  const response = await apiClient.post(PO_DETAIL_PATH, {
    name: poName,
  });
  return unwrapMessage(response) ?? {};
}

const ALL_POS_PATH = `${API_BASE}.get_procurement_pos`;

/**
 * Company-wide PO's list with pagination and status-tab filtering.
 * @param {{
 *   statusTab?: string,
 *   page?: number,
 *   pageSize?: number,
 *   keyword?: string,
 *   vendor?: string,
 *   package?: string,
 *   category?: string,
 * }} [params]
 * @returns {Promise<{
 *   rows: Array<Record<string, unknown>>,
 *   page: number,
 *   pageSize: number,
 *   hasMore: boolean,
 *   total: number,
 *   counts: Record<string, number>,
 * }>}
 */
export async function fetchProcurementPos({
  statusTab = 'all',
  page = 1,
  pageSize = 25,
  keyword = '',
  vendor = 'all',
  package: packageFilter = 'all',
  category = 'all',
} = {}) {
  const response = await apiClient.post(ALL_POS_PATH, {
    status_tab: statusTab || 'all',
    page,
    page_size: pageSize,
    keyword: keyword || undefined,
    vendor: vendor && vendor !== 'all' ? vendor : undefined,
    package: packageFilter && packageFilter !== 'all' ? packageFilter : undefined,
    category: category && category !== 'all' ? category : undefined,
  });
  const payload = unwrapMessage(response) ?? {};
  const rows = Array.isArray(payload.pos)
    ? payload.pos
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  return {
    rows: rows.map(normalizeProjectProcurementPosRow),
    page: Number(payload.page) || page,
    pageSize: Number(payload.page_size) || pageSize,
    hasMore: Boolean(payload.has_more),
    total: Number(payload.total_count ?? rows.length),
    counts: {
      all: Number(payload.counts?.all) || 0,
      released: Number(payload.counts?.released) || 0,
      draft: Number(payload.counts?.draft) || 0,
      'pending-approval': Number(payload.counts?.['pending-approval']) || 0,
    },
  };
}

const ALL_POS_FILTER_OPTIONS_PATH = `${API_BASE}.get_procurement_pos_filter_options`;

function normalizeSelectOption(row = {}, { valueKeys = ['value'], labelKeys = ['label'] } = {}) {
  const value = valueKeys.map((key) => row[key]).find((item) => String(item ?? '').trim()) ?? '';
  const label =
    labelKeys.map((key) => row[key]).find((item) => String(item ?? '').trim()) ?? String(value);
  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const title = String(row.title ?? row.name ?? label).trim();
  const breadcrumb = String(row.breadcrumb ?? '').trim();

  return {
    value: normalizedValue,
    label: String(label).trim() || normalizedValue,
    ...(title ? { title } : {}),
    ...(breadcrumb ? { breadcrumb } : {}),
    ...(row.level ? { level: row.level } : {}),
    ...(row.level_label ? { levelLabel: row.level_label } : {}),
    ...(row.name ? { name: row.name } : {}),
    ...(row.code ? { code: row.code } : {}),
  };
}

/**
 * Master filter options for company-wide PO's (all vendors, packages, 4-level categories).
 * @returns {Promise<{
 *   vendorOptions: Array<{ value: string, label: string }>,
 *   packageOptions: Array<{ value: string, label: string }>,
 *   categoryOptions: Array<{ value: string, label: string }>,
 * }>}
 */
export async function fetchProcurementPosFilterOptions() {
  const response = await apiClient.post(ALL_POS_FILTER_OPTIONS_PATH);
  const payload = unwrapMessage(response) ?? {};

  const vendors = Array.isArray(payload.vendors) ? payload.vendors : [];
  const packages = Array.isArray(payload.packages) ? payload.packages : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];

  return {
    vendorOptions: [
      { value: 'all', label: 'All Vendors' },
      ...vendors
        .map((row) =>
          normalizeSelectOption(row, {
            valueKeys: ['value', 'name'],
            labelKeys: ['label', 'supplier_name', 'name'],
          }),
        )
        .filter(Boolean),
    ],
    packageOptions: [
      { value: 'all', label: 'All Packages' },
      ...packages
        .map((row) =>
          normalizeSelectOption(row, {
            valueKeys: ['value', 'name', 'code'],
            labelKeys: ['label', 'code', 'package_name', 'name'],
          }),
        )
        .filter(Boolean),
    ],
    categoryOptions: [
      { value: 'all', label: 'All Categories', title: 'All Categories' },
      ...categories
        .map((row) => {
          const option = normalizeSelectOption(row, {
            valueKeys: ['value'],
            labelKeys: ['title', 'label', 'name'],
          });
          if (!option) return null;
          // Keep search matching title + breadcrumb (product-style path).
          const searchLabel = [option.title || option.label, option.breadcrumb]
            .filter(Boolean)
            .join(' ');
          return { ...option, label: searchLabel || option.label };
        })
        .filter(Boolean),
    ],
  };
}

const PACKAGE_DETAIL_PATH = `${API_BASE}.get_project_procurement_package_detail`;
/** @param {string} packageCode */
export async function fetchProjectProcurementPackageDetail(packageCode) {
  const response = await apiClient.post(PACKAGE_DETAIL_PATH, {
    code: packageCode,
  });
  const payload = unwrapMessage(response) ?? {};
  return payload;
}

const CREATE_RFQ_PATH = `${API_BASE}.create_rfq_for_package`;
const CREATE_DRAFT_PO_PATH = `${API_BASE}.create_draft_purchase_order`;
/**
 * Create an ERPNext Request for Quotation for a procurement package.
 *
 * @param {{ packageName: string, vendorIds: string[], submissionEndDate?: string, message?: string, itemIds?: string[] }} params
 * @returns {Promise<{ rfq: string, status: string, vendor_count: number, message: string }>}
 */
export async function createRfqForPackage({
  packageName,
  vendorIds = [],
  submissionEndDate,
  message,
  itemIds,
} = {}) {
  if (!packageName) {
    throw new Error('A package is required to create an RFQ.');
  }
  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw new Error('Select at least one vendor to create an RFQ.');
  }

  const response = await apiClient.post(CREATE_RFQ_PATH, {
    package: packageName,
    vendors: JSON.stringify(vendorIds),
    submission_date: submissionEndDate || undefined,
    message: message || undefined,
    item_ids: Array.isArray(itemIds) ? JSON.stringify(itemIds) : undefined,
  });
  return unwrapMessage(response) ?? {};
}

/**
 * Create a Purchase Order for a procurement package (linked to its Material Request).
 *
 * @param {object} payload - Raise PO drawer payload
 * @param {{ submit?: boolean }} [options] - When `submit` is true, PO is submitted (Send PO).
 * @returns {Promise<{ name: string, docstatus: number, message?: string }>}
 */
export async function createDraftProcurementPurchaseOrder(payload = {}, { submit = false } = {}) {
  const packageName = payload?.packageName ?? payload?.package ?? '';
  const purchaseBoqName = payload?.purchaseBoqName ?? payload?.purchase_boq ?? '';
  const isDirectPo = Boolean(
    payload?.isDirectPo || payload?.is_direct_po || (!packageName && purchaseBoqName),
  );

  if (!isDirectPo && !packageName) {
    throw new Error('A package is required to create a Purchase Order.');
  }
  if (isDirectPo && !purchaseBoqName) {
    throw new Error('Purchase BOQ is required to create a Direct Purchase Order.');
  }
  if (!payload?.vendorId) {
    throw new Error(
      submit
        ? 'Select a vendor before sending the Purchase Order.'
        : 'Select a vendor before saving the Purchase Order draft.',
    );
  }
  if (submit && !payload?.poType) {
    throw new Error('Select a PO Type before sending the Purchase Order.');
  }

  const response = await apiClient.post(CREATE_DRAFT_PO_PATH, {
    ...(packageName ? { package: packageName } : {}),
    ...(isDirectPo && purchaseBoqName ? { purchase_boq: purchaseBoqName } : {}),
    is_submit: submit ? 1 : 0,
    doc: JSON.stringify({
      ...payload,
      isDirectPo: isDirectPo ? 1 : 0,
      is_submit: submit ? 1 : 0,
    }),
  });
  return unwrapMessage(response) ?? {};
}

const VENDOR_COMPARISON_PATH = `${API_BASE}.get_package_vendor_comparison`;
const REQUEST_VENDOR_RESUBMISSION_PATH = `${API_BASE}.request_package_vendor_resubmission`;
const REJECT_VENDOR_QUOTATION_PATH = `${API_BASE}.reject_package_vendor_quotation`;
/**
 * Fetch the vendor comparison matrix (supplier quotations) for a package.
 *
 * @param {string} packageName
 * @returns {Promise<{ vendors: Array<object>, categories: Array<object>, internalTotal: number }>}
 */
export async function getPackageVendorComparison(packageName) {
  if (!packageName) {
    throw new Error('A package is required to load the vendor comparison.');
  }

  const response = await apiClient.post(VENDOR_COMPARISON_PATH, {
    package: packageName,
  });
  const payload = unwrapMessage(response) ?? {};

  return {
    vendors: Array.isArray(payload.vendors) ? payload.vendors : [],
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    internalTotal: Number(payload.internalTotal) || 0,
  };
}

/**
 * Request a vendor to resubmit their quotation for a package.
 * Creates a new draft Supplier Quotation revision and marks status as revision_requested.
 *
 * @param {{ packageName: string, vendorId: string }} params
 */
export async function requestPackageVendorResubmission({ packageName, vendorId }) {
  if (!packageName) {
    throw new Error('A package is required to request resubmission.');
  }
  if (!vendorId) {
    throw new Error('A vendor is required to request resubmission.');
  }

  const response = await apiClient.post(REQUEST_VENDOR_RESUBMISSION_PATH, {
    package: packageName,
    supplier: vendorId,
  });
  return unwrapMessage(response) ?? {};
}

/**
 * Reject a vendor's submitted quotation for a package.
 * Sets Supplier Quotation + RFQ portal status to rejected (blocked after PO).
 *
 * @param {{ packageName: string, vendorId: string }} params
 */
export async function rejectPackageVendorQuotation({ packageName, vendorId }) {
  if (!packageName) {
    throw new Error('A package is required to reject a quotation.');
  }
  if (!vendorId) {
    throw new Error('A vendor is required to reject a quotation.');
  }

  const response = await apiClient.post(REJECT_VENDOR_QUOTATION_PATH, {
    package: packageName,
    supplier: vendorId,
  });
  return unwrapMessage(response) ?? {};
}

const VENDOR_QUOTES_PATH = `${API_BASE}.get_package_vendor_quotes`;
const PURCHASE_BOQ_VENDOR_QUOTE_RATES_PATH = `${API_BASE}.get_purchase_boq_vendor_quote_rates`;
/**
 * Fetch the per-vendor quotation breakdown (all versions) for a package.
 *
 * Only vendors that submitted a Supplier Quotation are returned, each with all of
 * their quotation versions (V1, V2, …) and category-grouped line items.
 *
 * @param {string} packageName
 * @returns {Promise<{ vendors: Array<object> }>}
 */
export async function getPackageVendorQuotes(packageName) {
  if (!packageName) {
    throw new Error('A package is required to load vendor quotes.');
  }

  const response = await apiClient.post(VENDOR_QUOTES_PATH, {
    package: packageName,
  });
  const payload = unwrapMessage(response) ?? {};

  return {
    vendors: Array.isArray(payload.vendors) ? payload.vendors : [],
  };
}

/**
 * Fetch latest submitted vendor quotation rates for a Purchase BOQ supplier.
 *
 * @param {string} purchaseBoqName
 * @param {string} vendorId
 * @returns {Promise<{ rates: Record<string, number> }>}
 */
export async function getPurchaseBoqVendorQuoteRates(purchaseBoqName, vendorId) {
  if (!purchaseBoqName) {
    throw new Error('Purchase BOQ is required to load vendor quote rates.');
  }
  if (!vendorId) {
    throw new Error('Vendor is required to load vendor quote rates.');
  }

  const response = await apiClient.post(PURCHASE_BOQ_VENDOR_QUOTE_RATES_PATH, {
    purchase_boq: purchaseBoqName,
    vendor: vendorId,
  });
  const payload = unwrapMessage(response) ?? {};
  const rates = payload.rates && typeof payload.rates === 'object' ? payload.rates : {};

  return { rates };
}

export async function fetchProjectProcurementsListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: PROJECT_PROCUREMENTS_LIST_PREF_DOCTYPE,
      react_table_id: PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

/** @param {Array<Record<string, unknown>>} columns */
export async function saveProjectProcurementsListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: PROJECT_PROCUREMENTS_LIST_PREF_DOCTYPE,
    react_table_id: PROJECT_PROCUREMENTS_COLUMN_CONFIG_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

/** Packages tab column prefs — User Listview Preference doctype. */
export async function fetchProjectProcurementPackagesListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: PROJECT_PROCUREMENT_PACKAGES_LIST_PREF_DOCTYPE,
      react_table_id: PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

/** @param {Array<Record<string, unknown>>} columns */
export async function saveProjectProcurementPackagesListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: PROJECT_PROCUREMENT_PACKAGES_LIST_PREF_DOCTYPE,
    react_table_id: PROJECT_PROCUREMENT_PACKAGES_COLUMN_CONFIG_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

/** Company-wide PO's list column prefs — User Listview Preference doctype. */
export async function fetchProcurementPosListPref() {
  const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
    params: {
      doctype: PROCUREMENT_POS_LIST_PREF_DOCTYPE,
      react_table_id: PROCUREMENT_POS_COLUMN_TABLE_ID,
    },
  });
  const message = response?.data?.message;
  if (!message || (Array.isArray(message) && message.length === 0)) {
    return null;
  }
  return message;
}

/** @param {Array<Record<string, unknown>>} columns */
export async function saveProcurementPosListPref(columns) {
  const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
    doctype: PROCUREMENT_POS_LIST_PREF_DOCTYPE,
    react_table_id: PROCUREMENT_POS_COLUMN_TABLE_ID,
    columns,
  });
  return response?.data?.message ?? { status: 'success' };
}

const GET_PO_SCOPE_TERMS_PATH =
  '/method/devx.devx_procurements.api.po_scope_terms.get_po_scope_terms';
const GET_PO_TYPE_OPTIONS_PATH = '/method/devx.devx_procurements.api.po_types.get_po_type_options';

/**
 * @returns {Promise<{ categories: Array }>}
 */
export async function fetchPoScopeTerms() {
  const response = await apiClient.post(GET_PO_SCOPE_TERMS_PATH);
  const payload = unwrapMessage(response);
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
  };
}

/**
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function fetchPoTypeOptions() {
  const response = await apiClient.post(GET_PO_TYPE_OPTIONS_PATH);
  const payload = unwrapMessage(response);
  const options = Array.isArray(payload?.options) ? payload.options : [];
  return options
    .map((option) => ({
      value: String(option?.value ?? '').trim(),
      label: String(option?.label ?? option?.value ?? '').trim(),
    }))
    .filter((option) => option.value && option.label);
}
