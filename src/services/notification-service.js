import axios from '@/api/axios';
import { addHours, addDays, nextMonday, setHours, setMinutes, format } from 'date-fns';
import { orderNotificationTimeframeKeys } from '@/utils/inbox-timeframe-order';

/** Parse activity creation for stable chronological ordering (newest first). */
function activityCreationTimestamp(creation) {
  if (creation == null || creation === '') return 0;
  const t = Date.parse(String(creation));
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Newest activity in the notification group (list + detail preview must match timeline “latest”).
 * Backend usually sends activities sorted desc; this makes ordering explicit.
 */
function pickLatestActivity(activities) {
  const list = Array.isArray(activities) ? activities : [];
  if (list.length === 0) return {};
  const sorted = [...list].sort(
    (a, b) => activityCreationTimestamp(b?.creation) - activityCreationTimestamp(a?.creation),
  );
  return sorted[0] || {};
}

function resolveUserImage(user) {
  if (!user || typeof user !== 'object') return '';
  return user.image || user.user_image || '';
}

/**
 * Notifications API Service
 *
 * Mirrors the style of TicketCommentsService and provides:
 * - getNotifications(userEmail, tab)
 * - updateNotificationActivity(singlePayload) for single updates
 * - bulkUpdateNotificationActivity(updates, user) for bulk updates
 */
class NotificationService {
  getCurrentUserEmailFallback() {
    try {
      const raw = localStorage.getItem('userInfo');
      const userInfo = raw ? JSON.parse(raw) : null;
      if (!userInfo || typeof userInfo !== 'object') return undefined;
      return (
        userInfo.email ??
        userInfo.user_email ??
        userInfo.username ??
        userInfo.user ??
        userInfo.name ??
        userInfo.full_name ??
        undefined
      );
    } catch {
      return undefined;
    }
  }

  normalizeUser(userEmail) {
    const u = userEmail ?? this.getCurrentUserEmailFallback();
    if (u == null) return undefined;
    const s = String(u).trim();
    return s ? s : undefined;
  }

  /**
   * Fetch notifications for a user and tab (Primary | Later | Cleared)
   * @param {string} userEmail - User email (optional; backend will use session user if omitted)
   * @param {string} tab - Tab name (Primary | Later | Cleared)
   * @param {string[]} [filters] - Optional filter keys (e.g. ['unread', 'mentions', 'assigned_to_me'])
   * @param {string[]} [centers] - Optional selected center IDs to filter notifications
   * @returns {Promise} API response with timeframe-bucketed notifications
   */
  async getNotifications(userEmail, tab = 'Primary', filters = [], centers = []) {
    try {
      const params = { tab };
      const user = this.normalizeUser(userEmail);
      if (user) params.user = user;
      // Backend may expect filters as JSON array string (e.g. ["unread","mentions"])
      if (Array.isArray(filters) && filters.length > 0) {
        params.filters = JSON.stringify(filters);
      }
      // Centre header (shared global-centre filter contract):
      //   - missing / undefined / 'All' -> omit (no centre restriction)
      //   - explicit empty []           -> send "[]" so backend returns 0 rows
      //   - explicit subset [...]       -> send the JSON list
      if (centers === 'All') {
        // Match the contract sentinel; omit so backend treats as "all centres".
      } else if (Array.isArray(centers)) {
        params.centers = JSON.stringify(centers);
      }
      const response = await axios.get('/method/devx.api.notification.get_notifications', {
        params,
      });
      const raw = response.data;
      const payload = raw?.message ?? raw ?? {};

      const ICON_MAP = {
        'HD Ticket': 'RiTicketLine',
        'HD Ticket Comment': 'RiChat1Line',
      };

      const processDocument = (document_ = {}) => {
        const activities = Array.isArray(document_.activities) ? document_.activities : [];
        const latest = pickLatestActivity(activities);
        const change =
          Array.isArray(latest.changes) && latest.changes.length > 0 ? latest.changes[0] : null;
        const changeField = change?.field ?? null;

        const owner = (latest.user && (latest.user.name || latest.user.email)) || '';
        const assigneeInitials = owner
          ? owner
              .split(' ')
              .map((s) => (s ? s[0] : ''))
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : '';
        const message = change?.message ?? '';
        const secondaryText = owner ? `${owner} ${message}`.trim() : message;
        const useStatusPill =
          (changeField === 'status' || changeField === 'status_category') &&
          change?.from != null &&
          change?.from !== '' &&
          change?.to != null &&
          change?.to !== '';
        const secondaryStatusFrom = useStatusPill ? String(change.from) : null;
        const secondaryStatusTo = useStatusPill ? String(change.to) : null;

        const avatarUrl = resolveUserImage(latest?.user);
        const markAsRead = document_.read;

        return {
          id: document_.notification_id || `${document_.doctype}_${document_.docname}`,
          doctype: document_.doctype,
          icon:
            ICON_MAP[document_.doctype] || ICON_MAP[document_.doctype?.trim()] || 'RiInbox2Line',
          primaryText:
            document_.title || document_.docname || `${document_.doctype} ${document_.docname}`,
          secondaryIcon: changeField === 'comment' ? 'comment' : null,
          showAssigneeAvatar: Boolean(avatarUrl || assigneeInitials),
          assigneeAvatarUrl: avatarUrl || undefined,
          assigneeInitials,
          secondaryText,
          activityField: changeField ?? '',
          activityMessage: message,
          activityActorName: owner,
          secondaryStatusFrom,
          secondaryStatusTo,
          displayTime: latest.creation || null,
          count: activities.length,
          markAsRead,
          clear: Boolean(document_.closed),
          createdAt: latest.creation || null,
          raw: document_,
        };
      };

      // payload is keyed by timeframe; Object.keys() mis-orders numeric labels like "2025".
      const orderedKeys = orderNotificationTimeframeKeys(Object.keys(payload), tab);
      const result = {};
      orderedKeys.forEach((key) => {
        const array = Array.isArray(payload[key]) ? payload[key] : [];
        result[key] = array.map(processDocument);
      });

      return result;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Fetch a single notification by id (for detail page).
   * Calls get_notification_one; id should be in form "DoctypeName_Docname" (e.g. "HD Ticket_113").
   * @param {string} notificationId - Notification id from URL (doctype_docname)
   * @param {string} [userEmail] - Optional user; backend uses session user if omitted
   * @returns {Promise<Object|null>} Processed notification item or null if not found
   */
  async getNotificationById(notificationId, userEmail, inboxTab = 'primary') {
    try {
      const params = { notification_id: notificationId };
      if (userEmail != null) params.user = userEmail;
      const response = await axios.get('/method/devx.api.notification.get_notification', {
        params,
      });
      const raw = response?.data?.message ?? response?.data ?? response;
      if (!raw || typeof raw !== 'object' || !raw.doctype) return null;
      const document_ = raw;
      const tab = String(inboxTab || 'primary').toLowerCase();
      const readPrimary = Boolean(document_.read_primary_tab);
      const readSimple = Boolean(document_.read);
      const effectiveRead = tab === 'primary' ? readPrimary : readSimple;
      const activities = Array.isArray(document_.activities) ? document_.activities : [];
      const latest = pickLatestActivity(activities);
      const change =
        Array.isArray(latest.changes) && latest.changes.length > 0 ? latest.changes[0] : null;
      const changeField = change?.field ?? null;
      const owner = (latest.user && (latest.user.name || latest.user.email)) || '';
      const assigneeInitials = owner
        ? owner
            .split(' ')
            .map((s) => (s ? s[0] : ''))
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : '';
      const message = change?.message ?? '';
      const secondaryText = owner ? `${owner} ${message}`.trim() : message;
      const useStatusPill =
        (changeField === 'status' || changeField === 'status_category') &&
        change?.from != null &&
        change?.from !== '' &&
        change?.to != null &&
        change?.to !== '';
      const secondaryStatusFrom = useStatusPill ? String(change.from) : null;
      const secondaryStatusTo = useStatusPill ? String(change.to) : null;
      const ICON_MAP = { 'HD Ticket': 'RiTicketLine', 'HD Ticket Comment': 'RiChat1Line' };
      const avatarUrl = resolveUserImage(latest?.user);
      return {
        id: `${document_.doctype}_${document_.docname}`,
        doctype: document_.doctype,
        icon: ICON_MAP[document_.doctype] || ICON_MAP[document_.doctype?.trim()] || 'RiInbox2Line',
        primaryText:
          document_.title || document_.docname || `${document_.doctype} ${document_.docname}`,
        secondaryIcon: changeField === 'comment' ? 'comment' : null,
        showAssigneeAvatar: Boolean(avatarUrl || assigneeInitials),
        assigneeAvatarUrl: avatarUrl || undefined,
        assigneeInitials,
        secondaryText,
        activityField: changeField ?? '',
        activityMessage: message,
        activityActorName: owner,
        secondaryStatusFrom,
        secondaryStatusTo,
        displayTime: latest.creation || null,
        count: activities.length,
        markAsRead: effectiveRead,
        clear: Boolean(document_.closed),
        createdAt: latest.creation || null,
        raw: document_,
      };
    } catch (error) {
      console.error('Failed to fetch notification by id:', error);
      throw error;
    }
  }

  /**
   * Update notification activity - single update mode
   * @param {Object} payload - { doctype, docname, from_doctypes, user, read, closed, snoozed, ... }
   * @returns {Promise} API response
   */
  async updateNotificationActivity(payload = {}) {
    try {
      const response = await axios.post(
        '/method/devx.api.notification.update_notification_activity',
        payload,
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update notification activity:', error);
      throw error;
    }
  }

  /**
   * Bulk update notification activity
   * @param {Array} updates - Array of update objects (see backend docs)
   * @param {string} user - Optional user email applied to all items
   * @returns {Promise} API response
   */
  async bulkUpdateNotificationActivity(updates = [], user = undefined) {
    try {
      const payload = { updates };
      if (user) payload.user = user;
      const response = await axios.post(
        '/method/devx.api.notification.update_notification_activity',
        payload,
      );
      return response.data;
    } catch (error) {
      console.error('Failed to perform bulk notification update:', error);
      throw error;
    }
  }

  /**
   * Convenience: mark a single notification (doc) as read/unread
   * @param {string} doctype
   * @param {string} docname
   * @param {Object} from_doctypes - e.g. { Version: { version_ids: ['v1'] } }
   * @param {boolean} read
   * @param {string} user - optional
   */
  async markAsRead(
    doctype,
    docname,
    from_doctypes = {},
    read = true,
    user = undefined,
    readScope = 'primary',
  ) {
    const scope = String(readScope || 'primary').toLowerCase();
    const normalized = ['primary', 'later', 'cleared'].includes(scope) ? scope : 'primary';
    return this.updateNotificationActivity({
      doctype,
      docname,
      from_doctypes,
      read: read ? 1 : 0,
      user,
      read_scope: normalized,
    });
  }

  /**
   * Snooze a notification until a given time.
   * @param {string} doctype - e.g. "HD Ticket"
   * @param {string} docname - e.g. "113"
   * @param {Object} from_doctypes - e.g. { "HD Ticket Comment": { version_ids: [...] }, "Version": { version_ids: [...] } }
   * @param {string} optionValue - 'later' | 'tomorrow' | 'in_2_days' | 'next_week'
   * @param {string} [snoozed_activity_id] - optional UUID; generated if omitted
   * @returns {Promise} API response
   */
  async snooze(doctype, docname, from_doctypes = {}, optionValue, snoozed_activity_id = undefined) {
    const at8 = (d) => setMinutes(setHours(d, 8), 0);
    const now = new Date();
    let snoozeDate;
    // console.log('optionValue', optionValue);
    switch (optionValue) {
      case 'later':
        snoozeDate = addHours(now, 2);
        break;
      case 'tomorrow':
        snoozeDate = at8(addDays(now, 1));
        break;
      case 'in_2_days':
        snoozeDate = at8(addDays(now, 2));
        break;
      case 'next_week':
        snoozeDate = at8(nextMonday(now));
        break;
      default:
        snoozeDate = addHours(now, 2);
    }
    const snooze_active_time = format(snoozeDate, 'yyyy-MM-dd HH:mm:ss');
    // console.log('snooze_active_time', snooze_active_time);
    const id =
      snoozed_activity_id ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    return this.updateNotificationActivity({
      doctype,
      docname,
      from_doctypes,
      snoozed: 1,
      snooze_active_time,
      snoozed_activity_id: id,
    });
  }

  /**
   * Unsnooze a notification (snoozed = 0).
   * @param {string} doctype
   * @param {string} docname
   * @param {Object} from_doctypes
   * @returns {Promise} API response
   */
  async unsnooze(doctype, docname, from_doctypes = {}) {
    return this.updateNotificationActivity({
      doctype,
      docname,
      from_doctypes,
      snoozed: 0,
    });
  }

  /**
   * Get unread notification counts by tab (Primary, Later, Cleared).
   * Calls get_notification_unread_counts with optional user and centers.
   * @param {string} [user] - Optional user email; backend uses session user if omitted
   * @param {string|string[]} [centers] - Optional: 'All' or JSON array string / array of center IDs
   * @returns {Promise<Array<{tab: string, count: number}>>} e.g. [{ tab: 'primary', count: 20 }, { tab: 'later', count: 5 }, ...]
   */
  async getCountBasedOnTab(user, centers) {
    const mockCounts = [
      { tab: 'primary', count: 20 },
      { tab: 'other', count: 0 },
      { tab: 'later', count: 5 },
      { tab: 'cleared', count: 0 },
    ];
    try {
      const params = {};
      const normalizedUser = this.normalizeUser(user);
      if (normalizedUser) params.user = normalizedUser;
      // Centre header (shared global-centre filter contract):
      //   - undefined / null / 'All' -> omit (no centre restriction)
      //   - explicit empty []         -> send "[]" so backend zeroes every tab
      //   - explicit subset [...]     -> send the JSON list
      //   - already-stringified value -> pass through
      if (centers === 'All') {
        // omit
      } else if (Array.isArray(centers)) {
        params.centers = JSON.stringify(centers);
      } else if (centers != null) {
        params.centers = centers;
      }
      const response = await axios.get(
        '/method/devx.api.notification.get_notification_unread_counts',
        { params },
      );
      const raw = response?.data?.message ?? response?.data ?? response ?? {};
      const data = typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const primary = Number(data.Primary ?? data.primary ?? 0);
      const later = Number(data.Later ?? data.later ?? 0);
      const cleared = Number(data.Cleared ?? data.cleared ?? 0);
      return [
        { tab: 'primary', count: primary },
        { tab: 'other', count: 0 },
        { tab: 'later', count: later },
        { tab: 'cleared', count: cleared },
      ];
    } catch (error) {
      console.error('Failed to fetch notification counts by tab:', error);
      return mockCounts;
    }
  }

  /**
   * Mark a single notification as closed/unclosed (clear/unclear).
   * @param {string} doctype
   * @param {string} docname
   * @param {Object} from_doctypes - e.g. { "HD Ticket Comment": { version_ids: ['v1'] }, "Version": { version_ids: ['v2'] } }
   * @param {boolean} closed - true = clear, false = unclear
   * @param {Object} options - optional { closed_time, closed_activity_id } (required when closed=true for backend)
   * @param {string} user - optional
   */
  async markAsClosed(
    doctype,
    docname,
    from_doctypes = {},
    closed = true,
    options = {},
    user = undefined,
  ) {
    const payload = {
      doctype,
      docname,
      from_doctypes,
      closed: closed ? 1 : 0,
      user,
    };
    if (closed && options.closed_time != null) payload.closed_time = options.closed_time;
    if (closed && options.closed_activity_id != null)
      payload.closed_activity_id = options.closed_activity_id;
    return this.updateNotificationActivity(payload);
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();

export default notificationService;
