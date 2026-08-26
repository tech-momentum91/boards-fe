import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseLine,
  RiFilter3Line,
  RiLoader4Line,
  RiNotification3Line,
  RiSettings4Line,
} from 'react-icons/ri';
import Sidebar from '@/pages/boards/sidebar/Sidebar';
import BoardHeader from '@/pages/boards/layout/BoardHeader';
import BoardsSidebarShell from '@/pages/boards/layout/BoardsSidebarShell';
import BoardsGlobalSearchModal from '@/pages/boards/layout/BoardsGlobalSearchModal';
import useBoardsSidebarCollapsed from '@/pages/boards/hooks/useBoardsSidebarCollapsed';
import { buildBoardsNavigationPath } from '@/pages/boards/utils/boards-navigation';
import { buildBoardTaskSearchPath } from '@/pages/boards/utils/boards-global-search-utils';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import {
  getInboxSection,
  getInboxSectionLabel,
  getInboxSectionOrder,
} from '@/utils/date-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useInboxSync } from '@/contexts/inbox-sync-context';
import {
  acceptBoardInvite,
  clearAllInboxNotifications,
  clearInboxNotifications,
  declineBoardInvite,
  getInboxNotifications,
  markInboxRead,
  markInboxUnread,
  snoozeInboxNotification,
  unclearInboxNotifications,
} from '@/services/inbox-service';
import { ensureBoardPushSubscription, getBoardPushPermission } from '@/services/board-push';
import InboxNotificationRow from './InboxNotificationRow';
import InboxInviteModal from './InboxInviteModal';
import InboxActivityPanel from './InboxActivityPanel';
import {
  getInviteId,
  getInviteKind,
  groupInboxByDate,
  INBOX_FILTERS,
  toggleInboxFilter,
} from './inbox-utils';

const INBOX_HEADER_ITEM = { label: 'Inbox' };
const PAGE_SIZE = 50;

function buildResourcePath(notification) {
  const type = notification?.resource_type || notification?.payload?.resource_type;
  const id = notification?.resource_id || notification?.payload?.resource_id;
  if (!type || !id) return null;

  if (type === 'list') {
    return buildBoardsNavigationPath({
      id,
      type: 'list',
      spaceId: notification.space || undefined,
      parentFolderId: notification.folder || undefined,
    });
  }
  if (type === 'folder') {
    return buildBoardsNavigationPath({
      id,
      type: 'folder',
      spaceId: notification.space || undefined,
    });
  }
  if (type === 'space') {
    return buildBoardsNavigationPath({ id, type: 'space' });
  }
  return null;
}

