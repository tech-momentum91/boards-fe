import apiClient from './axios';

const GET_PROJECT_AREAS_LIST_PATH = '/method/devx.devx_project.api.areas.get_project_areas_list';
const GET_PROJECT_AREA_PATH = '/method/devx.devx_project.api.areas.get_project_area';

/**
 * Grouped project areas listview — search, sort, filters, pagination.
 * @param {{
 *   project: string,
 *   floor?: string,
 *   area_type?: string,
 *   status?: string,
 *   keyword?: string,
 *   order_by?: string,
 *   group_by?: string,
 *   page?: number,
 *   limit_page_length?: number,
 * }} params
 */
export async function getProjectAreasList(params = {}) {
  const project = String(params?.project ?? '').trim();
  if (!project) {
    throw new Error('project is required');
  }

  const query = { project };

  ['floor', 'area_type', 'status', 'keyword', 'order_by', 'group_by'].forEach((key) => {
    const value = String(params?.[key] ?? '').trim();
    if (value) query[key] = value;
  });

  if (params?.page != null) {
    query.page = String(params.page);
  }

  if (params?.limit_page_length != null) {
    query.limit_page_length = String(params.limit_page_length);
  }

  const response = await apiClient.get(GET_PROJECT_AREAS_LIST_PATH, { params: query });
  return response.data?.message ?? response.data;
}

/**
 * Fetch a single project area with optional layout preview data.
 * @param {string} areaId
 */
export async function getProjectArea(areaId) {
  const id = String(areaId ?? '').trim();
  if (!id) {
    throw new Error('area_id is required');
  }

  const response = await apiClient.get(GET_PROJECT_AREA_PATH, {
    params: { area_id: id },
  });

  return response.data?.message ?? response.data;
}
