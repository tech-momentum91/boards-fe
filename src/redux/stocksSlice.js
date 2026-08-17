import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import apiClient from '@/api/axios';
import {
  STOCKS_COLUMN_CONFIG_TABLE_ID,
  STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID,
  STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID,
  STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
} from '@/components/stocks/constants';
import { postStocksMultipartRequest } from '@/components/stocks/shared/api/multipart-api';
import {
  STOCKS_DOCUMENT_ACTIVITY_ENDPOINTS,
  requestStockDocumentActivity,
} from '@/components/stocks/shared/api/stock-activity-api';
import {
  parseProductMasterCategoryGroupsFromApi,
  parseStockCategoriesFromApi,
} from '@/components/stocks/shared/stock-categories';
import { extractErrorMessage } from '@/utils/error-utils';
import {
  buildListRequestBody,
  buildPurchaseOrderListFormData,
  buildPurchaseOrderUpdatePayload,
  buildSavePurchaseOrderPayload,
  purchaseOrderShouldSubmit,
  buildSaveStockRulesPayload,
  buildSaveVendorRcPayload,
  buildStockRuleUpdatePayload,
  buildStockRulesListRequestBody,
  buildVendorRcListFormData,
  buildVendorRcUpdatePayload,
  filterVendorRcUploadFiles,
  lineItemsToVendorRcApiItems,
  mapCategoryItemToStockRuleDraftRow,
  mapCategoryItemToVendorRcDraftRow,
  mapCenterToVendorRcOption,
  mapPoLineItemFromApi,
  parsePoLineItemsMessage,
  parseProductMasterListMessage,
  mapPurchaseOrderDetail,
  mapPurchaseOrderDetailToDisplayRow,
  mapPurchaseOrderDetailToForm,
  applyPurchaseOrderFormToDetailOrder,
  applyPurchaseOrderFormToListItem,
  mapPurchaseOrderListItem,
  mapPurchaseOrderListSummary,
  buildSaveStockInPayload,
  buildStockInNotesUpdatePayload,
  mapStockInSaveResponse,
  mapStockInDetailToForm,
  mapStockInManualItemsMessage,
  mapStockInPoItemsMessage,
  mapStockInTransferItemsMessage,
  parseStockInListMessage,
  buildStockInListFormData,
  parseStockInOptionsMessage,
  stockInSourceIsPurchaseOrder,
  stockInSourceToApi,
  parseStockRulesListMessage,
  mapSupplierToVendorRcOption,
  mapVendorRcDetailLineItem,
  mapVendorRcDetailToRow,
  parseVendorRcListMessage,
  mergePoLineItemsWithDraft,
  parsePurchaseOrderListMessage,
  parsePurchaseOrderOptionsMessage,
  parsePurchaseOrderSaveMessage,
  parseVendorRcMutationResponse,
  postVendorRcRequest,
  buildCurrentStockListFormData,
  mapStockReorderToOrderForm,
  parseStockReorderMessage,
  parseCurrentStockListMessage,
  parseStockOutOptionsMessage,
  parseStockOutItemsMessage,
  stockOutIssueModeToApi,
  stockOutIsTransferMode,
  buildSaveStockOutPayload,
  buildStockOutNotesUpdatePayload,
  mapStockOutSaveResponse,
  mapStockOutDetailToForm,
  buildStockOutListFormData,
  parseStockOutListMessage,
} from '@/components/stocks/stocks-api-helpers';

const PRODUCT_MASTER_LIST_PREF_DOCTYPE = 'Item';
const CURRENT_STOCK_LIST_PREF_DOCTYPE = 'Item';
const PURCHASE_ORDER_LIST_PREF_DOCTYPE = 'Purchase Order';
const STOCK_IN_LIST_PREF_DOCTYPE = 'Purchase Receipt';

const PRODUCT_MASTER_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.get_product_master_listview';

const PRODUCT_MASTER_UPDATE_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.update_product_master';

const STOCK_CATEGORIES_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.get_stock_category';

const PRODUCT_MASTER_CATEGORIES_ENDPOINT =
  '/method/devx.stock_management.api.api_product_master.get_product_master_category';

const STOCK_UOMS_ENDPOINT = '/method/devx.stock_management.api.api_product_master.get_stock_uoms';

const STOCK_RULES_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_rules.get_items_of_category';

const STOCK_RULES_SAVE_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_rules.save_stock_rules';

const STOCK_RULES_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_rules.get_stock_rules_listview';

const STOCK_RULES_UPDATE_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_rules.update_stock_rule';

const VENDOR_RC_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_vendor_rate_contract.get_vendor_rate_contract_listview';

const VENDOR_RC_SAVE_ENDPOINT =
  '/method/devx.stock_management.api.api_vendor_rate_contract.save_vendor_rate_contract';

const VENDOR_RC_DETAIL_ENDPOINT =
  '/method/devx.stock_management.api.api_vendor_rate_contract.get_vendor_rate_contract_detail';

const VENDOR_RC_UPDATE_ENDPOINT =
  '/method/devx.stock_management.api.api_vendor_rate_contract.update_vendor_rate_contract';

const VENDOR_RC_CENTER_LIST_ENDPOINT =
  '/method/devx.center_management.api.listview.get_center_listview';

const PO_OPTIONS_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.get_purchase_order_options';

const PO_LINE_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.get_po_line_items';

const PO_SAVE_ENDPOINT = '/method/devx.stock_management.api.api_purchase_order.save_purchase_order';

const PO_UPDATE_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.update_purchase_order_items';

const PO_DETAIL_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.get_purchase_order_detail';

const PO_CANCEL_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.cancel_purchase_order';

const PO_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.get_purchase_order_listview';

const STOCK_IN_OPTIONS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_options';

const STOCK_IN_MANUAL_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_manual_items';

const STOCK_IN_PO_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_po_items';

const STOCK_IN_TRANSFER_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_transfer_items';

const STOCK_IN_SAVE_ENDPOINT = '/method/devx.stock_management.api.api_stock_in.save_stock_in';

const STOCK_IN_UPDATE_ENDPOINT = '/method/devx.stock_management.api.api_stock_in.update_stock_in';

const STOCK_IN_DETAIL_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_detail';

const STOCK_IN_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_listview';

const CURRENT_STOCK_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_current_stock.get_current_stock_listview';
const CURRENT_STOCK_LIST_PAGE_SIZE = 5;

const STOCK_REORDER_ENDPOINT = '/method/devx.stock_management.api.api_reorder.get_stock_reorder';

const STOCK_OUT_OPTIONS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.get_stock_out_options';

const STOCK_OUT_ITEMS_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.get_stock_out_items';

const STOCK_OUT_SAVE_ENDPOINT = '/method/devx.stock_management.api.api_stock_out.save_stock_out';

const STOCK_OUT_UPDATE_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.update_stock_out';

const STOCK_OUT_DETAIL_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.get_stock_out_detail';

const STOCK_OUT_LIST_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.get_stock_out_listview';

const SUPPLIER_RESOURCE_ENDPOINT = '/resource/Supplier';
const UOM_RESOURCE_ENDPOINT = '/resource/UOM';

const VENDOR_RC_FORM_FETCH_PAGE_SIZE = 999;
const DEFAULT_LIST_PAGE_SIZE = 20;

const listInitialState = {
  items: [],
  page: 0,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  status: 'idle',
};

const stockRulesCategoryItemsInitialState = {
  items: [],
  itemGroup: '',
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockRulesSaveInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const vendorRcFormFetchInitialState = {
  items: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const vendorRcSaveInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const vendorRcDetailInitialState = {
  contractId: null,
  row: null,
  activity: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const vendorRcUpdateInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockCategoriesInitialState = {
  items: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockUomsInitialState = {
  items: [],
  isLoading: false,
  error: null,
  status: 'idle',
  isCreating: false,
  createError: null,
  createStatus: 'idle',
};

const productMasterCategoryGroupsInitialState = {
  groups: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const purchaseOrderOptionsInitialState = {
  centers: [],
  suppliers: [],
  categories: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const purchaseOrderLineItemsInitialState = {
  items: [],
  vendorRc: '',
  warehouse: '',
  requiresSupplier: false,
  requiresVendorRc: false,
  supplierOptions: [],
  vendorRcOptions: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const purchaseOrderSaveInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const purchaseOrderDetailInitialState = {
  orderName: null,
  /** Full order for drawer: labels, line items, totals, plus `form` for edits. */
  order: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

const purchaseOrderCancelInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockInOptionsInitialState = {
  centers: [],
  suppliers: [],
  categories: [],
  purchaseOrders: [],
  pendingTransfers: [],
  requiresTransferSelection: false,
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockInLineItemsInitialState = {
  items: [],
  purchaseOrder: '',
  outgoingStockEntry: '',
  sourceCenter: '',
  sourceCenterName: '',
  vendorRc: '',
  requiresVendorRc: false,
  vendorRcOptions: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockInSaveInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockInDetailInitialState = {
  entryName: null,
  form: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

const stocksDocumentActivityEntryInitialState = {
  docName: null,
  items: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const stocksDocumentActivityInitialState = {
  vendorRc: { ...stocksDocumentActivityEntryInitialState },
  purchaseOrder: { ...stocksDocumentActivityEntryInitialState },
  stockIn: { ...stocksDocumentActivityEntryInitialState },
  stockOut: { ...stocksDocumentActivityEntryInitialState },
};

const currentStockStatsInitialState = {
  totalSku: 0,
  totalStockValueLabel: '₹0',
  criticalCount: 0,
  outOfStock: 0,
};

const stockOutOptionsInitialState = {
  centers: [],
  categories: [],
  departments: [],
  issuedBy: [],
  destinationCenters: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockOutLineItemsInitialState = {
  items: [],
  center: '',
  category: '',
  isLoading: false,
  error: null,
  status: 'idle',
};

const stockOutSaveInitialState = {
  isLoading: false,
  error: null,
  status: 'idle',
};

const initialState = {
  productMaster: {
    list: {
      ...listInitialState,
      groups: [],
      isGrouped: false,
    },
    categoryGroups: { ...productMasterCategoryGroupsInitialState },
  },
  stockRules: {
    list: {
      ...listInitialState,
      groups: [],
      isGrouped: false,
    },
    categoryItems: { ...stockRulesCategoryItemsInitialState },
    save: { ...stockRulesSaveInitialState },
  },
  vendorRc: {
    list: {
      ...listInitialState,
      groups: [],
      isGrouped: false,
    },
    vendors: { ...vendorRcFormFetchInitialState },
    centers: { ...vendorRcFormFetchInitialState },
    save: { ...vendorRcSaveInitialState },
    detail: { ...vendorRcDetailInitialState },
    update: { ...vendorRcUpdateInitialState },
  },
  stockCategories: { ...stockCategoriesInitialState },
  stockUoms: { ...stockUomsInitialState },
  purchaseOrder: {
    list: {
      ...listInitialState,
      summary: null,
      groups: [],
      isGrouped: false,
    },
    options: { ...purchaseOrderOptionsInitialState },
    lineItems: { ...purchaseOrderLineItemsInitialState },
    save: { ...purchaseOrderSaveInitialState },
    detail: { ...purchaseOrderDetailInitialState },
    cancel: { ...purchaseOrderCancelInitialState },
  },
  stockIn: {
    list: { ...listInitialState },
    options: { ...stockInOptionsInitialState },
    lineItems: { ...stockInLineItemsInitialState },
    save: { ...stockInSaveInitialState },
    detail: { ...stockInDetailInitialState },
  },
  currentStock: {
    list: {
      ...listInitialState,
      pageSize: CURRENT_STOCK_LIST_PAGE_SIZE,
      groups: [],
      isGrouped: true,
      stats: { ...currentStockStatsInitialState },
      groupBy: 'category',
    },
  },
  stockOut: {
    list: {
      ...listInitialState,
      groups: [],
      isGrouped: false,
    },
    options: { ...stockOutOptionsInitialState },
    lineItems: { ...stockOutLineItemsInitialState },
    save: { ...stockOutSaveInitialState },
  },
  documentActivity: { ...stocksDocumentActivityInitialState },
};

function getStockUomsArray(result) {
  const message = result?.message ?? result ?? {};
  if (Array.isArray(message)) return message;
  if (Array.isArray(message.uoms)) return message.uoms;
  if (Array.isArray(message.stock_uoms)) return message.stock_uoms;
  if (Array.isArray(message.units)) return message.units;
  if (Array.isArray(message.uom_list)) return message.uom_list;
  if (Array.isArray(message.data)) return message.data;
  if (Array.isArray(message.results)) return message.results;
  if (Array.isArray(result?.data)) return result.data;
  if (message && typeof message === 'object') {
    const firstArray = Object.values(message).find(Array.isArray);
    if (firstArray) return firstArray;
  }
  return [];
}

function mapStockUomOption(unit) {
  if (typeof unit === 'string') {
    const value = unit.trim();
    return value ? { value, label: value } : null;
  }
  if (!unit || typeof unit !== 'object') return null;

  const value = String(
    unit.value ??
      unit.name ??
      unit.stock_uom ??
      unit.uom_name ??
      unit.uom ??
      unit.unit ??
      unit.id ??
      '',
  ).trim();

  if (!value) return null;

  const label = String(
    unit.label ?? unit.uom_name ?? unit.stock_uom ?? unit.uom ?? unit.unit ?? unit.name ?? value,
  ).trim();

  const mustBeWholeNumber =
    Number(unit.must_be_whole_number) === 1 || unit.must_be_whole_number === true;

  return { value, label: label || value, mustBeWholeNumber };
}

function parseStockUomsMessage(result) {
  const byValue = new Map();
  for (const unit of getStockUomsArray(result)) {
    const option = mapStockUomOption(unit);
    if (option && !byValue.has(option.value)) {
      byValue.set(option.value, option);
    }
  }
  return [...byValue.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}

export const fetchStockCategories = createAsyncThunk(
  'stocks/fetchStockCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(STOCK_CATEGORIES_ENDPOINT);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock categories.'));
      }
      return { items: parseStockCategoriesFromApi(result) };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock categories.'),
      );
    }
  },
);

export const fetchProductMasterCategories = createAsyncThunk(
  'stocks/fetchProductMasterCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(PRODUCT_MASTER_CATEGORIES_ENDPOINT);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load product categories.'));
      }
      return { groups: parseProductMasterCategoryGroupsFromApi(result) };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load product categories.'),
      );
    }
  },
);

export const fetchStockUoms = createAsyncThunk(
  'stocks/fetchStockUoms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(STOCK_UOMS_ENDPOINT);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock units.'));
      }
      return { items: parseStockUomsMessage(result) };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock units.'),
      );
    }
  },
);

