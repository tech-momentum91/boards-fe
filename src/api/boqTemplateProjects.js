import apiClient from '@/api/axios';
import { flattenBoqProductsResponse } from '@/components/boq/boq-helper';
import { extractErrorMessage } from '@/utils/error-utils';

const API_BASE = '/method/devx.boq.api.api_boq_template_projects';
const PROJECTS_PATH = `${API_BASE}.get_boq_previous_projects`;
const PRODUCTS_PATH = `${API_BASE}.get_boq_previous_project_products`;

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

export async function fetchBoqPreviousProjects({ keyword = '', excludeProjectId } = {}) {
  const response = await apiClient.post(PROJECTS_PATH, {
    keyword: keyword.trim() || undefined,
    exclude_project_id: excludeProjectId || undefined,
  });
  const msg = unwrapMessage(response);
  return Array.isArray(msg) ? msg : [];
}

export async function fetchBoqPreviousProjectProducts({
  projectId,
  boqCode,
  categoryId,
  keyword,
} = {}) {
  const response = await apiClient.post(PRODUCTS_PATH, {
    project_id: projectId || undefined,
    boq_code: boqCode || undefined,
    category_id: categoryId || undefined,
    keyword: keyword?.trim() || undefined,
  });
  const msg = unwrapMessage(response);
  const data = msg && typeof msg === 'object' ? msg : { categories: [], products: [] };
  return {
    ...data,
    products: Array.isArray(data.products) ? data.products : flattenBoqProductsResponse(data),
  };
}
