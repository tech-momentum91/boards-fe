/**
 * Event Task assignee picker — team sections + helpers.
 * Child `roles` are Frappe Role names for `get_users_by_roles` only;
 * the UI shows team-level options (CRM Team / Facility Team / …).
 *
 * `roles` below are environment-specific fallbacks used only when
 * `get_roles_with_type` fails or does not return a matching team bucket.
 * Keep this list in sync with backend Role names / group labels.
 */

export const EVENT_TASK_ASSIGNEE_TEAM_SECTIONS = [
  {
    label: 'CRM Team',
    value: 'CRM Team',
    roles: ['CRM', 'CRM (Account Manager)', 'CRM User'],
  },
  {
    label: 'Facility Team',
    value: 'Facility Team',
    roles: ['Booking Manager', 'Facility Manager', 'Facility User', 'Facility Lead'],
  },
  {
    label: 'Operation Head',
    value: 'Operation Head',
    roles: ['Operations Head'],
  },
];

/**
 * Fetched for the Users list only — never shown as role/team checkboxes.
 * Role names must match Frappe Role docs (Settings > Users).
 */
export const EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES = ['Super Admin', 'Sub Admin', 'Admin'];

export const EVENT_TASK_ASSIGNEE_ROLE_OPTIONS = EVENT_TASK_ASSIGNEE_TEAM_SECTIONS.map((team) => ({
  label: team.label,
  value: team.value,
}));

export const EVENT_TASK_ASSIGNEE_FETCH_LIMIT = 999;

const roleNameFromEntry = (item) => {
  if (typeof item === 'string') return item.trim();
  if (item && typeof item === 'object' && item.name != null) return String(item.name).trim();
  return '';
};

const pickTeamRolesFromMessage = (message, teamLabel) => {
  if (!message || typeof message !== 'object') return null;
  if (Array.isArray(message[teamLabel])) {
    return message[teamLabel].map(roleNameFromEntry).filter(Boolean);
  }
  for (const bucket of Object.values(message)) {
    if (
      bucket &&
      typeof bucket === 'object' &&
      !Array.isArray(bucket) &&
      Array.isArray(bucket[teamLabel])
    ) {
      return bucket[teamLabel].map(roleNameFromEntry).filter(Boolean);
    }
  }
  return null;
};

/** Merge live `get_roles_with_type` roles into static team sections. */
export const resolveEventTaskTeamSections = (rolesWithTypeMessage) => {
  const message =
    rolesWithTypeMessage?.message && typeof rolesWithTypeMessage.message === 'object'
      ? rolesWithTypeMessage.message
      : rolesWithTypeMessage;

  return EVENT_TASK_ASSIGNEE_TEAM_SECTIONS.map((section) => {
    if (section.value === 'Operation Head') return { ...section, roles: [...section.roles] };
    const live = pickTeamRolesFromMessage(message, section.value);
    return {
      ...section,
      roles: live?.length > 0 ? live : [...section.roles],
    };
  });
};

