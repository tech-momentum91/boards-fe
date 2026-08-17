import React, { useState, useRef } from 'react';
import { RiSendPlaneLine, RiCloseLine, RiAttachment2, RiAtLine } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import TextEditor from '@/components/ui/text-editor';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/file-utils';
import { showErrorToast } from '@/utils/error-utils';

/**
 * Inbox reply input for the notification detail timeline.
 * Standalone implementation (does not use CommentInput). Renders inline in same card as comment.
 *
 * @param {Object} props
 * @param {Function} props.onSubmit - (content, attachments, isVisibleToClient, parentCommentId) => Promise
 * @param {Function} props.onCancelReply - () => void
 * @param {Object} [props.replyTo] - Comment being replied to
 * @param {boolean} [props.isSubmitting] - Submit in progress
 * @param {Function} [props.onSearchMentions] - Mention search (e.g. from useMentionSearch)
 */
const InboxInput = ({
  onSubmit,
  onCancelReply,
  replyTo = null,
  isSubmitting = false,
  onSearchMentions,
  mentionUsers,
  hasMoreMentions,
  loadingMoreMentions,
  onLoadMoreMentions,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const contentText = content
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll(/&\w+;|&#\d+;/g, ' ')
    .trim();
  const hasContent = contentText.length > 0 || attachments.length > 0;

  const handleSubmit = async () => {
    if (!hasContent) return;
    try {
      const raw = replyTo?.name ?? replyTo?.id;
      const parentId = raw != null && raw !== '' ? String(raw) : null;
      await onSubmit(content, attachments, false, parentId);
      setContent('');
      setAttachments([]);
      setIsFocused(false);
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to submit reply:', error);
      showErrorToast(error, {
        defaultMessage: 'Failed to submit reply. Please try again.',
        position: 'bottom-right',
      });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (event) => {
    const files = [...event.target.files];
    const newAttachments = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Math.random().toString(36).slice(2, 11),
    }));
    setAttachments((previous) => [...previous, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((previous) => previous.filter((a) => a.id !== id));
  };

  return (
    <div className={cn('')}>
      <div
        className={cn(
          'bg-white rounded-lg outline-none ring-1 ring-inset ring-stroke-soft-200 transition duration-200 ease-out',
          isFocused && 'ring-primary-base',
        )}
      >
        <div className='p-3 pb-1'>
          <TextEditor
            editorInstanceRef={editorRef}
            value={content}
            onChange={setContent}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder='Type your reply here'
            enableMentions={true}
            onSearchMentions={onSearchMentions}
            inboxToolbar
          />

          {attachments.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1'
                >
                  <RiAttachment2 size={16} className='text-text-soft-400 shrink-0' aria-hidden />
                  <div className='flex items-center gap-1 min-w-0'>
                    <span className='text-sm font-medium text-text-main-900 truncate max-w-[150px]'>
                      {attachment.name}
                    </span>
                    <span className='text-xs text-text-sub-500'>
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                  <CompactButton.Root
                    variant='ghost'
                    size='small'
                    onClick={() => removeAttachment(attachment.id)}
                    className='text-text-soft-400 hover:text-text-strong-950 cursor-pointer'
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <CompactButton.Icon as={RiCloseLine} />
                  </CompactButton.Root>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='p-3 pt-0 flex items-center justify-end'>
          <div className='flex items-center gap-1'>
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
              onClick={() => fileInputRef.current?.click()}
              className='text-text-soft-400 hover:text-text-strong-950 p-1 cursor-pointer'
              aria-label='Attach file'
            >
              <CompactButton.Icon as={RiAttachment2} />
            </CompactButton.Root>
            <CompactButton.Root
              variant='ghost'
              size='large'
              type='button'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  ed.chain().focus().insertContent('@').run();
                  setTimeout(() => ed.commands.focus(), 0);
                }
              }}
              className='text-text-soft-400 hover:text-text-strong-950 p-1 cursor-pointer'
              aria-label='Insert mention'
            >
              <CompactButton.Icon as={RiAtLine} />
            </CompactButton.Root>
            <CompactButton.Root
              size='large'
              onClick={handleSubmit}
              disabled={!hasContent || isSubmitting}
              className='bg-primary-base text-white p-1 cursor-pointer'
            >
              <CompactButton.Icon as={RiSendPlaneLine} />
            </CompactButton.Root>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxInput;
