import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiBox3Line,
  RiCloseLine,
  RiImageLine,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import ProjectThreeDVersionTab from '@/components/projects/three-d/project-three-d-version-tab';
import { getStatusMetaForOption } from '@/components/ticket-management/constants';
import { useMediaPreviewLayerLock } from '@/hooks/use-media-preview-layer-lock';
import { useTaskStatusScope } from '@/components/projects/shared/task-status-scope-context';
import { cn } from '@/utils/cn';

const STATUS_BADGE_COLORS = new Set([
  'gray',
  'blue',
  'orange',
  'red',
  'green',
  'yellow',
  'purple',
  'sky',
  'pink',
  'teal',
]);

function PreviewStatusBadge({ status, statusOptions = [], statusMetaMap = {} }) {
  if (!status) return null;

  const option = statusOptions.find((entry) => (entry.value ?? entry.label) === status) ?? {
    value: status,
    label: status,
  };
  const meta = getStatusMetaForOption(option, statusMetaMap);
  const color = STATUS_BADGE_COLORS.has(meta.color) ? meta.color : 'gray';

  return (
    <Badge.Root
      size='medium'
      variant='filled'
      color={color}
      className='max-w-[min(40vw,220px)] truncate shadow-regular-sm'
    >
      {option.label ?? status}
    </Badge.Root>
  );
}

