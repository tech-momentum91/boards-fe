import { VALID_USER_SUB_TAB_IDS } from '@/constants/users-constants';

// --- Settings → Users profile tabs / list ---

/**
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 * @returns {'all' | 'core_team' | 'others'}
 */
export function getUsersSubTabFromSearchParams(searchParams) {
  const id = (searchParams.get('tab') || '').toLowerCase();
  return VALID_USER_SUB_TAB_IDS.has(id) ? id : 'all';
}

/** Payload `type` for `get_user_list`: Core Team / Others tabs only. */
export function userListTypeForSubTab(tabId) {
  if (tabId === 'core_team') return 'Core';
  if (tabId === 'others') return 'Others';
  return undefined;
}

/** Map `get_user_list` `message.status` to Users profile tab badge counts. */
export function mapUserListSegmentStatusToTabCounts(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    return {};
  }
  const toCount = (value) => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };
  return {
    all: toCount(status.all_users),
    core_team: toCount(status.core_team),
    others: toCount(status.others),
  };
}

// --- Display / form name helpers ---

/**
 * Split a single display / full name into first + last.
 * First whitespace-delimited token → first name; remainder → last name.
 *
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
export function splitFullNameIntoFirstAndLast(fullName) {
  const trimmed = String(fullName ?? '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function joinFirstAndLastName(firstName, lastName) {
  return [String(firstName ?? '').trim(), String(lastName ?? '').trim()].filter(Boolean).join(' ');
}

// --- Center display (`get_user_list`, tables) ---

/** Display label when a record applies to every center. */
export const ALL_CENTERS_LABEL = 'All Centers';

/**
 * Truthy `all_centers` flag (matches event-management table semantics).
 * Accepts 1, true, '1', or 'yes' (case-insensitive).
 */
export function isTruthyAllCentersFlag(value) {
  return (
    value === 1 ||
    value === true ||
    value === '1' ||
    String(value || '')
      .trim()
      .toLowerCase() === 'yes'
  );
}

const ALL_CENTERS_SENTINEL_RE = /^all\s+centers$/i;

/** Legacy `get_user_list` sentinel before `all_centers` existed on each row. */
export function isAllCentersSentinelString(value) {
  if (value == null) return false;
  return ALL_CENTERS_SENTINEL_RE.test(String(value).trim());
}

/** Normalize rows from `devx.api.user.get_user_list` for tables and legacy flows. */
export function normalizeUserListRow(row) {
  if (!row || typeof row !== 'object') return row;

  const roles = Array.isArray(row.roles)
    ? row.roles.map((r) => String(r).trim()).filter(Boolean)
    : [];
  const user_role =
    row.user_role != null && String(row.user_role).trim() !== ''
      ? String(row.user_role).trim()
      : (roles[0] ?? '');

  const allCenters =
    isTruthyAllCentersFlag(row.all_centers) ||
    (typeof row.centers === 'string' && isAllCentersSentinelString(row.centers));

  let centerNames = [];
  if (!allCenters && typeof row.centers === 'string' && String(row.centers).trim() !== '') {
    const t = String(row.centers).trim();
    centerNames = t.includes(',')
      ? t
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [t];
  } else if (!allCenters && Array.isArray(row.centers) && row.centers.length > 0) {
    const first = row.centers[0];
    if (typeof first === 'string') {
      centerNames = row.centers.map((s) => String(s).trim()).filter(Boolean);
    } else if (
      first &&
      typeof first === 'object' &&
      !Array.isArray(first) &&
      (first.center_name != null || first.id != null || first.name != null)
    ) {
      centerNames = row.centers
        .map((c) => {
          if (!c || typeof c !== 'object') return '';
          return String(c.center_name ?? '').trim();
        })
        .filter(Boolean);
    }
  }
  if (!allCenters && centerNames.length === 1 && isAllCentersSentinelString(centerNames[0])) {
    centerNames = [];
  }

  if (centerNames.length === 0 && Array.isArray(row.center_names)) {
    centerNames = row.center_names.map((c) => String(c).trim()).filter(Boolean);
  } else if (centerNames.length === 0 && typeof row.center_name === 'string') {
    const trimmed = row.center_name.trim();
    if (trimmed.includes(',')) {
      centerNames = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmed) {
      centerNames = [trimmed];
    }
  } else if (centerNames.length === 0 && row.center_name != null && row.center_name !== '') {
    centerNames = [String(row.center_name).trim()].filter(Boolean);
  }

  const groups = Array.isArray(row.groups)
    ? row.groups.map((g) => String(g).trim()).filter(Boolean)
    : [];

  const full_name = row.full_name ?? row.name ?? '';
  const name = full_name || row.name || '';

  return {
    ...row,
    name,
    full_name: full_name || row.full_name,
    user_role,
    roles,
    groups,
    all_centers: allCenters ? 1 : (row.all_centers ?? 0),
    center_names_list: centerNames,
    center_name: allCenters ? null : (centerNames[0] ?? row.center_name ?? null),
    center: allCenters ? null : (centerNames[0] ?? row.center ?? null),
  };
}

