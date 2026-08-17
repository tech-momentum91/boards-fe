import apiClient from '@/api/axios';
import { parseStockActivityList } from '@/components/stocks/shared/stock-activity';
import { extractErrorMessage } from '@/utils/error-utils';

export const STOCKS_VENDOR_RC_ACTIVITY_ENDPOINT =
  '/method/devx.stock_management.api.api_vendor_rate_contract.get_vendor_rate_contract_activity';

export const STOCKS_PURCHASE_ORDER_ACTIVITY_ENDPOINT =
  '/method/devx.stock_management.api.api_purchase_order.get_purchase_order_activity';

export const STOCKS_STOCK_IN_ACTIVITY_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_in.get_stock_in_activity';

export const STOCKS_STOCK_OUT_ACTIVITY_ENDPOINT =
  '/method/devx.stock_management.api.api_stock_out.get_stock_out_activity';

export const STOCKS_DOCUMENT_ACTIVITY_ENDPOINTS = {
  vendorRc: STOCKS_VENDOR_RC_ACTIVITY_ENDPOINT,
  purchaseOrder: STOCKS_PURCHASE_ORDER_ACTIVITY_ENDPOINT,
  stockIn: STOCKS_STOCK_IN_ACTIVITY_ENDPOINT,
  stockOut: STOCKS_STOCK_OUT_ACTIVITY_ENDPOINT,
};

/** Fetch activity timeline for a stock document (`name` = docname). */
export async function requestStockDocumentActivity(endpoint, name) {
  const docName = String(name ?? '').trim();
  if (!docName) {
    throw new Error('Document name is required.');
  }

  const response = await apiClient.post(endpoint, { name: docName });
  const result = response.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage(result, 'Failed to load activity.'));
  }

  const message = result?.message ?? result ?? {};
  return parseStockActivityList(message);
}
