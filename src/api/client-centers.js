import apiClient from '@/api/axios';
import { mergeCenterOptions, normalizeClientCenterOption } from '@/utils/coworker-centers';

/**
 * Centers assigned to a client (`get_client_centers`).
 *
 * @param {string} clientId
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getClientCenters(clientId) {
  const id = String(clientId ?? '').trim();
  if (!id) return [];

  const response = await apiClient.get(
    '/method/devx.client_management.api.client.get_client_centers',
    { params: { client_id: id } },
  );

  const list = response.data?.message;
  if (!Array.isArray(list)) return [];

  const byValue = new Map();
  for (const row of list) {
    const opt = normalizeClientCenterOption(row);
    if (!opt) continue;
    byValue.set(opt.value, opt);
  }

  return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Resolve center doc ids (e.g. CTR-05) to display names via Center doctype.
 *
 * @param {string[]} centerIds
 * @returns {Promise<Map<string, string>>}
 */
export async function resolveCenterLabels(centerIds = []) {
  const ids = [...new Set(centerIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  try {
    const response = await apiClient.get('/resource/Center', {
      params: {
        fields: JSON.stringify(['name', 'center_name']),
        filters: JSON.stringify([['name', 'in', ids]]),
        limit_page_length: ids.length,
      },
    });

    const map = new Map();
    for (const row of response?.data?.data || []) {
      const id = String(row?.name ?? '').trim();
      const label = String(row?.center_name ?? '').trim();
      if (id && label) map.set(id, label);
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Fill in center_name labels for options that only have ids (label === value).
 *
 * @param {Array<{ value: string, label: string }>} options
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function enrichCenterOptionsWithLabels(options = []) {
  const needsLabel = options.filter((opt) => opt.value && (!opt.label || opt.label === opt.value));
  if (needsLabel.length === 0) return options;

  const labelMap = await resolveCenterLabels(needsLabel.map((opt) => opt.value));
  if (labelMap.size === 0) return options;

  return options.map((opt) => {
    const richLabel = labelMap.get(opt.value);
    if (richLabel && (!opt.label || opt.label === opt.value)) {
      return { ...opt, label: richLabel };
    }
    return opt;
  });
}

/**
 * Load assigned center options for a client with resolved display names.
 *
 * @param {string} clientId
 * @param {Array<{ value: string, label: string }>} detailOptions
 * @returns {Promise<Array<{ value: string, label: string }>>}
 */
export async function getClientCenterOptions(clientId, detailOptions = []) {
  const fromApi = await getClientCenters(clientId).catch(() => []);
  const merged = mergeCenterOptions(detailOptions, fromApi);
  return enrichCenterOptionsWithLabels(merged);
}
