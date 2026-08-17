import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiUploadCloud2Line } from 'react-icons/ri';

import AttachmentCard from '@/components/ui/attachment-card';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import MediaPreview from '@/components/ui/media-preview';
import { buildMediaPreviewItems, normalizeAttachment } from '@/lib/utils';

const AttachmentList = ({
  attachments = [],
  onDownload,
  onRemove,
  emptyStateMessage = 'Choose a file or drag & drop.',
  emptyStateDescription = 'All file types, up to 10 MB per file.',
  disabled = false,
  emptyStateAction,
  dangerRemove = false,
  normalizeAttachmentFn = normalizeAttachment,
}) => {
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [previewErrors, setPreviewErrors] = useState({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const attachmentsListRef = useRef(null);
  const scrollSyncTimeoutRef = useRef(null);

  useEffect(() => {
    if (attachments.length === 0) {
      setCurrentAttachmentIndex(0);
      return;
    }

    setCurrentAttachmentIndex((previous) => {
      if (previous >= attachments.length) return attachments.length - 1;
      return previous;
    });
  }, [attachments.length]);

  const scrollToAttachment = useCallback((index) => {
    if (!attachmentsListRef.current) return;
    const target = attachmentsListRef.current.children?.[index];
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, []);

  const handleScrollSyncCurrentIndex = useCallback(() => {
    if (!attachmentsListRef.current) return;

    const container = attachmentsListRef.current;
    const containerRect = container.getBoundingClientRect();
    const children = [...container.children];

    let bestIndex = 0;
    let bestVisibleWidth = 0;

    children.forEach((child, index) => {
      const rect = child.getBoundingClientRect();

      const visibleLeft = Math.max(rect.left, containerRect.left);
      const visibleRight = Math.min(rect.right, containerRect.right);
      const visibleWidth = visibleRight - visibleLeft;

      if (
        visibleWidth > 0 &&
        (visibleWidth > bestVisibleWidth ||
          (visibleWidth === bestVisibleWidth && index > bestIndex))
      ) {
        bestVisibleWidth = visibleWidth;
        bestIndex = index;
      }
    });

    setCurrentAttachmentIndex((previous) => (previous === bestIndex ? previous : bestIndex));
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }

    scrollSyncTimeoutRef.current = setTimeout(() => {
      handleScrollSyncCurrentIndex();
    }, 100);
  }, [handleScrollSyncCurrentIndex]);

  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  const handleAttachmentNav = useCallback(
    (direction) => {
      if (attachments.length === 0) return;

      setCurrentAttachmentIndex((previous) => {
        const nextIndex = Math.min(Math.max(previous + direction, 0), attachments.length - 1);
        requestAnimationFrame(() => scrollToAttachment(nextIndex));
        return nextIndex;
      });
    },
    [attachments.length, scrollToAttachment],
  );

  const handleAttachmentDownload = useCallback(
    (attachment) => {
      if (onDownload) {
        onDownload(attachment);
        return;
      }

      if (attachment.fileUrl) {
        const link = document.createElement('a');
        link.href = attachment.fileUrl;
        link.download = attachment.fileName || attachment.name || 'attachment';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (attachment.file instanceof File) {
        const url = URL.createObjectURL(attachment.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName || attachment.name || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    },
    [onDownload],
  );

  const handlePreviewError = useCallback((attachmentId) => {
    setPreviewErrors((previous) => ({ ...previous, [attachmentId]: true }));
  }, []);

  const normalizedAttachments = useMemo(
    () => attachments.map((attachment, index) => normalizeAttachmentFn(attachment, index)),
    [attachments, normalizeAttachmentFn],
  );

  const lightboxItems = useMemo(
    () => buildMediaPreviewItems(normalizedAttachments, previewErrors),
    [normalizedAttachments, previewErrors],
  );

  const handlePreviewClick = useCallback(
    (attachment) => {
      const idx = lightboxItems.findIndex((item) => item.src === attachment.fileUrl);
      if (idx === -1) return;
      setLightboxIndex(idx);
      setLightboxOpen(true);
    },
    [lightboxItems],
  );

  return (
    <div className='flex flex-col gap-2 pb-6'>
      <MediaPreview
        items={lightboxItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      {normalizedAttachments.length > 0 && (
        <div className='flex flex-col gap-3'>
          <div
            ref={attachmentsListRef}
            className='flex min-w-0 gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory'
            onScroll={handleScroll}
          >
            {normalizedAttachments.map((attachment, index) => (
              <AttachmentCard
                key={attachment.id || `${attachment.fileName}-${index}`}
                attachment={attachment}
                disabled={disabled}
                dangerRemove={dangerRemove}
                showFormatIcon
                showDownload
                previewError={Boolean(previewErrors[attachment.id])}
                onPreviewError={handlePreviewError}
                onRemove={onRemove}
                onDownload={handleAttachmentDownload}
                onPreviewClick={handlePreviewClick}
                className='w-[min(100%,220px)] shrink-0 snap-start sm:w-[220px]'
              />
            ))}
          </div>
          {normalizedAttachments.length > 1 && (
            <div className='flex items-center justify-center gap-2 text-paragraph-xs text-text-sub-500'>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(-1)}
                disabled={currentAttachmentIndex === 0 || disabled}
                className='shrink-0 bg-white'
                type='button'
              >
                <CompactButton.Icon as={RiArrowLeftSLine} />
              </CompactButton.Root>
              <span className='min-w-[52px] text-center'>
                {currentAttachmentIndex + 1}/{normalizedAttachments.length}
              </span>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(1)}
                disabled={currentAttachmentIndex === normalizedAttachments.length - 1 || disabled}
                className='shrink-0 bg-white'
                type='button'
              >
                <CompactButton.Icon as={RiArrowRightSLine} />
              </CompactButton.Root>
            </div>
          )}
        </div>
      )}

      {normalizedAttachments.length === 0 && (
        <div className='flex items-start gap-3 rounded-xl border border-dashed border-stroke-sub-300 px-4 py-3'>
          <RiUploadCloud2Line className='size-6 text-text-sub-500' />
          <div className='flex flex-1 flex-col gap-1'>
            <p className='label-small text-text-main-900'>{emptyStateMessage}</p>
            <p className='text-paragraph-xs text-text-soft-400'>{emptyStateDescription}</p>
          </div>
          {emptyStateAction && (
            <Button.Root
              type='button'
              onClick={emptyStateAction.onClick}
              disabled={disabled || emptyStateAction.disabled}
              variant='neutral'
              mode='stroke'
              size='xsmall'
            >
              {emptyStateAction.label || 'Browse File'}
            </Button.Root>
          )}
        </div>
      )}
    </div>
  );
};

export default AttachmentList;
