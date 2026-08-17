/**
 * Shared storage utility for Center Configuration (Pricing & Teams).
 * Stores data in localStorage per centerId, providing helper accessors
 * for space creation auto-population and team role max limit tracking.
 */

export const DEFAULT_PRICING_ROWS = [
  {
    id: '1',
    productType: 'Managed Office',
    subType: 'FITTED OUT',
    pricePerSeat: 220,
    pricePerSqFt: 220,
    creditPerSeat: 3,
  },
  {
    id: '2',
    productType: 'Co-Working Space',
    subType: 'PRIVATE CABIN',
    pricePerSeat: 340,
    pricePerSqFt: 510,
    creditPerSeat: 5,
  },
  {
    id: '3',
    productType: 'Resource',
    subType: 'CABINS',
    pricePerSeat: 120,
    pricePerSqFt: 490,
    creditPerSeat: 2,
  },
  {
    id: '4',
    productType: 'Pure Rental',
    subType: 'FURNISHED',
    pricePerSeat: 490,
    pricePerSqFt: 220,
    creditPerSeat: 8,
  },
];

export const DEFAULT_TEAMS_CONFIG_ROWS = [
  {
    id: '1',
    role: 'Faculty User',
    memberMin: 6,
    memberMax: 10,
  },
  {
    id: '2',
    role: 'CRM',
    memberMin: 5,
    memberMax: 7,
  },
  {
    id: '3',
    role: 'Zone Manager',
    memberMin: 2,
    memberMax: 5,
  },
  {
    id: '4',
    role: 'Faculty Manager',
    memberMin: 7,
    memberMax: 8,
  },
];

const PRICING_PREFIX = 'center_detail_pricing_';
const TEAMS_CONFIG_PREFIX = 'center_detail_teams_config_';

/** Get Pricing records for a center */
export const getCenterPricing = (centerId) => {
  const key = `${PRICING_PREFIX}${centerId || 'default'}`;
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to get pricing config:', error);
    }
  }
  return [];
};

/** Save Pricing records for a center */
export const saveCenterPricing = (centerId, rows) => {
  const key = `${PRICING_PREFIX}${centerId || 'default'}`;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(rows));
    } catch (error) {
      console.error('Failed to save pricing config:', error);
    }
  }
};

/**
 * Find matching pricing record by space type and sub type.
 * Normalized comparison handles case differences (e.g. 'Managed Office' vs 'managed office', 'Fitted Out' vs 'FITTED OUT').
 */
export const findMatchingPricing = (centerId, productType, subType) => {
  if (!productType || !subType) return null;
  const rows = getCenterPricing(centerId);

  const normProduct = String(productType).trim().toLowerCase();
  const normSub = String(subType).trim().toLowerCase();

  return (
    rows.find((r) => {
      const rowProduct = String(r.productType || '')
        .trim()
        .toLowerCase();
      const rowSub = String(r.subType || '')
        .trim()
        .toLowerCase();

      // Flexible product type matching (e.g., 'Managed Office' matching 'Managed Office', 'Co-Working' matching 'Co-Working Space')
      const matchesProduct =
        rowProduct === normProduct ||
        (normProduct.includes('managed') && rowProduct.includes('managed')) ||
        (normProduct.includes('work') && rowProduct.includes('work')) ||
        (normProduct.includes('resource') && rowProduct.includes('resource')) ||
        (normProduct.includes('pure') && rowProduct.includes('pure'));

      const matchesSub =
        rowSub === normSub ||
        rowSub.replaceAll(/[\s_-]+/g, '') === normSub.replaceAll(/[\s_-]+/g, '');

      return matchesProduct && matchesSub;
    }) || null
  );
};

/** Get Teams configuration records for a center */
export const getCenterTeamsConfig = (centerId) => {
  const key = `${TEAMS_CONFIG_PREFIX}${centerId || 'default'}`;
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to get teams config:', error);
    }
  }
  return [];
};

/** Save Teams configuration records for a center */
export const saveCenterTeamsConfig = (centerId, rows) => {
  const key = `${TEAMS_CONFIG_PREFIX}${centerId || 'default'}`;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(rows));
    } catch (error) {
      console.error('Failed to save teams config:', error);
    }
  }
};

/** Get max member limit for a specific role in a center */
export const getRoleMaxLimit = (centerId, roleName) => {
  if (!roleName) return null;
  const rows = getCenterTeamsConfig(centerId);
  const normRole = String(roleName).trim().toLowerCase();
  const found = rows.find(
    (r) =>
      String(r.role || '')
        .trim()
        .toLowerCase() === normRole,
  );
  return found?.memberMax ? Number(found.memberMax) : null;
};

/** Count currently assigned members for a specific role across team lists */
export const getRoleCurrentCount = (roleName, coreTeam = [], supportTeam = []) => {
  if (!roleName) return 0;
  const normRole = String(roleName).trim().toLowerCase();

  const flatten = (arr) => {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'object') {
      const items = arr.data ?? arr.results ?? arr;
      if (Array.isArray(items)) return items;
      if (items && typeof items === 'object') {
        return Object.values(items).flatMap((v) => (Array.isArray(v) ? v : []));
      }
    }
    return [];
  };

  const allRows = [...flatten(coreTeam), ...flatten(supportTeam)];
  const seen = new Set();
  let count = 0;

  for (const m of allRows) {
    if (!m) continue;
    const mRole = String(m.role || m.custom_role || m.role_name || m.designation || '')
      .trim()
      .toLowerCase();

    const isMatch =
      mRole === normRole ||
      (normRole.includes('crm') && mRole.includes('crm')) ||
      (normRole.length > 3 && mRole === normRole) ||
      (mRole.length > 3 && normRole.includes(mRole));

    if (isMatch) {
      const id = m.team_member_id ?? m.employee_id ?? m.name ?? m.email ?? JSON.stringify(m);
      if (!seen.has(id)) {
        seen.add(id);
        count++;
      }
    }
  }

  return count;
};

/** Check if adding one more team member to role exceeds the max member limit */
export const isRoleMaxLimitReached = (centerId, roleName, coreTeam = [], supportTeam = []) => {
  const maxLimit = getRoleMaxLimit(centerId, roleName);
  if (maxLimit === null || maxLimit === undefined) return false;
  const currentCount = getRoleCurrentCount(roleName, coreTeam, supportTeam);
  return currentCount >= maxLimit;
};
