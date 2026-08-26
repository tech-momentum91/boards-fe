import {
  RiAlarmLine,
  RiAttachment2,
  RiCheckboxCircleFill,
  RiEditLine,
  RiUserLine,
} from 'react-icons/ri';
import { getPriorityColor } from '@/components/clients-management/constants';
import * as Badge from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import CircularProgress from '@/components/ui/circular-progress';
import { getCategoryProgressPercentage } from '@/pages/boards/utils/task-statuses-utils';
import { getNotificationActionPhrase } from './inbox-utils';

export type StatusSnap = {
  id?: string;
  title?: string;
  color?: string;
  category?: string;
  is_closed?: number | boolean;
};

export type InboxNotification = {
  name: string;
  type: string;
  actor?: string | null;
  actor_name?: string | null;
  actor_image?: string | null;
  title?: string | null;
  task?: string | null;
  task_title?: string | null;
  task_status?: StatusSnap | null;
  list?: string | null;
  list_title?: string | null;
  space?: string | null;
  space_title?: string | null;
  folder?: string | null;
  folder_title?: string | null;
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

export function isStatusSnap(value: unknown): value is StatusSnap {
  return Boolean(value) && typeof value === 'object' && 'title' in (value as object);
}

export function formatDisplayValue(value: unknown) {
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

export function resolveTaskStatusSnap(notification?: InboxNotification | null): StatusSnap | null {
  if (!notification) return null;
  if (notification.task_status?.title || notification.task_status?.color) {
    return notification.task_status;
  }
  const to = notification.payload?.to;
  if (isStatusSnap(to)) return to;
  return null;
}

/** Same circular status glyph used in the task status dropdown. */
export function TaskStatusGlyph({
  status,
  size = 16,
}: {
  status?: StatusSnap | null;
  size?: number;
}) {
  if (!status) {
    return (
      <span
        className='size-[15px] rounded-full border-[1.5px] border-dashed border-icon-soft-400'
        aria-hidden
      />
    );
  }

  const category = status.category || '';
  const isClosed = Boolean(status.is_closed) || category === 'done' || category === 'closed';
  const percentage = isClosed ? 100 : getCategoryProgressPercentage(category);
  const color = status.color || (isClosed ? '#1DAF61' : '#98A2B3');

  return (
    <CircularProgress
      percentage={percentage}
      color={color}
      size={size}
      variant='sector'
      aria-label={status.title || 'Task status'}
      className='shrink-0'
    />
  );
}

export function StatusIcon({ notification }: { notification: InboxNotification }) {
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

  if (type === 'task_assigned' || type === 'task_unassigned' || type === 'people_field_assigned') {
    return <RiUserLine size={16} className='text-icon-sub-500' />;
  }

  if (type === 'attachment_added') {
    return <RiAttachment2 size={16} className='text-icon-sub-500' />;
  }

  if (
    type === 'custom_field_changed' ||
    type === 'tags_changed' ||
    type === 'title_changed' ||
    type === 'description_changed'
  ) {
    return <RiEditLine size={16} className='text-icon-sub-500' />;
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

export function StatusValue({
  status,
  size = 'list',
}: {
  status?: StatusSnap | null;
  size?: 'list' | 'detail';
}) {
  if (!status?.title) return null;
  const detail = size === 'detail';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 truncate text-text-sub-600',
        detail ? 'max-w-[14rem] text-[14px]' : 'max-w-[12rem] text-[13px]',
      )}
    >
      <span
        className={cn('shrink-0 rounded-[2px]', detail ? 'size-2' : 'size-[9px]')}
        style={{ backgroundColor: status.color || '#98A2B3' }}
      />
      <span className='truncate'>{status.title}</span>
    </span>
  );
}

export function CommentBody({
  text,
  multiline = false,
  mentionClassName,
}: {
  text?: string | null;
  multiline?: boolean;
  mentionClassName?: string;
}) {
  const content = String(text || '').trim();
  if (!content) return null;

  const parts = content.split(/(@[\w.+-]+(?:\s+[\w.+-]+)?)/g);
  return (
    <span
      className={
        multiline
          ? 'whitespace-pre-wrap break-words text-[inherit] leading-[inherit]'
          : 'min-w-0 truncate text-[13px] text-text-sub-600'
      }
    >
      {parts.map((part, index) =>
        part.startsWith('@') ? (
          <span
            key={`${part}-${index}`}
            className={cn('font-medium', mentionClassName || 'text-primary-base')}
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Compact / truncated activity line used in the inbox list row. */
export function ActivityContent({
  notification,
  multiline = false,
  variant = 'list',
}: {
  notification: InboxNotification;
  multiline?: boolean;
  variant?: 'list' | 'detail';
}) {
  const type = notification.type;
  const payload = notification.payload;
  const actor = notification.actor_name || notification.actor || 'Someone';
  const phrase = getNotificationActionPhrase(notification);
  const detail = variant === 'detail';
  const phraseClass = detail ? 'font-medium text-primary-base' : 'text-primary-base';
  const actorClass = detail ? 'font-medium text-[#292d34]' : '';
  const textClass = detail
    ? 'text-[14px] leading-5 text-[#7c828d]'
    : multiline
      ? 'text-[13px] leading-5 text-text-sub-600'
      : 'truncate text-[13px] text-text-sub-600';

  if (type === 'mention' || type === 'comment_added') {
    return <CommentBody text={notification.message} multiline={multiline} />;
  }

  if (type === 'comment_reaction') {
    return (
      <span className={textClass}>
        <span className={actorClass}>{actor} </span>
        <span className={phraseClass}>reacted</span>
        {notification.message ? <span> {notification.message}</span> : null}
      </span>
    );
  }

  if (type === 'status_changed') {
    const from = isStatusSnap(payload?.from) ? payload.from : null;
    const to = isStatusSnap(payload?.to) ? payload.to : null;
    return (
      <span
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5',
          detail ? 'flex-wrap text-[14px]' : multiline ? 'flex-wrap text-[13px]' : 'overflow-hidden text-[13px]',
        )}
      >
        <span className={detail ? 'text-[#7c828d]' : multiline ? 'text-text-sub-600' : 'truncate text-text-sub-600'}>
          <span className={actorClass}>{actor}</span>{' '}
          <span className={phraseClass}>{phrase}</span>
          {from || to ? ':' : ''}
        </span>
        {from || to ? (
          <span className='inline-flex min-w-0 items-center gap-1.5 overflow-hidden'>
            <StatusValue status={from} size={variant} />
            <span className='shrink-0 text-text-soft-400'>→</span>
            <StatusValue status={to} size={variant} />
          </span>
        ) : null}
      </span>
    );
  }

  if (type === 'priority_changed') {
    const to = formatDisplayValue(payload?.to);
    return (
      <span
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5',
          detail ? 'flex-wrap text-[14px]' : multiline ? 'flex-wrap text-[13px]' : 'overflow-hidden text-[13px]',
        )}
      >
        <span className={detail ? 'text-[#7c828d]' : multiline ? 'text-text-sub-600' : 'truncate text-text-sub-600'}>
          <span className={actorClass}>{actor}</span>{' '}
          <span className={phraseClass}>{phrase}</span>
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
      <span
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5',
          detail ? 'flex-wrap text-[14px]' : multiline ? 'flex-wrap text-[13px]' : 'overflow-hidden text-[13px]',
        )}
      >
        <span className={detail ? 'text-[#7c828d]' : multiline ? 'text-text-sub-600' : 'truncate text-text-sub-600'}>
          <span className={actorClass}>{actor}</span>{' '}
          <span className={phraseClass}>{phrase}</span>
          {to ? ':' : ''}
        </span>
        {to ? (
          <span
            className={cn(
              'inline-flex max-w-[14rem] truncate rounded px-1.5 py-0.5 text-[12px] font-medium text-static-white',
              detail ? 'bg-[#e11d48]' : 'bg-success-base',
            )}
          >
            {to}
          </span>
        ) : null}
      </span>
    );
  }

  if (type === 'attachment_added') {
    const fileName = payload?.file_name || notification.message;
    return (
      <span className={textClass}>
        <span className={actorClass}>{actor} </span>
        <span className={phraseClass}>{phrase}</span>
        {fileName ? (
          <span className='ml-1 rounded bg-yellow-100 px-1 text-text-main-900'>{fileName}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={textClass}>
      <span className={actorClass}>{actor} </span>
      <span className={phraseClass}>{phrase}</span>
      {type === 'due_date_changed' || type === 'start_date_changed' || type === 'title_changed' ? (
        <>
          {formatDisplayValue(payload?.to) ? ': ' : ''}
          <span className={detail ? 'text-[#7c828d]' : 'text-text-sub-600'}>
            {formatDisplayValue(payload?.to)}
          </span>
        </>
      ) : null}
    </span>
  );
}

export function isCommentNotification(notification: InboxNotification) {
  return notification.type === 'mention' || notification.type === 'comment_added';
}

export function buildInboxBreadcrumb(notification?: InboxNotification | null) {
  if (!notification) return [];
  return [notification.space_title, notification.folder_title, notification.list_title].filter(
    Boolean,
  ) as string[];
}
