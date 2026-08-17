import React, { useId, useRef } from 'react';
import { RiAddLine, RiArrowUpLine, RiAttachment2 } from 'react-icons/ri';
import ProjectThreeDUploadMenu from '@/components/projects/three-d/project-three-d-upload-menu';
import { THREE_D_UPLOAD_MODES } from '@/components/projects/three-d/project-three-d-attachment-helpers';
import ProjectAttachmentList from '@/components/projects/shared/project-attachment-list';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';

export default function ProjectDrawerAttachmentsSection({
  attachments = [],
  onUpload,
  onRemove,
  versionedUpload = false,
  disabled = false,
  uploadDisabled = false,
  fileError = '',
  title = 'Attachments',
  emptyLabel = 'Drop your files here to upload',
  showUploadWhenEmpty = true,
  className = 'mt-6',
}) {
  const fileInputRef = useRef(null);
  const inputId = useId();
  const pendingModeRef = useRef(THREE_D_UPLOAD_MODES.FILE);
  const isInteractionDisabled = disabled || uploadDisabled;

  const openFilePicker = (mode = THREE_D_UPLOAD_MODES.FILE) => {
    pendingModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    onUpload?.(versionedUpload ? pendingModeRef.current : THREE_D_UPLOAD_MODES.FILE, files);
  };

  return (
    <section className={className}>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-label-md text-text-sub-500'>
          <RiAttachment2 className='size-5 text-text-soft-400' />
          {title}
        </div>
        {showUploadWhenEmpty || attachments.length > 0 ? (
          versionedUpload ? (
            <ProjectThreeDUploadMenu
              onUpload={(mode, files) => onUpload?.(mode, files)}
              disabled={isInteractionDisabled}
              buttonSize='small'
            />
          ) : (
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='flex flex-row gap-1.5'
              disabled={isInteractionDisabled}
              onClick={() => openFilePicker()}
            >
              <Button.Icon as={RiArrowUpLine} />
              Upload Files
            </Button.Root>
          )
        ) : null}
      </div>

      {fileError ? (
        <div className='mb-3 rounded-lg border border-error-base bg-error-50 px-3 py-2'>
          <span className='text-paragraph-xs text-error-base'>{fileError}</span>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        id={inputId}
        type='file'
        multiple
        className='hidden'
        disabled={isInteractionDisabled}
        onChange={handleFileChange}
      />

      {attachments.length > 0 ? (
        <ProjectAttachmentList
          attachments={attachments}
          onRemove={onRemove}
          disabled={isInteractionDisabled}
        />
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stroke-sub-300 bg-[#fcfcfc] px-3.5 py-2.5 shadow-regular-xs transition hover:bg-bg-weak-50',
            isInteractionDisabled && 'pointer-events-none opacity-60',
          )}
        >
          <RiAddLine className='size-5 shrink-0 text-text-sub-500' />
          <span className='text-paragraph-sm text-text-sub-500'>
            {emptyLabel.includes('upload') ? (
              <>
                Drop your files here to <span className='font-semibold underline'>upload</span>
              </>
            ) : (
              emptyLabel
            )}
          </span>
        </label>
      )}
    </section>
  );
}
