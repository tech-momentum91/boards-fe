export const ROLE_KEYS = {
  SUPER_ADMIN: 'super_admin',
  FACILITY_MANAGER: 'facility_manager',
  CLIENT_ADMIN: 'client_admin',
  CLIENT_USER: 'client_user',
  VENDOR_ADMIN: 'vendor_admin',
  ADMIN: 'admin',
};

export const ROLE_KEYS_SETTINGS = {
  SUPER_ADMIN: 'Super Admin',
  FACILITY_MANAGER: 'Facility Manager',
  CLIENT_ADMIN: 'Client Admin',
  CLIENT_USER: 'Client User',
  VENDOR_ADMIN: 'Vendor Admin',
  ADMIN: 'Admin',
};

// Normalize roles input to an array of normalized role keys
const normalizeRoles = (rolesInput) => {
  if (!rolesInput) return [];

  const rawRoles = Array.isArray(rolesInput)
    ? rolesInput
    : typeof rolesInput === 'object'
      ? Object.keys(rolesInput)
      : [rolesInput];

  return rawRoles
    .filter(Boolean)
    .map((role) => role.toString().trim().toLowerCase().replaceAll(/\s+/g, '_'));
};

// Accepts an array of role identifiers, a single role string, or a role map object
// and returns true when the user is a client (admin/user).
export const isClient = (rolesInput) => {
  const normalizedRoles = normalizeRoles(rolesInput);

  return (
    normalizedRoles.includes(ROLE_KEYS.CLIENT_USER) ||
    normalizedRoles.includes(ROLE_KEYS.CLIENT_ADMIN)
  );
};

export const isClientAdmin = (rolesInput) => {
  const normalizedRoles = normalizeRoles(rolesInput);
  return normalizedRoles.includes(ROLE_KEYS.CLIENT_ADMIN);
};

export const isClientUser = (rolesInput) => {
  const normalizedRoles = normalizeRoles(rolesInput);
  return normalizedRoles.includes(ROLE_KEYS.CLIENT_USER);
};

// Returns true when the user is a Facility Manager
export const isFacilityManager = (rolesInput) => {
  const normalizedRoles = normalizeRoles(rolesInput);
  return normalizedRoles.includes(ROLE_KEYS.FACILITY_MANAGER);
};

export const EDIT_USER_ROLES = [
  'Facility Manager',
  'Client User',
  'Vendor',
  'Admin',
  'Client Admin',
  'Super Admin',
];

export const ZONE_OPTIONS = [
  { value: 'Zone 1', label: 'Zone 1' },
  { value: 'Zone 2', label: 'Zone 2' },
  { value: 'Zone 3', label: 'Zone 3' },
  { value: 'Zone 4', label: 'Zone 4' },
  { value: 'Zone 5', label: 'Zone 5' },
  { value: 'Zone 6', label: 'Zone 6' },
];

/** Roles that require CRM pipeline assignment on create/edit user. */
export const PIPELINE_REQUIRED_ROLES = ['Sales', 'Inside Sales', 'Marketing'];

/** True when role needs a mandatory pipelines multi-select. */
export const roleRequiresPipelines = (roleName) => {
  const normalized = String(roleName || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return PIPELINE_REQUIRED_ROLES.some((r) => r.toLowerCase() === normalized);
};

/** Settings → Users profile sub-tabs (URL `?tab=`). */
export const USER_SUB_TABS = [
  { id: 'all', label: 'All Users' },
  { id: 'core_team', label: 'Core Team' },
  { id: 'others', label: 'Others' },
];

export const VALID_USER_SUB_TAB_IDS = new Set(USER_SUB_TABS.map((t) => t.id));
