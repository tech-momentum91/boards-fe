import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RiSearchLine, RiCheckLine } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';
import {
  normalizeAssigneeId,
  assigneeBelongsToSelectedCenters,
  isEventTaskAssigneeDisabled,
} from '@/components/event-management/event-task-assignee-utils';

function idsEqual(a, b) {
  const aa = [...(Array.isArray(a) ? a : [])].map(normalizeAssigneeId).filter(Boolean).sort();
  const bb = [...(Array.isArray(b) ? b : [])].map(normalizeAssigneeId).filter(Boolean).sort();
  return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
}

const rowClass = (selected) =>
  cn(
    'group/item relative cursor-pointer select-none rounded-lg p-2 text-paragraph-sm outline-none',
    'flex items-center gap-2 transition duration-200 ease-out',
    selected && 'bg-bg-weak-50',
  );

/**
 * Event Tasks assignee picker.
 * Roles = team options (CRM Team, Facility Team, Operation Head) with RiCheckLine.
 * Selecting a team toggles all selectable users in that primary-team group.
 * Disabled User accounts are never listed. When centers are selected, only users
 * belonging to those centers appear in the dropdown.
 */
const EventTaskAssigneeMultiSelect = ({
  value = [],
  onChange,
  onBlur,
  roleOptions = [],
  userOptions = [],
  roleGroups = [],
  userOptionsLoading = false,
  /** Center ids from the create drawer — empty = no selection filter yet */
  selectedCenterIds = [],
  disabled = false,
  readonly = false,
  placeholder = 'Select assignees',
  size = 'small',
  hasError = false,
  variant = 'stroke',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSelection, setDraftSelection] = useState([]);
  const valueWhenOpenedRef = useRef([]);
  const inputRef = useRef(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const valueIds = useMemo(() => {
    const array = Array.isArray(value) ? value : value ? [value] : [];
    return array.map(normalizeAssigneeId).filter(Boolean);
  }, [value]);

  const centerScope = useMemo(
    () => (Array.isArray(selectedCenterIds) ? selectedCenterIds : []).map(String).filter(Boolean),
    [selectedCenterIds],
  );
  const hasCenterScope = centerScope.length > 0;

  const enabledUserOptions = useMemo(
    () => (userOptions || []).filter((u) => !isEventTaskAssigneeDisabled(u)),
    [userOptions],
  );

  const userByValue = useMemo(() => {
    const m = new Map();
    enabledUserOptions.forEach((u) => {
      if (u?.value == null) return;
      const primary = String(u.value);
      m.set(primary, u);
      if (u.email && String(u.email) !== primary) m.set(String(u.email), u);
      if (u.name && String(u.name) !== primary) m.set(String(u.name), u);
    });
    return m;
  }, [enabledUserOptions]);

  const isUserSelectable = useCallback(
    (userOrId) => {
      if (!hasCenterScope) return true;
      const user =
        userOrId && typeof userOrId === 'object'
          ? userOrId
          : userByValue.get(normalizeAssigneeId(userOrId));
      if (!user || isEventTaskAssigneeDisabled(user)) return false;
      return assigneeBelongsToSelectedCenters(user, centerScope);
    },
    [hasCenterScope, centerScope, userByValue],
  );

  const teams = useMemo(() => {
    const sourceUsers = enabledUserOptions;
    if (roleGroups?.length) {
      return roleGroups.map((g) => ({
        label: g.label || g.role,
        value: g.role || g.value,
        userIds: (g.users || [])
          .map((u) => normalizeAssigneeId(typeof u === 'string' ? u : (u?.value ?? u)))
          .filter((id) => id && userByValue.has(id)),
      }));
    }
    return (roleOptions || []).map((r) => ({
      label: r.label || r.value,
      value: r.value,
      userIds: sourceUsers
        .filter((u) => u.team === r.value || u.teamLabel === r.value)
        .map((u) => normalizeAssigneeId(u))
        .filter(Boolean),
    }));
  }, [roleGroups, roleOptions, enabledUserOptions, userByValue]);

  const currentSelection = open ? draftSelection : valueIds;
  const selectionSet = useMemo(() => new Set(currentSelection), [currentSelection]);

  const displayOptions = useMemo(
    () =>
      currentSelection.map((id) => {
        const user = userByValue.get(String(id));
        return user || { value: id, label: id };
      }),
    [currentSelection, userByValue],
  );

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [open]);

  const q = debouncedSearchQuery.trim().toLowerCase();

  const filteredTeams = useMemo(() => {
    const visible = hasCenterScope
      ? teams.filter((t) => (t.userIds || []).some((id) => isUserSelectable(id)))
      : teams;
    if (!q) return visible;
    return visible.filter(
      (t) =>
        String(t.label || '')
          .toLowerCase()
          .includes(q) ||
        String(t.value || '')
          .toLowerCase()
          .includes(q),
    );
  }, [teams, q, hasCenterScope, isUserSelectable]);

  const filteredUsers = useMemo(() => {
    let list = enabledUserOptions;
    if (hasCenterScope) {
      list = list.filter((u) => isUserSelectable(u));
    }
    if (!q) return list;
    return list.filter((u) => {
      const hay = [u.label, u.full_name, u.name, u.value, u.email, u.user_role, u.teamLabel, u.team]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enabledUserOptions, q, hasCenterScope, isUserSelectable]);

  const applySelection = useCallback(
    (next) => {
      const unique = [...new Set(next.map(normalizeAssigneeId).filter(Boolean))];
      const scoped = hasCenterScope ? unique.filter((id) => isUserSelectable(id)) : unique;
      setDraftSelection(scoped);
      onChange?.(scoped);
    },
    [onChange, hasCenterScope, isUserSelectable],
  );

  const handleOpen = useCallback(() => {
    if (disabled || readonly) return;
    valueWhenOpenedRef.current = [...valueIds];
    setDraftSelection([...valueIds]);
    setOpen(true);
  }, [valueIds, disabled, readonly]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    if (!idsEqual(valueWhenOpenedRef.current, draftSelection)) {
      onBlur?.(draftSelection);
    }
    setDraftSelection([]);
  }, [draftSelection, onBlur]);

  const handleToggleUser = useCallback(
    (optionValue) => {
      if (disabled || readonly) return;
      const key = normalizeAssigneeId(optionValue);
      if (!key) return;
      if (selectionSet.has(key)) {
        applySelection(currentSelection.filter((v) => v !== key));
        return;
      }
      if (!isUserSelectable(key)) return;
      applySelection([...currentSelection, key]);
    },
    [disabled, readonly, selectionSet, currentSelection, applySelection, isUserSelectable],
  );

  const handleToggleTeam = useCallback(
    (team) => {
      if (disabled || readonly) return;
      const ids = (team.userIds || []).filter((id) => isUserSelectable(id));
      if (ids.length === 0) return;
      const allSelected = ids.every((id) => selectionSet.has(id));
      if (allSelected) {
        const remove = new Set(ids);
        applySelection(currentSelection.filter((v) => !remove.has(v)));
      } else {
        applySelection([...new Set([...currentSelection, ...ids])]);
      }
    },
    [disabled, readonly, selectionSet, currentSelection, applySelection, isUserSelectable],
  );

  const isTeamSelected = (team) => {
    const ids = (team.userIds || []).filter((id) => isUserSelectable(id));
    return ids.length > 0 && ids.every((id) => selectionSet.has(id));
  };

  return (
    <Dropdown.Root open={open} onOpenChange={(isOpen) => (isOpen ? handleOpen() : handleClose())}>
      <Dropdown.Trigger asChild>
        <Button.Root
          variant='neutral'
          mode={variant === 'borderless' ? 'ghost' : 'stroke'}
          type='button'
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left',
            disabled && 'cursor-not-allowed opacity-50',
            readonly && 'cursor-not-allowed hover:bg-transparent',
            hasError && 'ring-error-base',
            className,
          )}
          size={size}
          {...(readonly && {
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
            },
          })}
        >
          {displayOptions.length === 0 ? (
            <span className='text-paragraph-sm text-text-soft-400'>{placeholder}</span>
          ) : (
            <span className='flex flex-nowrap gap-1 items-center min-w-0 overflow-hidden'>
              {displayOptions.slice(0, 3).map((opt) => (
                <span
                  key={opt.value}
                  className='inline-flex items-center gap-1 rounded-md bg-bg-weak-50 px-1.5 py-0.5 text-label-xs text-text-sub-600 max-w-[120px] min-w-0 shrink truncate'
                >
                  {getAssigneeDisplayName(opt)}
                </span>
              ))}
              {displayOptions.length > 3 ? (
                <span className='text-label-xs text-text-soft-400 shrink-0 whitespace-nowrap'>
                  +{displayOptions.length - 3}
                </span>
              ) : null}
            </span>
          )}
        </Button.Root>
      </Dropdown.Trigger>
      <Dropdown.Content
        className='max-h-[360px] min-h-[200px] w-[320px] gap-0 overflow-hidden p-0'
        align='start'
        side='bottom'
        sideOffset={8}
      >
        <div className='p-2 border-b border-stroke-soft-200'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                ref={inputRef}
                placeholder='Search teams or users...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                autoComplete='off'
                autoCorrect='off'
                autoCapitalize='off'
                spellCheck='false'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='flex flex-col max-h-[300px] overflow-y-auto'>
          {userOptionsLoading ? (
            <div className='flex items-center justify-center px-4 py-8'>
              <p className='text-paragraph-sm text-text-soft-400'>Loading assignees...</p>
            </div>
          ) : (
            <>
              {filteredTeams.length > 0 ? (
                <div className='px-2 pt-2'>
                  <Dropdown.Label className='px-2 py-1.5'>Roles</Dropdown.Label>
                  <div className='space-y-0.5 pb-2'>
                    {filteredTeams.map((team) => {
                      const selectableCount = (team.userIds || []).filter((id) =>
                        isUserSelectable(id),
                      ).length;
                      const selected = isTeamSelected(team);
                      const count = hasCenterScope ? selectableCount : team.userIds?.length || 0;
                      return (
                        <div
                          key={team.value}
                          role='button'
                          tabIndex={0}
                          onClick={() => handleToggleTeam(team)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleTeam(team);
                            }
                          }}
                          className={rowClass(selected)}
                        >
                          <div className='flex flex-col flex-1 min-w-0'>
                            <span className='text-paragraph-sm text-text-main-900 truncate'>
                              {team.label}
                            </span>
                            {count > 0 ? (
                              <span className='text-label-xs text-text-soft-400'>
                                {count} {count === 1 ? 'user' : 'users'}
                              </span>
                            ) : null}
                          </div>
                          {selected ? (
                            <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className={cn('px-2 pb-2', filteredTeams.length > 0 && 'pt-1')}>
                {(filteredTeams.length > 0 || filteredUsers.length > 0) && (
                  <Dropdown.Label className='px-2 py-1.5'>Users</Dropdown.Label>
                )}
                {filteredUsers.length === 0 ? (
                  <div className='flex items-center justify-center px-4 py-6'>
                    <p className='text-paragraph-sm text-text-soft-400'>
                      {q ? 'No matches found' : 'No users available'}
                    </p>
                  </div>
                ) : (
                  <div className='space-y-0.5'>
                    {filteredUsers.map((user) => {
                      const key = String(user.value);
                      const selected = selectionSet.has(key);
                      const label = getAssigneeDisplayName(user);
                      const subtitle = [user.user_role, user.teamLabel].filter(Boolean).join(' · ');
                      return (
                        <div
                          key={key}
                          role='button'
                          tabIndex={0}
                          onClick={() => handleToggleUser(key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleUser(key);
                            }
                          }}
                          className={rowClass(selected)}
                        >
                          <CrmAccountAvatar
                            name={label}
                            initials={getAssigneeFirstNameInitial(user)}
                            image={user.image || user.user_image}
                            size={28}
                          />
                          <div className='flex flex-col flex-1 min-w-0'>
                            <span className='text-paragraph-sm text-text-main-900 truncate'>
                              {label}
                            </span>
                            {subtitle ? (
                              <span className='text-label-xs text-text-soft-400 truncate'>
                                {subtitle}
                              </span>
                            ) : null}
                          </div>
                          {selected ? (
                            <RiCheckLine className='size-4 text-text-main-900 shrink-0' />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default EventTaskAssigneeMultiSelect;
