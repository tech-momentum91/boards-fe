import apiClient from '@/api/axios';
import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';

const GET_ASSET_OUT_LISTVIEW_PATH =
  '/method/devx.asset_module.api.api_asset_out.get_asset_out_listview';

const GET_ASSET_OUT_DETAIL_PATH =
  '/method/devx.asset_module.api.api_asset_out.get_asset_out_detail';

const SAVE_ASSET_OUT_PATH = '/method/devx.asset_module.api.api_asset_out.save_asset_out';

const UPDATE_ASSET_OUT_STATUS_PATH =
  '/method/devx.asset_module.api.api_asset_out.update_asset_out_status';

const GET_AVAILABLE_ASSETS_FOR_OUT_PATH =
  '/method/devx.asset_module.api.api_asset_out.get_available_assets_for_out_api';

const SEND_ASSET_OUT_IN_TRANSIT_PATH =
  '/method/devx.asset_module.api.api_asset_out.send_asset_out_in_transit';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

function mapLineItemsToApi(lineItems = []) {
  return (lineItems ?? []).map((row) => ({
    assetId: row.assetId,
    assetCode: row.assetCode,
    barcode: row.barcode,
    product: row.product,
    unitValue: row.unitValue,
    issued: row.issued,
    remarks: row.remarks,
  }));
}

export async function fetchAssetOutList(params = {}) {
  const response = await apiClient.get(GET_ASSET_OUT_LISTVIEW_PATH, {
    params: {
      search: params.search ?? '',
      center: params.center ?? '',
      page: params.page ?? 1,
      page_size: params.page_size ?? AUM_LIST_PAGE_SIZE,
    },
  });
  const message = unwrapMessage(response);
  return {
    rows: message.data ?? message.results ?? [],
    totalCount: message.total_count ?? 0,
    page: message.page ?? params.page ?? 1,
    pageSize: message.page_size ?? AUM_LIST_PAGE_SIZE,
  };
}

export async function fetchAssetOutDetail(id) {
  const response = await apiClient.get(GET_ASSET_OUT_DETAIL_PATH, { params: { name: id } });
  const message = unwrapMessage(response);
  return message.data ?? message;
}

export async function saveAssetOutDraft(payload = {}) {
  const response = await apiClient.post(SAVE_ASSET_OUT_PATH, {
    action: payload.action || 'save_draft',
    name: payload.name || payload.id,
    ...payload,
    lineItems: payload.lineItems ? mapLineItemsToApi(payload.lineItems) : undefined,
  });
  const message = unwrapMessage(response);
  return message.data ?? message;
}

export async function updateAssetOutStatus(id, action) {
  const response = await apiClient.post(UPDATE_ASSET_OUT_STATUS_PATH, {
    name: id,
    action,
  });
  const message = unwrapMessage(response);
  return message.data ?? message;
}

export async function fetchAvailableAssetsForOut({
  centerSlug,
  floorLabel = '',
  areaLabel = '',
  space = '',
} = {}) {
  const response = await apiClient.get(GET_AVAILABLE_ASSETS_FOR_OUT_PATH, {
    params: {
      center: centerSlug,
      floor: floorLabel,
      area: areaLabel,
      space,
    },
  });
  const message = unwrapMessage(response);
  return message.data ?? [];
}

export async function sendAssetOutInTransit(id) {
  const response = await apiClient.post(SEND_ASSET_OUT_IN_TRANSIT_PATH, { name: id });
  const message = unwrapMessage(response);
  return message.data ?? message;
}

export function mapApiRowToTransaction(row = {}) {
  return {
    id: row.id || row.name,
    outNumber: row.outNumber || row.name,
    outDate: row.outDate,
    centerName: row.centerName,
    centerSlug: row.centerSlug,
    floor: row.floor === '—' ? '' : row.floor || '',
    area: row.area === '—' ? '' : row.area || '',
    space: row.space || '',
    outType: row.outType,
    reason: row.reason,
    reasonSlug: row.reasonSlug,
    qty: row.qty,
    value: row.value,
    createdBy: row.createdBy,
    status: row.status,
    destinationCenter: row.destinationCenter,
    destinationFloor: row.destinationFloor,
    destinationArea: row.destinationArea,
    destinationCenterSlug: row.destinationCenterSlug,
    destinationSpace: row.destinationSpace,
    destinationFloorRef: row.destinationFloorRef,
    sourceMaintenanceTaskId: row.sourceMaintenanceTaskId,
    destinationAssetInId: row.destinationAssetInId,
    lineItems: row.lineItems ?? [],
    assets: [],
  };
}