export const createStockUom = createAsyncThunk(
  'stocks/createStockUom',
  async (unitName, { rejectWithValue }) => {
    const value = String(unitName ?? '').trim();
    if (!value) {
      return rejectWithValue('Unit is required.');
    }

    try {
      const response = await apiClient.post(UOM_RESOURCE_ENDPOINT, {
        uom_name: value,
        enabled: 1,
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to create unit.'));
      }
      return { value, label: value };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to create unit.'),
      );
    }
  },
);

export const fetchProductMasterList = createAsyncThunk(
  'stocks/fetchProductMasterList',
  async (
    {
      keyword = '',
      categoryFilter = [],
      orderBy = 'modified desc',
      groupBy = '',
      groupOrder = 'asc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.productMaster?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const body = buildListRequestBody({
        keyword,
        categoryFilter,
        page: nextPage,
        pageSize,
        orderBy,
        groupBy,
        groupOrder,
      });

      const response = await apiClient.post(PRODUCT_MASTER_LIST_ENDPOINT, body);
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load products.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parseProductMasterListMessage(message);

      return {
        rows,
        groups,
        isGrouped,
        page: message.page ?? nextPage,
        pageSize: message.page_size ?? pageSize,
        totalCount: message.total_count ?? rows.length,
        hasMore: Boolean(message.has_more),
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load products.'),
      );
    }
  },
);

export const updateProductMasterFields = createAsyncThunk(
  'stocks/updateProductMasterFields',
  async (body, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(PRODUCT_MASTER_UPDATE_ENDPOINT, body);
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to update product.'));
      }

      return result?.message ?? result ?? null;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update product.'),
      );
    }
  },
);

export const fetchProductMasterListPref = createAsyncThunk(
  'stocks/fetchProductMasterListPref',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: PRODUCT_MASTER_LIST_PREF_DOCTYPE,
          react_table_id: STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID,
        },
      });
      const message = response?.data?.message;
      if (!message || (Array.isArray(message) && message.length === 0)) {
        return null;
      }
      return message;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load column preferences.'),
      );
    }
  },
);

export const fetchStockRuleCategoryItems = createAsyncThunk(
  'stocks/fetchStockRuleCategoryItems',
  async (itemGroup, { rejectWithValue }) => {
    const group = String(itemGroup ?? '').trim();
    if (!group) {
      return rejectWithValue('Category is required.');
    }
    try {
      const response = await apiClient.get(STOCK_RULES_ITEMS_ENDPOINT, {
        params: { item_group: group },
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load products.'));
      }
      const raw = result?.message ?? result ?? [];
      const items = Array.isArray(raw) ? raw : [];
      return { itemGroup: group, items };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load products.'),
      );
    }
  },
);

export const updateStockRule = createAsyncThunk(
  'stocks/updateStockRule',
  async ({ rowId, updates }, { rejectWithValue }) => {
    const body = buildStockRuleUpdatePayload(rowId, updates);
    if (!body) {
      return rejectWithValue('Invalid stock rule update.');
    }
    try {
      const response = await apiClient.post(STOCK_RULES_UPDATE_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to update stock rule.'));
      }
      return {
        message: result?.message ?? result ?? {},
        rowId: body.row_id,
        updates,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update stock rule.'),
      );
    }
  },
);

export const saveStockRules = createAsyncThunk(
  'stocks/saveStockRules',
  async (payload, { rejectWithValue }) => {
    // const body = buildSaveStockRulesPayload(payload);
    console.log('body', payload);
    if (!payload) {
      return rejectWithValue('Invalid stock rules payload.');
    }
    try {
      const response = await apiClient.post(STOCK_RULES_SAVE_ENDPOINT, payload);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to save stock rules.'));
      }
      const message = result?.message ?? result ?? {};
      if (Array.isArray(message.errors) && message.errors.length > 0) {
        const first = message.errors[0];
        const detail =
          typeof first === 'object' && first?.error
            ? String(first.error)
            : 'Some stock rules could not be saved.';
        return rejectWithValue(detail);
      }
      return message;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save stock rules.'),
      );
    }
  },
);

export const fetchPurchaseOrderList = createAsyncThunk(
  'stocks/fetchPurchaseOrderList',
  async (
    {
      keyword = '',
      vendorFilter = [],
      categoryFilter = [],
      statusFilter = [],
      groupBy = '',
      groupOrder = 'asc',
      orderBy = 'modified desc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.purchaseOrder?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const formData = buildPurchaseOrderListFormData({
        keyword,
        vendorFilter,
        categoryFilter,
        statusFilter,
        page: nextPage,
        pageSize,
        groupBy,
        groupOrder,
        orderBy,
      });

      const response = await apiClient.post(PO_LIST_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load purchase orders.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parsePurchaseOrderListMessage(message);
      const page = message.page ?? nextPage;
      const size = message.page_size ?? message.limit_page_length ?? pageSize;
      const totalCount = message.total_count ?? rows.length;
      const hasMore = Boolean(message.has_more);

      return {
        rows,
        groups,
        isGrouped,
        summary: mapPurchaseOrderListSummary(message.summary),
        page,
        pageSize: size,
        totalCount,
        hasMore,
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load purchase orders.'),
      );
    }
  },
);

export const fetchPurchaseOrderOptions = createAsyncThunk(
  'stocks/fetchPurchaseOrderOptions',
  async ({ center = '', supplier = '' } = {}, { rejectWithValue }) => {
    try {
      const body = {};
      const centerId = String(center ?? '').trim();
      const supplierId = String(supplier ?? '').trim();
      if (centerId) body.center = centerId;
      if (supplierId) body.supplier = supplierId;

      const response = await apiClient.post(PO_OPTIONS_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to load purchase order options.'),
        );
      }
      const parsed = parsePurchaseOrderOptionsMessage(result);
      if (center && parsed.suppliers.length === 0) {
        return {
          ...parsed,
          emptyVendorsForCenter: true,
        };
      }
      return parsed;
    } catch (error) {
      const message = extractErrorMessage(
        error,
        'Failed to load vendors for this center. The center may have no active rate contract.',
      );
      return rejectWithValue(message);
    }
  },
);

export const fetchPurchaseOrderDetail = createAsyncThunk(
  'stocks/fetchPurchaseOrderDetail',
  async (orderName, { rejectWithValue }) => {
    const name = String(orderName ?? '').trim();
    if (!name) {
      return rejectWithValue('Purchase order name is required.');
    }
    try {
      const response = await apiClient.get(PO_DETAIL_ENDPOINT, { params: { name } });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load purchase order.'));
      }
      const message = result?.message ?? result ?? {};
      const detailPayload =
        message && typeof message === 'object' && message.data ? message : { data: message };
      return {
        orderName: name,
        order: mapPurchaseOrderDetail(detailPayload),
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load purchase order.'),
      );
    }
  },
);

export const cancelPurchaseOrder = createAsyncThunk(
  'stocks/cancelPurchaseOrder',
  async (orderName, { rejectWithValue }) => {
    const name = String(orderName ?? '').trim();
    if (!name) {
      return rejectWithValue('Purchase order name is required.');
    }
    try {
      const response = await apiClient.post(PO_CANCEL_ENDPOINT, { name });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to cancel purchase order.'));
      }
      const message = result?.message ?? result ?? {};
      const data = message?.data ?? {};
      return {
        name: message?.name ?? name,
        display: mapPurchaseOrderDetailToDisplayRow({
          data: { ...data, id: message?.name ?? name },
        }),
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to cancel purchase order.'),
      );
    }
  },
);

export const savePurchaseOrder = createAsyncThunk(
  'stocks/savePurchaseOrder',
  async ({ form, isSubmit = false, mode }, { rejectWithValue }) => {
    const submitOrder =
      mode === 'submit' ? true : mode === 'draft' ? false : purchaseOrderShouldSubmit(isSubmit);

    const body = buildSavePurchaseOrderPayload(form, { isSubmit: submitOrder });

    if (body) {
      body.is_submit = submitOrder ? 1 : 0;
    }

    if (!body) {
      return rejectWithValue('Please fill center, vendor, category, dates, and line items.');
    }
    try {
      const response = await apiClient.post(PO_SAVE_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to save purchase order.'));
      }
      const message = result?.message ?? result ?? {};
      return parsePurchaseOrderSaveMessage(message, submitOrder);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save purchase order.'),
      );
    }
  },
);

export const updatePurchaseOrderItems = createAsyncThunk(
  'stocks/updatePurchaseOrderItems',
  async (arg, { rejectWithValue }) => {
    const patch = arg?.patch ?? arg;
    const form = arg?.form ?? null;
    if (!patch || typeof patch !== 'object') {
      return rejectWithValue('No changes to save.');
    }
    const name = String(patch.name ?? '').trim();
    if (!name) {
      return rejectWithValue('Purchase order name is required.');
    }
    try {
      const response = await apiClient.post(PO_UPDATE_ITEMS_ENDPOINT, patch);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to update purchase order.'));
      }
      const message = result?.message ?? result ?? {};
      return {
        ...parsePurchaseOrderSaveMessage(message, false),
        form,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update purchase order.'),
      );
    }
  },
);

export const fetchPoLineItems = createAsyncThunk(
  'stocks/fetchPoLineItems',
  async ({ center, supplier, category, vendorRc }, { rejectWithValue }) => {
    const centerId = String(center ?? '').trim();
    const supplierId = String(supplier ?? '').trim();
    const categoryId = String(category ?? '').trim();
    if (!centerId || !supplierId || !categoryId) {
      return rejectWithValue('Center, vendor, and category are required.');
    }
    try {
      const params = {
        center: centerId,
        supplier: supplierId,
        category: categoryId,
      };
      const vendorRcId = String(vendorRc ?? '').trim();
      if (vendorRcId) params.vendor_rc = vendorRcId;

      const response = await apiClient.get(PO_LINE_ITEMS_ENDPOINT, { params });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to load purchase order line items.'),
        );
      }
      return parsePoLineItemsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load purchase order line items.'),
      );
    }
  },
);

