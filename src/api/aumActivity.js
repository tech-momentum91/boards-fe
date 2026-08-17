import apiClient from '@/api/axios';
import { mapAumActivityList } from '@/components/aum/shared/aum-activity-helper';

const GET_AUM_ACTIVITY_PATH = '/method/devx.asset_module.api.api_aum_activity.get_aum_activity';

function unwrapMessage(response) {
  return response?.data?.message ?? response?.data ?? {};
}

/**
 * @param {'Asset In' | 'Asset Out'} entityDoctype
 * @param {string} entityId Parent document name
 * @returns {Promise<Array<object>>}
 */
export async function fetchAumActivity(entityDoctype, entityId) {
  if (!entityDoctype || !entityId) return [];
  const response = await apiClient.get(GET_AUM_ACTIVITY_PATH, {
    params: {
      entity_doctype: entityDoctype,
      entity_id: entityId,
    },
  });
  const message = unwrapMessage(response);
  const rows = Array.isArray(message?.activity) ? message.activity : [];
  return mapAumActivityList(rows);
}