// --- `fetchRolesWithType` / get_roles_with_type grouped role helpers (settings users, team, centers) ---

/** Payload for `fetchRolesWithType`. All Users → no query params (nested groups from API). */
export function rolesPayloadForUsersSegment(segment) {
  switch (segment) {
    case 'core_team':
      return { group: 'core' };
    case 'others':
      return { group: 'others' };
    case 'all':
    default:
      return undefined;
  }
}

/** True when bucket is { SubGroupLabel: roleName[] } (middle layer before role rows). */
export function isNestedRoleTypeMap(bucket) {
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return false;
  const vals = Object.values(bucket);
  if (vals.length === 0) return false;
  return vals.every((v) => Array.isArray(v));
}

export function normalizeBucketToArray(bucket) {
  if (Array.isArray(bucket)) return bucket;
  if (bucket && typeof bucket === 'object') {
    return Object.values(bucket).flatMap((v) => (Array.isArray(v) ? v : []));
  }
  return [];
}

export function normalizeRoleEntry(item) {
  if (typeof item === 'string') return { name: item.trim(), req_field: null };
  if (item && typeof item === 'object' && item.name) {
    const rawReq = item.req_field;
    const reqTrimmed =
      rawReq == null || rawReq === ''
        ? null
        : typeof rawReq === 'string'
          ? rawReq.trim() || null
          : rawReq;
    return {
      name: String(item.name).trim(),
      req_field: reqTrimmed,
    };
  }
  return { name: '', req_field: null };
}

/** Map role name → role type section label from `get_roles_with_type` message. */
export function buildRoleNameToTypeMap(rolesMessage = {}) {
  const map = {};
  for (const [typeLabel, roles] of Object.entries(rolesMessage)) {
    if (!Array.isArray(roles)) continue;
    for (const role of roles) {
      const { name } = normalizeRoleEntry(role);
      if (name) map[name] = typeLabel;
    }
  }
  return map;
}

/** When the same role appears twice, keep `req_field` if either side has a non-empty value. */
function mergeReqFieldPreferNonempty(existingReq, incomingReq) {
  const empty = (v) => v == null || (typeof v === 'string' && v.trim() === '');
  if (empty(existingReq) && !empty(incomingReq)) return incomingReq;
  if (!empty(existingReq)) return existingReq;
  return incomingReq ?? null;
}

/** True when message is { Core: { TypeLabel: roles[] }, Support: { … } } — drop outer keys in UI. */
function shouldFlattenOuterTeamLayer(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const vals = Object.values(raw);
  if (vals.length === 0) return false;
  return vals.every((v) => isNestedRoleTypeMap(v));
}

/** Merge inner type sections from Core, Support, etc. Keeps `{ name, req_field }` from API. */
function flattenOuterTeamLayer(raw) {
  /** @type {Record<string, Map<string, { name: string; req_field: unknown }>>} */
  const mergedMaps = {};
  for (const inner of Object.values(raw)) {
    if (!isNestedRoleTypeMap(inner)) continue;
    for (const [typeLabel, roleNames] of Object.entries(inner)) {
      if (!Array.isArray(roleNames)) continue;
      if (!mergedMaps[typeLabel]) mergedMaps[typeLabel] = new Map();
      const map = mergedMaps[typeLabel];
      for (const item of roleNames) {
        const entry = normalizeRoleEntry(item);
        if (!entry.name) continue;
        const prev = map.get(entry.name);
        if (!prev) {
          map.set(entry.name, entry);
        } else {
          map.set(entry.name, {
            name: entry.name,
            req_field: mergeReqFieldPreferNonempty(prev.req_field, entry.req_field),
          });
        }
      }
    }
  }
  const merged = {};
  for (const [typeLabel, map] of Object.entries(mergedMaps)) {
    merged[typeLabel] = [...map.values()];
  }
  return merged;
}

