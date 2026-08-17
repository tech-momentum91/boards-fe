import React from 'react';
import { RiFileLine, RiPencilLine, RiUploadLine } from 'react-icons/ri';

import { DocumentFileCard } from '@/components/products/products-basic-upload-fields';
import { groupProductDocumentFiles } from '@/components/products/product-document-file-utils';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';

function DocumentTypeGroup({ group, onEditGroup, onRemoveFile, removingFileId }) {
  return (
    <div className='flex w-full flex-col gap-3'>
      <div className='flex w-full items-center justify-between gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50/60 py-2 pl-4 pr-3'>
        <span className='text-label-sm font-medium text-text-main-900'>{group.label}</span>
        {onEditGroup ? (
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            onClick={() => onEditGroup(group)}
            aria-label={`Edit ${group.label} documents`}
            className='shrink-0 rounded-md p-0.5'
          >
            <CompactButton.Icon as={RiPencilLine} className='size-5' />
          </CompactButton.Root>
        ) : null}
      </div>
      <div className='flex flex-col items-start gap-3'>
        {group.files.map((file) => (
          <DocumentFileCard
            key={file.id}
            file={file}
            isRemoving={removingFileId === file.id}
            onRemove={onRemoveFile}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Documents header + vertical file list — matches Figma node 33328:40945.
 */
export function ProductDocumentsPanel({
  files = [],
  onUploadClick,
  onRemoveFile,
  onEditGroup,
  groupByDocumentType = false,
  isUploading = false,
  uploadDisabled = false,
  fileInputRef,
  onFileInputChange,
  accept = '.pdf,application/pdf,image/*',
  multiple = true,
  showFileInput = false,
  emptyMessage = 'No documents uploaded yet.',
  removingFileId = null,
  className,
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className='flex flex-col gap-4'>
        <div className='border-t border-stroke-soft-200' aria-hidden />
        <div className='flex items-center gap-4'>
          <div className='flex min-w-0 flex-1 items-center gap-1.5'>
            <RiFileLine className='size-5 shrink-0 text-text-sub-500' aria-hidden />
            <h2 className='text-label-md font-medium text-text-sub-500'>Documents</h2>
          </div>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            disabled={uploadDisabled || isUploading}
            onClick={onUploadClick}
            className='min-w-[76px] shrink-0 gap-0.5 bg-bg-white-0 px-1.5 py-1.5 shadow-regular-xs'
          >
            <Button.Icon as={RiUploadLine} />
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button.Root>
        </div>
      </div>

      {showFileInput ? (
        <input
          ref={fileInputRef}
          type='file'
          accept={accept}
          multiple={multiple}
          className='hidden'
          onChange={onFileInputChange}
        />
      ) : null}

      {files.length > 0 ? (
        <div className='flex w-full flex-col gap-3'>
          {groupByDocumentType ? (
            groupProductDocumentFiles(files).map((group) => (
              <DocumentTypeGroup
                key={group.key}
                group={group}
                onEditGroup={onEditGroup}
                onRemoveFile={onRemoveFile}
                removingFileId={removingFileId}
              />
            ))
          ) : (
            <div className='flex flex-col items-start gap-3'>
              {files.map((file) => (
                <DocumentFileCard
                  key={file.id}
                  file={file}
                  documentTypeLabel={file.documentTypeLabel}
                  isRemoving={removingFileId === file.id}
                  onRemove={onRemoveFile}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className='text-paragraph-sm text-text-soft-400'>{emptyMessage}</p>
      )}
    </section>
  );
}
