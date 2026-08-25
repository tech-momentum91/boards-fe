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

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';
import BoardAttachmentCard from './BoardAttachmentCard';
import BoardAttachmentPreview from './BoardAttachmentPreview';
import BoardAttachmentUploader from './BoardAttachmentUploader';
import type {
  BoardAttachment,
  BoardAttachmentsHook,
} from './useBoardAttachments';

interface BoardAttachmentListProps {
  hook: BoardAttachmentsHook;
  canDelete?: boolean;
  canUpload?: boolean;
  showUploader?: boolean;
  emptyLabel?: string;
  className?: string;
}

export default function BoardAttachmentList({
  hook,
  canDelete = false,
  canUpload = false,
  showUploader = true,
  emptyLabel = 'No attachments yet.',
  className,
}: BoardAttachmentListProps) {
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

  const [previewTarget, setPreviewTarget] = useState<BoardAttachment | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const toastedErrorsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const entry of uploadQueue) {
      if (entry.status !== 'error' || !entry.error) {
        continue;
      }
      if (toastedErrorsRef.current.has(entry.tempId)) {
        continue;
      }
      toastedErrorsRef.current.add(entry.tempId);
      showErrorToast(entry.error, {
        defaultMessage: `Failed to upload '${entry.file?.name ?? 'file'}'.`,
      });
    }
  }, [uploadQueue]);

  const handleFilesSelected = async (files: File[]) => {
    try {
      await upload(files);
    } catch (error) {
      showErrorToast(error, { defaultMessage: 'Failed to upload attachment.' });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await remove(id);
    if (result.error != null) {
      const error = result.error;
      setDeleteErrors((prev) => ({ ...prev, [id]: error }));
      showErrorToast(error);
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
        <BoardAttachmentUploader onFilesSelected={handleFilesSelected} />
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
