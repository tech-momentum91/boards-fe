import { useMemo, useState } from 'react';
import {
  RiAlarmLine,
  RiArrowGoBackLine,
  RiCheckboxCircleFill,
  RiCheckLine,
  RiInboxArchiveLine,
  RiMailLine,
  RiTimeLine,
  RiUserLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import { getPriorityColor } from '@/components/clients-management/constants';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { formatInboxDateTime } from '@/utils/date-utils';
import { getNotificationActionPhrase } from './inbox-utils';
import InboxSnoozePopover from './InboxSnoozePopover';

type StatusSnap = {
  id?: string;
  title?: string;
  color?: string;
  is_closed?: number | boolean;
};

type InboxNotification = {
  name: string;
  type: string;
  actor?: string | null;
  actor_name?: string | null;
  actor_image?: string | null;
  title?: string | null;
  task_title?: string | null;
  message?: string | null;
  payload?: {
    from?: StatusSnap | string | null;
    to?: StatusSnap | string | null;
    emoji?: string;
    file_name?: string;
    field_name?: string;
    field_id?: string;
    added?: string[];
    removed?: string[];
  } | null;
  is_read?: number | boolean;
  is_cleared?: number | boolean;
  creation?: string;
};

type InboxNotificationRowProps = {
  notification: InboxNotification;
  count?: number;
  isClearedView?: boolean;
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

function isStatusSnap(value: unknown): value is StatusSnap {
  return Boolean(value) && typeof value === 'object' && 'title' in (value as object);
}

function formatDisplayValue(value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String).join(', ') || null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.title === 'string') return record.title;
    if (typeof record.name === 'string') return record.name;
    if (typeof record.label === 'string') return record.label;
  }
  return null;
}

function StatusIcon({ notification }: { notification: InboxNotification }) {
  const type = notification.type;
  const to = notification.payload?.to;

  if (type === 'overdue') {
    return (
      <span
        className='flex size-[18px] items-center justify-center rounded-full border-2 border-error-base'
        aria-hidden
      >
        <span className='size-1.5 rounded-full bg-error-base' />
      </span>
    );
  }

  if (type === 'reminder' || type === 'due_soon') {
    return <RiAlarmLine size={18} className='text-primary-base' />;
  }

  if (isStatusSnap(to) && to.is_closed) {
    return <RiCheckboxCircleFill size={18} className='text-success-base' />;
  }

  if (isStatusSnap(to) && to.color) {
    return (
      <span
        className='size-[15px] rounded-full'
        style={{ backgroundColor: to.color }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className='size-[15px] rounded-full border-[1.5px] border-dashed border-icon-soft-400'
      aria-hidden
    />
  );
}

function StatusValue({ status }: { status?: StatusSnap | null }) {
  if (!status?.title) return null;
  return (
    <span className='inline-flex max-w-[9rem] items-center gap-1 truncate text-[13px] text-text-sub-600'>
      <span
        className='size-[9px] shrink-0 rounded-[2px]'
        style={{ backgroundColor: status.color || '#98A2B3' }}
      />
      <span className='truncate'>{status.title}</span>
    </span>
  );
}

function CommentBody({ text }: { text?: string | null }) {
  const content = String(text || '').trim();
  if (!content) return null;

  const parts = content.split(/(@[\w.+-]+(?:\s+[\w.+-]+)?)/g);
  return (
    <span className='min-w-0 truncate text-[13px] text-text-sub-600'>
      {parts.map((part, index) =>
        part.startsWith('@') ? (
          <span key={`${part}-${index}`} className='font-medium text-primary-base'>
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}

function ActivityContent({ notification }: { notification: InboxNotification }) {
  const type = notification.type;
  const payload = notification.payload;
  const actor = notification.actor_name || notification.actor || 'Someone';
  const phrase = getNotificationActionPhrase(notification);

  if (type === 'mention' || type === 'comment_added') {
    return <CommentBody text={notification.message} />;
  }

  if (type === 'comment_reaction') {
    return (
      <span className='truncate text-[13px] text-text-sub-600'>
        <span>{actor} </span>
        <span className='text-primary-base'>reacted</span>
        {notification.message ? <span> {notification.message}</span> : null}
      </span>
    );
  }

  if (type === 'status_changed') {
    const from = isStatusSnap(payload?.from) ? payload.from : null;
    const to = isStatusSnap(payload?.to) ? payload.to : null;
    return (
      <span className='inline-flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px]'>
        <span className='truncate text-text-sub-600'>
          {actor} <span className='text-primary-base'>{phrase}</span>
          {from || to ? ':' : ''}
        </span>
        {from || to ? (
          <span className='inline-flex min-w-0 items-center gap-1.5 overflow-hidden'>
            <StatusValue status={from} />
            <span className='shrink-0 text-text-soft-400'>→</span>
            <StatusValue status={to} />
          </span>
        ) : null}
      </span>
    );
  }

  if (type === 'priority_changed') {
    const to = formatDisplayValue(payload?.to);
    return (
      <span className='inline-flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px]'>
        <span className='truncate text-text-sub-600'>
          {actor} <span className='text-primary-base'>{phrase}</span>
          {to ? ':' : ''}
        </span>
        {to ? (
          <Badge.Root variant='light' color={getPriorityColor(to)} className='uppercase'>
            {to}
          </Badge.Root>
        ) : null}
      </span>
    );
  }

  if (type === 'custom_field_changed') {
    const to = formatDisplayValue(payload?.to);
    return (
      <span className='inline-flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px]'>
        <span className='truncate text-text-sub-600'>
          {actor} <span className='text-primary-base'>{phrase}</span>
          {to ? ':' : ''}
        </span>
        {to ? (
          <span className='inline-flex max-w-[10rem] truncate rounded px-1.5 py-0.5 text-[12px] font-medium text-static-white bg-success-base'>
            {to}
          </span>
        ) : null}
      </span>
    );
  }

  if (type === 'attachment_added') {
    const fileName = payload?.file_name || notification.message;
    return (
      <span className='min-w-0 truncate text-[13px] text-text-sub-600'>
        <span>{actor} </span>
        <span className='text-primary-base'>{phrase}</span>
        {fileName ? (
          <span className='ml-1 rounded bg-yellow-100 px-1 text-text-main-900'>{fileName}</span>
        ) : null}
      </span>
    );
  }

  // Default: "Actor assigned this task to you" with action in primary blue
  return (
    <span className='min-w-0 truncate text-[13px] text-text-sub-600'>
      <span>{actor} </span>
      <span className='text-primary-base'>{phrase}</span>
      {type === 'due_date_changed' || type === 'start_date_changed' || type === 'title_changed' ? (
        <>
          {formatDisplayValue(payload?.to) ? ': ' : ''}
          <span className='text-text-sub-600'>{formatDisplayValue(payload?.to)}</span>
        </>
      ) : null}
    </span>
  );
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
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center'>
        <StatusIcon notification={notification} />
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
