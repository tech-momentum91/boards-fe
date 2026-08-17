import React, { useCallback, useMemo, useState } from 'react';
import { RiUploadCloud2Line } from 'react-icons/ri';

import AttachmentCard from '@/components/ui/attachment-card';
import * as Button from '@/components/ui/button';
import MediaPreview from '@/components/ui/media-preview';
import { buildMediaPreviewItems, normalizeAttachment } from '@/lib/utils';

function AttachmentGrid({
  attachments = [],
  onRemove,
  onDownload,
  disabled = false,
  dangerRemove = false,
  columns = 2,
  showFormatIcon = false,
  emptyStateMessage = 'Choose a file or drag & drop.',
  emptyStateDescription = 'All file types, up to 10 MB per file.',
  emptyStateAction,
}) {
  const [previewErrors, setPreviewErrors] = useState({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const normalizedAttachments = useMemo(
    () => attachments.map((attachment, index) => normalizeAttachment(attachment, index)),
    [attachments],
  );

  const lightboxItems = useMemo(
    () => buildMediaPreviewItems(normalizedAttachments, previewErrors),
    [normalizedAttachments, previewErrors],
  );

  const handlePreviewError = useCallback((attachmentId) => {
    setPreviewErrors((previous) => ({ ...previous, [attachmentId]: true }));
  }, []);

  const handlePreviewClick = useCallback(
    (attachment) => {
      const idx = lightboxItems.findIndex((item) => item.src === attachment.fileUrl);
      if (idx === -1) return;
      setLightboxIndex(idx);
      setLightboxOpen(true);
    },
    [lightboxItems],
  );

  const handleDownload = useCallback(
    (attachment) => {
      if (onDownload) {
        onDownload(attachment);
        return;
      }

      if (attachment.fileUrl) {
        const link = document.createElement('a');
        link.href = attachment.fileUrl;
        link.download = attachment.fileName || 'attachment';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (attachment.file instanceof File) {
        const url = URL.createObjectURL(attachment.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    },
    [onDownload],
  );

  const gridClass =
    columns === 3
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-2 gap-3';

  return (
    <div className='flex flex-col gap-3'>
      <MediaPreview
        items={lightboxItems}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {normalizedAttachments.length > 0 ? (
        <div className={gridClass}>
          {normalizedAttachments.map((attachment, index) => (
            <AttachmentCard
              key={attachment.id || `${attachment.fileName}-${index}`}
              attachment={attachment}
              disabled={disabled}
              dangerRemove={dangerRemove}
              showFormatIcon={showFormatIcon}
              showDownload={Boolean(onDownload)}
              previewError={Boolean(previewErrors[attachment.id])}
              onPreviewError={handlePreviewError}
              onRemove={onRemove}
              onDownload={handleDownload}
              onPreviewClick={handlePreviewClick}
              className='min-w-0'
            />
          ))}
        </div>
      ) : null}

      {normalizedAttachments.length === 0 ? (
        <div className='flex items-start gap-3 rounded-xl border border-dashed border-stroke-sub-300 px-4 py-3'>
          <RiUploadCloud2Line className='size-6 shrink-0 text-text-sub-500' aria-hidden />
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <p className='label-small text-text-main-900'>{emptyStateMessage}</p>
            <p className='text-paragraph-xs text-text-soft-400'>{emptyStateDescription}</p>
          </div>
          {emptyStateAction ? (
            <Button.Root
              type='button'
              onClick={emptyStateAction.onClick}
              disabled={disabled || emptyStateAction.disabled}
              variant='neutral'
              mode='stroke'
              size='xsmall'
              className='shrink-0'
            >
              {emptyStateAction.label || 'Browse File'}
            </Button.Root>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default AttachmentGrid;
