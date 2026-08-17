import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiCheckLine,
  RiCloseLine,
  RiNotification3Line,
  RiNotificationOffLine,
  RiSearchLine,
} from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Input from '@/components/ui/input';
import * as Popover from '@/components/ui/popover';
import * as Switch from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchTaskComments } from '@/redux/clientDetailSlice';
import {
  fetchProjectCollectionComments,
  fetchProjectLayoutComments,
  selectProjectDetail,
} from '@/redux/projectSlice';
import {
  addDocumentSubscriber,
  getSubscriptionStatus,
  listDocumentSubscribers,
  removeDocumentSubscriber,
} from '@/services/document-subscribe-service';
import {
  addProjectCustomFollower,
  emitProjectFollowersChanged,
  getProjectFollowerPanel,
  PROJECT_FOLLOWERS_CHANGED_EVENT,
  removeProjectCustomFollower,
  scheduleFollowerPanelRefresh,
  toggleLeafRoleFollowers,
  toggleProjectRoleFollower,
} from '@/services/follower-scope-service';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

function teamSignature(users) {
  return (Array.isArray(users) ? users : [])
    .map((row) => `${row?.user || ''}::${row?.custom_role || ''}`)
    .filter((key) => key !== '::')
    .sort()
    .join('|');
}

function asLeafUsers(users) {
  return (Array.isArray(users) ? users : [])
    .map((user) => {
      if (!user) return null;
      if (typeof user === 'string') return { user, full_name: user, user_image: null };
      const id = user.user || user.value || user.name || user.email;
      if (!id) return null;
      return {
        user: id,
        full_name: user.full_name || user.label || id,
        user_image: user.user_image || user.image || user.avatar || null,
      };
    })
    .filter(Boolean);
}

function userKey(id) {
  return String(id || '')
    .trim()
    .toLowerCase();
}

