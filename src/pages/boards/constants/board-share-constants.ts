export const BOARD_PERMISSION_LEVELS = [
  { value: 'full_access', label: 'Full Access' },
  { value: 'can_edit', label: 'Can Edit' },
  { value: 'can_comment', label: 'Can Comment' },
  { value: 'view_only', label: 'View Only' },
];

export const BOARD_PERMISSION_NO_ACCESS = {
  value: 'no_access',
  label: 'Remove Access',
};

export const BOARD_PERMISSION_REMOVE = BOARD_PERMISSION_NO_ACCESS;

const PERMISSION_ALIASES = {
  full_edit: 'full_access',
};

export function normalizePermissionLevel(level) {
  if (!level) {
    return 'full_access';
  }
  return PERMISSION_ALIASES[level] ?? level;
}

export function getPermissionLabel(level) {
  const normalized = normalizePermissionLevel(level);

  if (normalized === BOARD_PERMISSION_NO_ACCESS.value) {
    return BOARD_PERMISSION_NO_ACCESS.label;
  }

  return (
    BOARD_PERMISSION_LEVELS.find((option) => option.value === normalized)?.label ?? 'Full Access'
  );
}

export function getResourceTypeLabel(resourceType) {
  if (resourceType === 'folder') {
    return 'folder';
  }

  if (resourceType === 'list') {
    return 'list';
  }

  return 'board';
}

export function resolveSharingResource(item) {
  if (!item?.id) {
    return null;
  }

  const rawType = item.type === 'board' ? 'space' : item.type;

  if (!['space', 'folder', 'list'].includes(rawType)) {
    return null;
  }

  return {
    resourceType: rawType,
    resourceId: item.id,
    spaceId: rawType === 'space' ? item.id : (item.spaceId ?? null),
    label: item.label ?? '',
    typeLabel: getResourceTypeLabel(rawType),
  };
}

export function resolveBoardSpaceId(item) {
  const resource = resolveSharingResource(item);
  return resource?.spaceId ?? null;
}

export function buildBoardShareLink(resourceType, resourceId, spaceId) {
  if (!spaceId || typeof window === 'undefined') {
    return '';
  }

  const base = `${window.location.origin}/boards/space/${spaceId}`;

  if (resourceType === 'folder') {
    return `${base}?folder=${resourceId}`;
  }

  if (resourceType === 'list') {
    return `${base}?list=${resourceId}`;
  }

  return base;
}

export function getResourceAccessDescription(sharing) {
  if (!sharing) {
    return '';
  }

  const typeLabel = getResourceTypeLabel(sharing.resource_type ?? 'space');
  const parent = sharing.parent;
  const boardRoles = sharing.board_roles ?? [];

  if (sharing.inherits_from_parent) {
    if (parent?.is_restricted || !sharing.can_make_public) {
      const roleText =
        boardRoles.length > 0
          ? ` Roles from board: ${boardRoles.join(', ')}.`
          : parent?.shared_roles?.length
            ? ` Roles from parent: ${parent.shared_roles.join(', ')}.`
            : '';

      return `This ${typeLabel} inherits restricted access from ${parent?.title ?? 'its parent'}.${roleText} Use "Customize access" to narrow permissions further.`;
    }

    return `This ${typeLabel} inherits open access from its parent. Customize access to restrict it further.`;
  }

  if (sharing.is_effective_public ?? sharing.is_public) {
    const permissionLabel = getPermissionLabel(sharing.default_permission ?? 'full_access');
    return `This ${typeLabel} is public. Users with parent access have ${permissionLabel.toLowerCase()} permission.`;
  }

  const roles = sharing.shared_roles ?? [];
  if (roles.length > 0) {
    return `This ${typeLabel} is private. Access is limited to you and users in: ${roles.join(', ')}.`;
  }

  const memberCount = (sharing.members ?? []).filter((member) => !member.is_owner).length;
  if (memberCount > 0) {
    return `This ${typeLabel} is private and visible to you and invited members from the parent board.`;
  }

  return `This ${typeLabel} is private and only visible to you.`;
}

export const getBoardAccessDescription = getResourceAccessDescription;

export function canPerformBoardAction(permissions, action) {
  if (!permissions) {
    return false;
  }

  const actionMap = {
    view: 'can_view',
    comment: 'can_comment',
    edit: 'can_edit',
    create: 'can_create',
    delete: 'can_delete',
    manage_sharing: 'can_manage_sharing',
  };

  return Boolean(permissions[actionMap[action]]);
}
