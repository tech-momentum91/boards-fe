import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiUploadCloud2Line, RiUploadLine, RiDeleteBinLine } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { getFileExtension } from '@/utils/file-utils';

/**
 * Photo / file upload block matching the pattern used in create-new-agreement.jsx (Agreement Document).
 */
const IMAGE_EXTENSIONS = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'];

const SupportReportPhotoUpload = ({ files, onFilesChange, onRemoveAt, label = 'Attachments' }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const previewObjectUrls = useMemo(() => {
    return files.map((file) => {
      if (!file) return null;
      const extension = getFileExtension(file.name);
      const isImage = IMAGE_EXTENSIONS.includes(extension);
      if (!isImage) return null;
      return URL.createObjectURL(file);
    });
  }, [files]);

  useEffect(() => {
    return () => {
      previewObjectUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewObjectUrls]);

  const handlePicked = useCallback(
    (picked) => {
      if (!picked?.length) return;
      const next = [...files, ...picked];
      onFilesChange(next);
    },
    [files, onFilesChange],
  );

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div className='text-label-sm text-text-strong-950'>{label}</div>
        {files.length > 0 ? (
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='pl-2.5 pr-3 py-1.5 gap-0.5'
            type='button'
            onClick={() => inputRef.current?.click()}
          >
            <Button.Icon as={RiUploadLine} />
            <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
          </Button.Root>
        ) : null}
        <input
          ref={inputRef}
          type='file'
          multiple
          className='hidden'
          onChange={(e) => handlePicked(e.target.files)}
        />
      </div>

      {files.length === 0 ? (
        <div
          className={cn(
            'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
            dragActive ? 'bg-bg-weak-50' : '',
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            handlePicked(e.dataTransfer.files);
          }}
        >
          <div className='flex items-center justify-between '>
            <div className='flex items-center gap-3'>
              <RiUploadCloud2Line className='size-6 text-text-sub-500' />
              <div className='flex flex-col gap-1'>
                <div className='text-paragraph-sm text-text-strong-950'>
                  Choose a file or drag & drop it here.
                </div>
                <div className='text-paragraph-xs text-text-sub-600'>
                  JPEG, PNG formats, up to 50 MB
                </div>
              </div>
            </div>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='xsmall'
              type='button'
              onClick={() => inputRef.current?.click()}
            >
              Browse File
            </Button.Root>
          </div>
        </div>
      ) : (
        <div className='flex w-full flex-col gap-4'>
          {previewObjectUrls.some(Boolean) ? (
            <div className='flex flex-col gap-2'>
              <div className='text-label-xs text-text-sub-600'>Preview</div>
              <div className='flex flex-wrap gap-3'>
                {files.map((file, index) => {
                  const url = previewObjectUrls[index];
                  if (!file || !url) return null;
                  return (
                    <div
                      key={`preview-${file.name}-${file.size}-${file.lastModified ?? ''}`}
                      className='group relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50 shadow-regular-xs'
                    >
                      <img
                        src={url}
                        alt={file.name}
                        className='h-full w-full object-cover'
                        decoding='async'
                      />
                      <CompactButton.Root
                        variant='ghost'
                        size='large'
                        className='absolute right-1 top-1 z-10 cursor-pointer rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100'
                        type='button'
                        onClick={() => onRemoveAt(index)}
                        aria-label='Remove file'
                      >
                        <CompactButton.Icon as={RiDeleteBinLine} />
                      </CompactButton.Root>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SupportReportPhotoUpload;
