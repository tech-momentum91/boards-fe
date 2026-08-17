import apiClient from '@/api/axios';

const BASE = '/method/devx.devx_project.api.collection';
const GLOBAL_BASE = '/method/devx.devx_project.api.global_collections';

function unwrap(response) {
  const payload = response?.data ?? response;
  if (payload?.message && typeof payload.message === 'object' && !Array.isArray(payload.message)) {
    return payload.message;
  }
  return payload?.message ?? payload;
}

export async function getProjectCollections(project, params = {}) {
  const { data } = await apiClient.get(`${BASE}.get_project_collections`, {
    params: { project, ...params },
  });
  return unwrap(data);
}

export async function syncProjectCollections(project) {
  const { data } = await apiClient.post(`${BASE}.sync_project_collections`, { project });
  return unwrap(data);
}

export async function getProjectCollectionPlan(project, params = {}) {
  const { data } = await apiClient.get(`${BASE}.get_project_collection_plan`, {
    params: { project, ...params },
  });
  return unwrap(data);
}

export async function saveProjectCollectionPlan(payload) {
  const { data } = await apiClient.post(`${BASE}.save_project_collection_plan`, payload);
  return unwrap(data);
}

export async function updateProjectCollectionMilestone(payload) {
  const { data } = await apiClient.post(`${BASE}.update_project_collection_milestone`, payload);
  return unwrap(data);
}

export async function getGlobalCollections(params = {}) {
  const { data } = await apiClient.get(`${GLOBAL_BASE}.get_global_collections`, { params });
  return unwrap(data);
}

export async function getGlobalCollectionsAnalytics(params = {}) {
  const { data } = await apiClient.get(`${GLOBAL_BASE}.get_global_collections_analytics`, {
    params,
  });
  return unwrap(data);
}
