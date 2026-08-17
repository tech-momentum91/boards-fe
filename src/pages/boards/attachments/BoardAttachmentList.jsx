/**
 * BoardAttachmentList
 *
 * Renders the combined upload queue + completed attachments as a horizontal
 * scrollable row of cards.  Integrates drag-drop uploader above the list.
 *
 * Props:
 *   hook         – return value of useBoardAttachments()
 *   canDelete    – boolean, whether the current user may delete
 *   canUpload    – boolean, whether the current user may upload
 *   showUploader – boolean (default true), render the drop-zone above the list
 *   emptyLabel   – string override for empty state
 *   className    – string
 */

import React, { useState } from 'react';

import { cn } from '@/utils/cn';
import BoardAttachmentCard from './BoardAttachmentCard';
import BoardAttachmentPreview from './BoardAttachmentPreview';
import BoardAttachmentUploader from './BoardAttachmentUploader';

export default function BoardAttachmentList({
  hook,
  canDelete = false,
  canUpload = false,
  showUploader = true,
  emptyLabel = 'No attachments yet.',
  className,
}) {
  const {
    attachments,
    uploadQueue,
    isLoading,
    listError,
    upload,
    cancel,
    retry,
    dismissError,
    remove,
  } = hook;

  const [previewTarget, setPreviewTarget] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});

  const handleDelete = async (id) => {
    const result = await remove(id);
    if (result?.error) {
      setDeleteErrors((prev) => ({ ...prev, [id]: result.error }));
    } else {
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const hasContent = uploadQueue.length > 0 || attachments.length > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showUploader && canUpload ? (
        <BoardAttachmentUploader onFilesSelected={upload} disabled={isLoading} />
      ) : null}

      {listError ? <p className='text-paragraph-xs text-error-base'>{listError}</p> : null}

      {isLoading && !hasContent ? (
        <div className='flex min-w-0 gap-3 overflow-x-auto pb-1'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='h-[240px] w-[200px] shrink-0 animate-pulse rounded-[10px] bg-bg-weak-100'
            />
          ))}
        </div>
      ) : hasContent ? (
        <div className='flex min-w-0 gap-3 overflow-x-auto pb-1' role='list'>
          {uploadQueue.map((entry) => (
            <div key={entry.tempId} role='listitem'>
              <BoardAttachmentCard
                uploadEntry={entry}
                onCancel={cancel}
                onRetry={retry}
                onDismiss={dismissError}
              />
            </div>
          ))}

          {attachments.map((attachment) => (
            <div key={attachment.id} role='listitem' className='flex flex-col gap-1'>
              <BoardAttachmentCard
                attachment={attachment}
                canDelete={canDelete}
                onPreview={setPreviewTarget}
                onDelete={handleDelete}
              />
              {deleteErrors[attachment.id] ? (
                <p className='w-[200px] text-paragraph-xs text-error-base'>
                  {deleteErrors[attachment.id]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        !showUploader && <p className='text-paragraph-sm text-text-sub-500'>{emptyLabel}</p>
      )}

      {previewTarget ? (
        <BoardAttachmentPreview attachment={previewTarget} onClose={() => setPreviewTarget(null)} />
      ) : null}
    </div>
  );
}