/** API message shape: { [groupLabel]: (string | { name, req_field })[] } */
export function coerceGroupedRolesMessage(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    if (
      raw.length > 0 &&
      raw.every((x) => typeof x === 'object' && x !== null && typeof x.name === 'string')
    ) {
      return { Roles: raw };
    }
    if (raw.length > 0 && raw.every((x) => typeof x === 'string')) {
      return { Roles: raw };
    }
    const out = {};
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const label = row.group_label ?? row.group ?? row.team_type ?? row.name ?? '—';
      const items = row.roles ?? row.items ?? row.role_names ?? [];
      if (Array.isArray(items)) out[label] = items;
    }
    return out;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const arraysOnly = Object.fromEntries(Object.entries(raw).filter(([, v]) => Array.isArray(v)));
    if (Object.keys(arraysOnly).length > 0) return arraysOnly;

    if (shouldFlattenOuterTeamLayer(raw)) {
      return flattenOuterTeamLayer(raw);
    }

    const nested = {};
    for (const [groupName, inner] of Object.entries(raw)) {
      if (!inner || typeof inner !== 'object' || Array.isArray(inner)) continue;
      const typeMap = Object.fromEntries(Object.entries(inner).filter(([, v]) => Array.isArray(v)));
      if (Object.keys(typeMap).length > 0) nested[groupName] = typeMap;
    }
    if (Object.keys(nested).length > 0) return nested;
  }
  return {};
}

/**
 * Returns a copy of grouped roles with only rows (and group headers) matching `searchQuery`.
 * Matches role name, team label, or type label (case-insensitive). Empty query returns full `grouped`.
 */
export function filterGroupedRolesForSearch(grouped, searchQuery, adminExcludedRole) {
  const groupedSafe =
    grouped && typeof grouped === 'object' && !Array.isArray(grouped) ? grouped : {};
  const q = (searchQuery || '').trim().toLowerCase();
  const excluded = typeof adminExcludedRole === 'function' ? adminExcludedRole : () => false;

  const matches = (roleName, teamLabel, typeLabel) => {
    if (!q) return true;
    const tn = String(teamLabel).toLowerCase();
    const tt = typeLabel != null ? String(typeLabel).toLowerCase() : '';
    return roleName.toLowerCase().includes(q) || tn.includes(q) || (tt && tt.includes(q));
  };

  const out = {};
  for (const [teamLabel, bucket] of Object.entries(groupedSafe)) {
    if (isNestedRoleTypeMap(bucket)) {
      const inner = {};
      for (const [typeLabel, roleNames] of Object.entries(bucket)) {
        if (!Array.isArray(roleNames)) continue;
        const filtered = roleNames.filter((item) => {
          const r = normalizeRoleEntry(item);
          if (!r.name || excluded(r.name)) return false;
          return matches(r.name, teamLabel, typeLabel);
        });
        if (filtered.length > 0) inner[typeLabel] = filtered;
      }
      if (Object.keys(inner).length > 0) out[teamLabel] = inner;
    } else {
      const arr = Array.isArray(bucket) ? bucket : normalizeBucketToArray(bucket);
      const filtered = arr.filter((item) => {
        const r = normalizeRoleEntry(item);
        if (!r.name || excluded(r.name)) return false;
        return matches(r.name, teamLabel, null);
      });
      if (filtered.length > 0) out[teamLabel] = filtered;
    }
  }
  return out;
}

/** @param {string} expectedLower e.g. `'center'` */
function roleReqFieldEquals(entry, expectedLower) {
  const rf = entry?.req_field;
  if (rf == null || rf === '') return false;
  return String(rf).trim().toLowerCase() === expectedLower;
}

