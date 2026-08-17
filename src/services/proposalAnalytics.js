import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';

/** CRM wrapper: devx.devx_crm.api.crm_proposal_analytics.get_proposal_analytics */
export const PROPOSAL_ANALYTICS_DASHBOARD_API =
  '/method/devx.devx_crm.api.crm_proposal_analytics.get_proposal_analytics';

function unwrap(response) {
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
  return result?.message ?? result;
}

function toDateParam(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fetch full proposal analytics dashboard via CRM wrapper.
 * @param {{ proposalId: string, fromDate?: Date|string, toDate?: Date|string, signal?: AbortSignal }} params
 */
export async function fetchProposalAnalyticsDashboard({
  proposalId,
  fromDate,
  toDate,
  signal,
} = {}) {
  if (!proposalId) throw new Error('Proposal id is required.');

  const params = {
    proposal: proposalId,
    proposal_id: proposalId,
  };
  const from = toDateParam(fromDate);
  const to = toDateParam(toDate);
  if (from) {
    params.from_date = from;
    params.start_date = from;
  }
  if (to) {
    params.to_date = to;
    params.end_date = to;
  }

  try {
    const { data } = await apiClient.get(PROPOSAL_ANALYTICS_DASHBOARD_API, {
      params,
      ...(signal ? { signal } : {}),
    });
    return unwrap({ data });
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      throw error;
    }
    throw new Error(extractErrorMessage(error, 'Failed to load proposal analytics'));
  }
}
