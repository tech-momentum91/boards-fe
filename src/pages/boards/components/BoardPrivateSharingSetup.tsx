import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import { getRolesWithDescription } from '@/redux/settingSlice';
import BoardInviteInput from './BoardInviteInput';

function mapInviteQueryToUser(query) {
  return {
    value: query,
    name: query,
    email: query,
    full_name: query,
    label: query,
    image: null,
  };
}

export default function BoardPrivateSharingSetup({
  attachedRoles = [],
  onAttachedRolesChange,
  invitedUsers = [],
  onInvitedUsersChange,
  disabled = false,
}) {
  const dispatch = useDispatch();
  const [roles, setRoles] = useState([]);
  const [roleToAttach, setRoleToAttach] = useState('');

  useEffect(() => {
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
  }, [dispatch]);

  const availableRoles = useMemo(() => {
    const attached = new Set(attachedRoles);
    return roles.filter((role) => !attached.has(role.name));
  }, [attachedRoles, roles]);

  const selectedInviteUsers = useMemo(
    () => invitedUsers.map((query) => mapInviteQueryToUser(query)),
    [invitedUsers],
  );

  const handleAttachRole = () => {
    if (!roleToAttach || attachedRoles.includes(roleToAttach)) {
      return;
    }

    onAttachedRolesChange?.([...attachedRoles, roleToAttach]);
    setRoleToAttach('');
  };

  const handleDetachRole = (roleName) => {
    onAttachedRolesChange?.(attachedRoles.filter((role) => role !== roleName));
  };

  const handleSelectedChange = (users) => {
    onInvitedUsersChange?.(users.map((user) => user.value || user.name || user.email));
  };

  return (
    <div className='flex flex-col gap-4'>
      <BoardInviteInput
        value={selectedInviteUsers}
        onChange={handleSelectedChange}
        excludeUserIds={invitedUsers}
        disabled={disabled}
      />

      <div className='flex flex-col gap-3'>
        <span className='text-subheading-xs uppercase text-text-soft-400'>Attached roles</span>

        {attachedRoles.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {attachedRoles.map((roleName) => (
              <span
                key={roleName}
                className='inline-flex items-center gap-1 rounded-full border border-stroke-soft-200 bg-bg-weak-50 py-1 pl-2.5 pr-1 text-sm text-text-sub-600'
              >
                {roleName}
                <button
                  type='button'
                  onClick={() => handleDetachRole(roleName)}
                  disabled={disabled}
                  className='flex size-5 items-center justify-center rounded-full text-icon-sub-500 transition-colors hover:bg-bg-white-0'
                  aria-label={`Remove ${roleName}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className='text-sm text-text-soft-400'>
            Attach a role to give all users in that role access to this board.
          </p>
        )}

        <div className='flex items-center gap-2'>
          <Select.Root
            value={roleToAttach || '__none__'}
            onValueChange={(value) => setRoleToAttach(value === '__none__' ? '' : value)}
            disabled={disabled}
            size='small'
          >
            <Select.Trigger className='flex-1'>
              <Select.Value placeholder='Select a role to attach' />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value='__none__'>Select a role</Select.Item>
              {availableRoles.map((role) => (
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
            disabled={disabled || !roleToAttach}
            onClick={handleAttachRole}
          >
            Attach
          </Button.Root>
        </div>
      </div>
    </div>
  );
}
