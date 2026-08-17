import apiClient from './axios';

/**
 * @param {string} leadId
 * @returns {Promise<{ items: Array, meta: Object }>}
 */
export async function getSuggestedInventory(leadId) {
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_suggested_inventory.get_suggested_inventory',
    { params: { lead_id: leadId } },
  );
  const result = data?.message ?? data ?? {};
  return {
    items: Array.isArray(result.items) ? result.items : [],
    meta: result.meta ?? {},
  };
}

export async function searchSpacesForManualAdd({
  leadId,
  center,
  inventoryType,
  keyword,
  limit = 20,
} = {}) {
  const params = { lead_id: leadId, limit };
  if (center) params.center = center;
  if (inventoryType) params.inventory_type = inventoryType;
  if (keyword) params.keyword = keyword;
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_suggested_inventory.search_spaces_for_manual_add',
    { params },
  );
  const result = data?.message ?? data;
  return Array.isArray(result) ? result : [];
}

export async function listCentersForManualAdd({ leadId, keyword, limit = 30 } = {}) {
  const params = { lead_id: leadId, limit };
  if (keyword) params.keyword = keyword;
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_suggested_inventory.list_centers_for_manual_add',
    { params },
  );
  const result = data?.message ?? data;
  return Array.isArray(result) ? result : [];
}

export async function getManualAddFloorPlans({ leadId, center, inventoryType } = {}) {
  const params = { lead_id: leadId };
  if (center) params.center = center;
  if (inventoryType) params.inventory_type = inventoryType;
  const { data } = await apiClient.get(
    '/method/devx.devx_crm.api.crm_suggested_inventory.get_manual_add_floor_plans',
    { params },
  );
  const result = data?.message ?? data ?? {};
  return {
    floors: Array.isArray(result.floors) ? result.floors : [],
    centerId: result.center_id ?? center ?? '',
  };
}