export const fetchStockInOptions = createAsyncThunk(
  'stocks/fetchStockInOptions',
  async (
    { center = '', supplier = '', category = '', sourceType = '' } = {},
    { rejectWithValue },
  ) => {
    try {
      const body = {};
      const centerId = String(center ?? '').trim();
      const supplierId = String(supplier ?? '').trim();
      const categoryId = String(category ?? '').trim();
      if (centerId) body.center = centerId;
      if (supplierId) body.supplier = supplierId;
      if (categoryId) body.category = categoryId;
      if (centerId && sourceType) {
        body.source_type = stockInSourceToApi(sourceType);
      }

      const response = await apiClient.post(STOCK_IN_OPTIONS_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock in options.'));
      }
      const parsed = parseStockInOptionsMessage(result);
      if (
        centerId &&
        parsed.suppliers.length === 0 &&
        stockInSourceToApi(sourceType) === 'Manual Entry'
      ) {
        return { ...parsed, emptyVendorsForCenter: true };
      }
      return parsed;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock in options.'),
      );
    }
  },
);

export const fetchStockInManualItems = createAsyncThunk(
  'stocks/fetchStockInManualItems',
  async ({ center, supplier, category, vendorRc }, { rejectWithValue }) => {
    const centerId = String(center ?? '').trim();
    const supplierId = String(supplier ?? '').trim();
    const categoryId = String(category ?? '').trim();
    if (!centerId || !supplierId || !categoryId) {
      return rejectWithValue('Center, vendor, and category are required.');
    }
    try {
      const params = {
        center: centerId,
        supplier: supplierId,
        category: categoryId,
      };
      const vendorRcId = String(vendorRc ?? '').trim();
      if (vendorRcId) params.vendor_rc = vendorRcId;

      const response = await apiClient.get(STOCK_IN_MANUAL_ITEMS_ENDPOINT, { params });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to load manual inward line items.'),
        );
      }
      return mapStockInManualItemsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load manual inward line items.'),
      );
    }
  },
);

export const fetchStockInPoItems = createAsyncThunk(
  'stocks/fetchStockInPoItems',
  async (purchaseOrder, { rejectWithValue }) => {
    const poName = String(purchaseOrder ?? '').trim();
    if (!poName) {
      return rejectWithValue('Purchase order is required.');
    }
    try {
      const response = await apiClient.post(STOCK_IN_PO_ITEMS_ENDPOINT, {
        purchase_order: poName,
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to load purchase order line items.'),
        );
      }
      return mapStockInPoItemsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load purchase order line items.'),
      );
    }
  },
);

export const fetchStockInTransferItems = createAsyncThunk(
  'stocks/fetchStockInTransferItems',
  async ({ center, outgoingStockEntry }, { rejectWithValue }) => {
    const centerId = String(center ?? '').trim();
    const outgoingEntry = String(outgoingStockEntry ?? '').trim();
    if (!centerId || !outgoingEntry) {
      return rejectWithValue('Center and outgoing transfer are required.');
    }
    try {
      const response = await apiClient.post(STOCK_IN_TRANSFER_ITEMS_ENDPOINT, {
        center: centerId,
        outgoing_stock_entry: outgoingEntry,
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load transfer line items.'));
      }
      return mapStockInTransferItemsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load transfer line items.'),
      );
    }
  },
);

export const fetchStockInList = createAsyncThunk(
  'stocks/fetchStockInList',
  async (
    {
      keyword = '',
      centerFilter = [],
      vendorFilter = [],
      statusFilter = [],
      groupBy = '',
      groupOrder = 'asc',
      orderBy = 'modified desc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.stockIn?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const formData = buildStockInListFormData({
        keyword,
        centerFilter,
        vendorFilter,
        statusFilter,
        page: nextPage,
        pageSize,
        groupBy,
        groupOrder,
        orderBy,
      });

      const response = await apiClient.post(STOCK_IN_LIST_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock in entries.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parseStockInListMessage(message);
      const page = message.page ?? nextPage;
      const size = message.page_size ?? message.limit_page_length ?? pageSize;
      const totalCount = message.total_count ?? rows.length;
      const hasMore = Boolean(message.has_more);

      return {
        rows,
        groups,
        isGrouped,
        page,
        pageSize: size,
        totalCount,
        hasMore,
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock in entries.'),
      );
    }
  },
);

export const fetchStockInDetail = createAsyncThunk(
  'stocks/fetchStockInDetail',
  async (entryName, { rejectWithValue }) => {
    const name = String(entryName ?? '').trim();
    if (!name) {
      return rejectWithValue('Stock in entry name is required.');
    }
    try {
      const response = await apiClient.post(STOCK_IN_DETAIL_ENDPOINT, { name });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load inward entry.'));
      }
      const message = result?.message ?? result ?? {};
      const form = mapStockInDetailToForm(message);
      return {
        entryName: name,
        form,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load inward entry.'),
      );
    }
  },
);

export const saveStockIn = createAsyncThunk(
  'stocks/saveStockIn',
  async ({ form, isSubmit = false, mode, submitOnly = false }, { rejectWithValue }) => {
    const submitEntry =
      mode === 'submit' || mode === 'submit-only'
        ? true
        : mode === 'draft'
          ? false
          : Boolean(isSubmit);
    const onlySubmit = mode === 'submit-only' || Boolean(submitOnly);
    const uploadFiles = form?.files;
    const uploadDocuments = form?.documents;
    const formForPayload = { ...form };
    delete formForPayload.files;
    delete formForPayload.documents;

    const body = buildSaveStockInPayload(formForPayload, {
      isSubmit: submitEntry,
      submitOnly: onlySubmit,
    });
    if (!body) {
      const draftHint = submitEntry
        ? 'Please fill center, vendor, and at least one line with accepted or rejected quantity (rate required for manual entry).'
        : 'Please fill center, vendor, category (manual), purchase order (PO), line items, and rate (manual entry).';
      return rejectWithValue(draftHint);
    }
    try {
      const response = await postStocksMultipartRequest(
        STOCK_IN_SAVE_ENDPOINT,
        body,
        uploadFiles,
        uploadDocuments,
      );
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to save stock in entry.'));
      }
      const message = result?.message ?? result ?? {};
      return mapStockInSaveResponse({ ...message, isSubmit: submitEntry }, form);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save stock in entry.'),
      );
    }
  },
);

export const updateStockInNotes = createAsyncThunk(
  'stocks/updateStockInNotes',
  async ({ entryName, notes }, { rejectWithValue }) => {
    const body = buildStockInNotesUpdatePayload(entryName, notes);
    if (!body) {
      return rejectWithValue('Stock in entry name is required.');
    }
    try {
      const response = await apiClient.post(STOCK_IN_UPDATE_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to update inward entry notes.'));
      }
      return { entryName: body.name, notes: body.notes };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update inward entry notes.'),
      );
    }
  },
);

export const fetchVendorRcSuppliers = createAsyncThunk(
  'stocks/fetchVendorRcSuppliers',
  async (_, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('fields', JSON.stringify(['name', 'supplier_name', 'image']));
      formData.append('filters', JSON.stringify([['disabled', '=', 0]]));
      formData.append('limit_page_length', String(VENDOR_RC_FORM_FETCH_PAGE_SIZE));

      const response = await apiClient.get(SUPPLIER_RESOURCE_ENDPOINT, {
        params: Object.fromEntries(formData.entries()),
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load vendors.'));
      }
      const raw = Array.isArray(result?.data) ? result.data : [];
      const items = raw.map(mapSupplierToVendorRcOption).filter(Boolean);
      return { items };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load vendors.'),
      );
    }
  },
);

export const fetchVendorRcCenters = createAsyncThunk(
  'stocks/fetchVendorRcCenters',
  async (_, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('page', '1');
      formData.append('limit_page_length', String(VENDOR_RC_FORM_FETCH_PAGE_SIZE));

      const response = await apiClient.post(VENDOR_RC_CENTER_LIST_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load centers.'));
      }
      const message = result?.message ?? result ?? {};
      const raw = Array.isArray(message.results) ? message.results : [];
      const items = raw.map(mapCenterToVendorRcOption).filter(Boolean);
      return { items };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load centers.'),
      );
    }
  },
);

export const saveVendorRateContract = createAsyncThunk(
  'stocks/saveVendorRateContract',
  async (payload, { rejectWithValue }) => {
    const contractFiles = filterVendorRcUploadFiles(payload?.contractFiles);
    const { contractFiles: _removed, ...rest } = payload ?? {};
    const body = buildSaveVendorRcPayload(rest);
    if (!body) {
      return rejectWithValue('Invalid vendor rate contract payload.');
    }
    try {
      const response = await postVendorRcRequest(VENDOR_RC_SAVE_ENDPOINT, body, contractFiles);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to save vendor rate contract.'));
      }
      return result?.message ?? result ?? {};
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save vendor rate contract.'),
      );
    }
  },
);

export const fetchVendorRcDetail = createAsyncThunk(
  'stocks/fetchVendorRcDetail',
  async (contractName, { rejectWithValue }) => {
    const name = String(contractName ?? '').trim();
    if (!name) {
      return rejectWithValue('Contract name is required.');
    }
    try {
      const response = await apiClient.get(VENDOR_RC_DETAIL_ENDPOINT, {
        params: { name },
      });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load vendor rate contract.'));
      }
      const message = result?.message ?? result ?? {};
      const data = message?.data ?? message;
      const activity = Array.isArray(message?.activity) ? message.activity : [];
      const row = mapVendorRcDetailToRow(data, activity);
      if (!row) {
        return rejectWithValue('Invalid vendor rate contract response.');
      }
      return { contractId: name, row, activity: row.activityLog ?? [] };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load vendor rate contract.'),
      );
    }
  },
);

export const updateVendorRateContract = createAsyncThunk(
  'stocks/updateVendorRateContract',
  async ({ contractId, updates, files }, { rejectWithValue }) => {
    const body = buildVendorRcUpdatePayload(contractId, updates);
    const uploadFiles = filterVendorRcUploadFiles(files);
    if (!body && uploadFiles.length === 0) {
      return rejectWithValue('Invalid vendor rate contract update.');
    }
    try {
      const response = await postVendorRcRequest(
        VENDOR_RC_UPDATE_ENDPOINT,
        body ?? { name: String(contractId).trim() },
        uploadFiles,
      );
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to update vendor rate contract.'),
        );
      }
      const parsed = parseVendorRcMutationResponse(result);
      return {
        contractId: body?.name ?? String(contractId).trim(),
        row: parsed.row,
        activity: parsed.activity,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update vendor rate contract.'),
      );
    }
  },
);

export const fetchVendorRcList = createAsyncThunk(
  'stocks/fetchVendorRcList',
  async (
    {
      keyword = '',
      categoryFilter = [],
      statusFilter = [],
      groupBy = '',
      groupOrder = 'asc',
      orderBy = 'modified desc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.vendorRc?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const formData = buildVendorRcListFormData({
        keyword,
        categoryFilter,
        statusFilter,
        page: nextPage,
        pageSize,
        groupBy,
        groupOrder,
        orderBy,
      });

      const response = await apiClient.post(VENDOR_RC_LIST_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load vendor contracts.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parseVendorRcListMessage(message);
      const page = message.page ?? nextPage;
      const size = message.page_size ?? pageSize;
      const totalCount = message.total_count ?? rows.length;
      const hasMore =
        message.has_more != null ? Boolean(message.has_more) : page * size < totalCount;

      return {
        rows,
        groups,
        isGrouped,
        page,
        pageSize: size,
        totalCount,
        hasMore,
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load vendor contracts.'),
      );
    }
  },
);

export const fetchStockRulesList = createAsyncThunk(
  'stocks/fetchStockRulesList',
  async (
    {
      keyword = '',
      categoryFilter = [],
      orderBy = 'modified desc',
      groupBy = '',
      groupOrder = 'asc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.stockRules?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const body = buildStockRulesListRequestBody({
        keyword,
        categoryFilter,
        page: nextPage,
        pageSize,
        orderBy,
        groupBy,
        groupOrder,
      });
      const response = await apiClient.post(STOCK_RULES_LIST_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock rules.'));
      }
      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parseStockRulesListMessage(message);
      return {
        rows,
        groups,
        isGrouped,
        page: message.page ?? nextPage,
        pageSize: message.page_size ?? pageSize,
        totalCount: message.total_count ?? rows.length,
        hasMore: Boolean(message.has_more),
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock rules.'),
      );
    }
  },
);

export const saveProductMasterListPref = createAsyncThunk(
  'stocks/saveProductMasterListPref',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: PRODUCT_MASTER_LIST_PREF_DOCTYPE,
        react_table_id: STOCKS_PRODUCT_MASTER_COLUMN_CONFIG_TABLE_ID,
        columns,
      });
      return response?.data?.message ?? { status: 'success' };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save column preferences.'),
      );
    }
  },
);