/** True when API `req_field` is center scope (case-insensitive). */
export function roleReqFieldIsCenter(entry) {
  return roleReqFieldEquals(entry, 'center');
}

/** True when API `req_field` is zone scope (case-insensitive). */
export function roleReqFieldIsZone(entry) {
  return roleReqFieldEquals(entry, 'zone');
}

/** True when API `req_field` is center or zone scope (case-insensitive). */
export function roleReqFieldIsCenterOrZone(entry) {
  return roleReqFieldIsCenter(entry) || roleReqFieldIsZone(entry);
}

/**
 * Coerces `get_roles_with_type` message shape, then keeps only roles with `req_field` === `center` or `zone`.
 * Used for team management (core/support) and center “associate team member” flows.
 */
export function filterGroupedRolesOnlyCenterReqField(rawMessage) {
  const grouped = coerceGroupedRolesMessage(
    rawMessage && typeof rawMessage === 'object' && !Array.isArray(rawMessage) ? rawMessage : {},
  );
  const out = {};
  for (const [teamLabel, bucket] of Object.entries(grouped)) {
    if (isNestedRoleTypeMap(bucket)) {
      const inner = {};
      for (const [typeLabel, roleNames] of Object.entries(bucket)) {
        if (!Array.isArray(roleNames)) continue;
        const filtered = roleNames.filter((item) => {
          const e = normalizeRoleEntry(item);
          return e.name && roleReqFieldIsCenterOrZone(e);
        });
        if (filtered.length > 0) inner[typeLabel] = filtered;
      }
      if (Object.keys(inner).length > 0) out[teamLabel] = inner;
    } else {
      const arr = Array.isArray(bucket) ? bucket : normalizeBucketToArray(bucket);
      const filtered = arr.filter((item) => {
        const e = normalizeRoleEntry(item);
        return e.name && roleReqFieldIsCenterOrZone(e);
      });
      if (filtered.length > 0) out[teamLabel] = filtered;
    }
  }
  return out;
}

/** True when API `req_field` is client scope (case-insensitive). */
export function roleReqFieldIsClient(entry) {
  return roleReqFieldEquals(entry, 'client');
}

/**
 * Coerces API message, then drops roles whose `req_field` === `client`.
 * Settings → Users add/edit modals: client-scoped roles are not selectable from the role list.
 */
export function filterGroupedRolesExcludeClientReqField(rawMessage) {
  const grouped = coerceGroupedRolesMessage(
    rawMessage && typeof rawMessage === 'object' && !Array.isArray(rawMessage) ? rawMessage : {},
  );
  const out = {};
  for (const [teamLabel, bucket] of Object.entries(grouped)) {
    if (isNestedRoleTypeMap(bucket)) {
      const inner = {};
      for (const [typeLabel, roleNames] of Object.entries(bucket)) {
        if (!Array.isArray(roleNames)) continue;
        const filtered = roleNames.filter((item) => {
          const e = normalizeRoleEntry(item);
          return e.name && !roleReqFieldIsClient(e);
        });
        if (filtered.length > 0) inner[typeLabel] = filtered;
      }
      if (Object.keys(inner).length > 0) out[teamLabel] = inner;
    } else {
      const arr = Array.isArray(bucket) ? bucket : normalizeBucketToArray(bucket);
      const filtered = arr.filter((item) => {
        const e = normalizeRoleEntry(item);
        return e.name && !roleReqFieldIsClient(e);
      });
      if (filtered.length > 0) out[teamLabel] = filtered;
    }
  }
  return out;
}

export function flattenRolesFromGrouped(grouped) {
  /** @type {Map<string, { name: string; req_field: unknown }>} */
  const byName = new Map();
  for (const [, bucket] of Object.entries(grouped || {})) {
    const arr = normalizeBucketToArray(bucket);
    for (const item of arr) {
      const entry = normalizeRoleEntry(item);
      if (!entry.name) continue;
      const prev = byName.get(entry.name);
      if (!prev) {
        byName.set(entry.name, entry);
      } else {
        byName.set(entry.name, {
          name: entry.name,
          req_field: mergeReqFieldPreferNonempty(prev.req_field, entry.req_field),
        });
      }
    }
  }
  return [...byName.values()];
}
