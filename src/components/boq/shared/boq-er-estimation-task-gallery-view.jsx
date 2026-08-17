import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowLeftSLine, RiBox3Fill, RiImageLine } from 'react-icons/ri';

import { fetchProjectThreeDVersionedImages } from '@/api/projectTasks';
import ProjectThreeDVersionTab from '@/components/projects/three-d/project-three-d-version-tab';
import { mapProjectThreeDVersionedImagesToGalleryTask } from '@/components/projects/three-d/project-three-d-helpers';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';

const SELECTED_THUMBNAIL_OVERLAY =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 100 80' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.6'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0.010585 6.6164 -12.327 0.019722 47.929 40)'><stop stop-color='rgba(0,0,0,0)' offset='0'/><stop stop-color='rgba(0,0,0,1)' offset='1'/></radialGradient></defs></svg>\")";

function BoqErTaskGalleryThumbnail({ attachment, isSelected, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'relative h-20 w-[100px] shrink-0 overflow-hidden rounded-[6px] transition',
        isSelected ? 'border-2 border-[#53dc9f]' : 'opacity-40 hover:opacity-70',
      )}
    >
      {attachment?.previewUrl ? (
        <>
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className='h-full w-full object-cover'
            draggable={false}
          />
          {isSelected ? (
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 rounded-[6px]'
              style={{ backgroundImage: SELECTED_THUMBNAIL_OVERLAY }}
            />
          ) : null}
        </>
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-bg-weak-100'>
          <RiImageLine className='size-5 text-text-soft-400' />
        </div>
      )}
    </button>
  );
}

function resolveTaskGallerySummary(task) {
  if (!task || typeof task !== 'object') return null;

  const taskId = String(task.taskId ?? task.task_id ?? task.name ?? task.id ?? '').trim();
  if (!taskId) return null;

  return {
    taskId,
    title: String(task.title ?? task.subject ?? '').trim(),
    floor: String(task.floor ?? task.custom_floor ?? '').trim(),
    area: String(task.area ?? task.custom_area ?? task.area_label ?? task.area_id ?? '').trim(),
  };
}

/**
 * Versioned image gallery for a single 3D / GFC task selected from the ER layout.
 */
const BoqErEstimationTaskGalleryView = ({
  className = '',
  task = null,
  onBack,
  emptyLabel = 'No images for this task.',
}) => {
  const summary = useMemo(() => resolveTaskGallerySummary(task), [task]);
  const [previewTask, setPreviewTask] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState(0);

  useEffect(() => {
    if (!summary?.taskId) {
      setPreviewTask(null);
      setIsPreviewLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsPreviewLoading(true);
    setPreviewTask(null);
    setActiveVersionIndex(0);
    setActiveAttachmentIndex(0);

    fetchProjectThreeDVersionedImages(summary.taskId)
      .then((data) => {
        if (cancelled) return;
        setPreviewTask(mapProjectThreeDVersionedImagesToGalleryTask(data, summary));
        const versionGroups = Array.isArray(data?.versions) ? data.versions : [];
        setActiveVersionIndex(Math.max(versionGroups.length - 1, 0));
      })
      .catch((error) => {
        if (!cancelled) {
          showErrorToast(extractErrorMessage(error, 'Failed to load task images.'));
          setPreviewTask(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [summary]);

  const versionGroups = previewTask?.versionGroups ?? [];
  const activeVersionGroup = versionGroups[activeVersionIndex];
  const activeAttachments = activeVersionGroup?.attachments ?? [];
  const activeAttachment = activeAttachments[activeAttachmentIndex];

  const taskTitle = useMemo(() => {
    const title = String(previewTask?.title ?? summary?.title ?? '').trim();
    if (title) return title;
    const area = String(previewTask?.area ?? summary?.area ?? '').trim();
    if (area) return area;
    return 'Task gallery';
  }, [previewTask?.area, previewTask?.title, summary?.area, summary?.title]);

  const areaLabel = String(previewTask?.area ?? summary?.area ?? '').trim();

  const handleVersionSelect = useCallback((index) => {
    setActiveVersionIndex(index);
    setActiveAttachmentIndex(0);
  }, []);

  if (!summary?.taskId) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#20232d] px-6 text-center',
          className,
        )}
      >
        <p className='text-paragraph-sm text-white/80'>{emptyLabel}</p>
        {typeof onBack === 'function' ? (
          <button
            type='button'
            onClick={onBack}
            className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-white/80 hover:bg-white/10'
          >
            <RiArrowLeftSLine className='size-4' aria-hidden />
            Back to layout
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-[#20232d]', className)}>
      <div className='flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-1.5'>
        {typeof onBack === 'function' ? (
          <button
            type='button'
            onClick={onBack}
            className='inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-white/80 hover:bg-white/10'
          >
            <RiArrowLeftSLine className='size-4' aria-hidden />
            Back
          </button>
        ) : null}
        <div className='min-w-0 flex-1 truncate px-1'>
          <span className='text-[13px] font-semibold text-white/80'>{taskTitle}</span>
          {areaLabel && areaLabel !== taskTitle ? (
            <span className='ml-2 text-[12px] text-white/50'>{areaLabel}</span>
          ) : null}
        </div>
      </div>

      <div className='relative min-h-0 flex-1 overflow-hidden'>
        {activeAttachment?.previewUrl ? (
          <img
            src={activeAttachment.previewUrl}
            alt={activeAttachment.name || taskTitle}
            className='absolute inset-0 size-full object-cover'
            draggable={false}
          />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center bg-[#20232d]'>
            {isPreviewLoading ? (
              <p className='text-paragraph-sm text-white/80'>Loading images…</p>
            ) : (
              <div className='flex flex-col items-center gap-2 px-6 text-center'>
                <RiImageLine className='size-16 text-white/30' />
                <p className='text-paragraph-sm text-white/60'>{emptyLabel}</p>
              </div>
            )}
          </div>
        )}

        {versionGroups.length > 0 ? (
          <div className='absolute inset-x-0 bottom-0 z-10'>
            <div className='flex items-end gap-0 px-0'>
              {versionGroups.map((group, index) => {
                const isActive = index === activeVersionIndex;
                return (
                  <ProjectThreeDVersionTab
                    key={`${group.version}-${index}`}
                    version={group.version}
                    isActive={isActive}
                    onClick={() => handleVersionSelect(index)}
                    className={cn(
                      isActive ? 'text-text-white-0' : 'text-text-soft-400 hover:text-text-white-0',
                    )}
                  />
                );
              })}
            </div>

            <div className='border border-white/10 bg-[#161922]'>
              <div className='flex gap-[9px] overflow-x-auto p-2.5'>
                {activeAttachments.map((attachment, index) => (
                  <BoqErTaskGalleryThumbnail
                    key={attachment.id}
                    attachment={attachment}
                    isSelected={index === activeAttachmentIndex}
                    onClick={() => setActiveAttachmentIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className='flex h-10 shrink-0 items-center gap-1.5 px-2.5'>
        <RiBox3Fill className='size-5 shrink-0 text-white/80' aria-hidden />
        <span className='truncate text-[14px] font-semibold leading-5 text-white/80'>
          {taskTitle}
        </span>
      </div>
    </div>
  );
};

export default memo(BoqErEstimationTaskGalleryView);