export const fetchPurchaseOrderListPref = createAsyncThunk(
  'stocks/fetchPurchaseOrderListPref',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: PURCHASE_ORDER_LIST_PREF_DOCTYPE,
          react_table_id: STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID,
        },
      });
      const message = response?.data?.message;
      if (!message || (Array.isArray(message) && message.length === 0)) {
        return null;
      }
      return message;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load column preferences.'),
      );
    }
  },
);

export const savePurchaseOrderListPref = createAsyncThunk(
  'stocks/savePurchaseOrderListPref',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: PURCHASE_ORDER_LIST_PREF_DOCTYPE,
        react_table_id: STOCKS_ORDERS_COLUMN_CONFIG_TABLE_ID,
        columns,
      });
      return response?.data?.message ?? { status: 'success' };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save column preferences.'),
      );
    }
  },
);

export const fetchStockInListPref = createAsyncThunk(
  'stocks/fetchStockInListPref',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: STOCK_IN_LIST_PREF_DOCTYPE,
          react_table_id: STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
        },
      });
      const message = response?.data?.message;
      if (!message || (Array.isArray(message) && message.length === 0)) {
        return null;
      }
      return message;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load column preferences.'),
      );
    }
  },
);

export const saveStockInListPref = createAsyncThunk(
  'stocks/saveStockInListPref',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: STOCK_IN_LIST_PREF_DOCTYPE,
        react_table_id: STOCKS_STOCK_IN_COLUMN_CONFIG_TABLE_ID,
        columns,
      });
      return response?.data?.message ?? { status: 'success' };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save column preferences.'),
      );
    }
  },
);

export const fetchCurrentStockListPref = createAsyncThunk(
  'stocks/fetchCurrentStockListPref',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/method/devx.api.listview.get_list_pref', {
        params: {
          doctype: CURRENT_STOCK_LIST_PREF_DOCTYPE,
          react_table_id: STOCKS_COLUMN_CONFIG_TABLE_ID,
        },
      });
      const message = response?.data?.message;
      if (!message || (Array.isArray(message) && message.length === 0)) {
        return null;
      }
      return message;
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load column preferences.'),
      );
    }
  },
);

export const saveCurrentStockListPref = createAsyncThunk(
  'stocks/saveCurrentStockListPref',
  async (columns, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/method/devx.api.listview.save_list_pref', {
        doctype: CURRENT_STOCK_LIST_PREF_DOCTYPE,
        react_table_id: STOCKS_COLUMN_CONFIG_TABLE_ID,
        columns,
      });
      return response?.data?.message ?? { status: 'success' };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save column preferences.'),
      );
    }
  },
);

export const fetchCurrentStockList = createAsyncThunk(
  'stocks/fetchCurrentStockList',
  async (
    {
      keyword = '',
      categoryFilter = [],
      centerFilter = [],
      statusFilter = [],
      groupBy = 'category',
      groupOrder = 'asc',
      orderBy = '',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.currentStock?.list ?? initialState.currentStock.list;
    const pageSize = CURRENT_STOCK_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const formData = buildCurrentStockListFormData({
        keyword,
        categoryFilter,
        centerFilter,
        statusFilter,
        page: nextPage,
        pageSize,
        groupBy,
        groupOrder,
        orderBy,
      });

      const response = await apiClient.post(CURRENT_STOCK_LIST_ENDPOINT, formData);
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load current stock.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped, stats } = parseCurrentStockListMessage(message);
      const page = message.page ?? nextPage;
      const size = message.page_size ?? message.limit_page_length ?? pageSize;
      const totalCount = message.total_count ?? rows.length;
      const hasMore = Boolean(message.has_more);

      return {
        rows,
        groups,
        isGrouped,
        stats,
        groupBy: message.group_by ?? groupBy,
        page,
        pageSize: size,
        totalCount,
        hasMore,
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load current stock.'),
      );
    }
  },
);

export const fetchStockReorder = createAsyncThunk(
  'stocks/fetchStockReorder',
  async ({ center, itemCode, supplier, vendorRc }, { rejectWithValue }) => {
    const centerId = String(center ?? '').trim();
    const code = String(itemCode ?? '').trim();

    if (!centerId || !code) {
      return rejectWithValue('Center and item code are required to reorder stock.');
    }

    try {
      const body = {
        center: centerId,
        item_code: code,
      };
      const supplierId = String(supplier ?? '').trim();
      const vendorRcId = String(vendorRc ?? '').trim();
      if (supplierId) body.supplier = supplierId;
      if (vendorRcId) body.vendor_rc = vendorRcId;

      const response = await apiClient.post(STOCK_REORDER_ENDPOINT, body);
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load reorder details.'));
      }

      const parsed = parseStockReorderMessage(result);
      return {
        ...parsed,
        reorderItemCode: code,
        orderForm: mapStockReorderToOrderForm(result, { itemCode: code }),
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load reorder details.'),
      );
    }
  },
);

export const fetchStockOutOptions = createAsyncThunk(
  'stocks/fetchStockOutOptions',
  async ({ center = '', department = '', issueMode = '' } = {}, { rejectWithValue }) => {
    try {
      const body = {};
      const centerId = String(center ?? '').trim();
      const departmentName = String(department ?? '').trim();
      if (centerId) body.center = centerId;
      if (departmentName) body.department = departmentName;
      if (centerId && issueMode && stockOutIsTransferMode(issueMode)) {
        body.issue_mode = stockOutIssueModeToApi(issueMode);
      }

      const response = await apiClient.post(STOCK_OUT_OPTIONS_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock out options.'));
      }
      return parseStockOutOptionsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock out options.'),
      );
    }
  },
);

export const fetchStockOutItems = createAsyncThunk(
  'stocks/fetchStockOutItems',
  async ({ center, category, issueMode = '' }, { rejectWithValue }) => {
    const centerId = String(center ?? '').trim();
    const categoryName = String(category ?? '').trim();
    const isTransfer = stockOutIsTransferMode(issueMode);
    if (!centerId || (!isTransfer && !categoryName)) {
      return rejectWithValue(
        isTransfer ? 'Center is required.' : 'Center and category are required.',
      );
    }
    try {
      const body = { center: centerId };
      if (isTransfer) {
        body.issue_mode = stockOutIssueModeToApi(issueMode);
      } else {
        body.category = categoryName;
      }
      const response = await apiClient.post(STOCK_OUT_ITEMS_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock out items.'));
      }
      return parseStockOutItemsMessage(result);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock out items.'),
      );
    }
  },
);

export const fetchStockOutList = createAsyncThunk(
  'stocks/fetchStockOutList',
  async (
    {
      keyword = '',
      centerFilter = [],
      departmentFilter = [],
      statusFilter = [],
      groupBy = '',
      groupOrder = 'asc',
      orderBy = 'modified desc',
      reset = true,
    },
    { getState, rejectWithValue },
  ) => {
    const listState = getState()?.stocks?.stockOut?.list ?? listInitialState;
    const pageSize = listState.pageSize || DEFAULT_LIST_PAGE_SIZE;
    const nextPage = reset ? 1 : (listState.page || 0) + 1;

    if (!reset && !listState.hasMore) {
      return { skipped: true };
    }

    try {
      const formData = buildStockOutListFormData({
        keyword,
        centerFilter,
        departmentFilter,
        statusFilter,
        page: nextPage,
        pageSize,
        groupBy,
        groupOrder,
        orderBy,
      });

      const response = await apiClient.post(STOCK_OUT_LIST_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load stock out entries.'));
      }

      const message = result?.message ?? result ?? {};
      const { rows, groups, isGrouped } = parseStockOutListMessage(message);
      const page = message.page ?? nextPage;
      const size = message.page_size ?? message.limit_page_length ?? pageSize;
      const totalCount = message.total_count ?? rows.length;
      const hasMore = Boolean(message.has_more);

      return {
        rows,
        groups,
        isGrouped,
        page,
        pageSize: size,
        totalCount,
        hasMore,
        append: !reset,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load stock out entries.'),
      );
    }
  },
);

export const fetchStockOutDetail = createAsyncThunk(
  'stocks/fetchStockOutDetail',
  async (entryName, { rejectWithValue }) => {
    const name = String(entryName ?? '').trim();
    if (!name) {
      return rejectWithValue('Stock out entry name is required.');
    }
    try {
      const response = await apiClient.post(STOCK_OUT_DETAIL_ENDPOINT, { name });
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to load outward entry.'));
      }
      const message = result?.message ?? result ?? {};
      const form = mapStockOutDetailToForm(message);
      return {
        entryName: name,
        form,
      };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to load outward entry.'),
      );
    }
  },
);

export const saveStockOut = createAsyncThunk(
  'stocks/saveStockOut',
  async ({ form, isSubmit = false, mode, submitOnly = false }, { rejectWithValue }) => {
    const submitEntry =
      mode === 'submit' || mode === 'submit-only'
        ? true
        : mode === 'draft'
          ? false
          : Boolean(isSubmit);
    const onlySubmit = mode === 'submit-only' || Boolean(submitOnly);
    const uploadFiles = form?.files;
    const formForPayload = { ...form };
    delete formForPayload.files;

    const body = buildSaveStockOutPayload(formForPayload, {
      isSubmit: submitEntry,
      submitOnly: onlySubmit,
    });
    if (!body) {
      const draftHint = submitEntry
        ? onlySubmit
          ? 'Stock out entry name is required to submit.'
          : 'Please fill center, department, category, issued by, and at least one line with issued quantity.'
        : 'Please fill center, department, category, issued by, and at least one line with issued quantity.';
      return rejectWithValue(draftHint);
    }
    try {
      const response = await postStocksMultipartRequest(STOCK_OUT_SAVE_ENDPOINT, body, uploadFiles);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(extractErrorMessage(result, 'Failed to save stock out entry.'));
      }
      const message = result?.message ?? result ?? {};
      return mapStockOutSaveResponse({ ...message, isSubmit: submitEntry }, form);
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to save stock out entry.'),
      );
    }
  },
);

export const updateStockOutNotes = createAsyncThunk(
  'stocks/updateStockOutNotes',
  async ({ entryName, notes }, { rejectWithValue }) => {
    const body = buildStockOutNotesUpdatePayload(entryName, notes);
    if (!body) {
      return rejectWithValue('Stock out entry name is required.');
    }
    try {
      const response = await apiClient.post(STOCK_OUT_UPDATE_ENDPOINT, body);
      const result = response.data;
      if (result?.exc_type) {
        return rejectWithValue(
          extractErrorMessage(result, 'Failed to update outward entry notes.'),
        );
      }
      return { entryName: body.name, notes: body.notes };
    } catch (error) {
      return rejectWithValue(
        error.serialized || extractErrorMessage(error, 'Failed to update outward entry notes.'),
      );
    }
  },
);

export const fetchStocksDocumentActivity = createAsyncThunk(
  'stocks/fetchDocumentActivity',
  async ({ scope, name }, { rejectWithValue }) => {
    const endpoint = STOCKS_DOCUMENT_ACTIVITY_ENDPOINTS[scope];
    if (!endpoint) {
      return rejectWithValue('Unknown activity scope.');
    }
    const docName = String(name ?? '').trim();
    if (!docName) {
      return rejectWithValue('Document name is required.');
    }
    try {
      const items = await requestStockDocumentActivity(endpoint, docName);
      return { scope, name: docName, items };
    } catch (error) {
      return rejectWithValue(
        error?.message || extractErrorMessage(error, 'Failed to load activity.'),
      );
    }
  },
);

const stocksSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    clearProductMasterList: (state) => {
      state.productMaster.list = {
        ...listInitialState,
        pageSize: state.productMaster.list.pageSize,
      };
    },
    clearPurchaseOrderList: (state) => {
      state.purchaseOrder.list = {
        ...listInitialState,
        summary: null,
        groups: [],
        isGrouped: false,
        pageSize: state.purchaseOrder.list.pageSize,
      };
    },
    clearPurchaseOrderDetail: (state) => {
      state.purchaseOrder.detail = { ...purchaseOrderDetailInitialState };
    },
    clearPurchaseOrderCreateState: (state) => {
      state.purchaseOrder.options = { ...purchaseOrderOptionsInitialState };
      state.purchaseOrder.lineItems = { ...purchaseOrderLineItemsInitialState };
      state.purchaseOrder.save = { ...purchaseOrderSaveInitialState };
      state.purchaseOrder.detail = { ...purchaseOrderDetailInitialState };
    },
    clearStockInList: (state) => {
      state.stockIn.list = {
        ...listInitialState,
        pageSize: state.stockIn.list.pageSize,
      };
    },
    clearStockInDetail: (state) => {
      state.stockIn.detail = { ...stockInDetailInitialState };
    },
    clearStocksDocumentActivity: (state, action) => {
      const scope = action.payload;
      if (scope && state.documentActivity[scope]) {
        state.documentActivity[scope] = { ...stocksDocumentActivityEntryInitialState };
        return;
      }
      state.documentActivity = { ...stocksDocumentActivityInitialState };
    },
    clearStockInCreateState: (state) => {
      state.stockIn.options = { ...stockInOptionsInitialState };
      state.stockIn.lineItems = { ...stockInLineItemsInitialState };
      state.stockIn.save = { ...stockInSaveInitialState };
    },
    clearCurrentStockList: (state) => {
      state.currentStock.list = {
        ...listInitialState,
        groups: [],
        isGrouped: true,
        stats: { ...currentStockStatsInitialState },
        groupBy: 'category',
        pageSize: state.currentStock.list.pageSize,
      };
    },
    clearStockOutCreateState: (state) => {
      state.stockOut.options = { ...stockOutOptionsInitialState };
      state.stockOut.lineItems = { ...stockOutLineItemsInitialState };
      state.stockOut.save = { ...stockOutSaveInitialState };
    },
    clearStockOutList: (state) => {
      state.stockOut.list = {
        ...listInitialState,
        groups: [],
        isGrouped: false,
        pageSize: state.stockOut.list.pageSize,
      };
    },
    prependProductMasterListRows: (state, action) => {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      if (rows.length === 0) return;
      state.productMaster.list.items = [...rows, ...state.productMaster.list.items];
    },
    updateProductMasterListRow: (state, action) => {
      const { id, patch } = action.payload ?? {};
      if (!id || !patch || typeof patch !== 'object') return;
      const idx = state.productMaster.list.items.findIndex((r) => String(r.id) === String(id));
      if (idx < 0) return;
      state.productMaster.list.items[idx] = {
        ...state.productMaster.list.items[idx],
        ...patch,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockCategories.pending, (state) => {
        state.stockCategories.isLoading = true;
        state.stockCategories.error = null;
        state.stockCategories.status = 'loading';
      })
      .addCase(fetchStockCategories.fulfilled, (state, action) => {
        state.stockCategories.items = action.payload?.items ?? [];
        state.stockCategories.isLoading = false;
        state.stockCategories.error = null;
        state.stockCategories.status = 'succeeded';
      })
      .addCase(fetchStockCategories.rejected, (state, action) => {
        state.stockCategories.isLoading = false;
        state.stockCategories.error = action.payload ?? 'Failed to load stock categories.';
        state.stockCategories.status = 'failed';
      });

    builder
      .addCase(fetchProductMasterCategories.pending, (state) => {
        state.productMaster.categoryGroups.isLoading = true;
        state.productMaster.categoryGroups.error = null;
        state.productMaster.categoryGroups.status = 'loading';
      })
      .addCase(fetchProductMasterCategories.fulfilled, (state, action) => {
        state.productMaster.categoryGroups.groups = action.payload?.groups ?? [];
        state.productMaster.categoryGroups.isLoading = false;
        state.productMaster.categoryGroups.error = null;
        state.productMaster.categoryGroups.status = 'succeeded';
      })
      .addCase(fetchProductMasterCategories.rejected, (state, action) => {
        state.productMaster.categoryGroups.groups = [];
        state.productMaster.categoryGroups.isLoading = false;
        state.productMaster.categoryGroups.error =
          action.payload ?? 'Failed to load product categories.';
        state.productMaster.categoryGroups.status = 'failed';
      });

    builder
      .addCase(fetchStockUoms.pending, (state) => {
        state.stockUoms.isLoading = true;
        state.stockUoms.error = null;
        state.stockUoms.status = 'loading';
      })
      .addCase(fetchStockUoms.fulfilled, (state, action) => {
        state.stockUoms.items = action.payload?.items ?? [];
        state.stockUoms.isLoading = false;
        state.stockUoms.error = null;
        state.stockUoms.status = 'succeeded';
      })
      .addCase(fetchStockUoms.rejected, (state, action) => {
        state.stockUoms.isLoading = false;
        state.stockUoms.error = action.payload ?? 'Failed to load stock units.';
        state.stockUoms.status = 'failed';
      })
      .addCase(createStockUom.pending, (state) => {
        state.stockUoms.isCreating = true;
        state.stockUoms.createError = null;
        state.stockUoms.createStatus = 'loading';
      })
      .addCase(createStockUom.fulfilled, (state, action) => {
        const option = action.payload;
        if (option?.value && !state.stockUoms.items.some((item) => item.value === option.value)) {
          state.stockUoms.items.push(option);
          state.stockUoms.items.sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
          );
        }
        state.stockUoms.isCreating = false;
        state.stockUoms.createError = null;
        state.stockUoms.createStatus = 'succeeded';
      })
      .addCase(createStockUom.rejected, (state, action) => {
        state.stockUoms.isCreating = false;
        state.stockUoms.createError = action.payload ?? 'Failed to create unit.';
        state.stockUoms.createStatus = 'failed';
      });

    builder
      .addCase(fetchProductMasterList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.productMaster.list.error = null;
        if (reset) {
          state.productMaster.list.items = [];
          state.productMaster.list.groups = [];
          state.productMaster.list.isGrouped = false;
          state.productMaster.list.isLoading = true;
          state.productMaster.list.isLoadingMore = false;
          state.productMaster.list.hasMore = false;
          state.productMaster.list.page = 0;
          state.productMaster.list.status = 'loading';
        } else {
          state.productMaster.list.isLoadingMore = true;
        }
      })
      .addCase(fetchProductMasterList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.productMaster.list.isLoading = false;
          state.productMaster.list.isLoadingMore = false;
          return;
        }

        const {
          rows = [],
          groups = [],
          isGrouped = false,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;

        if (append) {
          state.productMaster.list.items = [...state.productMaster.list.items, ...rows];
          state.productMaster.list.groups = [...(state.productMaster.list.groups ?? []), ...groups];
        } else {
          state.productMaster.list.items = rows;
          state.productMaster.list.groups = groups;
        }
        state.productMaster.list.isGrouped = isGrouped;
        state.productMaster.list.page = page;
        state.productMaster.list.pageSize = pageSize;
        state.productMaster.list.totalCount = totalCount;
        state.productMaster.list.hasMore = hasMore;
        state.productMaster.list.isLoading = false;
        state.productMaster.list.isLoadingMore = false;
        state.productMaster.list.error = null;
        state.productMaster.list.status = 'succeeded';
      })
      .addCase(fetchProductMasterList.rejected, (state, action) => {
        state.productMaster.list.isLoading = false;
        state.productMaster.list.isLoadingMore = false;
        state.productMaster.list.error = action.payload ?? 'Failed to load products.';
        state.productMaster.list.status = 'failed';
      });

    builder
      .addCase(fetchStockRuleCategoryItems.pending, (state, action) => {
        state.stockRules.categoryItems.isLoading = true;
        state.stockRules.categoryItems.error = null;
        state.stockRules.categoryItems.status = 'loading';
        state.stockRules.categoryItems.itemGroup = action.meta.arg ?? '';
      })
      .addCase(fetchStockRuleCategoryItems.fulfilled, (state, action) => {
        const { itemGroup, items = [] } = action.payload ?? {};
        state.stockRules.categoryItems.itemGroup = itemGroup ?? '';
        state.stockRules.categoryItems.items = items;
        state.stockRules.categoryItems.isLoading = false;
        state.stockRules.categoryItems.error = null;
        state.stockRules.categoryItems.status = 'succeeded';
      })
      .addCase(fetchStockRuleCategoryItems.rejected, (state, action) => {
        state.stockRules.categoryItems.items = [];
        state.stockRules.categoryItems.isLoading = false;
        state.stockRules.categoryItems.error = action.payload ?? 'Failed to load products.';
        state.stockRules.categoryItems.status = 'failed';
      });

    builder
      .addCase(saveStockRules.pending, (state) => {
        state.stockRules.save.isLoading = true;
        state.stockRules.save.error = null;
        state.stockRules.save.status = 'loading';
      })
      .addCase(saveStockRules.fulfilled, (state) => {
        state.stockRules.save.isLoading = false;
        state.stockRules.save.error = null;
        state.stockRules.save.status = 'succeeded';
      })
      .addCase(saveStockRules.rejected, (state, action) => {
        state.stockRules.save.isLoading = false;
        state.stockRules.save.error = action.payload ?? 'Failed to save stock rules.';
        state.stockRules.save.status = 'failed';
      });

    builder
      .addCase(fetchStockRulesList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.stockRules.list.error = null;
        if (reset) {
          state.stockRules.list.items = [];
          state.stockRules.list.groups = [];
          state.stockRules.list.isGrouped = false;
          state.stockRules.list.isLoading = true;
          state.stockRules.list.isLoadingMore = false;
          state.stockRules.list.hasMore = false;
          state.stockRules.list.page = 0;
          state.stockRules.list.status = 'loading';
        } else {
          state.stockRules.list.isLoadingMore = true;
        }
      })
      .addCase(fetchStockRulesList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.stockRules.list.isLoading = false;
          state.stockRules.list.isLoadingMore = false;
          return;
        }
        const {
          rows = [],
          groups = [],
          isGrouped = false,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;
        if (append) {
          state.stockRules.list.items = [...state.stockRules.list.items, ...rows];
          state.stockRules.list.groups = [...(state.stockRules.list.groups ?? []), ...groups];
        } else {
          state.stockRules.list.items = rows;
          state.stockRules.list.groups = groups;
        }
        state.stockRules.list.isGrouped = isGrouped;
        state.stockRules.list.page = page;
        state.stockRules.list.pageSize = pageSize;
        state.stockRules.list.totalCount = totalCount;
        state.stockRules.list.hasMore = hasMore;
        state.stockRules.list.isLoading = false;
        state.stockRules.list.isLoadingMore = false;
        state.stockRules.list.error = null;
        state.stockRules.list.status = 'succeeded';
      })
      .addCase(fetchStockRulesList.rejected, (state, action) => {
        state.stockRules.list.isLoading = false;
        state.stockRules.list.isLoadingMore = false;
        state.stockRules.list.error = action.payload ?? 'Failed to load stock rules.';
        state.stockRules.list.status = 'failed';
      });

    builder
      .addCase(fetchVendorRcDetail.pending, (state, action) => {
        state.vendorRc.detail.contractId = action.meta.arg ?? null;
        state.vendorRc.detail.isLoading = true;
        state.vendorRc.detail.error = null;
        state.vendorRc.detail.status = 'loading';
      })
      .addCase(fetchVendorRcDetail.fulfilled, (state, action) => {
        state.vendorRc.detail.contractId = action.payload?.contractId ?? null;
        state.vendorRc.detail.row = action.payload?.row ?? null;
        state.vendorRc.detail.activity = action.payload?.activity ?? [];
        state.vendorRc.detail.isLoading = false;
        state.vendorRc.detail.error = null;
        state.vendorRc.detail.status = 'succeeded';
      })
      .addCase(fetchVendorRcDetail.rejected, (state, action) => {
        state.vendorRc.detail.isLoading = false;
        state.vendorRc.detail.error = action.payload ?? 'Failed to load vendor rate contract.';
        state.vendorRc.detail.status = 'failed';
      });

    builder
      .addCase(updateVendorRateContract.pending, (state) => {
        state.vendorRc.update.isLoading = true;
        state.vendorRc.update.error = null;
        state.vendorRc.update.status = 'loading';
      })
      .addCase(updateVendorRateContract.fulfilled, (state, action) => {
        state.vendorRc.update.isLoading = false;
        state.vendorRc.update.error = null;
        state.vendorRc.update.status = 'succeeded';
        if (action.payload?.row) {
          state.vendorRc.detail.row = action.payload.row;
          state.vendorRc.detail.activity = action.payload.activity ?? [];
          state.vendorRc.detail.contractId =
            action.payload.contractId ?? state.vendorRc.detail.contractId;
        }
      })
      .addCase(updateVendorRateContract.rejected, (state, action) => {
        state.vendorRc.update.isLoading = false;
        state.vendorRc.update.error = action.payload ?? 'Failed to update vendor rate contract.';
        state.vendorRc.update.status = 'failed';
      });

    builder
      .addCase(fetchVendorRcSuppliers.pending, (state) => {
        state.vendorRc.vendors.isLoading = true;
        state.vendorRc.vendors.error = null;
        state.vendorRc.vendors.status = 'loading';
      })
      .addCase(fetchVendorRcSuppliers.fulfilled, (state, action) => {
        state.vendorRc.vendors.items = action.payload?.items ?? [];
        state.vendorRc.vendors.isLoading = false;
        state.vendorRc.vendors.error = null;
        state.vendorRc.vendors.status = 'succeeded';
      })
      .addCase(fetchVendorRcSuppliers.rejected, (state, action) => {
        state.vendorRc.vendors.isLoading = false;
        state.vendorRc.vendors.error = action.payload ?? 'Failed to load vendors.';
        state.vendorRc.vendors.status = 'failed';
      });

    builder
      .addCase(fetchVendorRcCenters.pending, (state) => {
        state.vendorRc.centers.isLoading = true;
        state.vendorRc.centers.error = null;
        state.vendorRc.centers.status = 'loading';
      })
      .addCase(fetchVendorRcCenters.fulfilled, (state, action) => {
        state.vendorRc.centers.items = action.payload?.items ?? [];
        state.vendorRc.centers.isLoading = false;
        state.vendorRc.centers.error = null;
        state.vendorRc.centers.status = 'succeeded';
      })
      .addCase(fetchVendorRcCenters.rejected, (state, action) => {
        state.vendorRc.centers.isLoading = false;
        state.vendorRc.centers.error = action.payload ?? 'Failed to load centers.';
        state.vendorRc.centers.status = 'failed';
      });

    builder
      .addCase(saveVendorRateContract.pending, (state) => {
        state.vendorRc.save.isLoading = true;
        state.vendorRc.save.error = null;
        state.vendorRc.save.status = 'loading';
      })
      .addCase(saveVendorRateContract.fulfilled, (state) => {
        state.vendorRc.save.isLoading = false;
        state.vendorRc.save.error = null;
        state.vendorRc.save.status = 'succeeded';
      })
      .addCase(saveVendorRateContract.rejected, (state, action) => {
        state.vendorRc.save.isLoading = false;
        state.vendorRc.save.error = action.payload ?? 'Failed to save vendor rate contract.';
        state.vendorRc.save.status = 'failed';
      });

    builder
      .addCase(fetchVendorRcList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.vendorRc.list.error = null;
        if (reset) {
          state.vendorRc.list.items = [];
          state.vendorRc.list.groups = [];
          state.vendorRc.list.isGrouped = false;
          state.vendorRc.list.isLoading = true;
          state.vendorRc.list.isLoadingMore = false;
          state.vendorRc.list.hasMore = false;
          state.vendorRc.list.page = 0;
          state.vendorRc.list.status = 'loading';
        } else {
          state.vendorRc.list.isLoadingMore = true;
        }
      })
      .addCase(fetchVendorRcList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.vendorRc.list.isLoading = false;
          state.vendorRc.list.isLoadingMore = false;
          return;
        }
        const {
          rows = [],
          groups = [],
          isGrouped = false,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;
        if (append) {
          state.vendorRc.list.items = [...state.vendorRc.list.items, ...rows];
          state.vendorRc.list.groups = [...(state.vendorRc.list.groups ?? []), ...groups];
        } else {
          state.vendorRc.list.items = rows;
          state.vendorRc.list.groups = groups;
        }
        state.vendorRc.list.isGrouped = isGrouped;
        state.vendorRc.list.page = page;
        state.vendorRc.list.pageSize = pageSize;
        state.vendorRc.list.totalCount = totalCount;
        state.vendorRc.list.hasMore = hasMore;
        state.vendorRc.list.isLoading = false;
        state.vendorRc.list.isLoadingMore = false;
        state.vendorRc.list.error = null;
        state.vendorRc.list.status = 'succeeded';
      })
      .addCase(fetchVendorRcList.rejected, (state, action) => {
        state.vendorRc.list.isLoading = false;
        state.vendorRc.list.isLoadingMore = false;
        state.vendorRc.list.error = action.payload ?? 'Failed to load vendor contracts.';
        state.vendorRc.list.status = 'failed';
      });

    builder
      .addCase(fetchPurchaseOrderList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.purchaseOrder.list.error = null;
        if (reset) {
          state.purchaseOrder.list.items = [];
          state.purchaseOrder.list.groups = [];
          state.purchaseOrder.list.isGrouped = false;
          state.purchaseOrder.list.isLoading = true;
          state.purchaseOrder.list.isLoadingMore = false;
          state.purchaseOrder.list.hasMore = false;
          state.purchaseOrder.list.page = 0;
          state.purchaseOrder.list.status = 'loading';
        } else {
          state.purchaseOrder.list.isLoadingMore = true;
        }
      })
      .addCase(fetchPurchaseOrderList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.purchaseOrder.list.isLoading = false;
          state.purchaseOrder.list.isLoadingMore = false;
          return;
        }
        const {
          rows = [],
          groups = [],
          isGrouped = false,
          summary = null,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;
        if (append) {
          state.purchaseOrder.list.items = [...state.purchaseOrder.list.items, ...rows];
          state.purchaseOrder.list.groups = [...(state.purchaseOrder.list.groups ?? []), ...groups];
        } else {
          state.purchaseOrder.list.items = rows;
          state.purchaseOrder.list.groups = groups;
        }
        state.purchaseOrder.list.isGrouped = isGrouped;
        state.purchaseOrder.list.summary = summary;
        state.purchaseOrder.list.page = page;
        state.purchaseOrder.list.pageSize = pageSize;
        state.purchaseOrder.list.totalCount = totalCount;
        state.purchaseOrder.list.hasMore = hasMore;
        state.purchaseOrder.list.isLoading = false;
        state.purchaseOrder.list.isLoadingMore = false;
        state.purchaseOrder.list.error = null;
        state.purchaseOrder.list.status = 'succeeded';
      })
      .addCase(fetchPurchaseOrderList.rejected, (state, action) => {
        state.purchaseOrder.list.isLoading = false;
        state.purchaseOrder.list.isLoadingMore = false;
        state.purchaseOrder.list.error = action.payload ?? 'Failed to load purchase orders.';
        state.purchaseOrder.list.status = 'failed';
      });

    builder
      .addCase(fetchPurchaseOrderOptions.pending, (state, action) => {
        const { center, supplier } = action.meta.arg ?? {};
        state.purchaseOrder.options.isLoading = true;
        state.purchaseOrder.options.error = null;
        state.purchaseOrder.options.status = 'loading';
        if (center && !supplier) {
          state.purchaseOrder.options.suppliers = [];
          state.purchaseOrder.options.categories = [];
        } else if (center && supplier) {
          state.purchaseOrder.options.categories = [];
        }
      })
      .addCase(fetchPurchaseOrderOptions.fulfilled, (state, action) => {
        const { suppliers, categories } = action.payload ?? {};
        const { center, supplier } = action.meta.arg ?? {};
        // Centers come from center listview; this API only supplies vendors/categories for a center.
        if (!center) {
          state.purchaseOrder.options.suppliers = [];
          state.purchaseOrder.options.categories = [];
        } else if (center && !supplier) {
          state.purchaseOrder.options.suppliers = suppliers;
          state.purchaseOrder.options.categories = [];
        } else if (center && supplier) {
          // Supplier fetch is scoped to one vendor; keep the full center vendor list.
          state.purchaseOrder.options.categories = categories;
        }
        state.purchaseOrder.options.isLoading = false;
        state.purchaseOrder.options.error = null;
        state.purchaseOrder.options.status = 'succeeded';
      })
      .addCase(fetchPurchaseOrderOptions.rejected, (state, action) => {
        state.purchaseOrder.options.isLoading = false;
        state.purchaseOrder.options.error =
          action.payload ?? 'Failed to load purchase order options.';
        state.purchaseOrder.options.status = 'failed';
      });

    builder
      .addCase(fetchPoLineItems.pending, (state) => {
        state.purchaseOrder.lineItems.isLoading = true;
        state.purchaseOrder.lineItems.error = null;
        state.purchaseOrder.lineItems.status = 'loading';
      })
      .addCase(fetchPoLineItems.fulfilled, (state, action) => {
        state.purchaseOrder.lineItems.items = action.payload?.items ?? [];
        state.purchaseOrder.lineItems.vendorRc = action.payload?.vendorRc ?? '';
        state.purchaseOrder.lineItems.warehouse = action.payload?.warehouse ?? '';
        state.purchaseOrder.lineItems.requiresSupplier = false;
        state.purchaseOrder.lineItems.requiresVendorRc = Boolean(action.payload?.requiresVendorRc);
        state.purchaseOrder.lineItems.supplierOptions = [];
        state.purchaseOrder.lineItems.vendorRcOptions = action.payload?.vendorRcOptions ?? [];
        state.purchaseOrder.lineItems.isLoading = false;
        state.purchaseOrder.lineItems.error = null;
        state.purchaseOrder.lineItems.status = 'succeeded';
      })
      .addCase(fetchPoLineItems.rejected, (state, action) => {
        state.purchaseOrder.lineItems.isLoading = false;
        state.purchaseOrder.lineItems.error =
          action.payload ?? 'Failed to load purchase order line items.';
        state.purchaseOrder.lineItems.status = 'failed';
        state.purchaseOrder.lineItems.items = [];
        state.purchaseOrder.lineItems.requiresSupplier = false;
        state.purchaseOrder.lineItems.requiresVendorRc = false;
        state.purchaseOrder.lineItems.supplierOptions = [];
        state.purchaseOrder.lineItems.vendorRcOptions = [];
      });

    builder
      .addCase(fetchStockReorder.pending, (state) => {
        state.purchaseOrder.lineItems.isLoading = true;
        state.purchaseOrder.lineItems.error = null;
        state.purchaseOrder.lineItems.status = 'loading';
      })
      .addCase(fetchStockReorder.fulfilled, (state, action) => {
        state.purchaseOrder.lineItems.items = action.payload?.items ?? [];
        state.purchaseOrder.lineItems.vendorRc = action.payload?.vendorRc ?? '';
        state.purchaseOrder.lineItems.warehouse = action.payload?.warehouse ?? '';
        state.purchaseOrder.lineItems.requiresSupplier = Boolean(action.payload?.requiresSupplier);
        state.purchaseOrder.lineItems.requiresVendorRc = Boolean(action.payload?.requiresVendorRc);
        state.purchaseOrder.lineItems.supplierOptions = action.payload?.supplierOptions ?? [];
        state.purchaseOrder.lineItems.vendorRcOptions = action.payload?.vendorRcOptions ?? [];
        state.purchaseOrder.lineItems.isLoading = false;
        state.purchaseOrder.lineItems.error = null;
        state.purchaseOrder.lineItems.status = 'succeeded';
      })
      .addCase(fetchStockReorder.rejected, (state, action) => {
        state.purchaseOrder.lineItems.isLoading = false;
        state.purchaseOrder.lineItems.error = action.payload ?? 'Failed to load reorder details.';
        state.purchaseOrder.lineItems.status = 'failed';
        state.purchaseOrder.lineItems.items = [];
        state.purchaseOrder.lineItems.requiresSupplier = false;
        state.purchaseOrder.lineItems.requiresVendorRc = false;
        state.purchaseOrder.lineItems.supplierOptions = [];
        state.purchaseOrder.lineItems.vendorRcOptions = [];
      });

    const setPurchaseOrderSavePending = (state) => {
      state.purchaseOrder.save.isLoading = true;
      state.purchaseOrder.save.error = null;
      state.purchaseOrder.save.status = 'loading';
    };
    const setPurchaseOrderSaveFulfilled = (state) => {
      state.purchaseOrder.save.isLoading = false;
      state.purchaseOrder.save.error = null;
      state.purchaseOrder.save.status = 'succeeded';
    };
    const setPurchaseOrderSaveRejected = (state, action, fallbackMessage) => {
      state.purchaseOrder.save.isLoading = false;
      state.purchaseOrder.save.error = action.payload ?? fallbackMessage;
      state.purchaseOrder.save.status = 'failed';
    };

    builder
      .addCase(savePurchaseOrder.pending, setPurchaseOrderSavePending)
      .addCase(savePurchaseOrder.fulfilled, setPurchaseOrderSaveFulfilled)
      .addCase(savePurchaseOrder.rejected, (state, action) =>
        setPurchaseOrderSaveRejected(state, action, 'Failed to save purchase order.'),
      )
      .addCase(updatePurchaseOrderItems.pending, setPurchaseOrderSavePending)
      .addCase(updatePurchaseOrderItems.fulfilled, (state, action) => {
        setPurchaseOrderSaveFulfilled(state);
        const form = action.payload?.form;
        const orderName = String(
          action.payload?.name ?? form?.name ?? state.purchaseOrder.detail.orderName ?? '',
        ).trim();

        if (form && state.purchaseOrder.detail.order) {
          state.purchaseOrder.detail.order = applyPurchaseOrderFormToDetailOrder(
            state.purchaseOrder.detail.order,
            form,
          );
        }

        if (form && orderName) {
          const patchListRow = (row) => {
            const rowName = String(row?.name ?? row?.orderNo ?? row?.id ?? '').trim();
            if (rowName !== orderName) return row;
            return applyPurchaseOrderFormToListItem(row, form);
          };

          state.purchaseOrder.list.items = (state.purchaseOrder.list.items ?? []).map(patchListRow);
          state.purchaseOrder.list.groups = (state.purchaseOrder.list.groups ?? []).map(
            (group) => ({
              ...group,
              rows: (group.rows ?? []).map(patchListRow),
            }),
          );
        }
      })
      .addCase(updatePurchaseOrderItems.rejected, (state, action) =>
        setPurchaseOrderSaveRejected(state, action, 'Failed to update purchase order.'),
      );

    builder
      .addCase(fetchPurchaseOrderDetail.pending, (state, action) => {
        const nextName = action.meta.arg ?? null;
        const sameOrder =
          nextName &&
          state.purchaseOrder.detail.orderName === nextName &&
          state.purchaseOrder.detail.order;
        state.purchaseOrder.detail.orderName = nextName;
        // Keep current detail visible while refreshing the same order (no full-drawer flash).
        if (!sameOrder) {
          state.purchaseOrder.detail.order = null;
          state.purchaseOrder.detail.isLoading = true;
          state.purchaseOrder.detail.status = 'loading';
        } else {
          state.purchaseOrder.detail.isLoading = false;
        }
        state.purchaseOrder.detail.error = null;
      })
      .addCase(fetchPurchaseOrderDetail.fulfilled, (state, action) => {
        state.purchaseOrder.detail.orderName = action.payload?.orderName ?? null;
        state.purchaseOrder.detail.order = action.payload?.order ?? null;
        state.purchaseOrder.detail.isLoading = false;
        state.purchaseOrder.detail.error = null;
        state.purchaseOrder.detail.status = 'succeeded';
      })
      .addCase(fetchPurchaseOrderDetail.rejected, (state, action) => {
        state.purchaseOrder.detail.isLoading = false;
        state.purchaseOrder.detail.error = action.payload ?? 'Failed to load purchase order.';
        state.purchaseOrder.detail.status = 'failed';
      });

    builder
      .addCase(cancelPurchaseOrder.pending, (state) => {
        state.purchaseOrder.cancel.isLoading = true;
        state.purchaseOrder.cancel.error = null;
        state.purchaseOrder.cancel.status = 'loading';
      })
      .addCase(cancelPurchaseOrder.fulfilled, (state) => {
        state.purchaseOrder.cancel.isLoading = false;
        state.purchaseOrder.cancel.error = null;
        state.purchaseOrder.cancel.status = 'succeeded';
      })
      .addCase(cancelPurchaseOrder.rejected, (state, action) => {
        state.purchaseOrder.cancel.isLoading = false;
        state.purchaseOrder.cancel.error = action.payload ?? 'Failed to cancel purchase order.';
        state.purchaseOrder.cancel.status = 'failed';
      });

    builder
      .addCase(fetchStockInList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.stockIn.list.error = null;
        if (reset) {
          state.stockIn.list.items = [];
          state.stockIn.list.groups = [];
          state.stockIn.list.isGrouped = false;
          state.stockIn.list.isLoading = true;
          state.stockIn.list.isLoadingMore = false;
          state.stockIn.list.hasMore = false;
          state.stockIn.list.page = 0;
          state.stockIn.list.status = 'loading';
        } else {
          state.stockIn.list.isLoadingMore = true;
        }
      })
      .addCase(fetchStockInList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.stockIn.list.isLoading = false;
          state.stockIn.list.isLoadingMore = false;
          return;
        }
        const {
          rows = [],
          groups = [],
          isGrouped = false,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;
        if (append) {
          state.stockIn.list.items = [...state.stockIn.list.items, ...rows];
          state.stockIn.list.groups = [...(state.stockIn.list.groups ?? []), ...groups];
        } else {
          state.stockIn.list.items = rows;
          state.stockIn.list.groups = groups;
        }
        state.stockIn.list.isGrouped = isGrouped;
        state.stockIn.list.page = page;
        state.stockIn.list.pageSize = pageSize;
        state.stockIn.list.totalCount = totalCount;
        state.stockIn.list.hasMore = hasMore;
        state.stockIn.list.isLoading = false;
        state.stockIn.list.isLoadingMore = false;
        state.stockIn.list.error = null;
        state.stockIn.list.status = 'succeeded';
      })
      .addCase(fetchStockInList.rejected, (state, action) => {
        state.stockIn.list.isLoading = false;
        state.stockIn.list.isLoadingMore = false;
        state.stockIn.list.error = action.payload ?? 'Failed to load stock in entries.';
        state.stockIn.list.status = 'failed';
      });

    builder
      .addCase(fetchStockInDetail.pending, (state, action) => {
        state.stockIn.detail.entryName = action.meta.arg ?? null;
        state.stockIn.detail.form = null;
        state.stockIn.detail.isLoading = true;
        state.stockIn.detail.error = null;
        state.stockIn.detail.status = 'loading';
      })
      .addCase(fetchStockInDetail.fulfilled, (state, action) => {
        state.stockIn.detail.entryName = action.payload?.entryName ?? null;
        state.stockIn.detail.form = action.payload?.form ?? null;
        state.stockIn.detail.isLoading = false;
        state.stockIn.detail.error = null;
        state.stockIn.detail.status = 'succeeded';
      })
      .addCase(fetchStockInDetail.rejected, (state, action) => {
        state.stockIn.detail.isLoading = false;
        state.stockIn.detail.error = action.payload ?? 'Failed to load inward entry.';
        state.stockIn.detail.status = 'failed';
      });

    builder.addCase(updateStockInNotes.fulfilled, (state, action) => {
      const { entryName, notes } = action.payload ?? {};
      if (state.stockIn.detail.entryName === entryName && state.stockIn.detail.form) {
        state.stockIn.detail.form.notes = notes ?? '';
      }
    });

    builder
      .addCase(fetchStockInOptions.pending, (state) => {
        state.stockIn.options.isLoading = true;
        state.stockIn.options.error = null;
        state.stockIn.options.status = 'loading';
      })
      .addCase(fetchStockInOptions.fulfilled, (state, action) => {
        const payload = action.payload ?? {};
        const { supplier = '', category = '' } = action.meta.arg ?? {};
        const supplierId = String(supplier).trim();
        const categoryId = String(category).trim();

        if (payload.centers?.length) {
          state.stockIn.options.centers = payload.centers;
        }
        if (!supplierId) {
          state.stockIn.options.suppliers = payload.suppliers ?? [];
          state.stockIn.options.categories = payload.categories ?? [];
        } else if (!categoryId) {
          state.stockIn.options.categories = payload.categories ?? [];
        }
        if (payload.purchaseOrders !== undefined) {
          state.stockIn.options.purchaseOrders = payload.purchaseOrders ?? [];
        }
        if (payload.pendingTransfers !== undefined) {
          state.stockIn.options.pendingTransfers = payload.pendingTransfers ?? [];
        }
        if (payload.requiresTransferSelection !== undefined) {
          state.stockIn.options.requiresTransferSelection = Boolean(
            payload.requiresTransferSelection,
          );
        }
        state.stockIn.options.isLoading = false;
        state.stockIn.options.error = null;
        state.stockIn.options.status = 'succeeded';
      })
      .addCase(fetchStockInOptions.rejected, (state, action) => {
        state.stockIn.options.isLoading = false;
        state.stockIn.options.error = action.payload ?? 'Failed to load stock in options.';
        state.stockIn.options.status = 'failed';
      });

    builder
      .addCase(fetchStockInManualItems.pending, (state) => {
        state.stockIn.lineItems.isLoading = true;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'loading';
      })
      .addCase(fetchStockInManualItems.fulfilled, (state, action) => {
        state.stockIn.lineItems.items = action.payload?.items ?? [];
        state.stockIn.lineItems.vendorRc = action.payload?.vendorRc ?? '';
        state.stockIn.lineItems.requiresVendorRc = Boolean(action.payload?.requiresVendorRc);
        state.stockIn.lineItems.vendorRcOptions = action.payload?.vendorRcOptions ?? [];
        state.stockIn.lineItems.purchaseOrder = '';
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'succeeded';
      })
      .addCase(fetchStockInManualItems.rejected, (state, action) => {
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error =
          action.payload ?? 'Failed to load manual inward line items.';
        state.stockIn.lineItems.status = 'failed';
        state.stockIn.lineItems.items = [];
        state.stockIn.lineItems.requiresVendorRc = false;
        state.stockIn.lineItems.vendorRcOptions = [];
      });

    builder
      .addCase(fetchStockInPoItems.pending, (state) => {
        state.stockIn.lineItems.isLoading = true;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'loading';
      })
      .addCase(fetchStockInPoItems.fulfilled, (state, action) => {
        state.stockIn.lineItems.items = action.payload?.items ?? [];
        state.stockIn.lineItems.purchaseOrder = action.payload?.purchaseOrder ?? '';
        state.stockIn.lineItems.vendorRc = '';
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'succeeded';
      })
      .addCase(fetchStockInPoItems.rejected, (state, action) => {
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error =
          action.payload ?? 'Failed to load purchase order line items.';
        state.stockIn.lineItems.status = 'failed';
        state.stockIn.lineItems.items = [];
      });

    builder
      .addCase(fetchStockInTransferItems.pending, (state) => {
        state.stockIn.lineItems.isLoading = true;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'loading';
      })
      .addCase(fetchStockInTransferItems.fulfilled, (state, action) => {
        const payload = action.payload ?? {};
        state.stockIn.lineItems.items = payload.items ?? [];
        state.stockIn.lineItems.outgoingStockEntry = payload.outgoingStockEntry ?? '';
        state.stockIn.lineItems.sourceCenter = payload.sourceCenter ?? '';
        state.stockIn.lineItems.sourceCenterName = payload.sourceCenterName ?? '';
        state.stockIn.lineItems.purchaseOrder = '';
        state.stockIn.lineItems.vendorRc = '';
        state.stockIn.lineItems.requiresVendorRc = false;
        state.stockIn.lineItems.vendorRcOptions = [];
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error = null;
        state.stockIn.lineItems.status = 'succeeded';
      })
      .addCase(fetchStockInTransferItems.rejected, (state, action) => {
        state.stockIn.lineItems.isLoading = false;
        state.stockIn.lineItems.error = action.payload ?? 'Failed to load transfer line items.';
        state.stockIn.lineItems.status = 'failed';
        state.stockIn.lineItems.items = [];
      });

    builder
      .addCase(saveStockIn.pending, (state) => {
        state.stockIn.save.isLoading = true;
        state.stockIn.save.error = null;
        state.stockIn.save.status = 'loading';
      })
      .addCase(saveStockIn.fulfilled, (state) => {
        state.stockIn.save.isLoading = false;
        state.stockIn.save.error = null;
        state.stockIn.save.status = 'succeeded';
      })
      .addCase(saveStockIn.rejected, (state, action) => {
        state.stockIn.save.isLoading = false;
        state.stockIn.save.error = action.payload ?? 'Failed to save stock in entry.';
        state.stockIn.save.status = 'failed';
      });

    builder
      .addCase(fetchCurrentStockList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.currentStock.list.error = null;
        if (reset) {
          state.currentStock.list.items = [];
          state.currentStock.list.groups = [];
          state.currentStock.list.isLoading = true;
          state.currentStock.list.isLoadingMore = false;
          state.currentStock.list.hasMore = false;
          state.currentStock.list.page = 0;
          state.currentStock.list.status = 'loading';
        } else {
          state.currentStock.list.isLoadingMore = true;
        }
      })
      .addCase(fetchCurrentStockList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.currentStock.list.isLoading = false;
          state.currentStock.list.isLoadingMore = false;
          return;
        }

        const {
          rows = [],
          groups = [],
          isGrouped = true,
          stats = null,
          groupBy = 'category',
          page = 1,
          pageSize = CURRENT_STOCK_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;

        if (append) {
          state.currentStock.list.items = [...state.currentStock.list.items, ...rows];
          state.currentStock.list.groups = [...state.currentStock.list.groups, ...groups];
        } else {
          state.currentStock.list.items = rows;
          state.currentStock.list.groups = groups;
        }

        state.currentStock.list.isGrouped = isGrouped;
        state.currentStock.list.groupBy = groupBy;
        if (stats) {
          state.currentStock.list.stats = stats;
        }
        state.currentStock.list.page = page;
        state.currentStock.list.pageSize = pageSize;
        state.currentStock.list.totalCount = totalCount;
        state.currentStock.list.hasMore = hasMore;
        state.currentStock.list.isLoading = false;
        state.currentStock.list.isLoadingMore = false;
        state.currentStock.list.error = null;
        state.currentStock.list.status = 'succeeded';
      })
      .addCase(fetchCurrentStockList.rejected, (state, action) => {
        state.currentStock.list.isLoading = false;
        state.currentStock.list.isLoadingMore = false;
        state.currentStock.list.error = action.payload ?? 'Failed to load current stock.';
        state.currentStock.list.status = 'failed';
      });

    builder
      .addCase(fetchStockOutList.pending, (state, action) => {
        const reset = action.meta.arg?.reset !== false;
        state.stockOut.list.error = null;
        if (reset) {
          state.stockOut.list.items = [];
          state.stockOut.list.groups = [];
          state.stockOut.list.isGrouped = false;
          state.stockOut.list.isLoading = true;
          state.stockOut.list.isLoadingMore = false;
          state.stockOut.list.hasMore = false;
          state.stockOut.list.page = 0;
          state.stockOut.list.status = 'loading';
        } else {
          state.stockOut.list.isLoadingMore = true;
        }
      })
      .addCase(fetchStockOutList.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.skipped) {
          state.stockOut.list.isLoading = false;
          state.stockOut.list.isLoadingMore = false;
          return;
        }
        const {
          rows = [],
          groups = [],
          isGrouped = false,
          page = 1,
          pageSize = DEFAULT_LIST_PAGE_SIZE,
          totalCount = 0,
          hasMore = false,
          append = false,
        } = payload;
        if (append) {
          state.stockOut.list.items = [...state.stockOut.list.items, ...rows];
          state.stockOut.list.groups = [...(state.stockOut.list.groups ?? []), ...groups];
        } else {
          state.stockOut.list.items = rows;
          state.stockOut.list.groups = groups;
        }
        state.stockOut.list.isGrouped = isGrouped;
        state.stockOut.list.page = page;
        state.stockOut.list.pageSize = pageSize;
        state.stockOut.list.totalCount = totalCount;
        state.stockOut.list.hasMore = hasMore;
        state.stockOut.list.isLoading = false;
        state.stockOut.list.isLoadingMore = false;
        state.stockOut.list.error = null;
        state.stockOut.list.status = 'succeeded';
      })
      .addCase(fetchStockOutList.rejected, (state, action) => {
        state.stockOut.list.isLoading = false;
        state.stockOut.list.isLoadingMore = false;
        state.stockOut.list.error = action.payload ?? 'Failed to load stock out entries.';
        state.stockOut.list.status = 'failed';
      });

    builder
      .addCase(fetchStockOutOptions.pending, (state) => {
        state.stockOut.options.isLoading = true;
        state.stockOut.options.error = null;
        state.stockOut.options.status = 'loading';
      })
      .addCase(fetchStockOutOptions.fulfilled, (state, action) => {
        const payload = action.payload ?? {};
        const { center = '', department = '', issueMode = '' } = action.meta.arg ?? {};
        const centerId = String(center).trim();
        const departmentName = String(department).trim();
        const isTransfer = stockOutIsTransferMode(issueMode);

        if (payload.centers?.length) {
          state.stockOut.options.centers = payload.centers;
        }
        if (isTransfer && centerId) {
          state.stockOut.options.destinationCenters = payload.destinationCenters ?? [];
        }
        if (centerId && !departmentName && !isTransfer) {
          state.stockOut.options.departments = payload.departments ?? [];
          state.stockOut.options.categories = payload.categories ?? [];
          state.stockOut.options.issuedBy = [];
        }
        if (centerId && departmentName && !isTransfer) {
          state.stockOut.options.departments =
            payload.departments ?? state.stockOut.options.departments;
          state.stockOut.options.categories =
            payload.categories ?? state.stockOut.options.categories;
          state.stockOut.options.issuedBy = payload.issuedBy ?? [];
        }
        state.stockOut.options.isLoading = false;
        state.stockOut.options.error = null;
        state.stockOut.options.status = 'succeeded';
      })
      .addCase(fetchStockOutOptions.rejected, (state, action) => {
        state.stockOut.options.isLoading = false;
        state.stockOut.options.error = action.payload ?? 'Failed to load stock out options.';
        state.stockOut.options.status = 'failed';
      });

    builder
      .addCase(fetchStockOutItems.pending, (state) => {
        state.stockOut.lineItems.isLoading = true;
        state.stockOut.lineItems.error = null;
        state.stockOut.lineItems.status = 'loading';
      })
      .addCase(fetchStockOutItems.fulfilled, (state, action) => {
        const payload = action.payload ?? {};
        state.stockOut.lineItems.items = payload.items ?? [];
        state.stockOut.lineItems.center = payload.center ?? '';
        state.stockOut.lineItems.category = payload.category ?? '';
        state.stockOut.lineItems.isLoading = false;
        state.stockOut.lineItems.error = null;
        state.stockOut.lineItems.status = 'succeeded';
      })
      .addCase(fetchStockOutItems.rejected, (state, action) => {
        state.stockOut.lineItems.isLoading = false;
        state.stockOut.lineItems.error = action.payload ?? 'Failed to load stock out items.';
        state.stockOut.lineItems.status = 'failed';
      });

    builder
      .addCase(saveStockOut.pending, (state) => {
        state.stockOut.save.isLoading = true;
        state.stockOut.save.error = null;
        state.stockOut.save.status = 'loading';
      })
      .addCase(saveStockOut.fulfilled, (state) => {
        state.stockOut.save.isLoading = false;
        state.stockOut.save.error = null;
        state.stockOut.save.status = 'succeeded';
      })
      .addCase(saveStockOut.rejected, (state, action) => {
        state.stockOut.save.isLoading = false;
        state.stockOut.save.error = action.payload ?? 'Failed to save stock out entry.';
        state.stockOut.save.status = 'failed';
      });

    builder
      .addCase(fetchStocksDocumentActivity.pending, (state, action) => {
        const scope = action.meta.arg?.scope;
        if (!scope || !state.documentActivity[scope]) return;
        state.documentActivity[scope].docName = action.meta.arg?.name ?? null;
        state.documentActivity[scope].isLoading = true;
        state.documentActivity[scope].error = null;
        state.documentActivity[scope].status = 'loading';
      })
      .addCase(fetchStocksDocumentActivity.fulfilled, (state, action) => {
        const { scope, name, items } = action.payload ?? {};
        if (!scope || !state.documentActivity[scope]) return;
        state.documentActivity[scope].docName = name ?? null;
        state.documentActivity[scope].items = items ?? [];
        state.documentActivity[scope].isLoading = false;
        state.documentActivity[scope].error = null;
        state.documentActivity[scope].status = 'succeeded';
      })
      .addCase(fetchStocksDocumentActivity.rejected, (state, action) => {
        const scope = action.meta.arg?.scope;
        if (!scope || !state.documentActivity[scope]) return;
        state.documentActivity[scope].isLoading = false;
        state.documentActivity[scope].error = action.payload ?? 'Failed to load activity.';
        state.documentActivity[scope].status = 'failed';
      });
  },
});

