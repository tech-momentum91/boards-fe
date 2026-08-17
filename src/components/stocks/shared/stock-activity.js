/** Map stock activity API rows to CRM history item shape (CrmTaskHistoryItem). */

export function mapStockActivityToHistory(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const field = String(entry.field || '').trim();
  let action = String(entry.action || '').trim();

  if (!action && field) {
    const from = entry.from ?? '';
    const to = entry.to ?? '';
    action =
      from || to
        ? `${field} changes to \`${from || '(empty)'}\` → \`${to || '(empty)'}\``
        : `Updated ${field}`;
  }

  if (!action) return null;

  const user = entry.user && typeof entry.user === 'object' ? entry.user : {};

  return {
    name: entry.name,
    action,
    field,
    from: entry.from ?? '',
    to: entry.to ?? '',
    creation: entry.creation,
    owner: entry.owner,
    user: {
      ...user,
      full_name: user.full_name || user.name,
      user_image: user.user_image || user.image,
    },
  };
}

/** @deprecated Prefer mapStockActivityToHistory — kept for callers that still expect flat text. */
export function mapStockActivityEntry(entry) {
  const history = mapStockActivityToHistory(entry);
  if (!history) return null;
  const who = history.user?.full_name || history.owner || '';
  const at = history.creation ? String(history.creation).replace('T', ' ').slice(0, 16) : '';
  return {
    id: history.name || `act-${history.creation || Date.now()}`,
    message: who ? `${who}: ${history.action}` : history.action,
    at,
    type: 'text',
  };
}

export function parseStockActivityList(message) {
  const payload = message?.data ?? message;
  const raw = Array.isArray(message?.activity)
    ? message.activity
    : Array.isArray(payload?.activity)
      ? payload.activity
      : Array.isArray(payload)
        ? payload
        : [];

  return raw
    .map(mapStockActivityToHistory)
    .filter(Boolean)
    .sort((a, b) => new Date(a.creation || 0) - new Date(b.creation || 0));
}
