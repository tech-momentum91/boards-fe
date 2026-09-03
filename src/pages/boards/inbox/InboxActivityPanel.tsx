import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  RiArrowDownSLine,
  RiArrowGoBackLine,
  RiArrowLeftSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiNotification3Line,
  RiNotificationOffLine,
  RiTimeLine,
} from 'react-icons/ri';
import { format, isToday, isYesterday } from 'date-fns';
import * as Avatar from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import { parseToDate } from '@/utils/date-utils';
import { showErrorToast } from '@/utils/error-utils';
import { useMentionSearch } from '@/hooks/use-mention-search';
import { getTaskInboxNotifications, markInboxRead } from '@/services/inbox-service';
import { addBoardTaskComment, toggleBoardTaskCommentReaction, uploadBoardCommentAttachment } from '@/services/tasks-service';
import BoardCommentComposer from '@/pages/boards/comments/BoardCommentComposer';
import CommentReactionsBar from '@/pages/boards/components/comment-reactions-bar';
import { buildBoardTaskSearchPath } from '@/pages/boards/utils/boards-global-search-utils';
import {
  ActivityContent,
  CommentBody,
  StatusIcon,
  TaskStatusGlyph,
  buildInboxBreadcrumb,
  isCommentNotification,
  resolveInboxCommentId,
  resolveTaskStatusSnap,
  type InboxNotification,
} from './inbox-activity-shared';
import InboxSnoozePopover from './InboxSnoozePopover';

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
  onSnooze: (snoozedUntil: string, names: string[]) => void | Promise<void>;
  onMute: (taskId: string, shouldMute: boolean) => Promise<{ error?: string } | void>;
  onOpenTask: (notification: InboxNotification) => void;
  onMarkedRead?: (names: string[]) => void;
  sidebarTree?: unknown[];
};

