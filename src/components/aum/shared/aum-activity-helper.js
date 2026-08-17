/** Map AUM activity API rows to CRM history item shape for CrmTaskHistoryItem. */
export function mapAumActivityToHistory(entry) {
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

export function mapAumActivityList(entries) {
  return (entries ?? [])
    .map(mapAumActivityToHistory)
    .filter(Boolean)
    .sort((a, b) => new Date(a.creation || 0) - new Date(b.creation || 0));
}
