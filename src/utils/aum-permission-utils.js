import { getModulePermissions, hasModulePermission } from '@/utils/user-role-utils';

/** ERPNext doctypes that gate AUM features in role permissions. */
export const AUM_PERMISSION_MODULE_NAMES = [
  'Asset In',
  'Asset Out',
  'Asset',
  'Asset Maintenance Log',
];

/**
 * True when the user can open AUM routes — matches sidebar visibility and role modules.
 * Sidebar uses the "AUM" key; role permissions use Asset In/Out/etc. (not "AUM").
 */
export function hasAumPageAccess(userSideBarPerm) {
  const sidebar = userSideBarPerm?.data?.message?.sidebar;
  if (sidebar && Object.prototype.hasOwnProperty.call(sidebar, 'AUM')) {
    return true;
  }

  return AUM_PERMISSION_MODULE_NAMES.some((moduleName) =>
    hasModulePermission(userSideBarPerm, moduleName, 'read'),
  );
}

/** Permissions object for guards; non-null when {@link hasAumPageAccess} is true. */
export function getAumModulePermissions(userSideBarPerm) {
  if (!hasAumPageAccess(userSideBarPerm)) {
    return null;
  }

  for (const moduleName of AUM_PERMISSION_MODULE_NAMES) {
    const permissions = getModulePermissions(userSideBarPerm, moduleName);
    if (permissions?.read) {
      return permissions;
    }
  }

  return {
    read: true,
    write: false,
    create: false,
    delete: false,
    export: false,
    import: false,
  };
}
