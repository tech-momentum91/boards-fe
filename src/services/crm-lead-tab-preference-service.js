import { getListViewTabs, updateListViewTabs } from '@/services/list-view-preference-service';

const REF_DOCTYPE = 'CRM Lead';

export async function getCrmLeadTabPreference() {
  return getListViewTabs({ refDoctype: REF_DOCTYPE });
}

/**
 * @param {{
 *   pipelineTabs?: { order: string[], pinned: string[], hidden: string[] },
 *   stageTabs?: Record<string, { order: string[], pinned: string[], hidden: string[] }>,
 *   replaceStageTabs?: boolean,
 * }} payload
 */
export async function updateCrmLeadTabPreference(payload = {}) {
  return updateListViewTabs(payload, { refDoctype: REF_DOCTYPE });
}
