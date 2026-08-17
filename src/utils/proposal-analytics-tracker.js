import {
  PROPOSAL_ANALYTICS_EVENTS,
  trackCrmProposalAnalyticsEvent,
  trackCrmProposalAnalyticsEventKeepalive,
} from '@/api/crmProposalAnalytics';

const VISITOR_KEY = 'devx_proposal_analytics_visitor_id';
const SESSION_PREFIX = 'devx_proposal_analytics_session:';

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getProposalAnalyticsVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const next = createId('visitor');
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return createId('visitor');
  }
}

export function getProposalAnalyticsSessionId(proposalId) {
  const key = `${SESSION_PREFIX}${proposalId || 'unknown'}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = createId('session');
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return createId('session');
  }
}

export function getClientDeviceInfo() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'desktop';

  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  if (/mobi|iphone|ipod|android.*mobile/i.test(ua)) device = 'mobile';
  else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device = 'tablet';

  return { browser, os, device };
}

/**
 * Fire-and-forget analytics tracker for proposal views.
 * IP is resolved server-side from the request — never send client_ip from the browser.
 */
export function createProposalAnalyticsTracker({ proposalId, token }) {
  const visitorId = getProposalAnalyticsVisitorId();
  const sessionId = getProposalAnalyticsSessionId(proposalId);
  const deviceInfo = getClientDeviceInfo();
  const openedAt = Date.now();
  let lastSection = null;
  let lastSectionEnteredAt = Date.now();
  let openTracked = false;
  let closeTracked = false;

  const buildPayload = (eventType, extra = {}) => ({
    proposal: proposalId,
    token,
    event_type: eventType,
    visitor_id: visitorId,
    session_id: sessionId,
    ...deviceInfo,
    ...extra,
  });

  const send = async (eventType, extra = {}) => {
    if (!proposalId || !eventType) return null;
    try {
      return await trackCrmProposalAnalyticsEvent(buildPayload(eventType, extra));
    } catch (error) {
      // Never block proposal viewing on analytics failures.
      if (typeof console !== 'undefined') {
        console.warn('[proposal-analytics]', eventType, error?.message || error);
      }
      return null;
    }
  };

  const sendKeepalive = (eventType, extra = {}) => {
    if (!proposalId || !eventType) return false;
    try {
      return trackCrmProposalAnalyticsEventKeepalive(buildPayload(eventType, extra));
    } catch {
      return false;
    }
  };

  return {
    visitorId,
    sessionId,
    trackOpen: async () => {
      if (openTracked) return null;
      // Lock immediately so concurrent trackOpen calls don't double-fire.
      openTracked = true;
      const result = await send(PROPOSAL_ANALYTICS_EVENTS.OPEN);
      if (result === null) {
        // Failed open must stay retryable (visit source of truth).
        // eslint-disable-next-line require-atomic-updates -- intentional reset after failed open
        openTracked = false;
      }
      return result;
    },
    trackSectionEnter: async (sectionName) => {
      const name = String(sectionName || '').trim();
      if (!name || name === lastSection) return null;

      const previousSection = lastSection;
      const previousEnteredAt = lastSectionEnteredAt;
      lastSection = name;
      lastSectionEnteredAt = Date.now();

      if (previousSection) {
        const duration = Math.max(0, Math.round((Date.now() - previousEnteredAt) / 1000));
        await send(PROPOSAL_ANALYTICS_EVENTS.SECTION_EXIT, {
          section_name: previousSection,
          duration,
        });
      }

      return send(PROPOSAL_ANALYTICS_EVENTS.SECTION_ENTER, { section_name: name });
    },
    trackDownload: async () => send(PROPOSAL_ANALYTICS_EVENTS.DOWNLOAD),
    /** Keep live-visitor presence fresh while the share page stays open. */
    trackHeartbeat: async () => send(PROPOSAL_ANALYTICS_EVENTS.FOCUS),
    /**
     * @param {{ keepalive?: boolean }} [options]
     * keepalive: unload beacon (pagehide). Flushes current section_exit + close and
     * marks the session closed so React unmount does not double-send.
     */
    trackClose: async ({ keepalive = false } = {}) => {
      if (closeTracked) return null;

      const openDuration = Math.max(0, Math.round((Date.now() - openedAt) / 1000));
      const section = lastSection;
      const enteredAt = lastSectionEnteredAt;

      if (keepalive) {
        closeTracked = true;
        lastSection = null;
        if (section) {
          const duration = Math.max(0, Math.round((Date.now() - enteredAt) / 1000));
          sendKeepalive(PROPOSAL_ANALYTICS_EVENTS.SECTION_EXIT, {
            section_name: section,
            duration,
          });
        }
        sendKeepalive(PROPOSAL_ANALYTICS_EVENTS.CLOSE, { duration: openDuration });
        return null;
      }

      closeTracked = true;
      lastSection = null;

      if (section) {
        const duration = Math.max(0, Math.round((Date.now() - enteredAt) / 1000));
        await send(PROPOSAL_ANALYTICS_EVENTS.SECTION_EXIT, {
          section_name: section,
          duration,
        });
      }
      return send(PROPOSAL_ANALYTICS_EVENTS.CLOSE, { duration: openDuration });
    },
  };
}
