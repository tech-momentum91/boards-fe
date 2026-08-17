import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  RiNotification3Line,
  RiNotificationOffLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
} from 'react-icons/ri';
import * as Popover from '@/components/ui/popover';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Input from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/use-debounce';
import { searchUsers } from '@/redux/userSlice';
import {
  getSubscriptionStatus,
  listDocumentSubscribers,
  addDocumentSubscriber,
  removeDocumentSubscriber,
} from '@/services/document-subscribe-service';
import { showErrorToast, extractErrorMessage } from '@/utils/error-utils';

function peopleRowMatchesSelf(u, selfId) {
  if (!selfId || !u) return false;
  const sid = String(selfId);
  return [u.value, u.name, u.email].some((x) => x != null && String(x) === sid);
}

/** Ensures the signed-in user appears when the API omits them (limit/sort) or when searching "me" / name / email. */
function mergeSelfIntoPeopleSearch(users, queryForApi, authUser, currentUserId) {
  if (!currentUserId || !authUser) return Array.isArray(users) ? users : [];
  const list = Array.isArray(users) ? [...users] : [];
  if (list.some((u) => peopleRowMatchesSelf(u, currentUserId))) return list;

  const q = (queryForApi || '').trim().toLowerCase();
  const full = (authUser.full_name || '').trim().toLowerCase();
  const mail = (authUser.email || '').trim().toLowerCase();
  const uidLower = String(currentUserId).toLowerCase();

  const shouldInclude =
    q === '' ||
    q === 'me' ||
    (full && full.includes(q)) ||
    (mail && mail.includes(q)) ||
    (uidLower && (uidLower.includes(q) || q.includes(uidLower)));

  if (!shouldInclude) return list;

  list.unshift({
    label: authUser.full_name || authUser.email || currentUserId,
    value: currentUserId,
    email: authUser.email || currentUserId,
    name: currentUserId,
    full_name: authUser.full_name,
    image: authUser.user_image,
    avatar: authUser.user_image,
  });
  return list;
}

/**
 * Reusable followers / Document Subscribe UI for any reference document.
 *
 * Prefer **controlled** usage from the parent (pass `followers`, `subscribed`, `onRefreshSubscribers`)
 * so list/status load once with the screen, not on every popover open. People list loads when the popover opens
 * (empty search); typing debounces search. Raw results are filtered to exclude current followers.
 *
 * @param {object} props
 * @param {string} props.referenceDoctype
 * @param {string} props.referenceName
 * @param {Array} [props.followers] — when set with `onRefreshSubscribers`, controlled mode
 * @param {boolean} [props.subscribed]
 * @param {boolean} [props.subscribersLoading]
 * @param {() => Promise<void>} [props.onRefreshSubscribers] — refetch after mutations / parent refresh
 */