export const {
  clearProductMasterList,
  clearPurchaseOrderList,
  clearPurchaseOrderDetail,
  clearPurchaseOrderCreateState,
  clearStockInList,
  clearStockInDetail,
  clearStockInCreateState,
  clearCurrentStockList,
  clearStockOutCreateState,
  clearStockOutList,
  clearStocksDocumentActivity,
  prependProductMasterListRows,
  updateProductMasterListRow,
} = stocksSlice.actions;

export const selectProductMasterListState = (state) =>
  state?.stocks?.productMaster?.list ?? listInitialState;

export const selectStockRulesListState = (state) =>
  state?.stocks?.stockRules?.list ?? listInitialState;

export const selectStockRulesCategoryItemsState = (state) =>
  state?.stocks?.stockRules?.categoryItems ?? stockRulesCategoryItemsInitialState;

export const selectStockRulesSaveState = (state) =>
  state?.stocks?.stockRules?.save ?? stockRulesSaveInitialState;

export const selectVendorRcListState = (state) => state?.stocks?.vendorRc?.list ?? listInitialState;

export const selectVendorRcVendorsState = (state) =>
  state?.stocks?.vendorRc?.vendors ?? vendorRcFormFetchInitialState;

export const selectVendorRcCentersState = (state) =>
  state?.stocks?.vendorRc?.centers ?? vendorRcFormFetchInitialState;

