import apiClient from '@/api/axios';

const PATH = '/method/devx.coworker.api.get_unassigned_coworker_list';

/**
 * Co-workers for a client who are not assigned to any sub-space yet.
 *
 * @param {{
 *   keyword?: string,
 *   client_id: string,
 *   department?: string,
 *   page?: number,
 *   page_size?: number,
 * }} body
 * @returns {Promise<object>}
 */
export async function postGetUnassignedCoworkerList(body) {
  const response = await apiClient.post(PATH, {
    keyword: String(body.keyword ?? '').trim(),
    client_id: String(body.client_id ?? '').trim(),
    department: String(body.department ?? 'All').trim() || 'All',
    page: Number(body.page ?? 1) || 1,
    page_size: Number(body.page_size ?? 20) || 20,
  });
  return response?.data?.message ?? response?.data ?? {};
}
