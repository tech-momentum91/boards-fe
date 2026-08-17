import apiClient from '@/api/axios';
import { extractErrorMessage } from '@/utils/error-utils';
import { getCachedCsrfToken } from '@/utils/csrf';
import { fetchProposalAnalyticsDashboard } from '@/services/proposalAnalytics';

/**
 * CRM-facing analytics methods (wrappers over devx_ai.proposal_analytics).
 *
 * Backend:
 *   - get_proposal_analytics
 *   - track_proposal_analytics_event
 */
export const CRM_PROPOSAL_ANALYTICS_API = {
  /** Prefer this over calling devx_ai.proposal_analytics.api.get_dashboard directly. */
  dashboard: '/method/devx.devx_crm.api.crm_proposal_analytics.get_proposal_analytics',
  track: '/method/devx.devx_crm.api.crm_proposal_analytics.track_proposal_analytics_event',
};

export const PROPOSAL_ANALYTICS_EVENTS = {
  OPEN: 'proposal_open',
  CLOSE: 'proposal_close',
  SECTION_ENTER: 'section_enter',
  SECTION_EXIT: 'section_exit',
  DOWNLOAD: 'download',
  SHARE: 'share',
  FOCUS: 'focus',
};

function unwrap(response) {
  const result = response?.data;
  if (result?.exc_type) {
    throw new Error(extractErrorMessage({ payload: result }, 'Request failed.'));
  }
  return result?.message ?? result;
}

export function buildTrackBody(payload = {}) {
  const proposal = payload.proposal || payload.proposal_id;
  return {
    proposal,
    proposal_id: proposal,
    token: payload.token || undefined,
    key: payload.token || undefined,
    event_type: payload.event_type,
    visitor_id: payload.visitor_id || undefined,
    session_id: payload.session_id || undefined,
    duration: payload.duration ?? 0,
    section_name: payload.section_name || undefined,
    subsection_name: payload.subsection_name || undefined,
    scroll_depth: payload.scroll_depth ?? 0,
    browser: payload.browser || undefined,
    os: payload.os || undefined,
    device: payload.device || undefined,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : undefined,
  };
}

/**
 * Full analytics dashboard for a CRM Proposal.
 * @param {{ proposal: string, fromDate?: Date|string, toDate?: Date|string, signal?: AbortSignal }} params
 */
export async function getCrmProposalAnalytics({ proposal, fromDate, toDate, signal } = {}) {
  return fetchProposalAnalyticsDashboard({
    proposalId: proposal,
    fromDate,
    toDate,
    signal,
  });
}

/**
 * Record an analytics event (public share or authenticated).
 * @param {object} payload
 */
export async function trackCrmProposalAnalyticsEvent(payload = {}) {
  const proposal = payload.proposal || payload.proposal_id;
  if (!proposal) throw new Error('Proposal id is required.');
  if (!payload.event_type) throw new Error('event_type is required.');

  const body = buildTrackBody(payload);

  try {
    const { data } = await apiClient.post(CRM_PROPOSAL_ANALYTICS_API.track, body);
    return unwrap({ data });
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      throw error;
    }
    throw new Error(extractErrorMessage(error, 'Failed to track proposal analytics'));
  }
}

/**
 * Fire a track event with fetch({ keepalive: true }) so it can complete during
 * pagehide / unload. Prefer this over axios for close/exit beacons.
 * Never puts token/key in the query string.
 */
export function trackCrmProposalAnalyticsEventKeepalive(payload = {}) {
  const proposal = payload.proposal || payload.proposal_id;
  if (!proposal || !payload.event_type) return false;

  const body = buildTrackBody(payload);

  try {
    const baseURL = String(apiClient.defaults?.baseURL || '/api').replace(/\/$/, '');
    const url = `${baseURL}${CRM_PROPOSAL_ANALYTICS_API.track}`;
    const headers = { 'Content-Type': 'application/json' };
    const csrfToken = getCachedCsrfToken();
    if (csrfToken) {
      headers['X-Frappe-CSRF-Token'] = csrfToken;
    }

    void fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
      keepalive: true,
    }).then((response) => {
      if (!response.ok && typeof console !== 'undefined') {
        console.warn(
          '[proposal-analytics] keepalive track failed',
          response.status,
          payload.event_type,
        );
      }
    });
    return true;
  } catch {
    return false;
  }
}
