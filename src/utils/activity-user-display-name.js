/**
 * Prefer a real name over email for activity / history attribution (CRM tasks, account activities).
 */
export function activityUserDisplayName(user, ownerFallback = '') {
  const owner = (ownerFallback || '').trim();
  const full = (user?.full_name || '').trim();
  const firstLast = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const name = (user?.name || '').trim();
  const email = (user?.email || '').trim();

  if (full) return full;
  if (firstLast) return firstLast;
  if (name && !name.includes('@')) return name;
  if (owner && !owner.includes('@')) return owner;
  if (email) {
    const local = email.split('@')[0];
    return local || email;
  }
  if (name) return name.includes('@') ? name.split('@')[0] || name : name;
  return owner || 'Unknown';
}
