import React, { useCallback, useMemo, useRef } from 'react';
import { RiImageLine, RiUploadCloud2Line } from 'react-icons/ri';

import { stockImagesToAttachments } from '@/components/stocks/shared/stock-images';
import AttachmentList from '@/components/ui/attachment-list';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';

function createPendingFileEntry(file, defaultName = 'File') {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    file,
    name: file?.name || defaultName,
    previewUrl: file instanceof File ? URL.createObjectURL(file) : '',
  };
}

const StocksImageUploadSection = ({
  title = 'Stock photos',
  description = 'PNG or JPG images. You can upload multiple photos.',
  accept = 'image/*,.png,.jpg,.jpeg,.webp',
  existingImages = [],
  pendingFiles = [],
  onPendingFilesChange,
  disabled = false,
  className,
  icon: Icon = RiImageLine,
  chooseLabel = 'Choose images or drag & drop.',
  browseLabel = 'Browse images',
  pendingFileLabel = 'File',
  multiple = true,
}) => {
  const fileInputRef = useRef(null);
  const hasPendingFiles = pendingFiles.length > 0;

  const existingSource = multiple
    ? existingImages
    : hasPendingFiles
      ? []
      : existingImages.slice(0, 1);
  const existingAttachments = stockImagesToAttachments(existingSource);
  const pendingAttachments = useMemo(
    () =>
      pendingFiles.map((entry) => ({
        id: entry.id,
        fileName: entry.name || pendingFileLabel,
        fileUrl: entry.previewUrl || '',
        file: entry.file,
        createdAt: entry.file?.lastModified
          ? new Date(entry.file.lastModified).toISOString()
          : undefined,
        size: entry.file?.size || 0,
      })),
    [pendingFileLabel, pendingFiles],
  );
  const hasExisting = existingAttachments.length > 0;
  const hasPending = pendingAttachments.length > 0;

  const appendFiles = useCallback(
    (fileList) => {
      if (!onPendingFilesChange || disabled) return;
      const picked = [...(fileList || [])].filter((file) => file instanceof File);
      if (picked.length === 0) return;

      if (!multiple) {
        for (const entry of pendingFiles) {
          if (entry?.previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(entry.previewUrl);
          }
        }
        onPendingFilesChange([createPendingFileEntry(picked[0], pendingFileLabel)]);
        return;
      }

      onPendingFilesChange([
        ...pendingFiles,
        ...picked.map((file) => createPendingFileEntry(file, pendingFileLabel)),
      ]);
    },
    [disabled, multiple, onPendingFilesChange, pendingFileLabel, pendingFiles],
  );

  const handleRemovePending = useCallback(
    (id) => {
      if (!onPendingFilesChange) return;
      const target = pendingFiles.find((entry) => entry.id === id);
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      onPendingFilesChange(pendingFiles.filter((entry) => entry.id !== id));
    },
    [onPendingFilesChange, pendingFiles],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      appendFiles(event.dataTransfer?.files);
    },
    [appendFiles],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-label-md font-medium text-text-sub-500'>
          <Icon className='size-5 shrink-0 text-text-sub-600' aria-hidden />
          {title}
        </div>
        {hasPending || hasExisting ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='shrink-0'
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </Button.Root>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        className='hidden'
        disabled={disabled}
        onChange={(event) => {
          appendFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {hasExisting ? (
        <AttachmentList
          attachments={existingAttachments}
          emptyStateMessage='No photos yet.'
          emptyStateDescription=''
          disabled={disabled}
        />
      ) : null}

      {hasPending ? (
        <AttachmentList
          attachments={pendingAttachments}
          onRemove={handleRemovePending}
          emptyStateMessage='No new photos selected.'
          emptyStateDescription=''
          disabled={disabled}
          dangerRemove
        />
      ) : null}

      {!hasPending && !hasExisting ? (
        <div
          role='presentation'
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className='flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-stroke-sub-300 bg-bg-white-0 px-5 py-5'
        >
          <RiUploadCloud2Line className='size-6 shrink-0 text-text-sub-600' aria-hidden />
          <div className='min-w-0 flex-1'>
            <p className='text-label-sm font-medium text-text-main-900'>{chooseLabel}</p>
            <p className='mt-1 text-paragraph-xs text-text-soft-400'>{description}</p>
          </div>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            className='shrink-0'
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            {browseLabel}
          </Button.Root>
        </div>
      ) : null}
    </section>
  );
};

export default StocksImageUploadSection;
