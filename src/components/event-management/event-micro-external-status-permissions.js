import { EVENT_STATUS_OPTIONS } from '@/components/event-management/constant';

/** Roles that may set HO workflow statuses (micro / external events). */
const HO_PRIVILEGED_ROLE_NAMES = new Set([
  'Super Admin',
  'Admin',
  'Operation Head',
  'Operations Head',
]);

const LIMITED_STATUS_VALUES = new Set(
  ['Exploration', 'Proposed to HO'].map((s) => s.toLowerCase()),
);

function normalizeRoleName(role) {
  return String(role ?? '')
    .trim()
    .toLowerCase();
}

function isHoPrivilegedRoleName(role) {
  const n = normalizeRoleName(role);
  if (!n) return false;
  for (const allowed of HO_PRIVILEGED_ROLE_NAMES) {
    if (normalizeRoleName(allowed) === n) return true;
  }
  return false;
}

/**
 * @param {unknown} apiPayload - `getProfile` fulfilled payload (`{ data: User }`) or raw User doc
 * @returns {string[]}
 */
export function collectUserRoleNamesFromProfilePayload(apiPayload) {
  const root =
    apiPayload && typeof apiPayload === 'object' && apiPayload.data ? apiPayload.data : apiPayload;
  if (!root || typeof root !== 'object') return [];
  const names = new Set();
  const primary = String(root.user_role || '').trim();
  if (primary) names.add(primary);
  const rows = Array.isArray(root.roles) ? root.roles : [];
  rows.forEach((r) => {
    const role = String(r?.role || '').trim();
    if (role) names.add(role);
  });
  return [...names];
}

/** True if the user may assign any `EVENT_STATUS_OPTIONS` value (micro / external). */
export function userCanEditMicroExternalHoStatuses(profilePayload) {
  return collectUserRoleNamesFromProfilePayload(profilePayload).some((r) =>
    isHoPrivilegedRoleName(r),
  );
}

/**
 * Options for the micro / external status dropdown.
 * Limited users: only Exploration & Proposed to HO, plus current status (disabled) when outside that set.
 *
 * @param {unknown} profilePayload
 * @param {string} [currentStatusRaw]
 * @returns {Array<{ label: string, value: string, disabled?: boolean }>}
 */
export function getMicroExternalEventStatusEditOptions(profilePayload, currentStatusRaw = '') {
  if (userCanEditMicroExternalHoStatuses(profilePayload)) {
    return EVENT_STATUS_OPTIONS;
  }

  const limited = EVENT_STATUS_OPTIONS.filter((o) =>
    LIMITED_STATUS_VALUES.has(String(o.value).trim().toLowerCase()),
  );

  const current = String(currentStatusRaw || '').trim();
  if (!current) return limited;

  const currentLower = current.toLowerCase();
  const inLimited = limited.some(
    (o) =>
      String(o.value).trim().toLowerCase() === currentLower ||
      String(o.label).trim().toLowerCase() === currentLower,
  );
  if (inLimited) return limited;

  const fromCatalog = EVENT_STATUS_OPTIONS.find(
    (o) =>
      String(o.value).trim().toLowerCase() === currentLower ||
      String(o.label).trim().toLowerCase() === currentLower,
  );
  const currentOpt = fromCatalog || { label: current, value: current };
  return [{ ...currentOpt, disabled: true }, ...limited];
}

/** Client-side guard before calling `update_events` with a new status. */
export function isMicroExternalStatusUpdateAllowed(profilePayload, nextStatusRaw) {
  const next = String(nextStatusRaw ?? '').trim();
  if (!next) return true;
  if (profilePayload == null) return true;
  if (userCanEditMicroExternalHoStatuses(profilePayload)) return true;
  return LIMITED_STATUS_VALUES.has(next.toLowerCase());
}
