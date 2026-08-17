import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiSearch2Line } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';

import {
  buildProjectMembersFormValues,
  buildProjectRoleAssigneeOptions,
  buildProjectUsersPayload,
  filterProjectMemberFields,
  isNestedRadixOverlayTarget,
  normalizeProjectMemberIds,
  projectMemberSelectionsEqual,
} from '@/components/projects/list/project-helpers';
import AssigneeMultiSelect from '@/components/ui/assignee-multi-select';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { selectProjectMembersUpdateLoading, updateProjectMembers } from '@/redux/projectSlice';
import {
  getProjectRoleMemberOptions,
  invalidateProjectFollowerCaches,
} from '@/services/follower-scope-service';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const MEMBER_SAVE_DEBOUNCE_MS = 350;
const MAX_VISIBLE_ROLE_AVATARS = 3;

function RoleMembersRow({
  field,
  selectedIds,
  roleMemberOptions,
  optionsLoading,
  disabled,
  onLocalChange,
  onCommitChange,
}) {
  const value = Array.isArray(selectedIds) ? selectedIds : [];
  const options = useMemo(
    () => buildProjectRoleAssigneeOptions(roleMemberOptions, field.label),
    [roleMemberOptions, field.label],
  );

  return (
    <div className='group flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-bg-weak-50'>
      <span className='min-w-0 flex-1 truncate text-label-sm text-text-strong-950'>
        {field.label}
      </span>

      <div className='flex shrink-0 items-center justify-end'>
        <AssigneeMultiSelect
          value={value}
          onChange={(nextValue) => onLocalChange(field.id, nextValue)}
          onBlur={(nextValue) => onCommitChange(field.id, nextValue)}
          disabled={disabled}
          size='xsmall'
          variant='borderless'
          maxVisibleAvatars={MAX_VISIBLE_ROLE_AVATARS}
          fixedAssigneeOptions={options}
          fixedAssigneeOptionsLoading={optionsLoading}
          showAddButton
          dropdownContentClassName='z-[60]'
          triggerAriaLabel={`Add member to ${field.label}`}
        />
      </div>
    </div>
  );
}

/**
 * Members popover anchored to "View All": role rows with shared AssigneeMultiSelect
 * (avatars + hover remove + dashed + button).
 * Opens even when the project has zero team members so roles can be filled in.
 */
