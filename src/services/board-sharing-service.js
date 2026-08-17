import apiClient from '@/api/axios';
import { extractErrorMessage, getFrappeResponseError } from '@/utils/error-utils';

const SHARING_API = '/method/devx_tasks.devx_tasks.apis.sharing';

function buildSharingPayload(resourceType, resourceId, extra = {}) {
  return {
    resource_type: resourceType,
    resource_id: resourceId,
    ...extra,
  };
}

export async function getResourceSharing(resourceType, resourceId, { role = null } = {}) {
  if (!resourceType || !resourceId) {
    return { error: 'Resource not found.' };
  }

  try {
    const response = await apiClient.get(`${SHARING_API}.get_sharing`, {
      params: buildSharingPayload(resourceType, resourceId, role ? { role } : {}),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to load sharing settings.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to load sharing settings.'),
    };
  }
}

export async function updateResourceMemberPermission(
  resourceType,
  resourceId,
  user,
  permissionLevel,
) {
  try {
    const response = await apiClient.put(`${SHARING_API}.update_member_permission`, {
      ...buildSharingPayload(resourceType, resourceId),
      user,
      permission_level: permissionLevel,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update permission.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update permission.'),
    };
  }
}

export async function inviteResourceMembers(
  resourceType,
  resourceId,
  { users = [], role = null, permissionLevel = 'full_access' } = {},
) {
  try {
    const response = await apiClient.post(`${SHARING_API}.invite_members`, {
      ...buildSharingPayload(resourceType, resourceId),
      users: JSON.stringify(users),
      role,
      permission_level: permissionLevel,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to invite members.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to invite members.'),
    };
  }
}

export async function removeResourceMember(resourceType, resourceId, user) {
  try {
    const response = await apiClient.delete(`${SHARING_API}.remove_member`, {
      data: {
        ...buildSharingPayload(resourceType, resourceId),
        user,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to remove member.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to remove member.'),
    };
  }
}

export async function updateResourceDefaultPermission(resourceType, resourceId, permissionLevel) {
  try {
    const response = await apiClient.put(`${SHARING_API}.update_default_permission`, {
      ...buildSharingPayload(resourceType, resourceId),
      permission_level: permissionLevel,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update default permission.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update default permission.'),
    };
  }
}

export async function toggleResourceVisibility(resourceType, resourceId) {
  try {
    const response = await apiClient.put(`${SHARING_API}.toggle_visibility`, {
      ...buildSharingPayload(resourceType, resourceId),
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to update visibility.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to update visibility.'),
    };
  }
}

export async function attachResourceRole(resourceType, resourceId, role) {
  try {
    const response = await apiClient.post(`${SHARING_API}.attach_role`, {
      ...buildSharingPayload(resourceType, resourceId),
      role,
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to attach role.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to attach role.'),
    };
  }
}

export async function detachResourceRole(resourceType, resourceId, role) {
  try {
    const response = await apiClient.delete(`${SHARING_API}.detach_role`, {
      data: {
        ...buildSharingPayload(resourceType, resourceId),
        role,
      },
    });

    const result = response.data;
    const responseError = getFrappeResponseError(result, 'Failed to detach role.');

    if (responseError) {
      return { error: responseError };
    }

    return { data: result?.message ?? null };
  } catch (error) {
    return {
      error: extractErrorMessage(error.serialized || error, 'Failed to detach role.'),
    };
  }
}

// Backward-compatible board helpers
export const getBoardSharing = (spaceId, options) => getResourceSharing('space', spaceId, options);

export const updateBoardMemberPermission = (spaceId, user, permissionLevel) =>
  updateResourceMemberPermission('space', spaceId, user, permissionLevel);

export const inviteBoardMembers = (spaceId, options) =>
  inviteResourceMembers('space', spaceId, options);

export const removeBoardMember = (spaceId, user) => removeResourceMember('space', spaceId, user);

export const updateBoardDefaultPermission = (spaceId, permissionLevel) =>
  updateResourceDefaultPermission('space', spaceId, permissionLevel);

export const toggleBoardVisibility = (spaceId) => toggleResourceVisibility('space', spaceId);

export const attachBoardRole = (spaceId, role) => attachResourceRole('space', spaceId, role);

export const detachBoardRole = (spaceId, role) => detachResourceRole('space', spaceId, role);