/** Project followers popover. scopeMode "project" | "leaf" (Task/Layout subscribe). */
export default function ProjectFollowersPopover({
  projectId,
  section = '',
  scopeMode = 'project',
  referenceDoctype = 'Project',
  referenceName,
  activityLabel = 'project',
  canManageOthers,
  onFollowersChange,
}) {
  const dispatch = useDispatch();
  const projectDetail = useSelector(selectProjectDetail);
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.email || authUser?.name || '';
  const isLeaf = scopeMode === 'leaf';
  const refName = referenceName || projectId;
  const sectionKey = String(section || '');

  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [tab, setTab] = useState('default');
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [canManage, setCanManage] = useState(
    typeof canManageOthers === 'boolean' ? canManageOthers : true,
  );
  const [roles, setRoles] = useState([]);
  const [customFollowers, setCustomFollowers] = useState([]);
  const [peopleOptions, setPeopleOptions] = useState([]);
  const [leafFollowers, setLeafFollowers] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const openRef = useRef(open);
  const leafFollowersRef = useRef(leafFollowers);
  const activityTimerRef = useRef(null);
  const refreshIdRef = useRef(0);
  openRef.current = open;
  leafFollowersRef.current = leafFollowers;

  const membersKey = useMemo(() => {
    if (!projectId || projectDetail?.name !== projectId) return '';
    return teamSignature(projectDetail?.users);
  }, [projectId, projectDetail?.name, projectDetail?.users]);

  const applyPanel = useCallback(
    (panel) => {
      if (!panel) return;
      setRoles(panel.roles || []);
      setPeopleOptions(panel.assignee_options || []);
      if (typeof canManageOthers === 'boolean') setCanManage(canManageOthers);
      else if (typeof panel.can_manage === 'boolean') setCanManage(panel.can_manage);

      if (isLeaf) return;

      const customs = panel.custom_followers || [];
      setCustomFollowers(customs);
      const selfKey = userKey(currentUserId);
      setSubscribed(
        typeof panel.self_subscribed === 'boolean'
          ? panel.self_subscribed
          : customs.some((f) => userKey(f.user) === selfKey),
      );
      setLeafFollowers([]);
    },
    [canManageOthers, currentUserId, isLeaf],
  );

  const applyLeafList = useCallback(
    (list) => {
      const rows = Array.isArray(list) ? list : [];
      setLeafFollowers(rows);
      setCustomFollowers(rows);
      const selfKey = userKey(currentUserId);
      setSubscribed(Boolean(selfKey && rows.some((row) => userKey(row.user) === selfKey)));
    },
    [currentUserId],
  );

  const loadLeafSubscribers = useCallback(async () => {
    if (!isLeaf || !referenceDoctype || !refName) return;
    const requestId = ++refreshIdRef.current;
    const [status, list] = await Promise.all([
      getSubscriptionStatus(referenceDoctype, refName, { force: true }),
      listDocumentSubscribers(referenceDoctype, refName, { force: true }),
    ]);
    if (requestId !== refreshIdRef.current) return;
    setSubscribed(Boolean(status?.subscribed));
    applyLeafList(list);
  }, [isLeaf, referenceDoctype, refName, applyLeafList]);

  const refreshActivity = useCallback(() => {
    if (!isLeaf || !refName) return;
    clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => {
      if (referenceDoctype === 'Task') dispatch(fetchTaskComments({ taskName: refName }));
      else if (referenceDoctype === 'Project Layout') {
        dispatch(fetchProjectLayoutComments({ layoutId: refName }));
      } else if (referenceDoctype === 'Project Collection BOQ') {
        dispatch(fetchProjectCollectionComments({ collectionBoqId: refName }));
      }
    }, 400);
  }, [dispatch, isLeaf, refName, referenceDoctype]);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!projectId) return;
      const requestId = ++refreshIdRef.current;
      const showLoader = openRef.current;
      if (showLoader) setLoading(true);
      try {
        // Leaf uses section when provided so Default roles match the parent tab.
        const panel = await getProjectFollowerPanel(projectId, sectionKey, { force });
        if (requestId !== refreshIdRef.current) return;
        applyPanel(panel);
        if (isLeaf) {
          const [status, list] = await Promise.all([
            getSubscriptionStatus(referenceDoctype, refName, { force: true }),
            listDocumentSubscribers(referenceDoctype, refName, { force: true }),
          ]);
          if (requestId !== refreshIdRef.current) return;
          setSubscribed(Boolean(status?.subscribed));
          applyLeafList(list);
        }
      } catch (error) {
        if (requestId === refreshIdRef.current) {
          showErrorToast(extractErrorMessage(error));
        }
      } finally {
        if (showLoader && requestId === refreshIdRef.current) setLoading(false);
      }
    },
    [projectId, isLeaf, sectionKey, referenceDoctype, refName, applyPanel, applyLeafList],
  );

  useEffect(() => {
    if (!projectId) return undefined;
    void load();
    // load identity is members/project/section/leaf — not callback identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sectionKey, isLeaf, referenceDoctype, refName, membersKey]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      return undefined;
    }
    // Force-refresh on open so badges/lists recover after sibling refresh failures.
    void load({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearTimeout(activityTimerRef.current), []);

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return undefined;

    const onChange = (event) => {
      const detail = event?.detail || {};
      if (detail.projectId !== projectId) return;

      if (!isLeaf && detail.panel && String(detail.section || '') === sectionKey) {
        applyPanel(detail.panel);
        return;
      }

      if (!isLeaf && detail.source === 'mutation' && String(detail.section || '') !== sectionKey) {
        scheduleFollowerPanelRefresh(projectId, sectionKey);
        return;
      }

      if (isLeaf && detail.panel && String(detail.section || '') === sectionKey) {
        applyPanel(detail.panel);
      }

      if (
        isLeaf &&
        detail.source === 'leaf' &&
        detail.leaf?.referenceDoctype === referenceDoctype &&
        detail.leaf?.referenceName === refName
      ) {
        if (detail.leaf.role) {
          const roleUsers = asLeafUsers(detail.leaf.users);
          const roleIds = new Set(roleUsers.map((u) => userKey(u.user)).filter(Boolean));
          const next = detail.leaf.enabled
            ? [
                ...leafFollowersRef.current.filter((row) => !roleIds.has(userKey(row.user))),
                ...roleUsers,
              ]
            : leafFollowersRef.current.filter((row) => !roleIds.has(userKey(row.user)));
          applyLeafList(next);
        } else {
          void loadLeafSubscribers();
        }
        refreshActivity();
        return;
      }

      // Tab/project mutation rematerializes leaves — refresh even if popover closed.
      if (isLeaf && detail.source === 'mutation') {
        void loadLeafSubscribers().then(refreshActivity);
      }
    };

    window.addEventListener(PROJECT_FOLLOWERS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PROJECT_FOLLOWERS_CHANGED_EVENT, onChange);
  }, [
    projectId,
    isLeaf,
    sectionKey,
    referenceDoctype,
    refName,
    applyPanel,
    applyLeafList,
    loadLeafSubscribers,
    refreshActivity,
  ]);

  const runMutation = useCallback(
    async (action) => {
      if (mutating) return;
      setMutating(true);
      try {
        const result = await action();
        if (result?.roles) applyPanel(result);
        else if (Array.isArray(result?.leafLocal)) applyLeafList(result.leafLocal);
        else if (isLeaf) await loadLeafSubscribers();
        refreshActivity();
        onFollowersChange?.();
      } catch (error) {
        showErrorToast(extractErrorMessage(error));
      } finally {
        setMutating(false);
      }
    },
    [
      mutating,
      applyPanel,
      applyLeafList,
      isLeaf,
      loadLeafSubscribers,
      refreshActivity,
      onFollowersChange,
    ],
  );

  const followerIds = useMemo(
    () => new Set(customFollowers.map((f) => userKey(f.user)).filter(Boolean)),
    [customFollowers],
  );

  const displayRoles = useMemo(() => {
    if (!isLeaf) return roles;
    const subscriberIds = new Set(leafFollowers.map((f) => userKey(f.user)).filter(Boolean));
    return roles.map((row) => {
      const users = row.users || [];
      const roleUserKeys = users.map((u) => userKey(u.user)).filter(Boolean);
      // Role ON when every role member is a leaf subscriber (case-insensitive).
      const allPresent =
        roleUserKeys.length > 0 && roleUserKeys.every((id) => subscriberIds.has(id));
      return {
        ...row,
        enabled: allPresent,
      };
    });
  }, [isLeaf, roles, leafFollowers]);

  const peopleResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return peopleOptions.filter((u) => {
      const id = u.value || u.user;
      if (!id || followerIds.has(userKey(id))) return false;
      if (!q) return true;
      return [u.label, u.full_name, u.email, id].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [peopleOptions, followerIds, debouncedSearch]);

  const badgeCount = useMemo(() => {
    if (isLeaf) return leafFollowers.length;
    const ids = new Set();
    roles.forEach((row) => {
      if (!row.enabled) return;
      (row.users || []).forEach((user) => {
        const key = userKey(user?.user);
        if (key) ids.add(key);
      });
    });
    customFollowers.forEach((f) => {
      const key = userKey(f.user);
      if (key) ids.add(key);
    });
    return ids.size;
  }, [isLeaf, leafFollowers, roles, customFollowers]);

  const emitLeafChange = () =>
    emitProjectFollowersChanged({
      projectId,
      source: 'leaf',
      leaf: { referenceDoctype, referenceName: refName },
    });

  const handleFollowMode = (wantSubscribe) => {
    if (!currentUserId && !isLeaf) {
      showErrorToast('Unable to resolve signed-in user.');
      return;
    }
    return runMutation(async () => {
      if (isLeaf) {
        if (wantSubscribe) await addDocumentSubscriber(referenceDoctype, refName, 'self');
        else await removeDocumentSubscriber(referenceDoctype, refName, 'self');
        emitLeafChange();
        return {};
      }
      return wantSubscribe
        ? addProjectCustomFollower(projectId, sectionKey, 'self')
        : removeProjectCustomFollower(projectId, sectionKey, 'self');
    });
  };

  const handleToggleRole = (role, enabled) => {
    if (!canManage) {
      showErrorToast('You cannot manage followers.');
      return;
    }
    return runMutation(async () => {
      if (!isLeaf) return toggleProjectRoleFollower(projectId, sectionKey, role, enabled);

      const result = await toggleLeafRoleFollowers(
        projectId,
        referenceDoctype,
        refName,
        role,
        enabled,
      );
      const roleUsers = asLeafUsers(result?.users);
      const roleIds = new Set(roleUsers.map((u) => userKey(u.user)).filter(Boolean));
      const withoutRole = leafFollowersRef.current.filter((row) => !roleIds.has(userKey(row.user)));
      return { leafLocal: enabled ? [...withoutRole, ...roleUsers] : withoutRole };
    });
  };

  const handleAddPerson = (userId) => {
    if (!canManage && userKey(userId) !== userKey(currentUserId)) {
      showErrorToast('You cannot add other followers.');
      return;
    }
    return runMutation(async () => {
      setSearchQuery('');
      if (!isLeaf) return addProjectCustomFollower(projectId, sectionKey, userId);
      await addDocumentSubscriber(referenceDoctype, refName, userId);
      emitLeafChange();
      return {};
    });
  };

  const handleRemoveFollower = (userId) => {
    if (userKey(userId) !== userKey(currentUserId) && !canManage) {
      showErrorToast('You cannot remove other followers.');
      return;
    }
    return runMutation(async () => {
      if (!isLeaf) return removeProjectCustomFollower(projectId, sectionKey, userId);
      await removeDocumentSubscriber(referenceDoctype, refName, userId);
      emitLeafChange();
      return {};
    });
  };

  if (!projectId || !refName) return null;

  const notSubscribed = !subscribed;
  const subscribedPressedOrHover = subscribed && (open || triggerHovered);
  const activityCopy = `this ${activityLabel}`;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg p-1.5',
            'outline outline-1 outline-offset-[-1px] transition-[background-color,box-shadow] duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
            notSubscribed && 'bg-bg-weak-100 outline-stroke-soft-200',
            subscribed &&
              !subscribedPressedOrHover &&
              'bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] outline-stroke-soft-200/80',
            subscribedPressedOrHover && 'bg-primary-lighter outline-stroke-soft-200',
          )}
          aria-label={`Followers${badgeCount ? `, ${badgeCount}` : ''}`}
          aria-expanded={open}
        >
          <RiNotification3Line
            className={cn(
              'size-5 shrink-0',
              notSubscribed && 'text-text-strong-950',
              subscribed && 'text-primary-dark',
            )}
            aria-hidden
          />
          <span
            className={cn(
              'flex items-center justify-center overflow-hidden rounded-full px-1.5 py-0.5 text-xs font-medium leading-4 tabular-nums',
              notSubscribed && 'bg-bg-soft-200 text-text-sub-500',
              subscribed && 'bg-primary-light text-primary-darker',
            )}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Content
        align='end'
        sideOffset={8}
        showArrow={false}
        className='w-[min(100vw-24px,360px)] border border-stroke-soft-200 p-0 shadow-regular-md ring-0'
      >
        <div className='flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl bg-bg-white-0'>
          <div className='flex flex-col gap-2 border-b border-stroke-soft-200 p-3'>
            <PreferenceCard
              active={subscribed}
              icon={RiNotification3Line}
              title='Follow'
              description={`Notify me on all activity of ${activityCopy}.`}
              disabled={mutating}
              onClick={() => handleFollowMode(true)}
            />
            <PreferenceCard
              active={!subscribed}
              icon={RiNotificationOffLine}
              title='Unfollow'
              description='Notify me on @mentions or assignment.'
              disabled={mutating}
              onClick={() => handleFollowMode(false)}
            />
          </div>

          <div className='flex w-full border-b border-stroke-soft-200'>
            {['default', 'custom'].map((id) => (
              <button
                key={id}
                type='button'
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 border-b-2 py-2.5 text-center text-label-sm capitalize transition-colors',
                  tab === id
                    ? 'border-primary-base text-primary-base'
                    : 'border-transparent text-text-sub-500 hover:text-text-strong-950',
                )}
              >
                {id}
              </button>
            ))}
          </div>

          {tab === 'custom' ? (
            <div className='border-b border-stroke-soft-200 p-3'>
              <Input.Root size='small' className='w-full'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete='off'
                    disabled={mutating}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          ) : null}

          <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-3'>
            {loading && !mutating ? (
              <p className='py-6 text-center text-paragraph-sm text-text-sub-500'>Loading…</p>
            ) : tab === 'default' ? (
              <>
                <p className='px-1 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-sub-500'>
                  Followers
                </p>
                <ul className='space-y-1'>
                  {displayRoles.map((row) => (
                    <li
                      key={row.role}
                      className='flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-weak-50'
                    >
                      <Switch.Root
                        checked={Boolean(row.enabled)}
                        disabled={!canManage || mutating}
                        onCheckedChange={(checked) => handleToggleRole(row.role, Boolean(checked))}
                        aria-label={`Follow as ${row.role}`}
                        title={
                          row.inherited_from_project
                            ? 'Inherited from project — turn off to exclude on this tab'
                            : row.excluded_from_project
                              ? 'Excluded on this tab (still enabled on project)'
                              : undefined
                        }
                      />
                      <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                        {row.role}
                      </span>
                      <div className='flex -space-x-1.5'>
                        {(row.users || []).slice(0, 4).map((u, i) => (
                          <CrmAccountAvatar
                            key={u.user}
                            name={u.full_name || u.user}
                            image={u.user_image}
                            size={24}
                            index={i}
                            className='ring-2 ring-bg-white-0'
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                {customFollowers.length > 0 ? (
                  <>
                    <p className='px-1 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-sub-500'>
                      {customFollowers.length} follower{customFollowers.length === 1 ? '' : 's'}
                    </p>
                    <ul className='space-y-1'>
                      {customFollowers.map((f, i) => {
                        const isSelf = userKey(f.user) === userKey(currentUserId);
                        const canRemove = isSelf || canManage;
                        return (
                          <li key={f.user || f.name}>
                            <button
                              type='button'
                              disabled={!canRemove || mutating}
                              onClick={() => canRemove && handleRemoveFollower(f.user)}
                              className={cn(
                                'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left',
                                canRemove && !mutating && 'hover:bg-bg-weak-50',
                              )}
                            >
                              <div className='relative shrink-0'>
                                <CrmAccountAvatar
                                  name={f.full_name || f.user}
                                  image={f.user_image}
                                  size={32}
                                  index={i}
                                />
                                {canRemove ? (
                                  <div className='pointer-events-none absolute -bottom-px -right-px flex size-4 items-center justify-center rounded-full bg-error-base text-white opacity-0 ring-1 ring-white transition-opacity group-hover:opacity-100'>
                                    <RiCloseLine className='size-2.5' />
                                  </div>
                                ) : null}
                              </div>
                              <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                                {isSelf ? 'Me' : f.full_name || f.user}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                <p
                  className={cn(
                    'px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-sub-500',
                    customFollowers.length > 0 ? 'pt-4' : 'pt-3',
                  )}
                >
                  People
                </p>
                {peopleResults.length === 0 ? (
                  <p className='py-1 text-paragraph-xs text-text-sub-500'>
                    {searchQuery.trim()
                      ? 'No matching project users.'
                      : 'No other project users to show.'}
                  </p>
                ) : (
                  <ul className='space-y-1'>
                    {peopleResults.map((u, i) => {
                      const id = u.value || u.user;
                      const isSelf = userKey(id) === userKey(currentUserId);
                      return (
                        <li key={id}>
                          <button
                            type='button'
                            disabled={mutating || (!canManage && !isSelf)}
                            className='flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-bg-weak-50 disabled:opacity-50'
                            onClick={() => handleAddPerson(id)}
                          >
                            <CrmAccountAvatar
                              name={u.full_name || u.label || id}
                              image={u.image || u.avatar}
                              size={32}
                              index={i}
                            />
                            <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                              {isSelf ? 'Me' : u.full_name || u.label || id}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function PreferenceCard({ active, icon: Icon, title, description, onClick, disabled }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full flex-col rounded-lg border-0 px-4 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        active ? 'bg-primary-lighter' : 'bg-bg-weak-100 hover:bg-bg-weak-50',
      )}
    >
      <div className='flex w-full items-start gap-1.5'>
        <Icon
          className={cn(
            'mt-0.5 size-5 shrink-0',
            active ? 'text-primary-dark' : 'text-text-sub-600',
          )}
          aria-hidden
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <div className='flex items-start justify-between gap-2 pr-1'>
            <span
              className={cn(
                'text-sm leading-5',
                active ? 'font-semibold text-primary-darker' : 'font-medium text-text-strong-950',
              )}
            >
              {title}
            </span>
            {active ? (
              <RiCheckLine className='size-4 shrink-0 text-primary-dark' aria-hidden />
            ) : null}
          </div>
          <p
            className={cn(
              'text-sm font-normal leading-5',
              active ? 'text-primary-darker' : 'text-text-sub-600',
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