export default function DocumentFollowersPopover({
  referenceDoctype,
  referenceName,
  followers: followersProp,
  subscribed: subscribedProp,
  subscribersLoading: subscribersLoadingProp = false,
  onRefreshSubscribers,
  canManageOthers = false,
  internalOnlySearch = true,
}) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.email || authUser?.name || '';

  const controlled =
    typeof onRefreshSubscribers === 'function' &&
    Array.isArray(followersProp) &&
    typeof subscribedProp === 'boolean';

  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalSubscribed, setInternalSubscribed] = useState(false);
  const [internalFollowers, setInternalFollowers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [peopleSearchRaw, setPeopleSearchRaw] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const followers = controlled ? followersProp : internalFollowers;
  const subscribed = controlled ? subscribedProp : internalSubscribed;
  const loading = controlled ? subscribersLoadingProp : internalLoading;

  const followerIds = useMemo(() => new Set(followers.map((f) => f.user)), [followers]);

  const followersOrdered = useMemo(() => {
    if (followers.length === 0 || !currentUserId) return followers;
    const idx = followers.findIndex((f) => f.user === currentUserId);
    if (idx <= 0) return followers;
    const next = [...followers];
    const [selfRow] = next.splice(idx, 1);
    return [selfRow, ...next];
  }, [followers, currentUserId]);

  const peopleResults = useMemo(() => {
    const filtered = peopleSearchRaw.filter((u) => {
      const id = u.value || u.name;
      return id && !followerIds.has(id);
    });
    if (!currentUserId || filtered.length <= 1) return filtered;
    const selfIdx = filtered.findIndex((u) => peopleRowMatchesSelf(u, currentUserId));
    if (selfIdx <= 0) return filtered;
    const next = [...filtered];
    const [selfRow] = next.splice(selfIdx, 1);
    return [selfRow, ...next];
  }, [peopleSearchRaw, followerIds, currentUserId]);

  const refreshInternal = useCallback(
    async ({ withLoading = false } = {}) => {
      if (!referenceDoctype || !referenceName) return;
      if (withLoading) setInternalLoading(true);
      try {
        const [status, list] = await Promise.all([
          getSubscriptionStatus(referenceDoctype, referenceName),
          listDocumentSubscribers(referenceDoctype, referenceName),
        ]);
        setInternalSubscribed(Boolean(status?.subscribed));
        setInternalFollowers(Array.isArray(list) ? list : []);
      } catch (error) {
        if (withLoading) showErrorToast(extractErrorMessage(error));
      } finally {
        if (withLoading) setInternalLoading(false);
      }
    },
    [referenceDoctype, referenceName],
  );

  useEffect(() => {
    if (controlled) return;
    refreshInternal({ withLoading: false });
  }, [controlled, refreshInternal]);

  const afterMutation = useCallback(async () => {
    if (controlled) {
      await onRefreshSubscribers();
    } else {
      await refreshInternal({ withLoading: false });
    }
  }, [controlled, onRefreshSubscribers, refreshInternal]);

  useEffect(() => {
    if (!open) {
      setPeopleSearchRaw([]);
      setPeopleLoading(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed !== '' && debouncedSearch.trim() !== trimmed) {
      return;
    }

    const queryForApi = trimmed;

    let cancelled = false;
    (async () => {
      setPeopleLoading(true);
      try {
        const includeSelfIds = [
          ...new Set([currentUserId, authUser?.email, authUser?.name].filter(Boolean)),
        ];
        const result = await dispatch(
          searchUsers({
            searchQuery: queryForApi,
            limit: 40,
            internal_only: internalOnlySearch,
            includeAssignedUsers: includeSelfIds,
          }),
        ).unwrap();
        if (cancelled) return;
        const merged = mergeSelfIntoPeopleSearch(
          result?.users,
          queryForApi,
          authUser,
          currentUserId,
        );
        setPeopleSearchRaw(merged);
      } catch {
        if (!cancelled) setPeopleSearchRaw([]);
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, searchQuery, debouncedSearch, dispatch, internalOnlySearch, currentUserId, authUser]);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const handleFollowMode = async (wantSubscribe) => {
    try {
      if (wantSubscribe) {
        await addDocumentSubscriber(referenceDoctype, referenceName, 'self');
        if (!controlled) setInternalSubscribed(true);
      } else {
        await removeDocumentSubscriber(referenceDoctype, referenceName, 'self');
        if (!controlled) setInternalSubscribed(false);
      }
      await afterMutation();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  const handleAddPerson = async (userId) => {
    try {
      await addDocumentSubscriber(referenceDoctype, referenceName, userId);
      await afterMutation();
      setSearchQuery('');
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  const handleRemoveFollower = async (userId) => {
    const isSelf = userId === currentUserId;
    if (!isSelf && !canManageOthers) {
      showErrorToast('You cannot remove other subscribers.');
      return;
    }
    try {
      await removeDocumentSubscriber(referenceDoctype, referenceName, userId);
      await afterMutation();
    } catch (error) {
      showErrorToast(extractErrorMessage(error));
    }
  };

  const followerRowLabel = (userId, fullName) =>
    userId === currentUserId ? 'Me' : fullName || userId;

  const peopleRowDisplayLabel = (userId, apiLabel) => (userId === currentUserId ? 'Me' : apiLabel);

  if (!referenceDoctype || !referenceName) {
    return null;
  }

  const count = followers.length;
  const notSubscribed = !subscribed;
  const subscribedPressedOrHover = subscribed && (open || triggerHovered);

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
          aria-label={`Subscribers${count ? `, ${count}` : ''}`}
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
            {count > 99 ? '99+' : count}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='end'
        sideOffset={8}
        showArrow={false}
        className='w-[min(100vw-24px,360px)] border border-stroke-soft-200 p-0 shadow-regular-md ring-0'
      >
        <div className='flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl bg-bg-white-0'>
          <div className='flex flex-col gap-2 border-b border-stroke-soft-200 p-3'>
            <button
              type='button'
              onClick={() => handleFollowMode(true)}
              className={cn(
                'flex w-full flex-col rounded-lg border-0 px-4 py-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
                subscribed ? 'bg-primary-lighter' : 'bg-bg-weak-100 hover:bg-bg-weak-50',
              )}
            >
              <div className='flex w-full items-start gap-1.5'>
                <RiNotification3Line
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    subscribed ? 'text-primary-dark' : 'text-text-sub-600',
                  )}
                  aria-hidden
                />
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <div className='flex items-start justify-between gap-2 pr-1'>
                    <span
                      className={cn(
                        'text-sm leading-5',
                        subscribed
                          ? 'font-semibold text-primary-darker'
                          : 'font-medium text-text-strong-950',
                      )}
                    >
                      Follow
                    </span>
                    {subscribed ? (
                      <RiCheckLine className='size-4 shrink-0 text-primary-dark' aria-hidden />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      'text-sm font-normal leading-5',
                      subscribed ? 'text-primary-darker' : 'text-text-sub-600',
                    )}
                  >
                    Notify me on all activity of this task.
                  </p>
                </div>
              </div>
            </button>
            <button
              type='button'
              onClick={() => handleFollowMode(false)}
              className={cn(
                'flex w-full flex-col rounded-lg border-0 px-4 py-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
                !subscribed ? 'bg-primary-lighter' : 'bg-bg-weak-100 hover:bg-bg-weak-50',
              )}
            >
              <div className='flex w-full items-start gap-1.5'>
                <RiNotificationOffLine
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    !subscribed ? 'text-primary-dark' : 'text-text-sub-600',
                  )}
                  aria-hidden
                />
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <div className='flex items-start justify-between gap-2 pr-1'>
                    <span
                      className={cn(
                        'text-sm leading-5',
                        !subscribed
                          ? 'font-semibold text-primary-darker'
                          : 'font-medium text-text-strong-950',
                      )}
                    >
                      Unfollow
                    </span>
                    {!subscribed ? (
                      <RiCheckLine className='size-4 shrink-0 text-primary-dark' aria-hidden />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      'text-sm font-normal leading-5',
                      !subscribed ? 'text-primary-darker' : 'text-text-sub-600',
                    )}
                  >
                    Notify me on @mentions or assignment.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className='border-b border-stroke-soft-200 p-3'>
            <Input.Root size='small' className='w-full'>
              <Input.Wrapper>
                <Input.Icon as={RiSearchLine} />
                <Input.Input
                  placeholder='Search...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete='off'
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-3'>
            {loading ? (
              <p className='py-6 text-center text-paragraph-sm text-text-sub-500'>Loading…</p>
            ) : (
              <>
                {count > 0 ? (
                  <>
                    <p className='px-1 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-sub-500'>
                      {count} follower{count === 1 ? '' : 's'}
                    </p>
                    <ul className='space-y-1'>
                      {followersOrdered.map((f, i) => {
                        const canRemove = f.user === currentUserId || canManageOthers;
                        const rowLabel = followerRowLabel(f.user, f.full_name);
                        const avatarName = f.full_name || f.user;
                        const removeAria =
                          f.user === currentUserId
                            ? 'Remove me from followers'
                            : `Remove ${f.full_name || f.user} from followers`;

                        const rowClassName = cn(
                          'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left',
                          canRemove && 'cursor-pointer hover:bg-bg-weak-50',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-1',
                        );

                        const avatarWithBadge = (
                          <div className='relative shrink-0'>
                            <CrmAccountAvatar
                              name={avatarName}
                              image={f.user_image}
                              size={32}
                              index={i}
                            />
                            {canRemove ? (
                              <div
                                className='pointer-events-none absolute -bottom-px -right-px flex size-4 items-center justify-center rounded-full bg-error-base text-white opacity-0 shadow-[0px_0.7px_1.4px_0px_rgba(82,88,102,0.06)] ring-1 ring-white transition-opacity group-hover:opacity-100'
                                aria-hidden
                              >
                                <RiCloseLine className='size-2.5' />
                              </div>
                            ) : null}
                          </div>
                        );

                        return (
                          <li key={f.name}>
                            {canRemove ? (
                              <button
                                type='button'
                                className={rowClassName}
                                aria-label={removeAria}
                                onClick={() => handleRemoveFollower(f.user)}
                              >
                                {avatarWithBadge}
                                <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                                  {rowLabel}
                                </span>
                              </button>
                            ) : (
                              <div className={cn(rowClassName, 'cursor-default')}>
                                {avatarWithBadge}
                                <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                                  {rowLabel}
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}

                <p
                  className={cn(
                    'px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-sub-500',
                    count > 0 ? 'pt-4' : 'pt-3',
                  )}
                >
                  People
                </p>
                {peopleLoading ? (
                  <p className='py-2 text-paragraph-xs text-text-sub-500'>Loading…</p>
                ) : peopleResults.length === 0 ? (
                  <p className='py-1 text-paragraph-xs text-text-sub-500'>
                    {searchQuery.trim()
                      ? 'No matching users. Try a different search.'
                      : 'No other users to show.'}
                  </p>
                ) : (
                  <ul className='space-y-1'>
                    {peopleResults.map((u, i) => {
                      const id = u.value || u.name;
                      const apiLabel = u.label || u.full_name || id;
                      const displayLabel = peopleRowDisplayLabel(id, apiLabel);
                      const avatarName = apiLabel;
                      return (
                        <li key={id}>
                          <button
                            type='button'
                            className='flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-bg-weak-50'
                            onClick={() => {
                              if (!canManageOthers && id !== currentUserId) {
                                showErrorToast('You cannot add other subscribers.');
                                return;
                              }
                              handleAddPerson(id);
                            }}
                          >
                            <CrmAccountAvatar
                              name={avatarName}
                              image={u.image || u.avatar}
                              size={32}
                              index={i}
                            />
                            <span className='min-w-0 flex-1 truncate text-paragraph-sm text-text-strong-950'>
                              {displayLabel}
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
