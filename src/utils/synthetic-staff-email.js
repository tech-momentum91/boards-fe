/**
 * Phone-based staff login shape from backend: only digits in local part @ devx.work
 */
export function isSyntheticDevxStaffEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at < 1) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  return domain === 'devx.work' && local.length > 0 && /^\d+$/.test(local);
}