export const parseUnknownRolesFromError = (error) => {
  const msg = error?.serialized?.message || error?.response?.data?.message || error?.message || '';
  const match = String(msg).match(/unknown role\(s\):\s*(.+)/i);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/** True when the User account is disabled (Frappe `enabled` = 0). */
export const isEventTaskAssigneeDisabled = (user) => {
  if (!user || typeof user !== 'object') return false;
  if (user.disabled === true || user.disabled === 1 || user.disabled === '1') return true;
  if (user.enabled === 0 || user.enabled === false || user.enabled === '0') return true;
  return false;
};

/**
 * Build users + exclusive primary-team groups from `get_users_by_roles` groups.
 * Roles in `usersOnlyRoles` contribute users to the list but never become team/role options.
 *
 * Prefer `centers` / `all_centers` from each API user (enriched by backend).
 * Optional `userCentersById` is a legacy fallback map user email → center ids.
 * Disabled User accounts are omitted.
 */
export const buildEventTaskAssigneePayload = (
  teamSections,
  apiGroups = [],
  usersOnlyRoles = EVENT_TASK_ASSIGNEE_USERS_ONLY_ROLES,
  userCentersById = {},
) => {
  const usersById = new Map();
  const teamByRole = new Map();
  teamSections.forEach((team) => {
    (team.roles || []).forEach((roleName) => {
      teamByRole.set(String(roleName).toLowerCase(), team);
    });
  });
  const usersOnlyRoleSet = new Set(
    (Array.isArray(usersOnlyRoles) ? usersOnlyRoles : []).map((r) => String(r).toLowerCase()),
  );
  const teamPriority = new Map(teamSections.map((team, index) => [team.value, index]));

  const resolveCenterAccess = (userId, apiUser, apiRole, isUsersOnlyRole) => {
    if (isUsersOnlyRole || usersOnlyRoleSet.has(String(apiRole || '').toLowerCase())) {
      return { centers: [], allCenters: true };
    }
    const hasEnrichedCenterMeta =
      Array.isArray(apiUser?.centers) ||
      apiUser?.all_centers === 0 ||
      apiUser?.all_centers === 1 ||
      apiUser?.all_centers === true ||
      apiUser?.all_centers === false ||
      apiUser?.all_centers === '0' ||
      apiUser?.all_centers === '1';
    // Old API without center enrichment — do not lock selection.
    if (!hasEnrichedCenterMeta) {
      const fromMap = userCentersById?.[userId] ?? userCentersById?.[String(userId).toLowerCase()];
      const mapped = (Array.isArray(fromMap) ? fromMap : [])
        .map((c) => String(c ?? '').trim())
        .filter(Boolean);
      if (mapped.length > 0) return { centers: mapped, allCenters: false };
      return { centers: [], allCenters: true };
    }
    const centers = (Array.isArray(apiUser?.centers) ? apiUser.centers : [])
      .map((c) => String(c ?? '').trim())
      .filter(Boolean);
    const allCenters =
      apiUser?.all_centers === 1 ||
      apiUser?.all_centers === true ||
      apiUser?.all_centers === '1' ||
      apiUser?.allCenters === true;
    return { centers, allCenters: Boolean(allCenters) };
  };

  apiGroups.forEach((group) => {
    const apiRole = String(group?.role || '').trim();
    if (!apiRole) return;
    const roleKey = apiRole.toLowerCase();
    const team = teamByRole.get(roleKey);
    const isUsersOnlyRole = usersOnlyRoleSet.has(roleKey);
    // Skip roles that are neither a team role nor an allowed users-only role.
    if (!team && !isUsersOnlyRole) return;

    (group?.users || []).forEach((u) => {
      const id = u.user_id || u.email || u.name;
      if (!id) return;
      // Never list disabled User accounts in the assignee picker.
      if (isEventTaskAssigneeDisabled(u)) return;
      const displayName = u.full_name || u.name || id;
      const centerAccess = resolveCenterAccess(id, u, apiRole, isUsersOnlyRole);

      if (!usersById.has(id)) {
        usersById.set(id, {
          label: displayName,
          value: id,
          email: id,
          name: id,
          full_name: displayName,
          image: u.user_image ?? null,
          user_role: apiRole,
          team: team?.value || null,
          teamLabel: team?.label || null,
          centers: centerAccess.centers,
          allCenters: centerAccess.allCenters,
          enabled: 1,
        });
        return;
      }

      const existing = usersById.get(id);
      if (centerAccess.allCenters) {
        existing.allCenters = true;
        existing.centers = [];
      } else if (!existing.allCenters && centerAccess.centers.length > 0) {
        const merged = new Set([...(existing.centers || []), ...centerAccess.centers]);
        existing.centers = [...merged];
      }
      if (!team?.value) return;
      const currentPri = teamPriority.get(existing.team) ?? Number.POSITIVE_INFINITY;
      const nextPri = teamPriority.get(team.value) ?? Number.POSITIVE_INFINITY;
      if (nextPri < currentPri || !existing.team) {
        existing.team = team.value;
        existing.teamLabel = team.label;
        existing.user_role = apiRole;
      }
    });
  });

  const users = [...usersById.values()];
  // Roles list = team sections only (never Super Admin / Sub Admin / Admin).
  const roles = teamSections.map((team) => ({ label: team.label, value: team.value }));
  const groups = teamSections.map((team) => ({
    role: team.value,
    label: team.label,
    users: users.filter((u) => u.team === team.value),
  }));

  return { users, groups, roles };
};

export const normalizeAssigneeId = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const raw = value.value ?? value.email ?? value.name ?? value.user ?? value.assignee;
    return raw != null ? String(raw).trim() : '';
  }
  return String(value).trim();
};

export const normalizeAssigneeIds = (assignedTo) =>
  (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).map(normalizeAssigneeId).filter(Boolean);

export const normalizeCenterIds = (value) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((v) => {
      if (v != null && typeof v === 'object') {
        return String(v.value ?? v.name ?? v.id ?? v.center ?? '').trim();
      }
      return String(v ?? '').trim();
    })
    .filter(Boolean);

/**
 * Whether an assignee may stay selected for the given center(s).
 * - No centers selected yet → everyone is allowed (pruning happens when centers are chosen).
 * - `allCenters` (admins / unrestricted roles) → always allowed.
 * - Otherwise → user must have center overlap with any selected center.
 */
export const assigneeBelongsToSelectedCenters = (user, selectedCenterIds) => {
  const centers = normalizeCenterIds(selectedCenterIds);
  if (centers.length === 0) return true;
  if (!user) return false;
  if (user.allCenters) return true;
  const userCenters = normalizeCenterIds(user.centers).map((c) => c.toLowerCase());
  if (userCenters.length === 0) return false;
  const selected = centers.map((c) => c.toLowerCase());
  return selected.some((c) => userCenters.includes(c));
};

/** Keep only assignee ids that belong to the selected centers. */
export const filterAssigneeIdsByCenters = (
  assignedTo,
  users,
  selectedCenterIds,
  { keepUnknown = false } = {},
) => {
  const centers = normalizeCenterIds(selectedCenterIds);
  const ids = normalizeAssigneeIds(assignedTo);
  if (centers.length === 0 || ids.length === 0) return ids;

  const byId = new Map();
  (Array.isArray(users) ? users : []).forEach((u) => {
    const key = normalizeAssigneeId(u);
    if (key) byId.set(key, u);
  });

  return ids.filter((id) => {
    const user = byId.get(id);
    if (!user) return keepUnknown;
    return assigneeBelongsToSelectedCenters(user, centers);
  });
};

/** Users (and their team groups) that belong to the given center(s). */
export const filterUsersByCenters = (users, selectedCenterIds) => {
  const list = Array.isArray(users) ? users : [];
  const centers = normalizeCenterIds(selectedCenterIds);
  if (centers.length === 0) return list;
  return list.filter((u) => assigneeBelongsToSelectedCenters(u, centers));
};
