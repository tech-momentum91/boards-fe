import { useMemo, useState } from 'react';
import {
  RiArrowGoBackLine,
  RiCheckLine,
  RiInboxArchiveLine,
  RiMailLine,
  RiTimeLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { formatInboxDateTime } from '@/utils/date-utils';
import {
  ActivityContent,
  TaskStatusGlyph,
  resolveTaskStatusSnap,
  type InboxNotification,
} from './inbox-activity-shared';
import InboxSnoozePopover from './InboxSnoozePopover';

type InboxNotificationRowProps = {
  notification: InboxNotification;
  count?: number;
  isClearedView?: boolean;
  isSelected?: boolean;
  onActivate: (notification: InboxNotification) => void;
  onMarkUnread: (notification: InboxNotification) => void;
  onClear: (notification: InboxNotification) => void;
  onUnclear: (notification: InboxNotification) => void;
  onSnooze: (notification: InboxNotification, snoozedUntil: string) => void;
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

/**
 * ClickUp light inbox row inside a bordered table group:
 * status · title · avatar · activity · count · date
 * Hover: mark · snooze · Clear / Unclear (primary)
 */
export default function InboxNotificationRow({
  notification,
  count = 1,
  isClearedView = false,
  isSelected = false,
  onActivate,
  onMarkUnread,
  onClear,
  onUnclear,
  onSnooze,
}: InboxNotificationRowProps) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const isRead = Boolean(notification.is_read);
  const title = notification.task_title || notification.title || 'Notification';
  const actor = notification.actor_name || notification.actor || 'Someone';
  const initials = useMemo(() => getInitials(actor), [actor]);
  const avatarColor = useMemo(() => avatarColorFor(actor), [actor]);
  const displayCount = Number.isFinite(count) && count > 0 ? count : 1;
  const showAsCleared = isClearedView || Boolean(notification.is_cleared);

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onActivate(notification)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate(notification);
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition',
        'hover:bg-bg-weak-50',
        !isRead && 'bg-primary-alpha-10/10',
        isSelected && 'bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center'>
        <TaskStatusGlyph status={resolveTaskStatusSnap(notification)} size={16} />
      </span>

      <span
        className={cn(
          'w-[200px] shrink-0 truncate text-[13px] text-text-main-900',
          !isRead && 'font-medium',
        )}
        title={title}
      >
        {title}
      </span>

      {notification.actor_image ? (
        <Avatar.Root size='20' className='shrink-0'>
          <Avatar.Image src={notification.actor_image} alt={actor} />
        </Avatar.Root>
      ) : notification.actor ? (
        <Avatar.Root size='20' color={avatarColor} className='shrink-0 text-[9px] font-semibold'>
          {initials}
        </Avatar.Root>
      ) : (
        <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-bg-weak-100 text-icon-sub-500'>
          <RiUserLine size={12} />
        </span>
      )}

      <span className='min-w-0 flex-1 overflow-hidden pl-1'>
        <ActivityContent notification={notification} />
      </span>

      <span className='relative ml-2 flex h-8 w-[8.75rem] shrink-0 items-center justify-end'>
        <span className='flex items-center gap-3 group-hover:invisible'>
          <span
            className={cn(
              'inline-flex size-[20px] items-center justify-center rounded-full border text-[11px] leading-none',
              isRead
                ? 'border-stroke-soft-200 text-text-soft-400'
                : 'border-stroke-sub-300 text-text-sub-600',
            )}
            aria-label={`${displayCount} notification${displayCount === 1 ? '' : 's'}`}
          >
            {displayCount > 99 ? '99+' : displayCount}
          </span>
          <span className='min-w-[3.5rem] text-right text-[12px] tabular-nums text-text-soft-400'>
            {formatInboxDateTime(notification.creation)}
          </span>
        </span>

        <span
          className='absolute inset-y-0 right-0 hidden items-center gap-0.5 group-hover:flex'
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {showAsCleared ? (
            <button
              type='button'
              title='Unclear'
              className='inline-flex items-center gap-1 rounded-md bg-primary-base px-2.5 py-1.5 text-[12px] font-medium text-static-white hover:opacity-90'
              onClick={() => onUnclear(notification)}
            >
              <RiArrowGoBackLine size={14} />
              Unclear
            </button>
          ) : (
            <>
              {isRead ? (
                <button
                  type='button'
                  title='Mark unread'
                  className='rounded-md p-1.5 text-icon-sub-500 hover:bg-bg-white-0 hover:text-text-main-900'
                  onClick={() => onMarkUnread(notification)}
                >
                  <RiMailLine size={16} />
                </button>
              ) : (
                <button
                  type='button'
                  title='Mark read'
                  className='rounded-md p-1.5 text-icon-sub-500 hover:bg-bg-white-0 hover:text-text-main-900'
                  onClick={() => onActivate(notification)}
                >
                  <RiInboxArchiveLine size={16} />
                </button>
              )}

              <InboxSnoozePopover
                open={snoozeOpen}
                onOpenChange={setSnoozeOpen}
                onSelect={(until) => onSnooze(notification, until)}
              >
                <button
                  type='button'
                  title='Snooze'
                  className='rounded-md p-1.5 text-icon-sub-500 hover:bg-bg-white-0 hover:text-text-main-900'
                  onClick={(event) => {
                    event.stopPropagation();
                    setSnoozeOpen(true);
                  }}
                >
                  <RiTimeLine size={16} />
                </button>
              </InboxSnoozePopover>

              <button
                type='button'
                title='Clear'
                className='ml-0.5 inline-flex items-center gap-1 rounded-md bg-primary-base px-2.5 py-1.5 text-[12px] font-medium text-static-white hover:opacity-90'
                onClick={() => onClear(notification)}
              >
                <RiCheckLine size={14} />
                Clear
              </button>
            </>
          )}
        </span>
      </span>
    </div>
  );
}
