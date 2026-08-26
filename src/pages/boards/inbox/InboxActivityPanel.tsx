import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAlarmLine,
  RiArchiveLine,
  RiArrowDownSLine,
  RiArrowGoBackLine,
  RiArrowLeftSLine,
  RiArrowUpSLine,
  RiBookmarkLine,
  RiCheckLine,
  RiEmotionHappyLine,
  RiExpandDiagonalLine,
  RiLayoutRightLine,
  RiLoader4Line,
  RiMoreLine,
  RiNotificationOffLine,
  RiReplyLine,
  RiShareForwardLine,
  RiSparklingLine,
  RiThumbUpLine,
  RiUserAddLine,
} from 'react-icons/ri';
import { format, isToday, isYesterday } from 'date-fns';
import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { parseToDate } from '@/utils/date-utils';
import { getTaskInboxNotifications, markInboxRead } from '@/services/inbox-service';
import {
  ActivityContent,
  CommentBody,
  StatusIcon,
  TaskStatusGlyph,
  buildInboxBreadcrumb,
  isCommentNotification,
  resolveTaskStatusSnap,
  type InboxNotification,
} from './inbox-activity-shared';

type InboxActivityPanelProps = {
  taskId: string;
  seedNotification?: InboxNotification | null;
  clearedView?: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  onClear: (names: string[]) => void | Promise<void>;
  onUnclear: (names: string[]) => void | Promise<void>;
  onOpenTask: (notification: InboxNotification) => void;
  onMarkedRead?: (names: string[]) => void;
};

const AVATAR_COLORS = ['yellow', 'blue', 'sky', 'purple', 'red', 'gray'] as const;

function getInitials(name?: string | null) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function avatarColorFor(name?: string | null) {
  const value = String(name || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] || 'gray';
}

function formatActivityTimestamp(input?: string | null) {
  const date = parseToDate(input);
  if (!date) return '';
  const time = format(date, 'h:mm a').toLowerCase();
  if (isToday(date)) return time;
  if (isYesterday(date)) return `Yesterday at ${time}`;
  return format(date, "MMM d 'at' h:mm a").replace(/AM|PM/g, (m) => m.toLowerCase());
}

function IconGhostButton({
  title,
  onClick,
  children,
  disabled,
  className,
}: {
  title: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type='button'
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 text-[#7c828d] transition hover:bg-[#eef0f3] hover:text-[#292d34] disabled:opacity-30',
        className,
      )}
    >
      {children}
    </button>
  );
}

function CommentActivityCard({
  notification,
  highlighted,
  onOpenTask,
}: {
  notification: InboxNotification;
  highlighted?: boolean;
  onOpenTask: (notification: InboxNotification) => void;
}) {
  const actor = notification.actor_name || notification.actor || 'Someone';
  const initials = useMemo(() => getInitials(actor), [actor]);
  const avatarColor = useMemo(() => avatarColorFor(actor), [actor]);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[10px] border border-[#e4e6eb] bg-bg-white-0',
        highlighted && 'ring-0',
      )}
    >
      {highlighted ? (
        <span className='absolute inset-y-0 left-0 w-[3px] bg-primary-base' aria-hidden />
      ) : null}

      <div className='flex items-center gap-2.5 px-4 pt-3.5'>
        {notification.actor_image ? (
          <Avatar.Root size='32' className='shrink-0'>
            <Avatar.Image src={notification.actor_image} alt={actor} />
          </Avatar.Root>
        ) : (
          <Avatar.Root size='32' color={avatarColor} className='shrink-0 text-[11px] font-semibold'>
            {initials}
          </Avatar.Root>
        )}

        <div className='flex min-w-0 flex-1 items-baseline gap-2'>
          <span className='truncate text-[14px] font-semibold text-[#292d34]'>{actor}</span>
          <span className='shrink-0 text-[12px] text-[#7c828d]'>
            {formatActivityTimestamp(notification.creation)}
          </span>
        </div>

        <div className='flex shrink-0 items-center text-[#9aa1ab] opacity-0 transition group-hover:opacity-100'>
          <IconGhostButton title='AI'>
            <RiSparklingLine size={15} className='text-[#7c6af2]' />
          </IconGhostButton>
          <IconGhostButton title='Bookmark'>
            <RiBookmarkLine size={15} />
          </IconGhostButton>
          <IconGhostButton title='Share'>
            <RiShareForwardLine size={15} />
          </IconGhostButton>
          <IconGhostButton title='Assign'>
            <RiUserAddLine size={15} />
          </IconGhostButton>
          <IconGhostButton title='Reply' onClick={() => onOpenTask(notification)}>
            <RiReplyLine size={15} />
          </IconGhostButton>
          <IconGhostButton title='More'>
            <RiMoreLine size={15} />
          </IconGhostButton>
        </div>
      </div>

      <div className='px-4 pb-3 pt-1.5 pl-[3.35rem] text-[14px] leading-[1.45] text-[#292d34]'>
        <CommentBody text={notification.message} multiline mentionClassName='text-primary-base' />
      </div>

      <div className='flex items-center justify-between border-t border-[#eef0f3] px-3 py-1'>
        <div className='flex items-center'>
          <IconGhostButton title='Like'>
            <RiThumbUpLine size={16} />
          </IconGhostButton>
          <IconGhostButton title='Add reaction'>
            <RiEmotionHappyLine size={16} />
          </IconGhostButton>
        </div>
        <button
          type='button'
          className='rounded-md px-2 py-1 text-[13px] font-medium text-[#7c828d] transition hover:bg-[#eef0f3] hover:text-[#292d34]'
          onClick={() => onOpenTask(notification)}
        >
          Reply
        </button>
      </div>
    </div>
  );
}

