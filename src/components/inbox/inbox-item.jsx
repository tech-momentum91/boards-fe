import React from 'react';
import AttachmentList from '@/components/ui/attachment-list';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { cn } from '@/lib/utils';
import { safeDisplayDateTime } from '@/utils/date-utils';
import { RiCircleFill, RiInformationFill, RiReplyLine } from 'react-icons/ri';
import { useSelector } from 'react-redux';
import { isClient } from '@/constants/users-constants';
import * as Button from '@/components/ui/button';

/**
 * Inbox comment item for the notification detail timeline.
 * Standalone implementation (does not use CommentItem). Supports inline reply in same card.
 *
 * @param {Object} props
 * @param {Object} props.comment - Comment data (content, creation, user, commented_by, attachments, etc.)
 * @param {Function} props.onReply - (comment) => void when user clicks Reply
 * @param {Object} [props.parentCommentPreview] - Full parent comment when this is a reply (for quoted preview)
 * @param {React.ReactNode} [props.inlineReplyInput] - Rendered inside the same card below content (e.g. InboxInput)
 */
const InboxItem = ({ comment, onReply, parentCommentPreview = null, inlineReplyInput = null }) => {
  const { profileData } = useSelector((state) => state.profile ?? {});
  const { userSideBarPerm } = useSelector((state) => state.auth ?? {});
  const roleMap = userSideBarPerm?.data?.message?.role;
  const isClientUser = isClient(roleMap);

  const {
    content,
    creation,
    user,
    attachments = [],
    commented_by,
    custom_visible_to_client,
    parent_comment,
  } = comment;

  const isReply = Boolean(parent_comment);
  const quotedParent = isReply && parentCommentPreview ? parentCommentPreview : null;
  const displayName = (user?.name || commented_by || '').trim() || 'Comment';
  const avatarSrc = user?.image ?? user?.user_image ?? null;

  const renderContent = (htmlContent) => {
    const safeHtml = htmlContent == null ? '' : String(htmlContent);
    let sanitizedContent = safeHtml
      .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replaceAll(/javascript:/gi, '');

    const mentionSpanRegex = /(<span[^>]*data-mention=["']true["'][^>]*>)([^<]*)(<\/span>)/gi;
    sanitizedContent = sanitizedContent.replaceAll(
      mentionSpanRegex,
      (fullMatch, openTag, innerText, closeTag) => {
        const idMatch = openTag.match(/data-id=["']([^"']+)["']/i);
        const mentionEmail = (idMatch?.[1] || '').toLowerCase();
        const currentEmail = (profileData?.email || '').toLowerCase();
        const isCurrentUserMention = mentionEmail && mentionEmail === currentEmail;
        const fontWeightStyle = isCurrentUserMention
          ? 'font-weight: 600; background-color: var(--color-primary-lighter); padding-bottom: 2px;'
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

  return (
    <div
      className={cn(
        'group relative bg-bg-weak-100 rounded-[10px] border border-stroke-soft-200 overflow-hidden',
      )}
    >
      {/* Header: Avatar, Name, Timestamp / Reply */}
      <div className='bg-bg-weak-100 px-4 py-2.5 flex items-center justify-between'>
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <CrmAccountAvatar name={displayName} image={avatarSrc} size={24} className='shrink-0' />
          <span className='text-sm font-normal text-text-sub-500 leading-[20px] tracking-[-0.084px] truncate'>
            {displayName}
          </span>
        </div>
        <div className='flex items-center gap-2 relative'>
          <span className='text-xs font-normal text-text-sub-500 leading-[16px] whitespace-nowrap group-hover:opacity-0 group-hover:invisible transition-opacity duration-200'>
            {safeDisplayDateTime(creation)}
          </span>
          {onReply && (
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={() => onReply(comment)}
              className='gap-1 text-xs font-medium text-text-sub-500 hover:text-text-strong-950 absolute right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200'
            >
              <Button.Icon as={RiReplyLine} className='w-4 h-4' />
              Reply
            </Button.Root>
          )}
        </div>
      </div>

      {/* Content: body, attachments, visible to client, inline reply */}
      <div
        className={cn(
          'bg-white border-t border-l border-r -mx-px border-stroke-soft-200 rounded-[10px] space-y-3 p-4',
        )}
      >
        {quotedParent && (
          <div className='rounded-[10px] border border-stroke-soft-200 bg-bg-weak-100 overflow-hidden opacity-90'>
            <div className='bg-bg-weak-100 px-3 py-2 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CrmAccountAvatar
                  name={
                    (quotedParent.user?.name || quotedParent.commented_by || '').trim() || 'Comment'
                  }
                  image={quotedParent.user?.image ?? quotedParent.user?.user_image ?? null}
                  size={24}
                  className='shrink-0'
                />
                <span className='text-sm font-normal text-text-sub-500 leading-[20px]'>
                  {quotedParent.user?.name || quotedParent.commented_by || 'Comment'}
                </span>
              </div>
              <span className='text-xs font-normal text-text-sub-500 whitespace-nowrap'>
                {safeDisplayDateTime(quotedParent.creation)}
              </span>
            </div>
            <div className='bg-white border-t border-stroke-soft-200 rounded-b-[10px] px-3 py-2'>
              <div className='paragraph-small text-text-sub-600 [&>p]:mb-0 [&>p:last-child]:mb-0'>
                {renderContent(quotedParent.content || '')}
              </div>
            </div>
          </div>
        )}

        <div className={cn('mb-0', isReply && !quotedParent && 'mx-2')}>
          {renderContent(content)}
        </div>

        {attachments.length > 0 && (
          <div className='mt-3'>
            <AttachmentList attachments={attachments} />
          </div>
        )}

        {Boolean(custom_visible_to_client && !isClientUser) && (
          <div className='mt-2 flex items-center gap-1.5 pl-px pt-1 pr-2 pb-0.5'>
            <RiCircleFill className='size-1.5 text-neutral-300' />
            <span className='text-xs font-medium text-text-sub-500 leading-[16px]'>
              Visible to Client
            </span>
            <RiInformationFill className='text-neutral-400' />
          </div>
        )}

        {inlineReplyInput != null && (
          <div className='border-t border-stroke-soft-200 pt-3 mt-3'>{inlineReplyInput}</div>
        )}
      </div>
    </div>
  );
};

export default InboxItem;