export default function ProjectMembersPopover({
  project = null,
  projectId: projectIdProp = '',
  onUpdated,
  children,
  open: controlledOpen,
  onOpenChange,
}) {
  const dispatch = useDispatch();
  const isSaving = useSelector(selectProjectMembersUpdateLoading);

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Prefer explicit prop (route id), then loaded project doc — never toast on mount flush.
  const projectId = String(projectIdProp || project?.name || '').trim();
  const projectUsers = useMemo(
    () => (Array.isArray(project?.users) ? project.users : []),
    [project?.users],
  );

  const [members, setMembers] = useState(() => buildProjectMembersFormValues(projectUsers));
  const [roleMemberOptions, setRoleMemberOptions] = useState({});
  const [roleMemberOptionsLoading, setRoleMemberOptionsLoading] = useState(false);
  const [roleMemberOptionsError, setRoleMemberOptionsError] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const debouncedRoleSearch = useDebounce(roleSearch, 200);

  const membersRef = useRef(members);
  const lastSavedUsersJsonRef = useRef(
    JSON.stringify(buildProjectUsersPayload(buildProjectMembersFormValues(projectUsers))),
  );
  const saveTimeoutRef = useRef(null);
  const saveRequestIdRef = useRef(0);
  const persistMembersRef = useRef(null);
  const enqueuePersistRef = useRef(null);
  const wasOpenRef = useRef(false);
  /** Coalesce overlapping saves (dropdown blur + click-outside flush). */
  const queuedMembersRef = useRef(null);
  const persistInFlightRef = useRef(false);
  const refreshAfterSaveRef = useRef(false);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const handleOpenChange = useCallback(
    (nextOpen) => {
      if (!isControlled) setUncontrolledOpen(Boolean(nextOpen));
      onOpenChange?.(Boolean(nextOpen));
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!open) {
      setRoleSearch('');
      return undefined;
    }

    // Don't clobber in-progress edits while a save is still draining.
    if (persistInFlightRef.current || saveTimeoutRef.current || queuedMembersRef.current) {
      return undefined;
    }

    const nextMembers = buildProjectMembersFormValues(projectUsers);
    setMembers(nextMembers);
    membersRef.current = nextMembers;
    lastSavedUsersJsonRef.current = JSON.stringify(buildProjectUsersPayload(nextMembers));

    let cancelled = false;
    setRoleMemberOptionsLoading(true);
    setRoleMemberOptionsError(false);

    getProjectRoleMemberOptions()
      .then((options) => {
        if (cancelled) return;
        setRoleMemberOptions(options || {});
        setRoleMemberOptionsError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setRoleMemberOptions({});
        setRoleMemberOptionsError(true);
        showErrorToast(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setRoleMemberOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectUsers]);

  const markUsersSaved = useCallback((usersJson) => {
    lastSavedUsersJsonRef.current = usersJson;
  }, []);

  const persistMembers = useCallback(
    async (nextMembers) => {
      // Silent skip when project not ready yet (mount/close flush can run before detail loads).
      if (!projectId) return false;

      const users = buildProjectUsersPayload(nextMembers);
      const usersJson = JSON.stringify(users);
      if (usersJson === lastSavedUsersJsonRef.current) return false;

      const requestId = ++saveRequestIdRef.current;
      try {
        await dispatch(updateProjectMembers({ projectId, users })).unwrap();
        if (requestId !== saveRequestIdRef.current) return false;
        markUsersSaved(usersJson);
        invalidateProjectFollowerCaches(projectId);
        refreshAfterSaveRef.current = true;
        return true;
      } catch (error) {
        if (requestId !== saveRequestIdRef.current) return false;
        showErrorToast(extractErrorMessage(error));
        const rolledBack = buildProjectMembersFormValues(projectUsers);
        setMembers(rolledBack);
        membersRef.current = rolledBack;
        return false;
      }
    },
    [dispatch, markUsersSaved, projectId, projectUsers],
  );

  persistMembersRef.current = persistMembers;

  const drainPersistQueue = useCallback(async () => {
    if (persistInFlightRef.current) return;
    persistInFlightRef.current = true;
    try {
      while (queuedMembersRef.current) {
        const toSave = queuedMembersRef.current;
        queuedMembersRef.current = null;
        await persistMembersRef.current?.(toSave);
      }
      if (refreshAfterSaveRef.current) {
        refreshAfterSaveRef.current = false;
        await onUpdated?.();
      }
    } finally {
      // Queue lock: release after awaits; not a stale-state race on a React state value.
      // eslint-disable-next-line require-atomic-updates -- intentional in-flight ref mutex
      persistInFlightRef.current = false;
      // A blur/flush may have queued work while we were refreshing.
      if (queuedMembersRef.current) {
        void drainPersistQueue();
      }
    }
  }, [onUpdated]);

  const enqueuePersist = useCallback(
    (nextMembers) => {
      queuedMembersRef.current = nextMembers ?? membersRef.current;
      void drainPersistQueue();
    },
    [drainPersistQueue],
  );

  enqueuePersistRef.current = enqueuePersist;

  const flushPendingPersist = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    enqueuePersistRef.current?.(membersRef.current);
  }, []);

  useEffect(
    () => () => {
      flushPendingPersist();
    },
    [flushPendingPersist],
  );

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return undefined;
    }
    // Skip initial mount (open starts false) — only flush after the popover was opened.
    if (!wasOpenRef.current) return undefined;
    flushPendingPersist();
    return undefined;
  }, [open, flushPendingPersist]);

  const schedulePersist = useCallback(
    (nextMembers) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        enqueuePersist(nextMembers);
      }, MEMBER_SAVE_DEBOUNCE_MS);
    },
    [enqueuePersist],
  );

  const updateMembersForField = useCallback((fieldId, nextValue) => {
    if (!fieldId) return membersRef.current;

    const normalized = normalizeProjectMemberIds(nextValue);
    const current = membersRef.current?.[fieldId] ?? [];
    if (projectMemberSelectionsEqual(current, normalized)) {
      return membersRef.current;
    }

    const nextMembers = { ...membersRef.current, [fieldId]: normalized };
    membersRef.current = nextMembers;
    setMembers(nextMembers);
    return nextMembers;
  }, []);

  const handleLocalChange = useCallback(
    (fieldId, nextValue) => {
      updateMembersForField(fieldId, nextValue);
    },
    [updateMembersForField],
  );

  const handleCommitChange = useCallback(
    (fieldId, nextValue) => {
      const nextMembers = updateMembersForField(fieldId, nextValue);
      schedulePersist(nextMembers);
    },
    [schedulePersist, updateMembersForField],
  );

  const filteredFields = useMemo(
    () => filterProjectMemberFields(debouncedRoleSearch, members, roleMemberOptions),
    [debouncedRoleSearch, members, roleMemberOptions],
  );

  const preventCloseForNestedMenu = useCallback((event) => {
    if (isNestedRadixOverlayTarget(event.target)) {
      event.preventDefault();
    }
  }, []);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange} modal>
      {children ? <Popover.Trigger asChild>{children}</Popover.Trigger> : null}

      <Popover.Content
        align='start'
        sideOffset={8}
        showArrow={false}
        className='z-[50] w-[340px] overflow-visible rounded-2xl p-0 shadow-regular-md'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={preventCloseForNestedMenu}
        onPointerDownOutside={preventCloseForNestedMenu}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <div className='border-b border-stroke-soft-200 p-3'>
          <Input.Root size='small'>
            <Input.Wrapper>
              <Input.Icon as={RiSearch2Line} />
              <Input.Input
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder='Search...'
                autoComplete='off'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='px-3 pb-1 pt-3'>
          <p className='px-2 text-subheading-2xs uppercase tracking-wide text-text-soft-400'>
            All Members
          </p>
          {projectUsers.length === 0 && !debouncedRoleSearch ? (
            <p className='mt-1 px-2 text-paragraph-xs text-text-sub-500'>
              No team members yet. Use + on a role to add people.
            </p>
          ) : null}
        </div>

        <div className='max-h-[420px] overflow-y-auto px-1.5 pb-2'>
          {roleMemberOptionsError && !roleMemberOptionsLoading ? (
            <div className='flex flex-col items-center gap-2 px-3 py-8 text-center'>
              <p className='text-paragraph-sm text-text-sub-500'>
                Couldn&apos;t load member options.
              </p>
              <button
                type='button'
                className='text-label-sm text-primary-base hover:underline'
                onClick={() => {
                  setRoleMemberOptionsLoading(true);
                  setRoleMemberOptionsError(false);
                  getProjectRoleMemberOptions()
                    .then((options) => {
                      setRoleMemberOptions(options || {});
                      setRoleMemberOptionsError(false);
                    })
                    .catch((error) => {
                      setRoleMemberOptions({});
                      setRoleMemberOptionsError(true);
                      showErrorToast(extractErrorMessage(error));
                    })
                    .finally(() => setRoleMemberOptionsLoading(false));
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredFields.length === 0 ? (
            <p className='px-3 py-8 text-center text-paragraph-sm text-text-sub-500'>
              No roles match your search
            </p>
          ) : (
            filteredFields.map((field) => (
              <RoleMembersRow
                key={field.id}
                field={field}
                selectedIds={members?.[field.id] ?? []}
                roleMemberOptions={roleMemberOptions}
                optionsLoading={roleMemberOptionsLoading}
                disabled={isSaving || !projectId || roleMemberOptionsError}
                onLocalChange={handleLocalChange}
                onCommitChange={handleCommitChange}
              />
            ))
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