function ActivityFeedItem({
  notification,
  highlighted,
  onOpenTask,
}: {
  notification: InboxNotification;
  highlighted?: boolean;
  onOpenTask: (notification: InboxNotification) => void;
}) {
  if (isCommentNotification(notification)) {
    return (
      <CommentActivityCard
        notification={notification}
        highlighted={highlighted}
        onOpenTask={onOpenTask}
      />
    );
  }

  return (
    <div className='flex items-start gap-2.5 py-1'>
      <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center text-[#9aa1ab]'>
        <StatusIcon notification={notification} />
      </span>
      <div className='min-w-0 flex-1'>
        <ActivityContent notification={notification} multiline variant='detail' />
      </div>
      <span className='shrink-0 pt-0.5 text-[12px] tabular-nums text-[#7c828d]'>
        {formatActivityTimestamp(notification.creation)}
      </span>
    </div>
  );
}

export default function InboxActivityPanel({
  taskId,
  seedNotification = null,
  clearedView = false,
  canGoPrev = false,
  canGoNext = false,
  onPrev,
  onNext,
  onClose,
  onClear,
  onUnclear,
  onOpenTask,
  onMarkedRead,
}: InboxActivityPanelProps) {
  const [items, setItems] = useState<InboxNotification[]>(
    seedNotification ? [seedNotification] : [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  const headerNotification = items[0] || seedNotification;
  const title = headerNotification?.task_title || headerNotification?.title || 'Task activity';
  const crumbs = buildInboxBreadcrumb(headerNotification);
  const names = useMemo(() => items.map((item) => item.name).filter(Boolean), [items]);
  const highlightName = seedNotification?.name || null;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    setItems(seedNotification?.task === taskId && seedNotification ? [seedNotification] : []);

    getTaskInboxNotifications({ task: taskId, cleared: clearedView, limit: 100 }).then((result) => {
      if (requestIdRef.current !== requestId) return;
      setLoading(false);
      if (result.error) {
        setLoadError(result.error);
        return;
      }
      const nextItems = result.notifications || [];
      setItems(nextItems);

      const unreadNames = nextItems
        .filter((item) => !item.is_read)
        .map((item) => item.name)
        .filter(Boolean);
      if (!unreadNames.length || clearedView) return;

      markInboxRead(unreadNames).then((markResult) => {
        if (requestIdRef.current !== requestId || markResult.error) return;
        setItems((prev) =>
          prev.map((item) => (unreadNames.includes(item.name) ? { ...item, is_read: 1 } : item)),
        );
        onMarkedRead?.(unreadNames);
      });
    });

    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, clearedView]);

  const handleClearOrUnclear = async () => {
    if (busy || !names.length) return;
    setBusy(true);
    try {
      if (clearedView) {
        await onUnclear(names);
      } else {
        await onClear(names);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='flex h-full min-h-0 gap-4 bg-bg-white-0 px-6 py-4'>
      <div className='flex w-12 shrink-0 flex-col items-center pt-2'>
        <IconGhostButton title='Back to inbox' onClick={onClose}>
          <RiArrowLeftSLine size={20} />
        </IconGhostButton>
        <div className='mt-3 flex flex-col overflow-hidden rounded-md border border-[#e4e6eb]'>
          <IconGhostButton title='Previous' onClick={onPrev} disabled={!canGoPrev} className='rounded-none'>
            <RiArrowUpSLine size={16} />
          </IconGhostButton>
          <IconGhostButton title='Next' onClick={onNext} disabled={!canGoNext} className='rounded-none'>
            <RiArrowDownSLine size={16} />
          </IconGhostButton>
        </div>
      </div>

      <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto'>
        <div className='flex items-start gap-3 px-2 pb-4'>
          <div className='min-w-0 flex-1'>
            {crumbs.length ? (
              <div className='mb-1 truncate text-[12px] text-[#7c828d]'>{crumbs.join(' / ')}</div>
            ) : null}
            <div className='flex min-w-0 items-center gap-2'>
              {headerNotification ? (
                <TaskStatusGlyph status={resolveTaskStatusSnap(headerNotification)} size={18} />
              ) : null}
              <h2 className='min-w-0 truncate text-[18px] font-semibold leading-6 tracking-tight text-[#292d34]'>
                {title}
              </h2>
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-1 pt-0.5'>
            <div className='mr-1 hidden items-center lg:flex'>
              <IconGhostButton title='Expand'>
                <RiExpandDiagonalLine size={16} />
              </IconGhostButton>
              <IconGhostButton title='Mute'>
                <RiNotificationOffLine size={16} />
              </IconGhostButton>
              <IconGhostButton title='Archive'>
                <RiArchiveLine size={16} />
              </IconGhostButton>
              <IconGhostButton title='Snooze'>
                <RiAlarmLine size={16} />
              </IconGhostButton>
              <IconGhostButton title='More'>
                <RiMoreLine size={16} />
              </IconGhostButton>
            </div>

            {headerNotification ? (
              <button
                type='button'
                onClick={() => onOpenTask(headerNotification)}
                className='inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d6d9de] bg-bg-white-0 px-2.5 text-[13px] font-medium text-[#292d34] transition hover:bg-[#eef0f3]'
              >
                <RiLayoutRightLine size={15} className='text-[#7c828d]' />
                Details
              </button>
            ) : null}

            <button
              type='button'
              disabled={busy || !names.length}
              onClick={handleClearOrUnclear}
              className='ml-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-base px-3 text-[13px] font-medium text-static-white transition hover:bg-primary-dark disabled:opacity-40'
            >
              {clearedView ? <RiArrowGoBackLine size={15} /> : <RiCheckLine size={15} />}
              {clearedView ? 'Unclear' : 'Clear'}
            </button>
          </div>
        </div>

        <div className='rounded-2xl border border-[#e4e6eb] bg-[#f7f8fa] px-10 py-6'>
            {loading && !items.length ? (
              <div className='flex h-24 items-center justify-center text-text-soft-400'>
                <RiLoader4Line size={22} className='animate-spin' />
              </div>
            ) : loadError && !items.length ? (
              <div className='flex h-24 flex-col items-center justify-center gap-2 text-center'>
                <p className='text-sm text-text-sub-500'>{loadError}</p>
              </div>
            ) : !items.length ? (
              <div className='flex h-24 items-center justify-center text-sm text-text-sub-500'>
                No activity for this task
              </div>
            ) : (
              <div className='flex flex-col gap-5'>
                {items.map((item) => (
                  <ActivityFeedItem
                    key={item.name}
                    notification={item}
                    highlighted={
                      highlightName
                        ? item.name === highlightName
                        : isCommentNotification(item) && item.name === items[0]?.name
                    }
                    onOpenTask={onOpenTask}
                  />
                ))}
                {loading ? (
                  <div className='flex justify-center py-2 text-text-soft-400'>
                    <RiLoader4Line size={18} className='animate-spin' />
                  </div>
                ) : null}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
