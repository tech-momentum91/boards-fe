import apiClient from '@/api/axios';
import { fetchPoScopeTerms } from '@/api/poScopeTerms';

export { fetchPoScopeTerms };

const BASE = '/method/devx.devx_procurements.api.po_scope_terms';

function unwrap(response) {
  return response?.data?.message ?? response?.data;
}

/**
 * @param {{
 *   category: string,
 *   template_name: string,
 *   content?: string,
 *   milestones?: Array<{ id?: string, name?: string, percentage?: string, remarks?: string }>
 * }} payload
 */
export async function createPoScopeTemplate(payload) {
  const response = await apiClient.post(`${BASE}.create_po_scope_template`, {
    category: payload.category,
    template_name: payload.template_name,
    content: payload.content ?? '',
    milestones: payload.milestones ?? [],
  });
  return unwrap(response);
}

/**
 * @param {{
 *   name: string,
 *   category?: string,
 *   template_name?: string,
 *   content?: string,
 *   milestones?: Array
 * }} payload
 */
export async function updatePoScopeTemplate(payload) {
  const response = await apiClient.post(`${BASE}.update_po_scope_template`, {
    name: payload.name,
    category: payload.category,
    template_name: payload.template_name,
    content: payload.content,
    milestones: payload.milestones,
  });
  return unwrap(response);
}

/**
 * @param {string} name Template document name
 * @param {string} [category] Active sidebar category id (needed to pick Payment vs T&C)
 */
export async function deletePoScopeTemplate(name, category) {
  const response = await apiClient.post(`${BASE}.delete_po_scope_template`, {
    name,
    category,
  });
  return unwrap(response);
}
