export const EMPTY_STATES = {
  default: {
    title: 'No users yet',
    description: 'Add your first user to get started.',
  },
  search: {
    title: 'No users found',
    description: 'Try adjusting your search or filters.',
  },
};

/**
 * Roles & Permissions (hardcoded matrix used by `src/pages/profile/roles-permission-profile.jsx`)
 * Intentionally static: API returns extra/unwanted data for this screen.
 */
export const USER_TYPES = [
  {
    name: 'Super Admin',
    description:
      'Full access across all centres, clients, data, and configurations. Can create, modify, or revoke anything.',
  },
  {
    name: 'Admin',
    description:
      'Manages users, roles, modules, and high-level settings—authority without ownership of the platform itself.',
  },
  {
    name: 'Sub Admin',
    description:
      'Manages users, roles, modules, and high-level settings—authority without ownership of the platform itself (They cannot delete primary items).',
  },
  {
    name: 'Client Admin',
    description:
      'Manages client users, views usage, raises requests, and oversees client-side operations and permissions.',
  },
  {
    name: 'Client User',
    description:
      'Can view assigned spaces, make requests or bookings, and track tickets within the allowed scope.',
  },
  {
    name: 'Facility Manager',
    description:
      'Handles maintenance, vendors, assets, services, and day-to-day facility operations.',
  },
  {
    name: 'Finance Manager',
    description: 'Manages invoicing, billing, collections, financial reports, and cost tracking.',
  },
  {
    name: 'Vendor Admin',
    description:
      'Handles assignments, service tickets, compliance documents, and vendor-side operations.',
  },
  {
    name: 'Zone Manager',
    description:
      'Monitors performance, escalates issues, and ensures consistency across centres under their jurisdiction.',
  },
  {
    name: 'MST',
    description:
      'Oversees the entire operation of the facility or hub where the technician performs maintenance tasks.',
  },
  {
    name: 'Booking Manager',
    description:
      'Manages bookings, availability, conflicts, approvals, and utilisation of spaces and resources.',
  },
];

// Fixed module order to match the provided reference.
export const MODULES = [
  { id: 'Center Management', label: 'Center Management' },
  { id: 'Client Management', label: 'Client Management' },
  { id: 'Spaces and Inventory', label: 'Spaces and Inventory' },
  { id: 'Facility Booking', label: 'Facility Booking' },
  { id: 'Visitor Management System', label: 'Visitor Management System' },
  { id: 'Invoice & Billing', label: 'Invoice & Billing' },
  { id: 'Collections', label: 'Collections' },
  { id: 'Ticket Management', label: 'Tickets' },
  { id: 'Vendor Management', label: 'Vendor Management' },
  { id: 'Settings (Profile)', label: 'Settings (Profile)' },
  { id: 'Settings (Roles & Permission)', label: 'Settings (Roles & Permission)' },
  { id: 'Settings (Clients Tasks)', label: 'Settings (Clients Tasks)' },
  { id: 'Landload Management', label: 'Landload Management' },
];

export const PERM = {
  NONE: { view: false, create: false, edit: false, delete: false },
  VIEW: { view: true, create: false, edit: false, delete: false },
  VIEW_EDIT: { view: true, create: false, edit: true, delete: false }, // 👁 + (+ Update)
  FULL: { view: true, create: true, edit: true, delete: true },
  NO_DELETE: { view: true, create: true, edit: true, delete: false }, // ✅ + (❌ Delete)
};

// role -> module -> { view, create, edit, delete }
export const ROLE_MODULE_PERMISSIONS = {
  // Same permissions as Admin
  'Super Admin': {},
  Admin: {
    'Center Management': PERM.FULL,
    'Client Management': PERM.FULL,
    'Spaces and Inventory': PERM.FULL,
    'Facility Booking': PERM.FULL,
    'Visitor Management System': PERM.FULL,
    'Invoice & Billing': PERM.FULL,
    Collections: PERM.FULL,
    'Ticket Management': PERM.FULL,
    'Vendor Management': { ...PERM.NO_DELETE },
    // Settings: Admin has full permissions
    'Settings (Profile)': PERM.FULL,
    'Settings (Roles & Permission)': PERM.FULL,
    'Settings (Clients Tasks)': PERM.FULL,
    'Landload Management': PERM.FULL,
  },
  'Facility Manager': {
    'Center Management': PERM.VIEW,
    'Client Management': PERM.FULL,
    'Spaces and Inventory': PERM.NONE,
    'Facility Booking': { ...PERM.FULL },
    'Visitor Management System': { ...PERM.NO_DELETE },
    'Invoice & Billing': { ...PERM.FULL },
    Collections: PERM.VIEW,
    'Ticket Management': { ...PERM.NO_DELETE },
    'Vendor Management': PERM.VIEW,
    'Settings (Profile)': { ...PERM.VIEW },
    'Settings (Roles & Permission)': PERM.NONE,
    // Settings rule: view-only for non-admin (even if screenshot shows ✅ for some)
    'Settings (Clients Tasks)': PERM.VIEW,
    'Landload Management': PERM.NONE,
  },
  'Accounts Manager': {
    'Center Management': PERM.VIEW,
    'Client Management': { ...PERM.VIEW_EDIT },
    'Spaces and Inventory': PERM.NONE,
    'Facility Booking': { ...PERM.VIEW_EDIT },
    'Visitor Management System': PERM.NONE,
    'Invoice & Billing': PERM.VIEW,
    Collections: PERM.VIEW,
    'Ticket Management': PERM.NONE,
    'Vendor Management': PERM.NONE,
    'Settings (Profile)': { ...PERM.VIEW },
    'Settings (Roles & Permission)': PERM.NONE,
    'Settings (Clients Tasks)': PERM.NONE,
    'Landload Management': PERM.VIEW,
  },
  'Client (Dedicated Login)': {
    'Center Management': { ...PERM.VIEW },
    'Client Management': { ...PERM.NONE },
    'Spaces and Inventory': PERM.NONE,
    'Facility Booking': PERM.FULL,
    'Visitor Management System': PERM.FULL,
    'Invoice & Billing': PERM.VIEW,
    Collections: PERM.NONE,
    'Ticket Management': PERM.FULL,
    'Vendor Management': PERM.NONE,
    'Settings (Profile)': { ...PERM.VIEW },
    'Settings (Roles & Permission)': PERM.NONE,
    'Settings (Clients Tasks)': PERM.NONE,
    'Landload Management': PERM.NONE,
  },
  'Vendors/Staffs (Dedicated Login)': {
    'Center Management': { ...PERM.VIEW },
    'Client Management': PERM.NONE,
    'Spaces and Inventory': PERM.NONE,
    'Facility Booking': PERM.NONE,
    'Visitor Management System': PERM.FULL,
    'Invoice & Billing': { ...PERM.FULL },
    Collections: PERM.NONE,
    'Ticket Management': PERM.FULL,
    'Vendor Management': PERM.NONE,
    'Settings (Profile)': { ...PERM.VIEW },
    'Settings (Roles & Permission)': PERM.NONE,
    'Settings (Clients Tasks)': PERM.NONE,
    'Landload Management': PERM.NONE,
  },
};

// Ensure Super Admin mirrors Admin exactly.
ROLE_MODULE_PERMISSIONS['Super Admin'] = ROLE_MODULE_PERMISSIONS.Admin;