export const selectVendorRcSaveState = (state) =>
  state?.stocks?.vendorRc?.save ?? vendorRcSaveInitialState;

export const selectVendorRcDetailState = (state) =>
  state?.stocks?.vendorRc?.detail ?? vendorRcDetailInitialState;

export const selectVendorRcUpdateState = (state) =>
  state?.stocks?.vendorRc?.update ?? vendorRcUpdateInitialState;

export const selectStockCategoriesState = (state) =>
  state?.stocks?.stockCategories ?? stockCategoriesInitialState;

export const selectProductMasterCategoryGroupsState = (state) =>
  state?.stocks?.productMaster?.categoryGroups ?? productMasterCategoryGroupsInitialState;

export const selectStockUomsState = (state) => state?.stocks?.stockUoms ?? stockUomsInitialState;

export const selectPurchaseOrderListState = (state) =>
  state?.stocks?.purchaseOrder?.list ?? listInitialState;

export const selectPurchaseOrderOptionsState = (state) =>
  state?.stocks?.purchaseOrder?.options ?? purchaseOrderOptionsInitialState;

export const selectPurchaseOrderLineItemsState = (state) =>
  state?.stocks?.purchaseOrder?.lineItems ?? purchaseOrderLineItemsInitialState;

export const selectPurchaseOrderSaveState = (state) =>
  state?.stocks?.purchaseOrder?.save ?? purchaseOrderSaveInitialState;

