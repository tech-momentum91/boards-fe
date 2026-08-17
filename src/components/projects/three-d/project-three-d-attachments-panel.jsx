import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiBox3Line } from 'react-icons/ri';
import ProjectThreeDAttachmentCard from '@/components/projects/three-d/project-three-d-attachment-card';
import ProjectThreeDUploadMenu from '@/components/projects/three-d/project-three-d-upload-menu';
import * as CompactButton from '@/components/ui/compact-button';

export default function ProjectThreeDAttachmentsPanel({
  attachments = [],
  version,
  onUpload,
  onOpenGallery,
  uploadDisabled = false,
  title = "3D's",
  emptyLabel = 'No 3D files',
}) {
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
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
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

  const handleOpenGallery = (attachment) => {
    onOpenGallery?.(attachment);
  };

  return (
    <section className='mt-6'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
          <RiBox3Line className='size-5 text-text-soft-400' />
          {title}
        </div>
        <ProjectThreeDUploadMenu onUpload={onUpload} disabled={uploadDisabled} />
      </div>

      {attachments.length > 0 ? (
        <div className='flex flex-col gap-3'>
          <div
            ref={attachmentsListRef}
            className='flex min-w-0 gap-4 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory'
            onScroll={handleScroll}
          >
            {attachments.map((attachment) => (
              <ProjectThreeDAttachmentCard
                key={attachment.id}
                attachment={attachment}
                version={attachment.version ?? version}
                onClick={() => handleOpenGallery(attachment)}
                className='snap-start'
              />
            ))}
          </div>

          {attachments.length > 1 ? (
            <div className='flex items-center justify-center gap-2 text-paragraph-xs text-text-sub-500'>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(-1)}
                disabled={currentAttachmentIndex === 0}
                className='shrink-0'
                type='button'
                aria-label='Previous attachment'
              >
                <CompactButton.Icon as={RiArrowLeftSLine} />
              </CompactButton.Root>
              <span className='min-w-[52px] text-center'>
                {currentAttachmentIndex + 1}/{attachments.length}
              </span>
              <CompactButton.Root
                size='large'
                variant='ghost'
                onClick={() => handleAttachmentNav(1)}
                disabled={currentAttachmentIndex === attachments.length - 1}
                className='shrink-0'
                type='button'
                aria-label='Next attachment'
              >
                <CompactButton.Icon as={RiArrowRightSLine} />
              </CompactButton.Root>
            </div>
          ) : null}
        </div>
      ) : (
        <p className='text-paragraph-sm text-text-sub-500'>{emptyLabel}</p>
      )}
    </section>
  );
}
