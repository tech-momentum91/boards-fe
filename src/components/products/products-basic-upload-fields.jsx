import React, { useMemo } from 'react';
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiImageLine,
  RiPencilLine,
  RiPlayLine,
  RiUploadLine,
} from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Label from '@/components/ui/label';
import { normalizeAttachment } from '@/lib/utils';
import { formatFileSize, getFileExtension } from '@/utils/file-utils';
import { showErrorToast } from '@/utils/error-utils';
import {
  validateProductFiles,
  validateProductMediaFiles,
} from '@/components/products/product-upload-utils';
import { cn } from '@/utils/cn';

function triggerFileInput(inputId) {
  document.querySelector(`#${inputId}`)?.click();
}

function handleValidatedFileSelection(fileList, validate, onAddFiles) {
  const { validFiles, errorMessage } = validate(fileList);
  if (errorMessage) {
    showErrorToast(errorMessage);
  }
  if (validFiles.length > 0) {
    onAddFiles(validFiles);
  }
}

function getDocumentIconFormat(file) {
  const extension = getFileExtension(file.fileName);
  if (extension) return extension;
  if (String(file.file?.type || '').startsWith('image/')) return 'IMG';
  return 'pdf';
}

export function DocumentFileCard({
  file,
  onRemove,
  onEdit,
  documentTypeLabel,
  className,
  isRemoving = false,
}) {
  const format = getDocumentIconFormat(file);
  const iconColor = format === 'pdf' || format === 'PDF' ? 'red' : 'blue';

  return (
    <div
      className={cn(
        documentTypeLabel ? 'flex w-full max-w-full' : 'inline-flex w-fit max-w-full',
        'shrink-0 flex-col justify-center overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 py-3 pl-[14px] pr-3 shadow-regular-xs',
        isRemoving && 'opacity-60',
        className,
      )}
    >
      {documentTypeLabel ? (
        <span className='mb-1.5 text-label-sm font-medium text-text-sub-500'>
          {documentTypeLabel}
        </span>
      ) : null}
      <div className='flex items-center gap-3'>
        <FileFormatIcon.Root format={format} size='xsmall' color={iconColor} />
        <div className='flex min-w-0 flex-1 items-center gap-1'>
          <span className='truncate text-label-sm font-medium text-text-main-900'>
            {file.fileName}
          </span>
          {file.size > 0 ? (
            <span className='shrink-0 text-paragraph-xs text-text-sub-500'>
              {formatFileSize(file.size)}
            </span>
          ) : null}
        </div>
        {onEdit ? (
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            disabled={isRemoving}
            onClick={() => onEdit(file.id)}
            aria-label={`Edit ${file.fileName}`}
            className='shrink-0 rounded-md p-0.5'
          >
            <CompactButton.Icon as={RiPencilLine} className='size-5' />
          </CompactButton.Root>
        ) : null}
        <CompactButton.Root
          type='button'
          variant='ghost'
          size='medium'
          disabled={isRemoving}
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.fileName}`}
          className='shrink-0 rounded-md p-0.5'
        >
          <CompactButton.Icon as={RiDeleteBinLine} className='size-5' />
        </CompactButton.Root>
      </div>
    </div>
  );
}

function BrochureFileCard({ file, onRemove }) {
  return <DocumentFileCard file={file} onRemove={onRemove} />;
}

export function BrochureUploadField({
  files = [],
  onAddFiles,
  onRemoveFile,
  inputId = 'file-input-brochures',
}) {
  const hasFiles = files.length > 0;

  return (
    <div className='flex flex-col gap-2'>
      {hasFiles ? (
        <>
          <div className='flex items-center justify-between gap-3'>
            <Label.Root>Brochure</Label.Root>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => triggerFileInput(inputId)}
              className='min-w-[76px] gap-0.5 bg-bg-white-0 px-1.5 py-1.5 shadow-regular-xs shrink-0'
            >
              <Button.Icon as={RiAddLine} />
              Add More
            </Button.Root>
          </div>

          <div className='flex flex-col items-start gap-2'>
            {files.map((file) => (
              <BrochureFileCard key={file.id} file={file} onRemove={onRemoveFile} />
            ))}
          </div>
        </>
      ) : (
        <>
          <Label.Root>Brochure</Label.Root>
          <div
            onClick={() => triggerFileInput(inputId)}
            className='flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 py-3 shadow-regular-xs transition-colors hover:bg-bg-weak-50'
          >
            <span className='flex items-center gap-1.5 text-paragraph-sm font-semibold text-text-sub-500'>
              <RiUploadLine className='size-4 text-text-soft-400' />+ Drop your files here to{' '}
              <span className='underline text-primary-base'>upload</span>
            </span>
          </div>
        </>
      )}

      <input
        id={inputId}
        type='file'
        accept='.pdf'
        multiple
        className='hidden'
        onChange={(event) => {
          handleValidatedFileSelection(event.target.files, validateProductFiles, onAddFiles);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function MediaThumbnail({ attachment, onRemove }) {
  const isVideo = attachment.isVideo || String(attachment.file?.type || '').startsWith('video/');
  const hasPreview = Boolean(attachment.fileUrl) && !isVideo;

  return (
    <div className='relative shrink-0 pt-1.5'>
      <div className='flex size-[76px] items-center justify-center overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-xs'>
        {hasPreview ? (
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className='size-full object-cover'
          />
        ) : isVideo ? (
          <RiPlayLine className='size-5 text-text-soft-400' />
        ) : (
          <RiImageLine className='size-5 text-text-soft-400' />
        )}
      </div>
      <CompactButton.Root
        type='button'
        variant='stroke'
        size='medium'
        onClick={() => onRemove(attachment.id)}
        aria-label={`Remove ${attachment.fileName}`}
        className='absolute -right-px -top-px bg-bg-white-0 shadow-regular-xs'
      >
        <CompactButton.Icon as={RiCloseLine} />
      </CompactButton.Root>
    </div>
  );
}

export function PhotosVideoField({
  files = [],
  onAddFiles,
  onRemoveFile,
  inputId = 'file-input-productImages',
  label = 'Photos & Video',
}) {
  const normalizedFiles = useMemo(
    () => files.map((file, index) => normalizeAttachment(file, index)),
    [files],
  );

  return (
    <div className='flex flex-col gap-1'>
      <Label.Root>{label}</Label.Root>

      {normalizedFiles.length > 0 ? (
        <div className='flex flex-wrap items-start gap-1.5'>
          {normalizedFiles.map((file) => (
            <MediaThumbnail key={file.id} attachment={file} onRemove={onRemoveFile} />
          ))}
          <button
            type='button'
            onClick={() => triggerFileInput(inputId)}
            className={cn(
              'mt-1.5 flex size-[76px] items-center justify-center rounded-lg border border-dashed border-stroke-soft-200',
              'bg-bg-white-0 text-text-soft-400 hover:bg-bg-weak-50 transition-colors',
            )}
            aria-label='Add photos or video'
          >
            <RiAddLine className='size-5' />
          </button>
        </div>
      ) : (
        <div
          onClick={() => triggerFileInput(inputId)}
          className='flex items-center justify-center border border-dashed border-stroke-soft-200 bg-bg-white-0 py-3 rounded-xl cursor-pointer hover:bg-bg-weak-50 transition-colors shadow-regular-xs'
        >
          <span className='text-paragraph-sm font-semibold text-text-sub-500 flex items-center gap-1.5'>
            <RiUploadLine className='size-4 text-text-soft-400' />+ Drop your files here to{' '}
            <span className='underline text-primary-base'>upload</span>
          </span>
        </div>
      )}

      <input
        id={inputId}
        type='file'
        accept='image/*,video/*'
        multiple
        className='hidden'
        onChange={(event) => {
          handleValidatedFileSelection(event.target.files, validateProductMediaFiles, onAddFiles);
          event.target.value = '';
        }}
      />
    </div>
  );
}
