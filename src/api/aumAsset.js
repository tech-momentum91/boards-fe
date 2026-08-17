import apiClient from '@/api/axios';
import { AUM_LIST_PAGE_SIZE } from '@/components/aum/constants';

const GET_AUM_ASSET_LISTVIEW_PATH =
  '/method/devx.asset_module.api.api_aum_asset.get_aum_asset_listview';

const GET_AUM_ASSET_FILTER_OPTIONS_PATH =
  '/method/devx.asset_module.api.api_aum_asset.get_aum_asset_filter_options';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @param {{ search?: string, center?: string, filters?: string, page?: number, page_size?: number }} [params]
 */
export async function fetchAumAssetList(params = {}) {
  const response = await apiClient.get(GET_AUM_ASSET_LISTVIEW_PATH, {
    params: {
      search: params.search ?? '',
      center: params.center ?? '',
      filters: params.filters ?? '',
      page: params.page ?? 1,
      page_size: params.page_size ?? AUM_LIST_PAGE_SIZE,
    },
  });

  const message = unwrapMessage(response);
  const rows = Array.isArray(message.data)
    ? message.data
    : Array.isArray(message.results)
      ? message.results
      : [];

  return {
    rows,
    totalCount: message.total_count ?? rows.length,
    page: message.page ?? params.page ?? 1,
    summary: message.summary ?? null,
  };
}

/**
 * @param {{ center?: string }} [params]
 */
export async function fetchAumAssetFilterOptions(params = {}) {
  const response = await apiClient.get(GET_AUM_ASSET_FILTER_OPTIONS_PATH, {
    params: {
      center: params.center ?? '',
    },
  });
  return unwrapMessage(response);
}
