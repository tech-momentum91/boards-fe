import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Lock, LockOpen, X } from 'lucide-react';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
import { getRolesWithDescription } from '@/redux/settingSlice';
import {
  attachResourceRole,
  detachResourceRole,
  getResourceSharing,
  inviteResourceMembers,
  removeResourceMember,
  toggleResourceVisibility,
  updateResourceDefaultPermission,
  updateResourceMemberPermission,
} from '@/services/board-sharing-service';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  BOARD_PERMISSION_LEVELS,
  BOARD_PERMISSION_NO_ACCESS,
  buildBoardShareLink,
  getResourceAccessDescription,
  getPermissionLabel,
  resolveSharingResource,
} from '../constants/board-share-constants';
import { BoardDefaultPermissionRow } from '../components/BoardAccessFieldRows';
import BoardInviteInput from '../components/BoardInviteInput';
import CopyLinkButton from '../components/CopyLinkButton';

function PermissionSelect({ value, disabled, onChange, isUpdating, options }) {
  const permissionOptions = options?.length
    ? options.filter((option) => option.value !== 'no_access')
    : BOARD_PERMISSION_LEVELS;
  const dropdownOptions = [...permissionOptions, BOARD_PERMISSION_NO_ACCESS];

  return (
    <Select.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled || isUpdating}
      size='small'
      variant='compact'
    >
      <Select.Trigger className='h-8 min-w-[112px] shrink-0 rounded-lg px-2.5'>
        <Select.Value placeholder='Full Edit' />
      </Select.Trigger>
      <Select.Content align='end' className='min-w-[160px]'>
        {dropdownOptions.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            <span className='whitespace-nowrap'>{option.label}</span>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function ShareMemberRow({
  member,
  onPermissionChange,
  onRemove,
  updatingUserId,
  permissionOptions,
}) {
  const isOwner = Boolean(member.is_owner);
  const permissionLevel = member.has_access
    ? (member.permission_level ?? 'full_access')
    : BOARD_PERMISSION_NO_ACCESS.value;
  const isUpdating = updatingUserId === member.user;

  return (
    <div className='group/member flex w-full items-center gap-3'>
      <div className='relative size-6 shrink-0'>
        <CrmAccountAvatar
          name={member.full_name || member.user}
          image={member.user_image}
          size={24}
        />
        {!isOwner ? (
          <button
            type='button'
            aria-label={`Remove ${member.full_name || member.user}`}
            disabled={isUpdating}
            onClick={() => onRemove?.(member)}
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full bg-black/45',
              'opacity-0 transition-opacity duration-200 group-hover/member:opacity-100',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-error-base focus:ring-offset-1',
              isUpdating && 'cursor-not-allowed opacity-100',
            )}
          >
            <X size={14} className='text-white' strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <span className='truncate text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
          {member.full_name || member.user}
        </span>
        {isOwner ? (
          <span className='shrink-0 rounded-full bg-information-lighter px-2 py-0.5 text-subheading-2xs uppercase text-information-base'>
            Owner
          </span>
        ) : member.access_source === 'role' ? (
          <span className='shrink-0 rounded-full bg-bg-weak-50 px-2 py-0.5 text-subheading-2xs uppercase text-text-soft-400'>
            Via role
          </span>
        ) : null}
      </div>

      <PermissionSelect
        value={permissionLevel}
        disabled={isOwner || !onPermissionChange}
        isUpdating={isUpdating}
        options={permissionOptions}
        onChange={(nextValue) => onPermissionChange?.(member, nextValue)}
      />
    </div>
  );
}

export default function BoardShareModal({ board, onClose, onUpdated }) {
  const dispatch = useDispatch();
  const sharingResource = resolveSharingResource(board);
  const resourceType = sharingResource?.resourceType ?? null;
  const resourceId = sharingResource?.resourceId ?? null;
  const spaceId = sharingResource?.spaceId ?? null;
  const resourceLabel = sharingResource?.label ?? 'Board';
  const typeLabel = sharingResource?.typeLabel ?? 'board';

  const [sharing, setSharing] = useState(null);
  const [roles, setRoles] = useState([]);
  const [roleToAttach, setRoleToAttach] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isAttachingRole, setIsAttachingRole] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [isUpdatingDefaultPermission, setIsUpdatingDefaultPermission] = useState(false);
  const [error, setError] = useState(null);

  const refreshSharing = useCallback(
    async (role = selectedRole) => {
      if (!resourceType || !resourceId) {
        return null;
      }

      const result = await getResourceSharing(resourceType, resourceId, { role: role || null });
      if (result.error) {
        showErrorToast(result.error);
        return null;
      }

      setSharing(result.data);
      return result.data;
    },
    [resourceId, resourceType, selectedRole],
  );

  const notifyUpdated = useCallback(async () => {
    await refreshSharing();
    onUpdated?.();
  }, [onUpdated, refreshSharing]);

  const loadSharing = useCallback(async () => {
    if (!resourceType || !resourceId) {
      setError('Sharing is not available for this item.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await getResourceSharing(resourceType, resourceId);

    if (result.error) {
      setError(result.error);
      setSharing(null);
    } else {
      setSharing(result.data);
    }

    setIsLoading(false);
  }, [resourceId, resourceType]);

  useEffect(() => {
    loadSharing();
  }, [loadSharing]);

  const attachedRoles = useMemo(() => sharing?.shared_roles ?? [], [sharing?.shared_roles]);
  const allowedRoleNames = useMemo(() => sharing?.allowed_roles ?? [], [sharing?.allowed_roles]);
  const isPublic = Boolean(sharing?.is_effective_public ?? sharing?.is_public);
  const inheritsFromParent = Boolean(sharing?.inherits_from_parent);
  const canMakePublic = sharing?.can_make_public !== false;
  const canAttachRoles = sharing?.can_attach_roles !== false;
  const isBoardLevel = resourceType === 'space';
  const permissionOptions = sharing?.permission_options ?? null;
  const hasAttachedRoles = attachedRoles.length > 0;
  const showInviteInput = !inheritsFromParent && !hasAttachedRoles;
  const showCustomizeAccess = inheritsFromParent && !sharing?.is_private;

  useEffect(() => {
    if (isPublic && !inheritsFromParent) {
      setSelectedRole('');
      setRoleToAttach('');
    }
  }, [inheritsFromParent, isPublic]);

  useEffect(() => {
    if (!isBoardLevel || (isPublic && !inheritsFromParent)) {
      return undefined;
    }

    let cancelled = false;

    const fetchRoles = async () => {
      try {
        const response = await dispatch(getRolesWithDescription()).unwrap();
        const roleRows = Array.isArray(response?.message) ? response.message : [];
        if (!cancelled) {
          setRoles(roleRows);
        }
      } catch {
        if (!cancelled) {
          setRoles([]);
        }
      }
    };

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [dispatch, inheritsFromParent, isBoardLevel, isPublic]);

  const availableRolesToAttach = useMemo(() => {
    const attached = new Set(attachedRoles);

    if (isBoardLevel) {
      return roles.filter((role) => !attached.has(role.name));
    }

    return allowedRoleNames.filter((roleName) => !attached.has(roleName)).map((name) => ({ name }));
  }, [allowedRoleNames, attachedRoles, isBoardLevel, roles]);

  const displayedMembers = useMemo(() => {
    if (!sharing) {
      return [];
    }

    if (selectedRole) {
      return sharing.role_members ?? [];
    }

    return sharing.members ?? [];
  }, [sharing, selectedRole]);

  const excludedInviteUserIds = useMemo(() => {
    const memberIds = (sharing?.members ?? []).map((member) => member.user).filter(Boolean);
    const roleMemberIds = (sharing?.role_members ?? [])
      .map((member) => member.user)
      .filter(Boolean);

    return [...new Set([...memberIds, ...roleMemberIds])];
  }, [sharing?.members, sharing?.role_members]);

  const handleInvite = async (userIds) => {
    if (!userIds?.length) {
      return false;
    }

    setIsInviting(true);

    const result = await inviteResourceMembers(resourceType, resourceId, {
      users: userIds,
      permissionLevel: 'full_access',
    });

    setIsInviting(false);

    if (result.error) {
      showErrorToast(result.error);
      return false;
    }

    await notifyUpdated();
    showSuccessToast(
      userIds.length === 1 ? 'Member invited successfully.' : `${userIds.length} members invited.`,
    );
    return true;
  };

  const handleAttachRole = async () => {
    if (!roleToAttach) {
      return;
    }

    setIsAttachingRole(true);

    const result = await attachResourceRole(resourceType, resourceId, roleToAttach);
    setIsAttachingRole(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    setRoleToAttach('');
    setSelectedRole(roleToAttach);
    setSharing(result.data);
    onUpdated?.();
    showSuccessToast(
      `Role "${roleToAttach}" attached. Users in this role can now see this ${typeLabel}.`,
    );
  };

  const handleDetachRole = async (roleName) => {
    const result = await detachResourceRole(resourceType, resourceId, roleName);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    if (selectedRole === roleName) {
      setSelectedRole('');
    }

    setSharing(result.data);
    onUpdated?.();
    showSuccessToast(`Role "${roleName}" removed from this ${typeLabel}.`);
  };

  const handleRemoveMember = async (member) => {
    if (!member?.user || member.is_owner) {
      return;
    }

    setUpdatingUserId(member.user);

    const result = await removeResourceMember(resourceType, resourceId, member.user);
    setUpdatingUserId(null);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    await notifyUpdated();
    showSuccessToast(`User removed from this ${typeLabel}.`);
  };

  const handlePermissionChange = async (member, nextValue) => {
    if (!member?.user || member.is_owner) {
      return;
    }

    setUpdatingUserId(member.user);

    if (nextValue === BOARD_PERMISSION_NO_ACCESS.value) {
      const result = await removeResourceMember(resourceType, resourceId, member.user);
      setUpdatingUserId(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      await notifyUpdated();
      return;
    }

    const result = await updateResourceMemberPermission(
      resourceType,
      resourceId,
      member.user,
      nextValue,
    );
    setUpdatingUserId(null);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    await notifyUpdated();
    showSuccessToast(`Permission updated to ${getPermissionLabel(nextValue)}.`);
  };

  const handleToggleVisibility = async () => {
    setIsTogglingVisibility(true);

    const result = await toggleResourceVisibility(resourceType, resourceId);
    setIsTogglingVisibility(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    const data = await refreshSharing();
    onUpdated?.();
    showSuccessToast(
      (data?.is_effective_public ?? data?.is_public)
        ? `${resourceLabel} is now public.`
        : `${resourceLabel} access customized.`,
    );
  };

  const handleDefaultPermissionChange = async (permissionLevel) => {
    setIsUpdatingDefaultPermission(true);

    const result = await updateResourceDefaultPermission(resourceType, resourceId, permissionLevel);
    setIsUpdatingDefaultPermission(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    setSharing(result.data);
    onUpdated?.();
    showSuccessToast(`Default permission updated to ${getPermissionLabel(permissionLevel)}.`);
  };

  const handleRoleViewChange = async (role) => {
    setSelectedRole(role);

    if (!resourceType || !resourceId) {
      return;
    }

    setIsLoading(true);
    const result = await getResourceSharing(resourceType, resourceId, { role: role || null });

    if (result.error) {
      showErrorToast(result.error);
      setIsLoading(false);
      return;
    }

    setSharing(result.data);
    setIsLoading(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      onClose?.();
    }
  };

  const accessDescription = getResourceAccessDescription(sharing);

  return (
    <Modal.Root open onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[480px] p-0' showClose={false}>
        <Modal.Description className='sr-only'>
          Manage sharing and permission settings for this {typeLabel}.
        </Modal.Description>

        <div className='flex items-center justify-between gap-3 border-b border-stroke-soft-200 px-5 py-4'>
          <Modal.Title className='text-base font-medium leading-6 tracking-[-0.176px] text-text-main-900'>
            Share &apos;{sharing?.title || resourceLabel}&apos; {typeLabel}
          </Modal.Title>

          <div className='flex items-center gap-3'>
            <CopyLinkButton
              link={() => buildBoardShareLink(resourceType, resourceId, spaceId)}
              disabled={!resourceId}
              successMessage={`${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} link copied to clipboard.`}
            />

            <button
              type='button'
              onClick={onClose}
              className='flex size-6 items-center justify-center rounded-md text-icon-sub-500 transition-colors hover:bg-bg-weak-50'
              aria-label='Close'
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <Modal.Body className='space-y-4 px-5 py-4'>
          {error ? (
            <div className='rounded-lg bg-error-lighter px-3 py-2 text-paragraph-sm text-error-base'>
              {error}
            </div>
          ) : null}

          {accessDescription ? (
            <div
              className={cn(
                'rounded-lg px-3 py-2 text-paragraph-sm',
                isPublic && !inheritsFromParent
                  ? 'bg-success-lighter text-success-base'
                  : 'bg-bg-weak-50 text-text-sub-600',
              )}
            >
              {accessDescription}
            </div>
          ) : null}

          {isPublic && !inheritsFromParent ? (
            <BoardDefaultPermissionRow
              value={sharing?.default_permission ?? 'full_access'}
              onChange={handleDefaultPermissionChange}
              disabled={isUpdatingDefaultPermission || isLoading}
            />
          ) : (
            <>
              {showInviteInput ? (
                <BoardInviteInput
                  excludeUserIds={excludedInviteUserIds}
                  disabled={!resourceId}
                  isSubmitting={isInviting}
                  onInvite={handleInvite}
                />
              ) : null}

              {canAttachRoles || attachedRoles.length > 0 ? (
                <div className='flex flex-col gap-3'>
                  <span className='text-subheading-xs uppercase text-text-soft-400'>
                    {inheritsFromParent ? 'Roles from board' : 'Attached roles'}
                  </span>

                  {attachedRoles.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {attachedRoles.map((roleName) => (
                        <span
                          key={roleName}
                          className='inline-flex items-center gap-1 rounded-full border border-stroke-soft-200 bg-bg-weak-50 py-1 pl-2.5 pr-1 text-sm text-text-sub-600'
                        >
                          {roleName}
                          {!inheritsFromParent ? (
                            <button
                              type='button'
                              onClick={() => handleDetachRole(roleName)}
                              className='flex size-5 items-center justify-center rounded-full text-icon-sub-500 transition-colors hover:bg-bg-white-0'
                              aria-label={`Remove ${roleName}`}
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-text-soft-400'>
                      {isBoardLevel
                        ? `Attach a role to give all users in that role access to this ${typeLabel}.`
                        : 'No board roles are available. Attach roles on the board first.'}
                    </p>
                  )}

                  {!inheritsFromParent && availableRolesToAttach.length > 0 ? (
                    <div className='flex items-center gap-2'>
                      <Select.Root
                        value={roleToAttach || '__none__'}
                        onValueChange={(value) =>
                          setRoleToAttach(value === '__none__' ? '' : value)
                        }
                        size='small'
                      >
                        <Select.Trigger className='flex-1'>
                          <Select.Value placeholder='Select a role to attach' />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value='__none__'>Select a role</Select.Item>
                          {availableRolesToAttach.map((role) => (
                            <Select.Item key={role.name} value={role.name}>
                              {role.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>

                      <Button.Root
                        type='button'
                        variant='neutral'
                        mode='stroke'
                        size='small'
                        disabled={!roleToAttach || isAttachingRole}
                        onClick={handleAttachRole}
                      >
                        {isAttachingRole ? 'Attaching...' : 'Attach'}
                      </Button.Root>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-2'>
                  <span className='text-subheading-xs uppercase text-text-soft-400'>
                    Shared with
                  </span>

                  {attachedRoles.length > 0 ? (
                    <Select.Root
                      value={selectedRole || '__all__'}
                      onValueChange={(value) =>
                        handleRoleViewChange(value === '__all__' ? '' : value)
                      }
                      size='small'
                    >
                      <Select.Trigger>
                        <Select.Value placeholder='All shared members' />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value='__all__'>All shared members</Select.Item>
                        {attachedRoles.map((roleName) => (
                          <Select.Item key={roleName} value={roleName}>
                            {roleName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  ) : null}
                </div>

                {isLoading ? (
                  <div className='flex flex-col gap-3 py-2'>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className='h-8 animate-pulse rounded-lg bg-bg-weak-50' />
                    ))}
                  </div>
                ) : displayedMembers.length === 0 ? (
                  <p className='py-2 text-sm text-text-soft-400'>
                    {selectedRole
                      ? 'No users found for this role.'
                      : inheritsFromParent
                        ? 'No members inherited from the board.'
                        : 'Only you have access. Attach a role or invite someone above.'}
                  </p>
                ) : (
                  <div className='flex max-h-[280px] flex-col gap-4 overflow-y-auto pr-1'>
                    {displayedMembers.map((member) => (
                      <ShareMemberRow
                        key={member.user}
                        member={member}
                        updatingUserId={updatingUserId}
                        permissionOptions={permissionOptions}
                        onPermissionChange={inheritsFromParent ? undefined : handlePermissionChange}
                        onRemove={inheritsFromParent ? undefined : handleRemoveMember}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Modal.Body>

        <div className='border-t border-stroke-soft-200 px-5 py-4'>
          {showCustomizeAccess ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full justify-center gap-2'
              disabled={!resourceId || isTogglingVisibility}
              onClick={handleToggleVisibility}
            >
              <Lock size={18} />
              {isTogglingVisibility ? 'Updating...' : 'Customize access'}
            </Button.Root>
          ) : canMakePublic || !isPublic ? (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full justify-center gap-2'
              disabled={!resourceId || isTogglingVisibility || (!canMakePublic && !isPublic)}
              onClick={handleToggleVisibility}
            >
              {isPublic ? <Lock size={18} /> : <LockOpen size={18} />}
              {isTogglingVisibility
                ? 'Updating...'
                : isPublic
                  ? 'Make Private'
                  : canMakePublic
                    ? 'Make Public'
                    : 'Restricted by parent'}
            </Button.Root>
          ) : (
            <p className='text-center text-sm text-text-soft-400'>
              Access is restricted by the parent board and cannot be opened further.
            </p>
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