export default function BoardsInboxPage() {
  const navigate = useNavigate();
  const { syncVersion, refresh: refreshInboxSync } = useInboxSync();
  const [sidebarTree, setSidebarTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useBoardsSidebarCollapsed();

  const [filters, setFilters] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState(() => getBoardPushPermission());
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const handleSelectItem = useCallback(
    (item: { id?: string; type?: string }) => {
      navigate(buildBoardsNavigationPath(item));
    },
    [navigate],
  );

  const loadNotifications = useCallback(async ({ append = false, offset = 0 } = {}) => {
    const requestId = ++requestIdRef.current;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLoadError('');
    }

    const result = await getInboxNotifications({
      filters,
      limit: PAGE_SIZE,
      offset,
    });

    if (requestIdRef.current !== requestId) return;

    if (append) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }

    if (result.error) {
      if (!append) {
        setNotifications([]);
        setLoadError(result.error);
      } else {
        showErrorToast(result.error);
      }
      return;
    }

    setTotalCount(result.count);
    setHasMore(result.hasMore);
    setNotifications((prev) =>
      append ? [...prev, ...(result.notifications || [])] : result.notifications || [],
    );
  }, [filters]);

  useEffect(() => {
    loadNotifications({ append: false, offset: 0 });
  }, [loadNotifications]);

  // Live updates from shared inbox sync (realtime / visibility / poll).
  const syncVersionSeenRef = useRef(0);
  useEffect(() => {
    if (syncVersion <= 0) return;
    if (syncVersionSeenRef.current === 0) {
      syncVersionSeenRef.current = syncVersion;
      return;
    }
    if (syncVersionSeenRef.current === syncVersion) return;
    syncVersionSeenRef.current = syncVersion;
    loadNotifications({ append: false, offset: 0 });
  }, [syncVersion, loadNotifications]);

  useEffect(() => {
    // Already granted: subscribe quietly. Do not prompt here — browsers
    // ignore Notification.requestPermission() without a user click.
    if (getBoardPushPermission() !== 'granted') return;
    ensureBoardPushSubscription().catch(() => {
      /* push is optional */
    });
  }, []);

  const handleEnablePush = async () => {
    if (isEnablingPush) return;
    setIsEnablingPush(true);
    const result = await ensureBoardPushSubscription();
    setIsEnablingPush(false);
    setPushPermission(getBoardPushPermission());

    if (result?.success) {
      showSuccessToast('Browser notifications enabled');
      return;
    }
    if (result?.reason === 'denied') {
      showErrorToast('Notifications are blocked. Enable them for this site in browser settings.');
      return;
    }
    if (result?.reason === 'no_vapid') {
      showErrorToast('Push is not configured on the server.');
      return;
    }
    if (result?.reason === 'unsupported') {
      showErrorToast('This browser does not support push notifications.');
      return;
    }
    if (result?.error) {
      showErrorToast(result.error);
    }
  };

  const groupedSections = useMemo(
    () =>
      groupInboxByDate(notifications, {
        getSection: getInboxSection,
        getSectionOrder: getInboxSectionOrder,
        getSectionLabel: getInboxSectionLabel,
      }),
    [notifications],
  );

  const flatStacks = useMemo(
    () => groupedSections.flatMap((section) => section.stacks),
    [groupedSections],
  );

  const taskStacks = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const stack of flatStacks) {
      const taskId = stack.primary?.task;
      if (!taskId || seen.has(taskId)) continue;
      seen.add(taskId);
      unique.push(stack);
    }
    return unique;
  }, [flatStacks]);

  const selectedStack = useMemo(() => {
    if (!selectedTaskId) return null;
    return taskStacks.find((stack) => stack.primary?.task === selectedTaskId) || null;
  }, [taskStacks, selectedTaskId]);

  const selectedTaskIndex = useMemo(() => {
    if (!selectedTaskId) return -1;
    return taskStacks.findIndex((stack) => stack.primary?.task === selectedTaskId);
  }, [taskStacks, selectedTaskId]);

  useEffect(() => {
    setSelectedTaskId(null);
  }, [filters]);

  const patchLocalMany = useCallback((names, patch) => {
    const nameSet = new Set(Array.isArray(names) ? names : [names]);
    setNotifications((prev) =>
      prev
        .map((item) => (nameSet.has(item.name) ? { ...item, ...patch } : item))
        .filter((item) => {
          // Visibility rules only apply to rows we just mutated; leave the rest alone.
          if (!nameSet.has(item.name)) return true;

          if (filters.includes('cleared')) {
            return Boolean(item.is_cleared);
          }
          if (item.is_cleared) return false;
          if (patch.snoozed_until) return false;
          if (filters.includes('unread') && item.is_read) return false;
          return true;
        }),
    );
  }, [filters]);

  const patchLocal = useCallback((name, patch) => {
    patchLocalMany([name], patch);
  }, [patchLocalMany]);

  const handleActivateStack = async (notification, names) => {
    if (!notification?.name) return;
    const targets = (Array.isArray(names) && names.length ? names : [notification.name]).filter(
      Boolean,
    );

    const markStackRead = async () => {
      const unreadNames = targets.filter((name) => {
        const row = notifications.find((item) => item.name === name);
        // Stack primary may be forced unread for display even if DB row is read.
        return name === notification.name ? !notification.is_read : !row?.is_read;
      });
      if (!unreadNames.length) return true;
      patchLocalMany(unreadNames, { is_read: 1 });
      const result = await markInboxRead(unreadNames);
      if (result.error) {
        patchLocalMany(unreadNames, { is_read: 0 });
        showErrorToast(result.error);
        return false;
      }
      refreshInboxSync({ force: false });
      return true;
    };

    const inviteKind = getInviteKind(notification);
    if (inviteKind === 'manual') {
      const inviteId = getInviteId(notification);
      if (!inviteId) {
        showErrorToast('Invite details are missing.');
        return;
      }
      const ok = await markStackRead();
      if (!ok) return;
      setInviteTarget(notification);
      return;
    }

    if (inviteKind === 'role' || notification.type === 'access_via_role') {
      await markStackRead();
      const path = buildResourcePath(notification);
      if (path) navigate(path);
      return;
    }

    await markStackRead();

    if (notification.task) {
      setSelectedTaskId(notification.task);
    }
  };

  const handleOpenTaskFromActivity = useCallback(
    (notification) => {
      if (!notification?.task) return;
      const path = buildBoardTaskSearchPath(
        {
          id: notification.task,
          list: notification.list,
          space: notification.space,
          folder: notification.folder,
        },
        sidebarTree,
      );
      navigate(path);
    },
    [navigate, sidebarTree],
  );

  const findAdjacentTaskStack = useCallback(
    (fromIndex: number, direction: 1 | -1) => {
      for (let i = fromIndex + direction; i >= 0 && i < taskStacks.length; i += direction) {
        if (taskStacks[i]?.primary?.task) return taskStacks[i];
      }
      return null;
    },
    [taskStacks],
  );

  const handleActivityClear = async (names) => {
    const targets = (Array.isArray(names) ? names : []).filter(Boolean);
    if (!targets.length) return;
    const next = findAdjacentTaskStack(selectedTaskIndex, 1)
      || findAdjacentTaskStack(selectedTaskIndex, -1);
    patchLocalMany(targets, { is_cleared: 1 });
    const result = await clearInboxNotifications(targets);
    if (result.error) {
      showErrorToast(result.error);
      loadNotifications({ append: false });
      return;
    }
    setTotalCount((count) => Math.max(0, count - targets.length));
    refreshInboxSync({ force: false });
    setSelectedTaskId(next?.primary?.task || null);
  };

  const handleActivityUnclear = async (names) => {
    const targets = (Array.isArray(names) ? names : []).filter(Boolean);
    if (!targets.length) return;
    const next = findAdjacentTaskStack(selectedTaskIndex, 1)
      || findAdjacentTaskStack(selectedTaskIndex, -1);
    patchLocalMany(targets, { is_cleared: 0, cleared_at: null });
    const result = await unclearInboxNotifications(targets);
    if (result.error) {
      showErrorToast(result.error);
      loadNotifications({ append: false });
      return;
    }
    setTotalCount((count) => Math.max(0, count - targets.length));
    showSuccessToast(
      targets.length === 1 ? 'Notification restored' : `${targets.length} notifications restored`,
    );
    refreshInboxSync({ force: false });
    setSelectedTaskId(next?.primary?.task || null);
  };

  const handleInviteAccept = async () => {
    if (!inviteTarget || inviteBusy) return;
    const inviteId = getInviteId(inviteTarget);
    if (!inviteId) return;
    setInviteBusy(true);
    const result = await acceptBoardInvite(inviteId);
    setInviteBusy(false);
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast('Invite accepted');
    const path = buildResourcePath(inviteTarget);
    const name = inviteTarget.name;
    setInviteTarget(null);
    await clearInboxNotifications(name);
    patchLocal(name, { is_cleared: 1, is_read: 1 });
    refreshInboxSync({ force: false });
    if (path) navigate(path);
  };

  const handleInviteDecline = async () => {
    if (!inviteTarget || inviteBusy) return;
    const inviteId = getInviteId(inviteTarget);
    if (!inviteId) return;
    setInviteBusy(true);
    const result = await declineBoardInvite(inviteId);
    setInviteBusy(false);
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast('Invite declined');
    const name = inviteTarget.name;
    setInviteTarget(null);
    await clearInboxNotifications(name);
    patchLocal(name, { is_cleared: 1, is_read: 1 });
    refreshInboxSync({ force: false });
  };

  const handleMarkUnread = async (notification, names) => {
    const targets = Array.isArray(names) && names.length ? names : [notification.name];
    patchLocalMany(targets, { is_read: 0 });
    const result = await markInboxUnread(targets);
    if (result.error) {
      patchLocalMany(targets, { is_read: 1 });
      showErrorToast(result.error);
      return;
    }
    refreshInboxSync({ force: false });
  };

  const handleClear = async (notification, names) => {
    const targets = Array.isArray(names) && names.length ? names : [notification.name];
    patchLocalMany(targets, { is_cleared: 1 });
    const result = await clearInboxNotifications(targets);
    if (result.error) {
      showErrorToast(result.error);
      loadNotifications({ append: false });
      return;
    }
    setTotalCount((count) => Math.max(0, count - targets.length));
    refreshInboxSync({ force: false });
  };

  const handleUnclear = async (notification, names) => {
    const targets = Array.isArray(names) && names.length ? names : [notification.name];
    patchLocalMany(targets, { is_cleared: 0, cleared_at: null });
    const result = await unclearInboxNotifications(targets);
    if (result.error) {
      showErrorToast(result.error);
      loadNotifications({ append: false });
      return;
    }
    setTotalCount((count) => Math.max(0, count - targets.length));
    showSuccessToast(
      targets.length === 1 ? 'Notification restored' : `${targets.length} notifications restored`,
    );
    refreshInboxSync({ force: false });
  };

  const handleSnooze = async (notification, snoozedUntil, names) => {
    const targets = Array.isArray(names) && names.length ? names : [notification.name];
    const outcomes = await Promise.all(
      targets.map(async (name) => {
        const result = await snoozeInboxNotification(name, snoozedUntil);
        return { name, error: result.error || null };
      }),
    );
    const failed = outcomes.filter((item) => item.error);
    const succeeded = outcomes.filter((item) => !item.error).map((item) => item.name);

    if (succeeded.length) {
      patchLocalMany(succeeded, { snoozed_until: snoozedUntil });
      setTotalCount((count) => Math.max(0, count - succeeded.length));
      showSuccessToast(
        succeeded.length === 1 ? 'Notification snoozed' : `${succeeded.length} notifications snoozed`,
      );
      refreshInboxSync({ force: false });
    }

    if (failed.length) {
      showErrorToast(
        failed.length === targets.length
          ? failed[0].error
          : `Snoozed ${succeeded.length}/${targets.length}; some failed.`,
      );
    }
  };

  const handleClearAll = async () => {
    if (isClearingAll) return;
    setIsClearingAll(true);
    const result = await clearAllInboxNotifications();
    setIsClearingAll(false);
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast('All notifications cleared');
    if (filters.includes('cleared')) {
      loadNotifications({ append: false });
    } else {
      setNotifications([]);
      setTotalCount(0);
      setHasMore(false);
    }
    refreshInboxSync({ force: false });
  };

  return (
    <div className='flex h-dvh min-w-0 overflow-hidden'>
      <div className='flex h-full min-h-0 min-w-0 flex-1'>
        <BoardsSidebarShell collapsed={isSidebarCollapsed}>
          <Sidebar
            activeId={null}
            expandedIds={expandedIds}
            onExpandedIdsChange={setExpandedIds}
            onSelectItem={handleSelectItem}
            onTreeLoaded={setSidebarTree}
          />
        </BoardsSidebarShell>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col bg-bg-white-0'>
          <BoardHeader
            selectedItem={INBOX_HEADER_ITEM}
            onOpenSearch={() => setIsGlobalSearchOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />

          <BoardsGlobalSearchModal
            open={isGlobalSearchOpen}
            onOpenChange={setIsGlobalSearchOpen}
            sidebarTree={sidebarTree}
          />

          <InboxInviteModal
            open={Boolean(inviteTarget)}
            title={inviteTarget?.title}
            actorName={inviteTarget?.actor_name}
            resourceType={inviteTarget?.resource_type || inviteTarget?.payload?.resource_type}
            busy={inviteBusy}
            onAccept={handleInviteAccept}
            onDecline={handleInviteDecline}
            onClose={() => {
              if (!inviteBusy) setInviteTarget(null);
            }}
          />

          {!selectedTaskId ? (
            <div className='flex items-center justify-between gap-3 bg-bg-weak-50 px-3 py-2'>
              <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
                <div
                  className={cn(
                    'inline-flex h-7 items-center text-[13px] font-medium transition',
                    filters.length
                      ? 'rounded-full bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-alpha-16'
                      : 'rounded-lg text-text-sub-500',
                  )}
                >
                  <Popover.Trigger asChild>
                    <button
                      type='button'
                      className={cn(
                        'inline-flex h-full items-center gap-1.5 px-2.5 transition',
                        filters.length
                          ? 'rounded-l-full hover:bg-primary-alpha-10'
                          : 'rounded-lg hover:bg-bg-white-0',
                        filters.length && 'pr-1.5',
                      )}
                    >
                      <RiFilter3Line size={15} className='shrink-0' />
                      <span className='max-w-[180px] truncate'>
                        {filters.length === 0
                          ? 'Filter'
                          : filters.length === 1
                            ? INBOX_FILTERS.find((item) => item.id === filters[0])?.label || 'Filter'
                            : `${filters.length} filters`}
                      </span>
                    </button>
                  </Popover.Trigger>
                  {filters.length ? (
                    <button
                      type='button'
                      aria-label='Clear filters'
                      className='mr-1 flex size-5 shrink-0 items-center justify-center rounded-full text-primary-base transition hover:bg-primary-alpha-10'
                      onClick={() => {
                        setFilters([]);
                        setFilterOpen(false);
                      }}
                    >
                      <RiCloseLine size={14} />
                    </button>
                  ) : null}
                </div>
                <Popover.Content
                  side='bottom'
                  align='start'
                  sideOffset={6}
                  showArrow={false}
                  className='w-[240px] rounded-xl border border-stroke-soft-200 p-1.5 shadow-regular-md'
                >
                  {INBOX_FILTERS.map((filter) => {
                    const active = filters.includes(filter.id);
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        type='button'
                        onClick={() => setFilters((prev) => toggleInboxFilter(prev, filter.id))}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                          active
                            ? 'bg-bg-weak-50 font-medium text-primary-base'
                            : 'text-text-main-900 hover:bg-bg-weak-50',
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            'shrink-0',
                            active ? 'text-primary-base' : 'text-icon-sub-500',
                          )}
                        />
                        <span className='min-w-0 flex-1 truncate'>{filter.label}</span>
                        {active ? (
                          <RiCheckLine size={16} className='shrink-0 text-primary-base' />
                        ) : null}
                      </button>
                    );
                  })}
                </Popover.Content>
              </Popover.Root>

              <div className='flex items-center gap-0.5'>
                {pushPermission === 'default' ? (
                  <button
                    type='button'
                    disabled={isEnablingPush}
                    onClick={handleEnablePush}
                    className='inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-sub-600 transition hover:bg-bg-weak-50 disabled:opacity-40'
                  >
                    <RiNotification3Line size={15} />
                    {isEnablingPush ? 'Enabling…' : 'Enable notifications'}
                  </button>
                ) : null}
                <button
                  type='button'
                  title='Settings (coming soon)'
                  className='rounded-md p-1.5 text-icon-sub-500 hover:bg-bg-weak-50'
                >
                  <RiSettings4Line size={16} />
                </button>
                <button
                  type='button'
                  disabled={isClearingAll || (!filters.includes('cleared') && totalCount === 0)}
                  onClick={handleClearAll}
                  className='inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-sub-600 transition hover:bg-bg-weak-50 disabled:opacity-40'
                >
                  <RiCheckDoubleLine size={15} />
                  Clear all
                </button>
              </div>
            </div>
          ) : null}

          <div className={cn('relative min-h-0 flex-1', selectedTaskId ? 'bg-bg-white-0' : 'bg-bg-weak-50')}>
            {selectedTaskId ? (
              <InboxActivityPanel
                key={selectedTaskId}
                taskId={selectedTaskId}
                seedNotification={selectedStack?.primary || null}
                clearedView={filters.includes('cleared')}
                canGoPrev={Boolean(findAdjacentTaskStack(selectedTaskIndex, -1))}
                canGoNext={Boolean(findAdjacentTaskStack(selectedTaskIndex, 1))}
                onPrev={() => {
                  const prev = findAdjacentTaskStack(selectedTaskIndex, -1);
                  if (prev?.primary?.task) setSelectedTaskId(prev.primary.task);
                }}
                onNext={() => {
                  const next = findAdjacentTaskStack(selectedTaskIndex, 1);
                  if (next?.primary?.task) setSelectedTaskId(next.primary.task);
                }}
                onClose={() => setSelectedTaskId(null)}
                onClear={handleActivityClear}
                onUnclear={handleActivityUnclear}
                onOpenTask={handleOpenTaskFromActivity}
                onMarkedRead={(names) => {
                  patchLocalMany(names, { is_read: 1 });
                  refreshInboxSync({ force: false });
                }}
              />
            ) : (
              <div className='h-full overflow-y-auto p-4'>
                {loading ? (
                  <div className='flex h-40 items-center justify-center text-text-soft-400'>
                    <RiLoader4Line size={22} className='animate-spin' />
                  </div>
                ) : loadError ? (
                  <div className='flex h-40 flex-col items-center justify-center gap-2 px-4 text-center'>
                    <p className='text-sm text-text-sub-500'>{loadError}</p>
                    <button
                      type='button'
                      className='text-sm font-medium text-primary-base'
                      onClick={() => loadNotifications({ append: false })}
                    >
                      Retry
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className='flex min-h-[min(420px,calc(100%-1rem))] flex-col items-center justify-center gap-3 px-6 text-center'>
                    <span className='flex size-12 items-center justify-center rounded-full bg-bg-white-0 text-icon-sub-500 shadow-sm ring-1 ring-stroke-soft-200'>
                      <RiNotification3Line size={22} />
                    </span>
                    <div className='flex max-w-sm flex-col gap-1'>
                      <p className='text-sm font-medium text-text-main-900'>
                        {filters.length ? 'No matching notifications' : "You're all caught up"}
                      </p>
                      <p className='text-[13px] leading-5 text-text-sub-600'>
                        {filters.length
                          ? 'Try clearing filters to see everything in your inbox.'
                          : 'Mentions, assignments, and updates on tasks you follow will show up here.'}
                      </p>
                    </div>
                    {filters.length ? (
                      <button
                        type='button'
                        onClick={() => setFilters([])}
                        className='mt-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-primary-base transition hover:bg-primary-alpha-10'
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className='flex flex-col gap-4 pb-8'>
                    {groupedSections.map((section) => (
                      <section key={section.key} className='min-w-0'>
                        <div className='mb-2 px-1 text-[13px] font-medium text-text-sub-600'>
                          {section.label}
                        </div>
                        <div className='divide-y divide-stroke-soft-200 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
                          {section.stacks.map((stack) => (
                            <InboxNotificationRow
                              key={stack.stackKey}
                              notification={stack.primary}
                              count={stack.count}
                              isClearedView={filters.includes('cleared')}
                              isSelected={stack.primary?.task === selectedTaskId}
                              onActivate={(item) => handleActivateStack(item, stack.names)}
                              onMarkUnread={(item) => handleMarkUnread(item, stack.names)}
                              onClear={(item) => handleClear(item, stack.names)}
                              onUnclear={(item) => handleUnclear(item, stack.names)}
                              onSnooze={(item, until) => handleSnooze(item, until, stack.names)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}

                    {hasMore ? (
                      <div className='flex justify-center py-2'>
                        <button
                          type='button'
                          disabled={loadingMore}
                          onClick={() =>
                            loadNotifications({ append: true, offset: notifications.length })
                          }
                          className='rounded-lg px-3 py-1.5 text-sm font-medium text-primary-base hover:bg-primary-alpha-10 disabled:opacity-50'
                        >
                          {loadingMore ? 'Loading…' : 'Load more'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