export default function ProjectThreeDGalleryPreview({
  open,
  task,
  initialAttachmentId,
  onClose,
  isLoading = false,
  navigationTasks = [],
  onNavigateTask,
}) {
  const { statusOptions, statusMetaMap } = useTaskStatusScope();
  const layerRef = React.useRef(null);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState(0);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const versionGroups = task?.versionGroups ?? [];
  const activeVersionGroup = versionGroups[activeVersionIndex];
  const activeAttachments = activeVersionGroup?.attachments ?? [];
  const activeAttachment = activeAttachments[activeAttachmentIndex];
  const activeStatus = activeVersionGroup?.status ?? task?.status;

  const currentTaskIndex = useMemo(() => {
    const currentId = String(task?.focusVersionTaskId || task?.taskId || '').trim();
    if (!currentId || navigationTasks.length === 0) return -1;
    return navigationTasks.findIndex((entry) => {
      const entryId = String(entry.focusVersionTaskId || entry.taskId || '').trim();
      return entryId === currentId || entry.taskId === task?.taskId;
    });
  }, [navigationTasks, task?.focusVersionTaskId, task?.taskId]);

  const canGoPrevTask = currentTaskIndex > 0;
  const canGoNextTask = currentTaskIndex >= 0 && currentTaskIndex < navigationTasks.length - 1;

  useEffect(() => {
    if (!open || !task) return;

    const initialVersionIndex = initialAttachmentId
      ? versionGroups.findIndex((group) =>
          group.attachments.some((attachment) => attachment.id === initialAttachmentId),
        )
      : versionGroups.length - 1;

    const safeVersionIndex =
      initialVersionIndex >= 0 ? initialVersionIndex : Math.max(versionGroups.length - 1, 0);
    const initialGroup = versionGroups[safeVersionIndex];
    const initialAttachmentIndex = initialAttachmentId
      ? Math.max(
          0,
          initialGroup?.attachments.findIndex(
            (attachment) => attachment.id === initialAttachmentId,
          ) ?? 0,
        )
      : 0;

    setActiveVersionIndex(safeVersionIndex);
    setActiveAttachmentIndex(initialAttachmentIndex);
  }, [initialAttachmentId, open, task?.taskId, versionGroups]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [activeAttachment?.id, activeAttachment?.previewUrl]);

  const goToAdjacentTask = useCallback(
    (direction) => {
      if (!onNavigateTask || currentTaskIndex < 0) return false;
      const nextIndex = currentTaskIndex + direction;
      const nextTask = navigationTasks[nextIndex];
      if (!nextTask) return false;
      onNavigateTask(nextTask);
      return true;
    },
    [currentTaskIndex, navigationTasks, onNavigateTask],
  );

  /** Side arrows: images within version → other versions of this task → then next/prev task. */
  const goPrevAttachment = useCallback(() => {
    if (activeAttachmentIndex > 0) {
      setActiveAttachmentIndex((current) => current - 1);
      return;
    }

    if (activeVersionIndex > 0) {
      const previousVersionIndex = activeVersionIndex - 1;
      const previousAttachments = versionGroups[previousVersionIndex]?.attachments ?? [];
      setActiveVersionIndex(previousVersionIndex);
      setActiveAttachmentIndex(Math.max(0, previousAttachments.length - 1));
      return;
    }

    goToAdjacentTask(-1);
  }, [activeAttachmentIndex, activeVersionIndex, goToAdjacentTask, versionGroups]);

  const goNextAttachment = useCallback(() => {
    if (activeAttachmentIndex < activeAttachments.length - 1) {
      setActiveAttachmentIndex((current) => current + 1);
      return;
    }

    if (activeVersionIndex < versionGroups.length - 1) {
      setActiveVersionIndex((current) => current + 1);
      setActiveAttachmentIndex(0);
      return;
    }

    goToAdjacentTask(1);
  }, [
    activeAttachmentIndex,
    activeAttachments.length,
    activeVersionIndex,
    goToAdjacentTask,
    versionGroups.length,
  ]);

  const isAtFirstImageInTask = activeVersionIndex <= 0 && activeAttachmentIndex <= 0;
  const isAtLastImageInTask =
    activeVersionIndex >= Math.max(versionGroups.length - 1, 0) &&
    activeAttachmentIndex >= Math.max(activeAttachments.length - 1, 0);

  const canGoPrevAttachment = !isAtFirstImageInTask || canGoPrevTask;
  const canGoNextAttachment = !isAtLastImageInTask || canGoNextTask;

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
      if (event.key === 'ArrowLeft') goPrevAttachment();
      if (event.key === 'ArrowRight') goNextAttachment();
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [goNextAttachment, goPrevAttachment, onClose, open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useMediaPreviewLayerLock(open, layerRef);

  const locationLabel = useMemo(() => {
    const parts = [task?.title, task?.floor].filter(Boolean);
    return parts.join(' ');
  }, [task?.floor, task?.title]);

  // Keep side navigation visible (disabled when unavailable), including for
  // blank tasks, so the preview controls do not disappear between tasks.
  const showSideAttachmentNav = Boolean(task);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={layerRef}
      className='fixed inset-0 z-[120] flex flex-col'
      role='dialog'
      aria-modal='true'
      aria-labelledby='three-d-gallery-preview-title'
    >
      <h2 id='three-d-gallery-preview-title' className='sr-only'>
        3D attachment preview
      </h2>

      <div className='absolute inset-0 bg-[rgba(2,13,23,0.6)] backdrop-blur-[4px]' aria-hidden />

      {isLoading || !task ? (
        <div className='relative z-10 flex min-h-0 flex-1 flex-col'>
          <div className='flex justify-end px-8 py-8'>
            <CompactButton.Root
              variant='stroke'
              size='medium'
              onClick={onClose}
              aria-label='Close preview'
              className='border-transparent bg-neutral-800 text-text-white-0 hover:bg-neutral-800/90'
            >
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </div>
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-paragraph-sm text-text-white-0'>Loading preview…</p>
          </div>
        </div>
      ) : (
        <div className='relative z-10 flex min-h-0 flex-1 flex-col'>
          <div className='flex items-start justify-end gap-4 px-8 py-5'>
            <div className='flex items-center gap-2'>
              {navigationTasks.length > 1 ? (
                <div className='flex items-center gap-1 rounded-md border border-white/10 bg-neutral-800/80 p-1'>
                  <CompactButton.Root
                    variant='stroke'
                    size='medium'
                    disabled={!canGoPrevTask}
                    onClick={() => goToAdjacentTask(-1)}
                    aria-label='Previous task'
                    className='border-transparent bg-transparent text-text-white-0 hover:bg-neutral-700 disabled:opacity-40'
                  >
                    <CompactButton.Icon as={RiArrowLeftSLine} />
                  </CompactButton.Root>
                  <CompactButton.Root
                    variant='stroke'
                    size='medium'
                    disabled={!canGoNextTask}
                    onClick={() => goToAdjacentTask(1)}
                    aria-label='Next task'
                    className='border-transparent bg-transparent text-text-white-0 hover:bg-neutral-700 disabled:opacity-40'
                  >
                    <CompactButton.Icon as={RiArrowRightSLine} />
                  </CompactButton.Root>
                </div>
              ) : null}

              <CompactButton.Root
                variant='stroke'
                size='large'
                onClick={onClose}
                aria-label='Close preview'
                className='border-transparent bg-neutral-800 text-text-white-0 hover:bg-neutral-800/90'
              >
                <CompactButton.Icon as={RiCloseLine} />
              </CompactButton.Root>
            </div>
          </div>

          <div className='relative flex min-h-0 flex-1 items-center justify-center px-20'>
            <div className='relative inline-flex max-h-[calc(100vh-230px)] max-w-[calc(100vw-10rem)] items-center justify-center overflow-hidden rounded-xl bg-neutral-800/35 shadow-regular-lg'>
              <div className='pointer-events-none absolute left-3 top-3 z-10 inline-flex max-w-[min(45vw,360px)] items-center gap-1.5 rounded-md border border-stroke-soft-200 bg-bg-white-0/95 px-2 py-1 shadow-regular-xs backdrop-blur-sm'>
                <RiBox3Line className='size-5 shrink-0 text-primary-base' />
                <p className='min-w-0 truncate text-label-sm text-text-strong-950'>
                  <span>{task.title}</span>
                  {task.floor ? (
                    <span className='ml-1 text-label-sm text-text-soft-400'>{task.floor}</span>
                  ) : null}
                </p>
              </div>
              <div className='pointer-events-none absolute right-3 top-3 z-10'>
                <PreviewStatusBadge
                  status={activeStatus}
                  statusOptions={statusOptions}
                  statusMetaMap={statusMetaMap}
                />
              </div>

              {activeAttachment?.previewUrl && !imageLoadFailed ? (
                <img
                  src={activeAttachment.previewUrl}
                  alt={activeAttachment.name}
                  className='block h-auto w-auto max-h-[calc(100vh-230px)] max-w-[calc(100vw-10rem)] object-contain'
                  draggable={false}
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <div className='flex h-[min(52vh,560px)] w-[min(70vw,860px)] items-center justify-center'>
                  <RiImageLine className='size-16 text-text-white-0/40' />
                </div>
              )}
            </div>

            {showSideAttachmentNav ? (
              <>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='large'
                  disabled={!canGoPrevAttachment}
                  onClick={goPrevAttachment}
                  aria-label='Previous attachment'
                  className='absolute left-6 top-1/2 size-12 -translate-y-1/2 rounded-full bg-bg-white-0 p-0'
                >
                  <Button.Icon as={RiArrowLeftSLine} className='size-7' />
                </Button.Root>
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='large'
                  disabled={!canGoNextAttachment}
                  onClick={goNextAttachment}
                  aria-label='Next attachment'
                  className='absolute right-6 top-1/2 size-12 -translate-y-1/2 rounded-full bg-bg-white-0 p-0'
                >
                  <Button.Icon as={RiArrowRightSLine} className='size-7' />
                </Button.Root>
              </>
            ) : null}
          </div>

          <div className='relative z-10 flex flex-col items-center px-8 pb-8 pt-4'>
            <div className='flex w-full max-w-[800px] items-end gap-2'>
              {versionGroups.map((group, index) => {
                const isActive = index === activeVersionIndex;
                return (
                  <ProjectThreeDVersionTab
                    key={`${group.taskId || group.version}-${index}`}
                    version={group.version}
                    isActive={isActive}
                    onClick={() => {
                      setActiveVersionIndex(index);
                      setActiveAttachmentIndex(0);
                    }}
                  />
                );
              })}
            </div>

            <div className='w-full max-w-[800px] rounded-b-[10px] rounded-tr-[10px] border border-white/10 bg-neutral-800 p-2.5'>
              <div className='flex gap-2 overflow-x-auto'>
                {activeAttachments.map((attachment, index) => {
                  const isSelected = index === activeAttachmentIndex;
                  return (
                    <button
                      key={attachment.id}
                      type='button'
                      onClick={() => setActiveAttachmentIndex(index)}
                      className={cn(
                        'relative h-20 w-[100px] shrink-0 overflow-hidden rounded-md border-2 transition',
                        isSelected
                          ? 'border-[#53dc9f]'
                          : 'border-transparent opacity-40 hover:opacity-70',
                      )}
                    >
                      {attachment.previewUrl ? (
                        <>
                          <img
                            src={attachment.previewUrl}
                            alt={attachment.name}
                            className='h-full w-full object-cover'
                          />
                          {isSelected ? (
                            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)]' />
                          ) : null}
                        </>
                      ) : (
                        <div className='flex h-full w-full items-center justify-center bg-bg-weak-100'>
                          <RiImageLine className='size-5 text-text-soft-400' />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {locationLabel ? (
              <p className='sr-only'>
                Viewing {locationLabel}, {activeVersionGroup?.version}, attachment{' '}
                {activeAttachmentIndex + 1} of {activeAttachments.length}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
