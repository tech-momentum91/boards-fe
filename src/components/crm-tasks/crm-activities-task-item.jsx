import React, { useState } from 'react';
import {
  RiArrowRightSLine,
  RiArrowRightLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
} from 'react-icons/ri';
import * as LinkButton from '@/components/ui/link-button';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import CommentItem from '@/components/ui/comment-item';
import CircularProgress from '@/components/ui/circular-progress';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { ActivityActionDisplay } from '@/components/crm-accounts/crm-account-activities/activity-action-display';
import {
  getStatusColor,
  getPriorityColor,
  getTaskProgress,
} from '@/components/crm-accounts/crm-account-activities/activity-color-utils';

const INITIAL_VISIBLE = 2;

function plainTextWithMentionsToHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replaceAll(
    /@(\w+(?:\s+\w+)*)(?=\s|@|$)/g,
    (_, name) =>
      `<span class="mention" data-mention="true" data-type="mention" data-id="" data-label="${name.trim()}" data-mention-suggestion-char="@">@${name.trim()}</span>`,
  );
}

function mapActivityCommentToCommentItem(activityComment) {
  if (!activityComment) return null;

  const {
    name: commentId,
    content: rawContent,
    creation,
    commented_by,
    user,
    attachments = [],
    parent_comment,
    custom_parent_comment,
  } = activityComment;

  const raw = typeof rawContent === 'string' ? rawContent : '';
  const isHtml = raw.includes('data-mention') || raw.trim().startsWith('<') || raw.includes('<p');
  const text = activityComment.text ?? '';
  const content = isHtml ? raw : plainTextWithMentionsToHtml(text || raw);

  const normalizedAttachments = (attachments || []).map((att) => {
    const fileName = att.file_name || att.fileName || att.name || 'file';
    const sizeString = att.size ?? att.file_size;
    const sizeBytes =
      typeof sizeString === 'number'
        ? sizeString
        : typeof sizeString === 'string' && /^\d+\s*kb$/i.test(sizeString)
          ? Number.parseInt(sizeString, 10) * 1024
          : 0;
    return {
      id: att.name || att.id,
      fileName,
      fileUrl: att.file_url || att.fileUrl || att.url || '',
      size: sizeBytes,
      file_size: att.file_size,
      creation: att.creation || att.created_at,
    };
  });

  const resolvedParent = parent_comment ?? activityComment.parent_comment;
  const resolvedCustomParent =
    custom_parent_comment ??
    activityComment.custom_parent_comment ??
    (resolvedParent ? (resolvedParent.name ?? resolvedParent.id) : null);

  return {
    name: commentId || activityComment.id,
    content,
    creation: creation ?? activityComment.timestamp ?? activityComment.creation,
    commented_by: commented_by ?? activityComment.author ?? '',
    user: user ?? { name: activityComment.author ?? commented_by },
    attachments: normalizedAttachments,
    parent_comment: resolvedParent,
    custom_parent_comment: resolvedCustomParent,
  };
}

// Colored pill matching task view drawer (Badge.Root variant="light")
const StatusOrPriorityBadge = ({ label, color }) => (
  <Badge.Root variant='light' color={color} size='small' className='text-nowrap normal-case'>
    {label}
  </Badge.Root>
);

// Fallback when action string is not available — build from from/to
const LegacyTaskChangeContent = ({ change }) => {
  const { changeType, field, from, to } = change;
  const isPriority = changeType === 'priority' || /priority/i.test(String(field || ''));

  if (changeType === 'status') {
    return (
      <span className='flex items-center gap-1.5 flex-wrap text-paragraph-sm text-text-sub-500'>
        <span>{field}</span>
        <StatusOrPriorityBadge label={from} color={getStatusColor(from)} />
        <RiArrowRightLine size={12} className='text-text-soft-400 shrink-0' />
        <StatusOrPriorityBadge label={to} color={getStatusColor(to)} />
      </span>
    );
  }
  if (isPriority) {
    return (
      <span className='flex items-center gap-1.5 flex-wrap text-paragraph-sm text-text-sub-500'>
        <span>{field}</span>
        <StatusOrPriorityBadge label={from} color={getPriorityColor(from)} />
        <RiArrowRightLine size={12} className='text-text-soft-400 shrink-0' />
        <StatusOrPriorityBadge label={to} color={getPriorityColor(to)} />
      </span>
    );
  }
  return (
    <span className='flex items-center gap-1.5 flex-wrap text-paragraph-sm text-text-sub-500'>
      <span>{field}</span>
      <span className='font-medium text-text-main-900'>{from}</span>
      <RiArrowRightLine size={12} className='text-text-soft-400 shrink-0' />
      <span className='font-medium text-text-main-900'>{to}</span>
    </span>
  );
};