function htmlToPlainText(html?: string | null) {
  const value = String(html || '').trim();
  if (!value) return '';
  const template = document.createElement('div');
  template.innerHTML = value;
  return (template.textContent || template.innerText || '').replace(/\s+/g, ' ').trim();
}

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
  isReplying = false,
  onReply,
  onToggleReaction,
}: {
  notification: InboxNotification;
  highlighted?: boolean;
  isReplying?: boolean;
  onReply?: () => void;
  onToggleReaction?: (commentId: string, emoji: string) => Promise<void> | void;
}) {
  const actor = notification.actor_name || notification.actor || 'Someone';
  const initials = useMemo(() => getInitials(actor), [actor]);
  const avatarColor = useMemo(() => avatarColorFor(actor), [actor]);
  const commentId = resolveInboxCommentId(notification);
  const canReact = Boolean(commentId && onToggleReaction);

  return (
    <div
      className={cn(
        'relative rounded-[10px] border border-[#e4e6eb] bg-bg-white-0',
        highlighted && 'ring-0',
      )}
    >
      {highlighted ? (
        <span className='absolute inset-y-0 left-0 w-[3px] rounded-l-[10px] bg-primary-base' aria-hidden />
      ) : null}

      <div className='flex items-center gap-2.5 px-4 pt-3.5 pb-0.5'>
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
      </div>

      <div className='px-4 pb-3.5 pt-2.5 pl-[3.35rem] text-[14px] leading-5 text-[#292d34]'>
        <CommentBody text={notification.message} multiline mentionClassName='text-primary-base' />
      </div>

      <div className='flex items-center justify-between gap-2 border-t border-[#eef0f3] px-4 py-2 pl-[3.35rem]'>
        <CommentReactionsBar
          className='mt-0 border-t-0 pt-0'
          reactions={notification.reactions ?? []}
          onToggleReaction={
            canReact ? (emoji) => onToggleReaction?.(commentId, emoji) : undefined
          }
          readOnly={!canReact}
        />
        {onReply ? (
          <button
            type='button'
            className={cn(
              'shrink-0 rounded-md px-2 py-1 text-[13px] font-medium transition',
              isReplying
                ? 'bg-[#eef0f3] text-[#292d34]'
                : 'text-[#7c828d] hover:bg-[#eef0f3] hover:text-[#292d34]',
            )}
            onClick={onReply}
          >
            Reply
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ActivityFeedItem({
  notification,
  highlighted,
  isReplying,
  onReply,
  onToggleReaction,
}: {
  notification: InboxNotification;
  highlighted?: boolean;
  isReplying?: boolean;
  onReply?: () => void;
  onToggleReaction?: (commentId: string, emoji: string) => Promise<void> | void;
}) {
  if (isCommentNotification(notification)) {
    return (
      <CommentActivityCard
        notification={notification}
        highlighted={highlighted}
        isReplying={isReplying}
        onReply={onReply}
        onToggleReaction={onToggleReaction}
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
  onSnooze,
  onMute,
  onOpenTask,
  onMarkedRead,
  sidebarTree = [],
}: InboxActivityPanelProps) {
  const { profileData } = useSelector((state) => state.profile);
  const { searchMentions } = useMentionSearch({
    listId: seedNotification?.list ?? null,
  });
  const [items, setItems] = useState<InboxNotification[]>(
    seedNotification ? [seedNotification] : [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [muteKnown, setMuteKnown] = useState(false);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const requestIdRef = useRef(0);
  const isSubmittingReplyRef = useRef(false);
  const muteInFlightRef = useRef(false);
  const composerRef = useRef<{ focus?: () => void } | null>(null);

  const headerNotification = items[0] || seedNotification;
  const title = headerNotification?.task_title || headerNotification?.title || 'Task activity';
  const crumbs = buildInboxBreadcrumb(headerNotification);
  const names = useMemo(
    () =>
      items
        .map((item) => item.name)
        .filter((name) => Boolean(name) && !String(name).startsWith('local-comment-')),
    [items],
  );
  const highlightName = seedNotification?.name || null;
  const taskPath =
    headerNotification?.task && headerNotification?.list
      ? buildBoardTaskSearchPath(
          {
            id: headerNotification.task,
            list: headerNotification.list,
            space: headerNotification.space,
            folder: headerNotification.folder,
          },
          sidebarTree,
        )
      : null;

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
      if (typeof result.isMuted === 'boolean') {
        setMuted(result.isMuted);
        setMuteKnown(true);
      } else if (typeof result.isWatching === 'boolean') {
        // Older backends: approximate mute from watching.
        setMuted(!result.isWatching);
        setMuteKnown(true);
      }

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

  useEffect(() => {
    setMuted(false);
    setMuteKnown(false);
    setSnoozeOpen(false);
    setReplyingToName(null);
    setIsSubmittingReply(false);
    isSubmittingReplyRef.current = false;
    muteInFlightRef.current = false;
  }, [taskId]);

  useEffect(() => {
    if (!replyingToName) return undefined;
    const timer = window.setTimeout(() => composerRef.current?.focus?.(), 0);
    return () => window.clearTimeout(timer);
  }, [replyingToName]);

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

  const handleSnoozeSelect = async (until: string) => {
    if (busy || !names.length) return;
    setBusy(true);
    try {
      await onSnooze(until, names);
    } finally {
      setBusy(false);
    }
  };

  const handleMuteToggle = async () => {
    if (busy || muteInFlightRef.current || !taskId || !muteKnown) return;
    const shouldMute = !muted;
    muteInFlightRef.current = true;
    setBusy(true);
    try {
      const result = await onMute(taskId, shouldMute);
      if (!result?.error) setMuted(shouldMute);
    } finally {
      muteInFlightRef.current = false;
      setBusy(false);
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    if (!commentId || !emoji) return;
    const result = await toggleBoardTaskCommentReaction({ commentId, emoji });
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    const nextReactions = Array.isArray(result.data?.reactions) ? result.data.reactions : null;
    if (!nextReactions) return;
    setItems((prev) =>
      prev.map((item) =>
        resolveInboxCommentId(item) === commentId ? { ...item, reactions: nextReactions } : item,
      ),
    );
  };

  const handleAddReply = async (content: string, pendingFiles: File[] = []) => {
    if (!taskId || isSubmittingReplyRef.current) return;
    isSubmittingReplyRef.current = true;
    setIsSubmittingReply(true);
    try {
      const result = await addBoardTaskComment({ taskId, message: content });
      if (result.error) {
        throw new Error(result.error);
      }

      const commentId = result.data?.name ?? result.data?.id;
      const files = Array.isArray(pendingFiles) ? pendingFiles : [];
      if (commentId && files.length > 0) {
        await Promise.all(
          files.map((file) =>
            uploadBoardCommentAttachment(commentId, file).then((uploadResult) => {
              if (uploadResult.error) {
                showErrorToast(`Failed to attach '${file.name}': ${uploadResult.error}`);
              }
            }),
          ),
        );
      }

      const message =
        htmlToPlainText(result.data?.content) || htmlToPlainText(content) || 'Comment';
      setItems((prev) => [
        {
          name: commentId ? `local-comment-${commentId}` : `local-comment-${crypto.randomUUID()}`,
          type: 'comment_added',
          actor: profileData?.email || null,
          actor_name: profileData?.full_name || profileData?.email || 'You',
          actor_image: profileData?.profile_image || null,
          message,
          comment_id: commentId || null,
          task: taskId,
          list: headerNotification?.list,
          space: headerNotification?.space,
          folder: headerNotification?.folder,
          task_title: headerNotification?.task_title,
          creation: result.data?.creation || new Date().toISOString(),
          is_read: 1,
        },
        ...prev,
      ]);
      setReplyingToName(null);
    } finally {
      isSubmittingReplyRef.current = false;
      setIsSubmittingReply(false);
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
              <nav aria-label='Board location' className='mb-1 truncate text-[12px] text-[#7c828d]'>
                {crumbs.map((crumb, index) => (
                  <span key={crumb.key}>
                    {index > 0 ? ' / ' : null}
                    {crumb.path ? (
                      <Link
                        to={crumb.path}
                        className='hover:text-[#292d34] hover:underline'
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      crumb.label
                    )}
                  </span>
                ))}
              </nav>
            ) : null}
            {taskPath ? (
              <Link
                to={taskPath}
                className='flex min-w-0 items-center gap-2 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary-base/40'
              >
                {headerNotification ? (
                  <TaskStatusGlyph status={resolveTaskStatusSnap(headerNotification)} size={18} />
                ) : null}
                <h2 className='min-w-0 truncate text-[18px] font-semibold leading-6 tracking-tight text-[#292d34] hover:underline'>
                  {title}
                </h2>
              </Link>
            ) : (
              <div className='flex min-w-0 items-center gap-2'>
                {headerNotification ? (
                  <TaskStatusGlyph status={resolveTaskStatusSnap(headerNotification)} size={18} />
                ) : null}
                <h2 className='min-w-0 truncate text-[18px] font-semibold leading-6 tracking-tight text-[#292d34]'>
                  {title}
                </h2>
              </div>
            )}
          </div>

          <div className='flex shrink-0 items-center gap-1 pt-0.5'>
            <IconGhostButton
              title={
                muted
                  ? 'Unmute notifications for this task'
                  : 'Mute notifications for this task'
              }
              onClick={handleMuteToggle}
              disabled={busy || !muteKnown}
            >
              {muted ? <RiNotificationOffLine size={16} /> : <RiNotification3Line size={16} />}
            </IconGhostButton>

            <InboxSnoozePopover
              open={snoozeOpen}
              onOpenChange={setSnoozeOpen}
              onSelect={handleSnoozeSelect}
            >
              <button
                type='button'
                title='Snooze'
                disabled={busy || !names.length}
                className='rounded-md p-1.5 text-[#7c828d] transition hover:bg-[#eef0f3] hover:text-[#292d34] disabled:opacity-30'
                onClick={(event) => {
                  event.preventDefault();
                  setSnoozeOpen(true);
                }}
              >
                <RiTimeLine size={16} />
              </button>
            </InboxSnoozePopover>

            {headerNotification ? (
              <button
                type='button'
                onClick={() => onOpenTask(headerNotification)}
                className='ml-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d6d9de] bg-bg-white-0 px-2.5 text-[13px] font-medium text-[#292d34] transition hover:bg-[#eef0f3]'
              >
                <RiExternalLinkLine size={15} className='text-[#7c828d]' />
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
                  <div key={item.name} className='flex flex-col gap-2'>
                    <ActivityFeedItem
                      notification={item}
                      highlighted={
                        highlightName
                          ? item.name === highlightName
                          : isCommentNotification(item) && item.name === items[0]?.name
                      }
                      isReplying={replyingToName === item.name}
                      onToggleReaction={handleToggleReaction}
                      onReply={
                        isCommentNotification(item)
                          ? () => {
                              if (isSubmittingReplyRef.current) return;
                              setReplyingToName((current) =>
                                current === item.name ? null : item.name,
                              );
                            }
                          : undefined
                      }
                    />
                    {replyingToName === item.name ? (
                      <BoardCommentComposer
                        ref={composerRef}
                        onSubmit={handleAddReply}
                        isSubmitting={isSubmittingReply}
                        disabled={!taskId || isSubmittingReply}
                        placeholder='Add a comment...'
                        onSearchMentions={searchMentions}
                        sidebarTree={sidebarTree}
                        currentListId={headerNotification?.list ?? null}
                      />
                    ) : null}
                  </div>
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
