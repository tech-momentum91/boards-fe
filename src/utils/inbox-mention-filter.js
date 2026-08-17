/**
 * Client-side refinement for inbox "mentions" filter: the API includes any document
 * where the user was @mentioned in at least one comment, but the same document can
 * surface multiple notification groups (timeline / read state). Keep only groups
 * that contain at least one comment activity whose HTML mentions the current user.
 */

/**
 * Resolve current user id for mention matching (typically Frappe User name = email).
 * Mirrors notification-service fallbacks plus `user` from localStorage (auth).
 */
export function getInboxUserIdForMentions() {
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const p = JSON.parse(userRaw);
      const e = p?.email || p?.name;
      if (e) return String(e).trim();
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem('userInfo');
    const userInfo = raw ? JSON.parse(raw) : null;
    if (userInfo && typeof userInfo === 'object') {
      const u =
        userInfo.email ??
        userInfo.user_email ??
        userInfo.username ??
        userInfo.user ??
        userInfo.name;
      if (u) return String(u).trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

/**
 * True if HTML (comment body) contains a text-editor mention of `userId`.
 * Matches <span data-type="mention" data-id="...">
 */
export function htmlContainsMentionOfUser(html, userId) {
  if (!html || !userId) return false;
  const want = norm(userId);
  if (!want) return false;
  try {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const spans = doc.querySelectorAll('span[data-type="mention"]');
    for (const el of spans) {
      const id = norm(el.getAttribute('data-id'));
      if (id && id === want) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Comment-shaped activity from get_notifications (HD Ticket Comment, etc.). */
export function isCommentLikeActivity(activity) {
  if (!activity || typeof activity !== 'object') return false;
  const changes = Array.isArray(activity.changes) ? activity.changes : [];
  const first = changes[0];
  if (first && String(first.field || '').toLowerCase() === 'comment') return true;
  const fd = String(activity.from_doctype || '').toLowerCase();
  if (fd.includes('comment')) return true;
  return false;
}

/**
 * Processed inbox row from notification-service: { raw: { activities } }.
 */
export function notificationRowHasUserMentionInComment(row, userId) {
  if (!userId || !row?.raw?.activities?.length) return false;
  return row.raw.activities.some(
    (a) => isCommentLikeActivity(a) && htmlContainsMentionOfUser(a.content, userId),
  );
}

/**
 * @param {Array<{ items: unknown[] }>} sections
 * @param {string} userId
 * @returns {Array<{ items: unknown[] }>}
 */
export function filterGroupedSectionsForMentions(sections, userId) {
  if (!userId || !Array.isArray(sections)) return sections;
  return sections
    .map((s) => ({
      ...s,
      items: (s.items || []).filter((row) => notificationRowHasUserMentionInComment(row, userId)),
    }))
    .filter((s) => (s.items || []).length > 0);
}
