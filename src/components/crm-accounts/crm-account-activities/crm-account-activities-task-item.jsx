import React, { useState } from 'react';
import { RiCheckboxCircleLine, RiArrowRightSLine, RiArrowRightLine } from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
import CommentItem from '@/components/ui/comment-item';

/**
 * Converts plain-text @mentions to HTML with data-mention spans so CommentItem styles them
 * the same as ticket management (green mention styling). Only used when content is plain text.
 */
function plainTextWithMentionsToHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replaceAll(
    /@(\w+(?:\s+\w+)*)(?=\s|@|$)/g,
    (_, name) =>
      `<span class="mention" data-mention="true" data-type="mention" data-id="" data-label="${name.trim()}" data-mention-suggestion-char="@">@${name.trim()}</span>`,
  );
}

/**
 * Maps activity comment to CommentItem props. Same structure as ticket comments:
 * name, commented_by, content (HTML with data-mention spans), creation, user, attachments,
 * custom_parent_comment, parent_comment. Content is passed through as-is when already HTML.
 */
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

  // Normalize attachments for AttachmentList (fileName, fileUrl, size)
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

  return {
    name: commentId || activityComment.id,
    content,
    creation: creation ?? activityComment.timestamp ?? activityComment.creation,
    commented_by: commented_by ?? activityComment.author ?? '',
    user: user ?? { name: activityComment.author ?? commented_by },
    attachments: normalizedAttachments,
    parent_comment: parent_comment ?? activityComment.parent_comment,
    custom_parent_comment: custom_parent_comment ?? activityComment.custom_parent_comment,
  };
}

// ── Task change row (status / field) ───────────────────────────────────────────
const StatusPill = ({ label, color }) => (
  <span
    className='inline-flex items-center rounded px-1.5 py-0.5 text-subheading-2xs font-semibold uppercase tracking-wide text-white'
    style={{ backgroundColor: color || '#9CA3AF' }}
  >
    {label}
  </span>
);

const TaskChangeRow = ({ change }) => {
  const { changeType, field, from, to, fromColor, toColor, timestamp } = change;

  const content =
    changeType === 'status' ? (
      <span className='flex items-center gap-1.5 flex-wrap text-paragraph-sm text-text-sub-500'>
        <span>{field}</span>
        <StatusPill label={from} color={fromColor} />
        <RiArrowRightLine size={12} className='text-text-soft-400 shrink-0' />
        <StatusPill label={to} color={toColor} />
      </span>
    ) : (
      <span className='flex items-center gap-1.5 flex-wrap text-paragraph-sm text-text-sub-500'>
        <span>{field}</span>
        <span className='font-medium text-text-main-900'>{from}</span>
        <RiArrowRightLine size={12} className='text-text-soft-400 shrink-0' />
        <span className='font-medium text-text-main-900'>{to}</span>
      </span>
    );

  return (
    <div className='flex items-start justify-between gap-4 py-1'>
      <div className='min-w-0'>{content}</div>
      {timestamp && (
        <span className='text-paragraph-xs text-text-soft-400 shrink-0 pt-0.5'>{timestamp}</span>
      )}
    </div>
  );
};

const CrmAccountActivitiesTaskItem = ({ activity }) => {
  const { title, timestamp, comments = [], changes = [], defaultExpanded = false } = activity;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasContent = changes.length > 0 || comments.length > 0;

  return (
    <div className='flex flex-col rounded-[10px] border border-stroke-soft-200 overflow-hidden'>
      {/* Task header — grey background */}
      <div className='flex items-center justify-between gap-4 bg-bg-weak-100 px-3 py-2.5'>
        <div className='flex items-center gap-2 min-w-0'>
          <RiCheckboxCircleLine size={18} className='text-primary-base shrink-0' />

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
            variant='light'
            color='gray'
            size='small'
            className='shrink-0 rounded-md normal-case tracking-normal'
          >
            Task
          </Badge.Root>
        </div>

        <span className='text-paragraph-xs text-text-soft-400 shrink-0'>{timestamp}</span>
      </div>

      {/* Expanded content — track line + changes + comments */}
      {expanded && (
        <div className='border-t border-stroke-soft-200 bg-white px-4 py-4'>
          {!hasContent && (
            <p className='text-paragraph-xs text-text-soft-400 italic py-2'>
              No activities on this task.
            </p>
          )}

          {hasContent && (
            <div className='relative flex flex-col'>
              {/* Vertical track line */}
              <div className='absolute left-[7px] top-4 bottom-4 w-px bg-stroke-soft-200' />

              {/* Change rows with timeline dot */}
              {changes.map((change) => (
                <div key={change.id} className='flex gap-3 py-2 first:pt-0'>
                  <div className='mt-2 flex h-4 w-4 shrink-0 items-center justify-center'>
                    <div className='h-1.5 w-1.5 rounded-full bg-stroke-sub-300' />
                  </div>
                  <div className='flex-1 min-w-0 pt-0.5'>
                    <TaskChangeRow change={change} />
                  </div>
                </div>
              ))}

              {/* Comment cards with timeline dot */}
              {comments.map((activityComment) => {
                const commentItem = mapActivityCommentToCommentItem(activityComment);
                if (!commentItem) return null;
                return (
                  <div
                    key={commentItem.name || activityComment.id}
                    className='flex gap-3 py-2 last:pb-0'
                  >
                    <div className='mt-2 flex h-4 w-4 shrink-0 items-center justify-center'>
                      <div className='h-2 w-2 rounded-full border-2 border-stroke-sub-300 bg-white' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='rounded-[10px] border border-stroke-soft-200 overflow-hidden'>
                        <CommentItem
                          comment={commentItem}
                          onReply={undefined}
                          collapsible
                          defaultCollapsed
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CrmAccountActivitiesTaskItem;