const OlderActivitiesToggle = ({ count, expanded, onToggle }) => (
  <LinkButton.Root onClick={onToggle} size='small' variant='primary'>
    {expanded ? (
      <>
        Hide older activities <RiArrowUpSLine className='w-4 h-4' />
      </>
    ) : (
      <>
        Show {count} older {count === 1 ? 'activity' : 'activities'}{' '}
        <RiArrowDownSLine className='w-4 h-4' />
      </>
    )}
  </LinkButton.Root>
);

const getCreation = (item) => {
  const c = item.data;
  const ts =
    item.type === 'change'
      ? (c.creation ?? c.timestamp)
      : (c.creation ?? c.timestamp ?? c.created_at);
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const TaskActivityContent = ({
  changes,
  comments,
  renderAvatar,
  mapActivityCommentToCommentItem,
  showUserDetails = false,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Resolve parent_comment for child comments (match task view behavior)
  const commentMap = React.useMemo(() => {
    const map = new Map();
    (comments ?? []).forEach((c) => map.set(c.name ?? c.id, c));
    return map;
  }, [comments]);

  const enrichedComments = React.useMemo(() => {
    return (comments ?? []).map((c) => {
      let parent = c.parent_comment;
      if (!parent && c.custom_parent_comment) {
        const parentId =
          typeof c.custom_parent_comment === 'string'
            ? c.custom_parent_comment
            : (c.custom_parent_comment?.name ?? c.custom_parent_comment?.id);
        parent = parentId ? commentMap.get(parentId) : null;
      }
      return parent ? { ...c, parent_comment: parent } : c;
    });
  }, [comments, commentMap]);

  // Merge changes + comments and sort by creation (newest first)
  const items = React.useMemo(() => {
    const merged = [
      ...changes.map((c) => ({ type: 'change', data: c, key: c.id })),
      ...enrichedComments.map((c) => ({ type: 'comment', data: c, key: c.name ?? c.id })),
    ];
    return merged.sort((a, b) => getCreation(b) - getCreation(a));
  }, [changes, enrichedComments]);

  const hasMore = items.length > INITIAL_VISIBLE;
  const visibleItems = hasMore && !showAll ? items.slice(0, INITIAL_VISIBLE) : items;
  const olderCount = items.length - INITIAL_VISIBLE;

  return (
    <div className='relative flex flex-col'>
      <div
        className='absolute left-[7px] w-px bg-stroke-soft-200'
        style={{ top: '18px', bottom: '24px' }}
      />

      {visibleItems.map((item) => {
        if (item.type === 'change') {
          return (
            <div key={item.key} className='flex gap-3 py-2 first:pt-0'>
              <div className='mt-2 flex h-4 w-4 shrink-0 items-center justify-center'>
                <div className='h-1.5 w-1.5 rounded-full bg-stroke-sub-300' />
              </div>
              <div className='flex-1 min-w-0 pt-0.5'>
                <TaskChangeRow change={item.data} showUserDetails={showUserDetails} />
              </div>
            </div>
          );
        }
        const commentItem = mapActivityCommentToCommentItem(item.data);
        if (!commentItem) return null;
        return (
          <div key={item.key} className='flex gap-3 py-2 last:pb-0'>
            <div className='mt-2 flex h-4 w-4 shrink-0 items-center justify-center'>
              <div className='h-2 w-2 rounded-full border-2 border-stroke-sub-300 bg-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='rounded-[10px] border border-stroke-soft-200 overflow-hidden'>
                <CommentItem
                  comment={commentItem}
                  onReply={undefined}
                  renderAvatar={renderAvatar}
                  collapsible
                  defaultCollapsed
                />
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className='flex gap-3 py-2 pl-7'>
          <OlderActivitiesToggle
            count={olderCount}
            expanded={showAll}
            onToggle={() => setShowAll((v) => !v)}
          />
        </div>
      )}
    </div>
  );
};

// ── User chip (avatar + name) with optional tooltip (user card: name + email) ───────────────
const TaskUserChip = ({ user, showTooltip }) => {
  const userName = user?.name ?? user?.email ?? 'Unknown';

  const chip = (
    <div className='inline-flex items-center gap-1.5 shrink-0'>
      <CrmAccountAvatar
        name={userName}
        image={user?.image ?? user?.user_image}
        size={24}
        className='shrink-0'
      />
      <span className='text-paragraph-sm text-text-sub-500'>{userName}</span>
    </div>
  );

  if (showTooltip && (user?.name || user?.email)) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className='cursor-default rounded px-1 -mx-1 py-0.5 -my-0.5 hover:bg-bg-weak-100 transition-colors w-fit'>
              {chip}
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top'>
            <div className='flex flex-col gap-1'>
              <span className='font-medium text-text-strong-500'>{userName}</span>
              {user?.email && (
                <span className='text-paragraph-xs text-text-sub-500'>{user.email}</span>
              )}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return chip;
};

const TaskChangeRow = ({ change, showUserDetails = false }) => {
  const { action, field, timestamp, user } = change;
  const rawField = (field ?? '').replace(/\s+changed\s+to\s*$/i, '').trim() || (field ?? '');
  const userName = user?.name ?? user?.email ?? 'Unknown';

  const content = action ? (
    <ActivityActionDisplay
      action={action}
      field={rawField}
      className='text-paragraph-sm text-text-sub-500'
    />
  ) : (
    <LegacyTaskChangeContent change={change} />
  );

  const rowContent = (
    <div className='flex items-start justify-between gap-4 py-1'>
      <div className='flex items-center gap-2 min-w-0 flex-wrap'>
        {showUserDetails && (user?.name || user?.email) ? (
          <>
            <TaskUserChip user={user} showTooltip />
            <div className='min-w-0'>{content}</div>
          </>
        ) : (
          <div className='min-w-0'>{content}</div>
        )}
      </div>
      {timestamp && (
        <span className='text-paragraph-xs text-text-soft-400 shrink-0 pt-0.5'>{timestamp}</span>
      )}
    </div>
  );

  if ((user?.name || user?.email) && !showUserDetails) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className='cursor-default rounded px-0.5 -mx-0.5 py-0.5 -my-0.5 hover:bg-bg-weak-100 transition-colors'>
              {rowContent}
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top'>
            <div className='flex items-center gap-2'>
              <CrmAccountAvatar
                name={userName}
                image={user?.image ?? user?.user_image}
                size={24}
                className='shrink-0'
              />
              <span>Changed by {userName}</span>
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return rowContent;
};

const CrmActivitiesTaskItem = ({ activity, renderAvatar, showUserDetails = false }) => {
  const { title, timestamp, status, comments = [], changes = [], defaultExpanded } = activity;
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const hasContent = changes.length > 0 || comments.length > 0;
  const progress = getTaskProgress(status);

  return (
    <div className='flex flex-col rounded-[10px] border border-stroke-soft-200 overflow-hidden'>
      <div className='flex items-center justify-between gap-4 bg-bg-weak-100 px-3 py-2.5'>
        <div className='flex items-center gap-2 min-w-0'>
          <CircularProgress percentage={progress.percentage} color={progress.color} size={18} />

          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  onClick={() => setExpanded((previous) => !previous)}
                  className='flex items-center justify-center rounded p-0.5 hover:bg-white/60 transition-colors shrink-0'
                >
                  <RiArrowRightSLine
                    size={16}
                    className={`text-text-soft-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content size='xsmall' side='top'>
                {expanded ? 'Collapse' : 'Expand'}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>

          <span className='text-paragraph-sm font-medium text-text-main-900 truncate'>{title}</span>

          <Badge.Root
            variant='stroke'
            color='gray'
            size='small'
            className='shrink-0 bg-white normal-case tracking-normal text-text-main-900'
          >
            Task
          </Badge.Root>
        </div>

        <span className='text-paragraph-xs text-text-soft-400 shrink-0'>{timestamp}</span>
      </div>

      {expanded && (
        <div className='border-t border-stroke-soft-200 bg-white px-4 py-4'>
          {!hasContent && (
            <p className='text-paragraph-xs text-text-soft-400 italic py-2'>
              No activities on this task.
            </p>
          )}

          {hasContent && (
            <TaskActivityContent
              changes={changes}
              comments={comments}
              renderAvatar={renderAvatar}
              mapActivityCommentToCommentItem={mapActivityCommentToCommentItem}
              showUserDetails={showUserDetails}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CrmActivitiesTaskItem;
