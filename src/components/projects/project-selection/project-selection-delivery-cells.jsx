import React, { useEffect, useRef, useState } from 'react';
import { RiCloseLine, RiUpload2Line } from 'react-icons/ri';
import { truncateFileName } from '@/components/products/product-document-file-utils';
import { extractFileNameFromAttachmentPath } from '@/components/projects/shared/project-attachment-display-utils';
import * as CompactButton from '@/components/ui/compact-button';
import * as FileFormatIcon from '@/components/ui/file-format-icon';
import * as Tooltip from '@/components/ui/tooltip';
import { getFileExtension, isImageFile, toAbsoluteAttachmentUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/file-utils';
import { PROJECT_SELECTION_CHALLAN_NAME_MAX_LENGTH } from '@/components/projects/constants';

function useAttachmentPreviewUrl(value) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!value) {
      setPreviewUrl('');
      return undefined;
    }

    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPreviewUrl(toAbsoluteAttachmentUrl(value) || '');
    return undefined;
  }, [value]);

  return previewUrl;
}

function InlineUploadButton({ disabled, isUploading, onClick }) {
  return (
    <button
      type='button'
      disabled={disabled || isUploading}
      onClick={onClick}
      className='inline-flex items-center gap-1 text-paragraph-sm text-text-sub-500 transition hover:text-text-main-900 disabled:cursor-not-allowed disabled:opacity-50'
    >
      <RiUpload2Line className='size-4' />
      {isUploading ? 'Uploading...' : 'Upload'}
    </button>
  );
}

export function isSelectionAttachmentImage(value) {
  if (!value) return false;
  if (value instanceof File) return isImageFile(value);
  const raw = String(value).trim();
  if (!raw || raw === 'uploaded-image') return false;
  const name = extractFileNameFromAttachmentPath(raw) || raw;
  return isImageFile({ name });
}

export function mapDeliveryChallanFromUrl(url, fileMeta = null) {
  if (!url) return null;
  if (url instanceof File) {
    return {
      name: url.name,
      url: '',
      file: url,
      sizeBytes: url.size,
      size: formatFileSize(url.size),
    };
  }
  return {
    name: fileMeta?.name || extractFileNameFromAttachmentPath(url) || 'File',
    url,
    sizeBytes: Number(fileMeta?.size) || 0,
    size: fileMeta?.size ? formatFileSize(fileMeta.size) : '',
  };
}

export function DeliveryPhotoCell({
  photoUrl,
  disabled = false,
  isUploading = false,
  accept = 'image/*',
  onChange,
}) {
  const fileInputRef = useRef(null);
  const hasPhoto = Boolean(photoUrl);
  const previewUrl = useAttachmentPreviewUrl(photoUrl);

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        {...(accept ? { accept } : {})}
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onChange?.(file);
        }}
      />
      {!hasPhoto ? (
        <InlineUploadButton
          disabled={disabled}
          isUploading={isUploading}
          onClick={() => {
            if (!disabled && !isUploading) fileInputRef.current?.click();
          }}
        />
      ) : (
        <div className='relative inline-flex shrink-0'>
          <button
            type='button'
            disabled={disabled || isUploading}
            onClick={() => {
              if (!disabled && !isUploading) fileInputRef.current?.click();
            }}
            className={cn(
              'size-10 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-weak-100 shadow-regular-xs',
              'transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
            )}
            aria-label='Change delivery photo'
          >
            <img
              src={previewUrl}
              alt='Delivery photo'
              className='size-full object-cover'
              loading='lazy'
            />
          </button>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='medium'
            disabled={disabled || isUploading}
            onClick={() => onChange?.('')}
            aria-label='Remove delivery photo'
            className='absolute -right-px -top-px bg-bg-white-0 shadow-regular-xs'
          >
            <CompactButton.Icon as={RiCloseLine} />
          </CompactButton.Root>
        </div>
      )}
    </>
  );
}

/**
 * Renders DeliveryPhotoCell for images and DeliveryChallanCell for other files.
 * Empty state uses the shared Upload button (challan cell) and accepts any file.
 */
export function SelectionAttachmentCell({
  value,
  disabled = false,
  isUploading = false,
  onChange,
}) {
  const handleChange = (next) => {
    if (!next) {
      onChange?.('');
      return;
    }
    onChange?.(next);
  };

  if (value && isSelectionAttachmentImage(value)) {
    return (
      <DeliveryPhotoCell
        photoUrl={value}
        disabled={disabled}
        isUploading={isUploading}
        accept={undefined}
        onChange={handleChange}
      />
    );
  }

  return (
    <DeliveryChallanCell
      challan={value ? mapDeliveryChallanFromUrl(value) : null}
      disabled={disabled}
      isUploading={isUploading}
      onChange={(next) => {
        if (!next) {
          handleChange('');
          return;
        }
        if (next instanceof File) {
          handleChange(next);
          return;
        }
        handleChange(next?.file || next?.url || '');
      }}
    />
  );
}

export function DeliveryChallanCell({ challan, disabled = false, isUploading = false, onChange }) {
  const fileInputRef = useRef(null);
  const hasChallan = Boolean(challan?.url || challan?.file);
  const fullName = challan?.name || extractFileNameFromAttachmentPath(challan?.url) || 'File';
  const displayName = truncateFileName(fullName, PROJECT_SELECTION_CHALLAN_NAME_MAX_LENGTH);
  const sizeLabel =
    Number(challan?.sizeBytes) > 0
      ? formatFileSize(challan.sizeBytes)
      : challan?.size
        ? String(challan.size)
        : '';
  const iconFormat = getFileExtension(fullName) || 'PDF';
  const iconColor = ['PDF', 'DOC', 'DOCX'].includes(iconFormat) ? 'red' : 'blue';

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onChange?.(file);
        }}
      />
      {!hasChallan ? (
        <InlineUploadButton
          disabled={disabled}
          isUploading={isUploading}
          onClick={() => {
            if (!disabled && !isUploading) fileInputRef.current?.click();
          }}
        />
      ) : (
        <div className='inline-flex max-w-[200px] items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1 pl-2 pr-1 shadow-regular-xs'>
          <FileFormatIcon.Root format={iconFormat} size='xsmall' color={iconColor} />
          <div className='min-w-0 flex-1'>
            <div className='flex min-w-0 items-center gap-1'>
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <button
                    type='button'
                    onClick={() => {
                      if (!challan?.url || challan?.file) return;
                      window.open(
                        toAbsoluteAttachmentUrl(challan.url),
                        '_blank',
                        'noopener,noreferrer',
                      );
                    }}
                    className='min-w-0 truncate text-left text-label-sm font-medium text-text-main-900 hover:underline'
                  >
                    {displayName}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>{fullName}</Tooltip.Content>
              </Tooltip.Root>
              {sizeLabel ? (
                <span className='shrink-0 text-paragraph-xs text-text-sub-500'>{sizeLabel}</span>
              ) : null}
            </div>
          </div>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            disabled={disabled || isUploading}
            onClick={() => onChange?.(null)}
            aria-label={`Remove ${fullName}`}
          >
            <CompactButton.Icon as={RiCloseLine} />
          </CompactButton.Root>
        </div>
      )}
    </>
  );
}
