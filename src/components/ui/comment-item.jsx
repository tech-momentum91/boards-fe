import React, { useState, useEffect, useRef } from 'react';
import * as Avatar from '@/components/ui/avatar';
import AttachmentList from '@/components/ui/attachment-list';
import LayoutVersionBadge from '@/components/ui/layout-version-badge';
import { cn, getInitials } from '@/lib/utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCircleFill,
  RiInformationFill,
  RiPencilLine,
  RiReplyLine,
  RiAttachment2,
  RiCloseLine,
  RiThumbUpLine,
  RiEmotionLine,
} from 'react-icons/ri';
import { useSelector } from 'react-redux';
import { isClient } from '@/constants/users-constants';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import TextEditor from '@/components/ui/text-editor';
import { formatFileSize } from '@/utils/file-utils';
import { MdOutlineAddReaction } from 'react-icons/md';
import * as Popover from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';

const CommentItem = ({
  comment,
  onPin,
  onReply,
  onEdit,
  onDelete,
  onAttachmentRemove,
  isPreview = false,
  renderAvatar,
  collapsible = false,
  defaultCollapsed = true,
  // Edit props
  isEditing = false,
  onSaveEdit,
  onCancelEdit,
  isSavingEdit = false,
  enableMentions = false,
  onSearchMentions,
  onToggleReaction,
}) => {
  const { userSideBarPerm } = useSelector((state) => state.auth);
  const { profileData } = useSelector((state) => state.profile);
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);
  const viewerEmail = String(profileData?.email ?? '')
    .trim()
    .toLowerCase();

  const {
    name,
    content,
    creation,
    is_pinned,
    user,
    attachments = [],
    commented_by,
    custom_visible_to_client,
    custom_parent_comment,
    parent_comment,
    parent_comment_missing,
    reply_count = 2,
    reactions = [],
    layout_display_version: layoutVersion,
  } = comment;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const displayName = (user?.name || commented_by || '').trim() || 'Comment';
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible ? collapsed : false;

  // Plain text excerpt for collapsed preview (strip HTML tags)
  const getTextExcerpt = (html, maxLen = 60) => {
    if (!html) return '';
    const text = String(html)
      .replaceAll(/<[^>]+>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  const [editContent, setEditContent] = useState('');
  const [editFiles, setEditFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setEditContent(content || '');
      setEditFiles([]);
    }
  }, [isEditing, content]);

  const contentText = editContent
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ')
    .trim();
  const canSave = (contentText.length > 0 || editFiles.length > 0) && !isSavingEdit;

  const handleFileSelect = (event) => {
    const selected = [...(event.target.files || [])].map((file) => ({
      file,
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).slice(2, 11),
    }));
    setEditFiles((previous) => [...previous, ...selected]);
    event.target.value = '';
  };

  const removeEditFile = (id) => setEditFiles((previous) => previous.filter((f) => f.id !== id));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSave) {
        onSaveEdit?.({ content: editContent, files: editFiles });
      }
    }
  };

  // Sanitize and render HTML content with @mention styling
  const renderContent = (htmlContent) => {
    const safeHtml = htmlContent == null ? '' : String(htmlContent);
    let sanitizedContent = safeHtml
      .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replaceAll(/javascript:/gi, '');

    // Style @mentions with exact green color from Figma (#079455)

    // Rich mention markup from TipTap: wrap inner text without changing saved HTML
    const mentionSpanRegex = /(<span[^>]*data-mention=["']true["'][^>]*>)([^<]*)(<\/span>)/gi;

    sanitizedContent = sanitizedContent.replaceAll(
      mentionSpanRegex,
      (fullMatch, openTag, innerText, closeTag) => {
        const idMatch = openTag.match(/data-id=["']([^"']+)["']/i);
        const mentionEmail = (idMatch?.[1] || '').toLowerCase();
        const currentEmail = (profileData?.email || '').toLowerCase();
        const isCurrentUserMention = mentionEmail && mentionEmail === currentEmail;
        const fontWeightStyle = isCurrentUserMention
          ? 'font-weight: 600;  background-color: var(--color-primary-lighter); padding-bottom: 2px;'
          : '';

        const styledInner = `<span style="color: var(--color-primary-base); ${fontWeightStyle}">${innerText}</span>`;
        return `${openTag}${styledInner}${closeTag}`;
      },
    );

    return (
      <div
        className='paragraph-small text-text-main-900 [&>p]:mb-0 [&>p:last-child]:mb-0'
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  // Compact preview card variant (used for parent comment preview)
  if (isPreview) {
    return (
      <div className='rounded-2xl bg-neutral-100 p-1.5 opacity-70 group relative'>
        <div
          className={cn(
            'bg-bg-weak-100 rounded-[10px] border border-stroke-soft-200 overflow-hidden shadow-regular-xs',
          )}
        >
          <div className='bg-bg-weak-100 px-4 py-2.5 flex items-center justify-between'>
            <div className='flex items-center gap-3 min-w-0'>
              {renderAvatar ? (
                renderAvatar({ user, commented_by, displayName })
              ) : (
                <Avatar.Root size='20' color='gray' className='shrink-0'>
                  {user?.image ? (
                    <Avatar.Image
                      src={user.image}
                      alt={displayName}
                      onError={(event) => {
                        if (event?.target) {
                          event.target.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    getInitials(displayName) || 'U'
                  )}
                </Avatar.Root>
              )}
              <span className='text-sm font-normal text-text-sub-500 leading-[20px] tracking-[-0.084px]'>
                {displayName}
              </span>
            </div>
            <span className='text-xs font-normal text-text-sub-500 leading-[16px] whitespace-nowrap'>
              {creation ? safeDisplayDateTime(creation) : ''}
            </span>
          </div>
          <div className='bg-white border-t border-l border-r -mx-px border-stroke-soft-200 rounded-[10px] p-4'>
            <div className='mb-0'>{renderContent(content || 'Original comment')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative bg-bg-weak-100 rounded-[10px] border border-stroke-soft-200 overflow-hidden',
      )}
    >
      {/* Pinned indicator */}
      {/* {is_pinned === 1 && (
        <div className='absolute -top-2 -right-2 z-20'>
          <div className='bg-primary-500 text-white rounded-full p-1'>
            <RiPushpinFill size={12} />
          </div>
        </div>
      )} */}

      {/* Header: Avatar, Name, Timestamp, Expand/Collapse */}
      <div className='bg-bg-weak-100 px-4 py-2.5 flex items-center justify-between'>
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          {collapsible && (
            <button
              type='button'
              onClick={() => setCollapsed((c) => !c)}
              className='flex items-center justify-center rounded p-0.5 hover:bg-white/60 transition-colors shrink-0'
              aria-label={isCollapsed ? 'Expand comment' : 'Collapse comment'}
            >
              {isCollapsed ? (
                <RiArrowRightSLine size={16} className='text-text-soft-400' />
              ) : (
                <RiArrowDownSLine size={16} className='text-text-soft-400' />
              )}
            </button>
          )}
          {/* Avatar - 20px; use renderAvatar when provided (e.g. CrmAccountAvatar for account activities) */}
          {renderAvatar ? (
            renderAvatar({ user, commented_by, displayName })
          ) : (
            <Avatar.Root size='20' color='gray' className='shrink-0'>
              {user?.image ? (
                <Avatar.Image
                  src={user.image}
                  alt={user.name || commented_by}
                  onError={(event) => {
                    if (event?.target) {
                      event.target.style.display = 'none';
                    }
                  }}
                />
              ) : (
                getInitials(user?.name || commented_by) || 'U'
              )}
            </Avatar.Root>
          )}
          {/* Name - 14px regular, text-sub-500 */}
          <span className='text-sm font-normal text-text-sub-500 leading-[20px] tracking-[-0.084px] truncate'>
            {user?.name || commented_by}
          </span>
          <LayoutVersionBadge version={layoutVersion} />
        </div>
        {/* Timestamp flush right; on hover Reply pins to the far right and time shifts left */}
        <div className='relative flex items-center justify-end shrink-0 min-w-0'>
          <span
            className={cn(
              'text-xs font-normal text-text-sub-500 leading-[16px] whitespace-nowrap',
              (onReply || onEdit) &&
                cn(
                  'pr-0 transition-[padding] duration-200 ease-out',
                  onEdit && onReply
                    ? 'group-hover:pr-[10rem] group-focus-within:pr-[10rem]'
                    : 'group-hover:pr-[5.5rem] group-focus-within:pr-[5.5rem]',
                ),
            )}
          >
            {safeDisplayDateTime(creation)}
          </span>
          {(onReply || onEdit) && (
            <div
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1',
                'opacity-0 invisible pointer-events-none',
                'transition-opacity duration-200 ease-out',
                'group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto',
                'group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto',
              )}
            >
              {onEdit && !isEditing && (
                <Button.Root
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  onClick={() => onEdit(comment)}
                  className='gap-1 text-xs font-medium text-text-sub-500 hover:text-text-strong-950'
                >
                  <Button.Icon as={RiPencilLine} className='w-4 h-4' />
                  Edit
                </Button.Root>
              )}
              {onReply && (
                <Button.Root
                  variant='neutral'
                  mode='ghost'
                  size='xsmall'
                  onClick={() => onReply?.(comment)}
                  className='gap-1 text-xs font-medium text-text-sub-500 hover:text-text-strong-950'
                >
                  <Button.Icon as={RiReplyLine} className='w-4 h-4' />
                  Reply
                </Button.Root>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area - White background with border (collapsible when prop set) */}
      {isCollapsed ? (
        <div
          role='button'
          tabIndex={0}
          onClick={() => setCollapsed(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed(false);
            }
          }}
          className='bg-white border-t border-l border-r -mx-px border-stroke-soft-200 rounded-[10px] p-3 cursor-pointer hover:bg-bg-weak-50 transition-colors'
        >
          <p className='text-paragraph-sm text-text-sub-500 line-clamp-1'>
            {getTextExcerpt(content) || 'View comment'}
          </p>
          {attachments.length > 0 && (
            <span className='text-paragraph-xs text-text-soft-400 mt-1 block'>
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      ) : isEditing ? (
        <div
          className={`bg-white border-t border-l border-r -mx-px border-stroke-soft-200 rounded-[10px] ${parent_comment ? 'p-[10px]' : 'p-4'} space-y-3`}
        >
          <div className='rounded-lg p-3 ring-1 ring-inset ring-stroke-soft-200'>
            <TextEditor
              value={editContent}
              onChange={setEditContent}
              enableMentions={enableMentions}
              onSearchMentions={onSearchMentions}
              placeholder=''
              onKeyDown={handleKeyDown}
            />
          </div>

          {editFiles.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {editFiles.map((att) => (
                <div
                  key={att.id}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1'
                >
                  <RiAttachment2
                    size={16}
                    className='shrink-0 text-text-soft-400'
                    aria-hidden='true'
                  />
                  <span className='max-w-[150px] truncate text-sm font-medium text-text-main-900'>
                    {att.name}
                  </span>
                  <span className='text-xs text-text-sub-500'>{formatFileSize(att.size)}</span>
                  <CompactButton.Root
                    variant='ghost'
                    size='small'
                    onClick={() => removeEditFile(att.id)}
                    aria-label={`Remove ${att.name}`}
                  >
                    <CompactButton.Icon as={RiCloseLine} />
                  </CompactButton.Root>
                </div>
              ))}
            </div>
          )}

          <div className='flex items-center justify-between pt-2'>
            <div>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                onChange={handleFileSelect}
                className='hidden'
                accept='*/*'
              />
              <CompactButton.Root
                variant='ghost'
                size='large'
                type='button'
                onClick={() => fileInputRef.current?.click()}
                aria-label='Attach files'
              >
                <CompactButton.Icon as={RiAttachment2} />
              </CompactButton.Root>
            </div>
            <div className='flex justify-end gap-2'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                type='button'
                onClick={() => onCancelEdit?.()}
                disabled={isSavingEdit}
              >
                Cancel
              </Button.Root>
              <Button.Root
                size='small'
                type='button'
                onClick={() => onSaveEdit?.({ content: editContent, files: editFiles })}
                disabled={!canSave}
              >
                {isSavingEdit ? 'Saving…' : 'Save'}
              </Button.Root>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`bg-white border-t border-l border-r -mx-px border-stroke-soft-200 rounded-[10px] ${parent_comment ? 'p-[10px]' : 'p-4'} space-y-3`}
        >
          {custom_parent_comment && parent_comment && (
            <CommentItem
              comment={{
                ...parent_comment,
                custom_parent_comment: null,
              }}
              isPreview
              renderAvatar={renderAvatar}
            />
          )}
          {/* Comment Content - 14px regular, text-main-900, line-height 20px */}
          <div className={`mb-0 ${parent_comment ? 'mx-2' : ''}`}>{renderContent(content)}</div>

          {/* Attachments — min-w-0 so horizontal scroll works inside flex layout (match ticket-view-drawer) */}
          {attachments.length > 0 && (
            <div className={`min-w-0 mt-3 ${parent_comment ? 'mx-2' : ''}`}>
              <AttachmentList
                attachments={attachments}
                onRemove={
                  onAttachmentRemove
                    ? (attachmentId) => onAttachmentRemove(attachmentId, comment)
                    : undefined
                }
                dangerRemove={Boolean(onAttachmentRemove)}
              />
            </div>
          )}

          {/* Visible to client indicator */}
          {Boolean(custom_visible_to_client && !isClientUser) && (
            <div
              className={`mt-2 flex items-center gap-1.5 pl-px pt-1 pr-2 pb-0.5 ${parent_comment ? 'mx-2' : ''}`}
            >
              <RiCircleFill className='size-1.5 text-neutral-300' />
              <span className='text-xs font-medium text-text-sub-500 leading-[16px]'>
                Visible to Client
              </span>
              <RiInformationFill className='text-neutral-400' />
            </div>
          )}

          {/* Reaction & Reply Footer */}
          {!isEditing && (
            <div
              className={`mt-3 pt-2 flex items-center justify-between border-t border-stroke-soft-200 ${parent_comment ? 'mx-2' : ''}`}
            >
              <div className='flex items-center gap-1.5 flex-wrap'>
                {Object.values(
                  reactions.reduce((acc, curr) => {
                    const reactionUser = String(curr.user ?? '')
                      .trim()
                      .toLowerCase();
                    if (!acc[curr.emoji])
                      acc[curr.emoji] = { users: [], fullNames: [], emoji: curr.emoji };
                    acc[curr.emoji].users.push(reactionUser);
                    acc[curr.emoji].fullNames.push(curr.full_name || reactionUser);
                    return acc;
                  }, {}),
                ).map((group) => {
                  const hasReacted = Boolean(viewerEmail) && group.users.includes(viewerEmail);
                  return (
                    <Tooltip.Provider key={group.emoji} delayDuration={200}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            onClick={() => onToggleReaction?.(group.emoji)}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-colors ${
                              hasReacted
                                ? 'border-black bg-bg-weak-100 text-text-main-900 hover:bg-bg-weak-50'
                                : 'border-stroke-soft-200 bg-bg-white-0 text-text-main-900 hover:bg-bg-weak-50'
                            }`}
                          >
                            <span className='text-sm leading-none'>{group.emoji}</span>
                            <span className='text-sm font-medium leading-none'>
                              {group.users.length}
                            </span>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          side='top'
                          variant='dark'
                          className='p-2 text-center max-w-xs'
                        >
                          <div className='flex flex-col items-center gap-1.5'>
                            <span className='text-3xl leading-none'>{group.emoji}</span>
                            <span className='text-sm text-gray-300'>
                              <span className='font-semibold text-white'>
                                {new Intl.ListFormat('en', {
                                  style: 'long',
                                  type: 'conjunction',
                                }).format([
                                  ...group.users
                                    .map((u, i) => (u === viewerEmail ? null : group.fullNames[i]))
                                    .filter(Boolean),
                                  ...(hasReacted ? ['You'] : []),
                                ])}
                              </span>
                              {' reacted'}
                            </span>
                          </div>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  );
                })}

                {!reactions.some((r) => r.emoji === '👍') && (
                  <Tooltip.Provider delayDuration={200}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          onClick={() => onToggleReaction?.('👍')}
                          className='text-text-sub-500 hover:text-text-strong-950 hover:bg-bg-weak-50 p-1.5 rounded-full transition-colors border border-transparent hover:border-stroke-soft-200'
                        >
                          <RiThumbUpLine size={16} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Content side='top' size='small' variant='dark'>
                        Like this comment
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                )}

                <Popover.Root open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <Tooltip.Provider delayDuration={200}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Popover.Trigger asChild>
                          <button className='text-text-sub-500 hover:text-text-strong-950 hover:bg-bg-weak-50 p-1.5 rounded-full transition-colors'>
                            <MdOutlineAddReaction size={16} />
                          </button>
                        </Popover.Trigger>
                      </Tooltip.Trigger>
                      <Tooltip.Content side='top' size='small' variant='dark'>
                        Add reaction
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>

                  <Popover.Content
                    side='top'
                    align='start'
                    sideOffset={8}
                    className='z-50 p-0 border-none rounded-xl shadow-xl'
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        onToggleReaction?.(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      autoFocusSearch={false}
                    />
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>
          )}
        </div>
      )}

      {/* "2 Replies" Badge - Absolutely positioned at bottom right */}
      {/* {reply_count > 0 && (
        <div className='absolute right-9 bottom-3 z-10'>
          <button
            onClick={() => onReply?.(comment)}
            className='inline-flex items-center gap-0.5 bg-white border border-stroke-soft-200 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-bg-weak-50 transition-colors'
          >
            <RiReplyFill className='w-4 h-4 text-text-soft-400' />
            <span className='text-xs font-medium text-text-sub-500 leading-[16px]'>
              {reply_count} {reply_count === 1 ? 'Reply' : 'Replies'}
            </span>
          </button>
        </div>
      )} */}
    </div>
  );
};

export default CommentItem;