export const selectPurchaseOrderDetailState = (state) =>
  state?.stocks?.purchaseOrder?.detail ?? purchaseOrderDetailInitialState;

export const selectPurchaseOrderCancelState = (state) =>
  state?.stocks?.purchaseOrder?.cancel ?? purchaseOrderCancelInitialState;

export const selectStockInListState = (state) => state?.stocks?.stockIn?.list ?? listInitialState;

export const selectStockInDetailState = (state) =>
  state?.stocks?.stockIn?.detail ?? stockInDetailInitialState;

export const selectStockInOptionsState = (state) =>
  state?.stocks?.stockIn?.options ?? stockInOptionsInitialState;

export const selectStockInLineItemsState = (state) =>
  state?.stocks?.stockIn?.lineItems ?? stockInLineItemsInitialState;

export const selectStockInSaveState = (state) =>
  state?.stocks?.stockIn?.save ?? stockInSaveInitialState;

export const selectCurrentStockListState = (state) =>
  state?.stocks?.currentStock?.list ?? initialState.currentStock.list;

export const selectStockOutListState = (state) => state?.stocks?.stockOut?.list ?? listInitialState;

export const selectStockOutOptionsState = (state) =>
  state?.stocks?.stockOut?.options ?? stockOutOptionsInitialState;

export const selectStockOutLineItemsState = (state) =>
  state?.stocks?.stockOut?.lineItems ?? stockOutLineItemsInitialState;

export const selectStockOutSaveState = (state) =>
  state?.stocks?.stockOut?.save ?? stockOutSaveInitialState;

export const selectStocksDocumentActivity = (scope) => (state) =>
  state?.stocks?.documentActivity?.[scope] ?? stocksDocumentActivityEntryInitialState;

export default stocksSlice.reducer;

// Re-export helpers for consumers that import mappers from the slice module.
export * from '@/components/stocks/stocks-api-helpers';
