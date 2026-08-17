import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiCalendarLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiCloseLine,
  RiImageLine,
  RiTimeLine,
  RiUserLine,
  RiBuilding2Line,
  RiPriceTag3Line,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiStickyNoteLine,
  RiStackLine,
  RiCheckLine,
  RiCheckboxLine,
  RiChat2Line,
  RiUploadCloud2Line,
  RiUploadLine,
  RiDeleteBinLine,
  RiAlertLine,
} from 'react-icons/ri';

import ImagePreview from '@/components/ui/image-preview';
import * as Drawer from '@/components/ui/drawer';
import * as Modal from '@/components/ui/modal';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import SupervisorAssigneeMultiSelect from '@/components/ui/supervisor-assignee-multi-select';
import FieldRow from '@/components/ui/field-row';
import { useSelector } from 'react-redux';
import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/file-utils';
import FacilityTaskComments from '@/components/facility/facility-task-comments';
import FacilityTaskLayoutPanel from '@/components/facility/facility-task-layout-panel';

const apiUrl = import.meta.env.VITE_API_URL || '';

const buildFullFileUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return fileUrl;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  if (fileUrl.startsWith('/')) return `${apiUrl}${fileUrl}`;
  return `${apiUrl}/${fileUrl}`;
};

// Simple Tailwind-based skeleton components
const SkeletonBox = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const SkeletonText = ({ width = 'w-full' }) => <SkeletonBox className={`h-4 ${width}`} />;

const SkeletonCircle = ({ size = 32 }) => (
  <div className='animate-pulse bg-gray-200 rounded-full' style={{ width: size, height: size }} />
);

const SkeletonAvatarGroup = () => (
  <div className='flex -space-x-2'>
    {[1, 2, 3].map((i) => (
      <SkeletonCircle key={i} size={24} />
    ))}
  </div>
);

const SkeletonFieldRow = () => (
  <div className='flex items-center justify-between py-3 px-4 border-b last:border-b-0'>
    <div className='flex items-center gap-3'>
      <SkeletonCircle size={20} />
      <SkeletonText width='w-24' />
    </div>
    <SkeletonText width='w-20' />
  </div>
);

const SkeletonPhotoCard = () => (
  <div className='w-[220px] shrink-0 rounded-[10px] border border-gray-200 overflow-hidden'>
    <SkeletonBox className='h-[170px] w-full' />
    <div className='p-3 space-y-2'>
      <SkeletonText width='w-3/4' />
      <SkeletonText width='w-1/2' />
    </div>
  </div>
);

const SkeletonChecklistItem = () => (
  <div className='flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-100'>
    <SkeletonCircle size={16} />
    <SkeletonText width='w-40' />
  </div>
);

const FacilityTrackerSkeleton = () => {
  return (
    <div className='flex h-full'>
      {/* LEFT PANEL */}
      <div className='w-[420px] border-r border-gray-200 overflow-y-auto'>
        <div className='p-5 flex flex-col gap-5'>
          {/* Status badge */}
          <SkeletonBox className='w-20 h-5 rounded' />

          {/* Title */}
          <SkeletonText width='w-3/4' />

          {/* Info card */}
          <div className='border rounded-xl overflow-hidden'>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonFieldRow key={i} />
            ))}
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <SkeletonText width='w-32' />
            <SkeletonText />
            <SkeletonText width='w-5/6' />
          </div>

          {/* Photos */}
          <div className='space-y-3'>
            <SkeletonText width='w-32' />
            <div className='flex gap-3 overflow-hidden'>
              {[1, 2, 3].map((i) => (
                <SkeletonPhotoCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='flex-1 p-6 overflow-y-auto'>
        {/* Tabs */}
        <div className='flex gap-6 mb-6'>
          <SkeletonText width='w-32' />
          <SkeletonText width='w-32' />
        </div>

        {/* Checklist */}
        <div className='space-y-4 mb-6'>
          <SkeletonText width='w-40' />
          <div className='space-y-2'>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonChecklistItem key={i} />
            ))}
          </div>
        </div>

        {/* Completion Photos */}
        <div className='space-y-3'>
          <SkeletonText width='w-40' />
          <div className='flex gap-3'>
            {[1, 2, 3].map((i) => (
              <SkeletonPhotoCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const resolveAssigneeIdsFromApi = (assignees) => {
  if (!Array.isArray(assignees)) return [];
  return assignees
    .map((entry) => {
      if (typeof entry === 'string') {
        const id = entry.trim();
        return id || null;
      }
      if (entry && typeof entry === 'object') {
        const id = String(entry?.id ?? entry?.assignee ?? '').trim();
        return id || null;
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * Layout block from facility task detail — API nests under `task_info.layout`; older payloads used flat keys.
 *
 * @param {object | null | undefined} taskInfo
 */
const resolveFacilityTaskLayout = (taskInfo) => {
  const info = taskInfo && typeof taskInfo === 'object' ? taskInfo : {};
  const nested = info.layout && typeof info.layout === 'object' ? info.layout : null;

  if (nested) {
    return {
      layout_image: nested.layout_image ?? '',
      layout_coordinate: nested.layout_coordinate ?? null,
      marker_coordinate: nested.marker_coordinate ?? null,
      space_id: nested.space_id ?? nested.space ?? '',
      space_name: nested.space_name ?? '',
      floor_ref: nested.floor_ref ?? '',
      block_floor_id: nested.block_floor_id ?? '',
    };
  }

  return {
    layout_image: info.layout_image ?? '',
    layout_coordinate: info.layout_coordinate ?? null,
    marker_coordinate: info.marker_coordinate ?? null,
    space_id: info.space_id ?? info.space ?? '',
    space_name: info.space_name ?? '',
    floor_ref: info.floor_ref ?? '',
    block_floor_id: info.block_floor_id ?? '',
  };
};

const resolveFacilityTaskCenterLabel = (centerLabel, taskInfo) => {
  if (String(centerLabel ?? '').trim()) return centerLabel;
  const center = taskInfo?.center;
  if (center && typeof center === 'object') {
    return String(center.name ?? center.id ?? '').trim() || '—';
  }
  if (typeof center === 'string' && center.trim()) return center.trim();
  return '—';
};

const PhotoCarousel = ({ items, emptyLabel = 'No photos', onRemove }) => {
  const pageSize = 3;
  const list = Array.isArray(items) ? items : [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const [page, setPage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxImages = useMemo(
    () => list.map((item) => ({ src: item.src, caption: item.caption })),
    [list],
  );

  const visibleItems = useMemo(() => {
    const start = page * pageSize;
    return list
      .slice(start, start + pageSize)
      .map((item, i) => ({ ...item, globalIndex: page * pageSize + i }));
  }, [list, page]);

  if (list.length === 0) {
    return (
      <p className='text-paragraph-sm text-text-sub-500 border border-dashed border-stroke-soft-200 rounded-xl p-4'>
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
      <ImagePreview
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
      <div className='flex flex-col gap-3'>
        <div className='w-full overflow-x-auto pb-1'>
          <div className='flex gap-3 min-w-max'>
            {visibleItems.map((item, index) => (
              <div
                key={item.id ?? `${item.src}-${index}`}
                className='w-[220px] shrink-0 rounded-[10px] border border-stroke-soft-200 overflow-hidden bg-white relative'
              >
                {typeof onRemove === 'function' ? (
                  <button
                    type='button'
                    className='absolute top-2 right-2 z-10 rounded p-1 bg-white/80 text-text-sub-500 hover:text-error-base shadow-sm'
                    onClick={() => onRemove(item)}
                  >
                    <RiDeleteBinLine size={16} />
                  </button>
                ) : null}
                <div className='h-[170px] w-full bg-bg-weak-100 flex items-center justify-center'>
                  <button
                    type='button'
                    className='w-full h-full cursor-zoom-in focus:outline-none'
                    onClick={() => {
                      setLightboxIndex(item.globalIndex);
                      setLightboxOpen(true);
                    }}
                    aria-label='View full image'
                  >
                    <img src={item.src} alt='' className='w-full h-full object-cover' />
                  </button>
                </div>
                {item.caption ? (
                  <div className='px-3 py-2 border-t border-stroke-soft-200'>
                    <p className='label-small text-text-main-900 truncate'>{item.caption}</p>
                    {item.meta ? (
                      <p className='paragraph-xsmall text-text-sub-500 truncate mt-0.5'>
                        {item.meta}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className='flex items-center justify-center gap-2 text-paragraph-xs text-text-sub-500'>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <Button.Icon as={RiArrowLeftSLine} />
            </Button.Root>
            <span>
              {page + 1}/{totalPages}
            </span>
            <Button.Root
              variant='neutral'
              mode='ghost'
              size='xsmall'
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <Button.Icon as={RiArrowRightSLine} />
            </Button.Root>
          </div>
        )}
      </div>
    </>
  );
};

const statusBadgeProps = (status) => {
  const s = String(status ?? '')
    .toLowerCase()
    .replaceAll('-', '_');
  if (s === 'completed') return { label: 'COMPLETED', className: 'bg-success-base' };
  if (s === 'missed') return { label: 'MISSED', className: 'bg-error-base' };
  if (s === 'partially_completed') return { label: 'PARTIAL', className: 'bg-warning-base' };
  if (s === 'pending') return { label: 'PENDING', className: 'bg-blue-500' };
  return { label: String(status ?? '—').toUpperCase(), className: 'bg-text-sub-400' };
};

const normalizeStatusLabel = (status) =>
  String(status ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_');

const MyTaskDrawerBody = ({ task, assigneeOptions = [] }) => {
  const startDate = task?.date ? new Date(task.date).toLocaleDateString() : '--';
  const assigneeIds = task?.assigneeIds ?? resolveAssigneeIdsFromApi(task?.assignees);
  return (
    <>
      <div>
        <span className='bg-success-base rounded-lg text-white px-2 py-1 label-xsmall'>
          COMPLETED
        </span>
      </div>
      <div className='title-h5 text-text-main-900'>{task.name}</div>
      <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
        <FieldRow icon={RiUserLine} label='Assignee'>
          <SupervisorAssigneeMultiSelect
            options={assigneeOptions}
            value={assigneeIds}
            readonly
            variant='borderless'
            size='xsmall'
            maxVisibleAvatars={4}
            placeholder='--'
            triggerClassName='w-auto min-h-0 p-0 h-auto hover:bg-transparent'
          />
        </FieldRow>
        <FieldRow icon={RiStackLine} label='Floor'>
          <span className='text-paragraph-sm text-text-main-900'>1</span>
        </FieldRow>
        <FieldRow icon={RiPriceTag3Line} label='Type'>
          <Badge.Root variant='stroke' color='gray'>
            {(task.trackerMode || 'daily').toUpperCase()}
          </Badge.Root>
        </FieldRow>
        <FieldRow icon={RiBuilding2Line} label='Center'>
          <span className='text-paragraph-sm text-text-main-900'>Skyline Hub</span>
        </FieldRow>
        <FieldRow icon={RiCalendarLine} label='Start Date'>
          <span className='text-paragraph-sm text-text-main-900'>{startDate}</span>
        </FieldRow>
      </div>
    </>
  );
};

const FacilityDetailDrawerBody = ({
  detail,
  assigneeOptions = [],
  centerLabel,
  taskRef,
  commentsData,
  commentsLoading,
  commentsFetchStatus = 'idle',
  onAddComment,
  onRefreshComments,
}) => {
  const [activeTab, setActiveTab] = useState('checklist-photos');
  const taskInfo = detail?.task_info ?? {};
  const scheduleInfo = detail?.schedule_info ?? {};
  const completionInfo = detail?.completion_info ?? {};

  const assigneeIds = useMemo(
    () => resolveAssigneeIdsFromApi(taskInfo.assignees),
    [taskInfo.assignees],
  );

  const referencePhotoItems = useMemo(() => {
    const raw = Array.isArray(taskInfo.reference_photos) ? taskInfo.reference_photos : [];
    return raw
      .map((row, index) => {
        const path = row?.photo || row?.file || row?.file_url;
        if (!path) return null;
        return {
          id: `ref-${index}`,
          src: buildFullFileUrl(path),
          caption: path.split('/').pop(),
        };
      })
      .filter(Boolean);
  }, [taskInfo.reference_photos]);

  const completionPhotoItems = useMemo(() => {
    const raw = Array.isArray(completionInfo.completion_photos)
      ? completionInfo.completion_photos
      : [];
    return raw
      .map((row, index) => {
        const path = row?.photo || row?.file || row?.file_url;
        if (!path) return null;
        return {
          id: `cmp-${index}`,
          src: buildFullFileUrl(path),
          caption: path.split('/').pop(),
        };
      })
      .filter(Boolean);
  }, [completionInfo.completion_photos]);

  const checklistItems = Array.isArray(completionInfo.checklist_items)
    ? completionInfo.checklist_items
    : [];

  const taskLayout = useMemo(() => resolveFacilityTaskLayout(taskInfo), [taskInfo]);
  const availabilityNote = String(detail?.availability_note ?? '').trim();
  const isLockedPending = detail?.status === 'pending' && detail?.executable === false;

  const hasLayoutTab = Boolean(
    String(taskLayout.layout_image ?? '').trim() &&
    (taskLayout.layout_coordinate?.points?.length || taskLayout.marker_coordinate?.points?.length),
  );

  const resolvedCenterLabel = resolveFacilityTaskCenterLabel(centerLabel, taskInfo);

  const badge = statusBadgeProps(detail?.status);

  return (
    <div className='flex h-full'>
      <div className='w-[420px] border-r border-stroke-soft-200 overflow-y-auto shrink-0'>
        <div className='px-5 pt-5 pb-6 flex flex-col gap-5'>
          <div>
            <span className={`rounded-lg text-white px-2 py-1 label-xsmall ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          <div className='title-h5 text-text-main-900'>{taskInfo.task_name ?? '—'}</div>

          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
            <FieldRow icon={RiUserLine} label='Assignee'>
              <SupervisorAssigneeMultiSelect
                options={assigneeOptions}
                value={assigneeIds}
                readonly
                variant='borderless'
                size='xsmall'
                maxVisibleAvatars={4}
                placeholder='--'
                triggerClassName='w-auto min-h-0 p-0 h-auto hover:bg-transparent'
              />
            </FieldRow>
            <FieldRow icon={RiStackLine} label='Floor'>
              <span className='text-paragraph-sm text-text-main-900'>{taskInfo.floor ?? '—'}</span>
            </FieldRow>
            <FieldRow icon={RiPriceTag3Line} label='Type'>
              <Badge.Root variant='stroke' color='gray'>
                {String(taskInfo.view_type ?? '—').toUpperCase()}
              </Badge.Root>
            </FieldRow>
            <FieldRow icon={RiBuilding2Line} label='Center'>
              <span className='text-paragraph-sm text-text-main-900'>{resolvedCenterLabel}</span>
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Schedule start'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.start_date ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Schedule end'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.end_date ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiTimeLine} label='Start time'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.start_time ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiUserLine} label='Completed by'>
              <span className='text-paragraph-sm text-text-main-900'>
                {completionInfo.completed_by ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiTimeLine} label='Completed at'>
              <span className='text-paragraph-sm text-text-main-900'>
                {completionInfo.completed_at ?? '—'}
              </span>
            </FieldRow>
          </div>

          {taskInfo.description ? (
            <div className='flex flex-col gap-2'>
              <span className='flex items-center gap-1 label-medium text-text-sub-500'>
                <RiStickyNoteLine />
                Description
              </span>
              <span className='paragraph-small text-text-main-900'>{taskInfo.description}</span>
            </div>
          ) : null}

          {isLockedPending && availabilityNote ? (
            <div className='flex items-start gap-2 rounded-xl bg-warning-light px-4 py-3 text-text-main-900'>
              <RiAlertLine className='mt-0.5 size-4 shrink-0 text-warning-base' />
              <span className='paragraph-small'>{availabilityNote}</span>
            </div>
          ) : null}

          <div className='flex flex-col gap-2'>
            <span className='flex items-center gap-1 label-medium text-text-sub-500'>
              <RiImageLine />
              Photo
            </span>
            <PhotoCarousel items={referencePhotoItems} emptyLabel='No reference photos' />
          </div>
        </div>
      </div>

      <div className='flex-1 min-w-0 flex flex-col overflow-hidden'>
        <TabMenuHorizontal.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className='h-full flex flex-col'
        >
          <TabMenuHorizontal.List className='gap-6 px-6 border-t-0' wrapperClassName='w-full'>
            <TabMenuHorizontal.Trigger value='checklist-photos'>
              <span className='flex items-center gap-1 group-data-[state=active]:text-success-base label-small text-text-sub-500'>
                <RiCheckboxLine className='text-[var(--color-text-soft-400)]' size={20} />
                Checklist & Photos
              </span>
            </TabMenuHorizontal.Trigger>
            {hasLayoutTab ? (
              <TabMenuHorizontal.Trigger value='layout'>
                <span className='flex items-center gap-1 group-data-[state=active]:text-success-base label-small text-text-sub-500'>
                  <RiStackLine className='text-[var(--color-text-soft-400)]' size={20} />
                  Layout
                </span>
              </TabMenuHorizontal.Trigger>
            ) : null}
            <TabMenuHorizontal.Trigger value='comments'>
              <span className='flex items-center gap-1 group-data-[state=active]:text-success-base label-small text-text-sub-500'>
                <RiChat2Line className='text-[var(--color-text-soft-400)]' size={20} />
                Comments
              </span>
            </TabMenuHorizontal.Trigger>
          </TabMenuHorizontal.List>

          <TabMenuHorizontal.Content
            value='checklist-photos'
            className='flex-1 overflow-y-auto px-6 py-5'
          >
            <div className='flex flex-col gap-5'>
              <div className='flex flex-col gap-3'>
                <span className='flex items-center gap-1 label-medium text-text-sub-500'>
                  <RiCheckboxLine className='text-[var(--color-text-soft-400)]' size={20} />
                  Checklist
                </span>
                <div className='flex flex-col gap-2'>
                  {checklistItems.length === 0 ? (
                    <p className='text-paragraph-sm text-text-sub-500'>No checklist items</p>
                  ) : (
                    checklistItems.map((item, index) => {
                      const st = String(item?.status ?? '').toLowerCase();
                      const isPass = st === 'pass';
                      const isFail = st === 'fail';
                      return (
                        <div
                          key={`${item?.checklist_name ?? 'c'}-${index}`}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                            isPass
                              ? 'bg-success-lighter'
                              : isFail
                                ? 'bg-error-lighter'
                                : 'bg-bg-weak-50'
                          }`}
                        >
                          {isPass ? (
                            <RiCheckLine className='size-4 shrink-0 text-success-base' />
                          ) : isFail ? (
                            <RiCloseCircleFill className='size-4 shrink-0 text-error-base' />
                          ) : (
                            <RiCheckboxLine className='size-4 shrink-0 text-text-sub-400' />
                          )}
                          <span className='text-paragraph-sm text-text-main-900'>
                            {item?.checklist_name ?? '—'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className='flex flex-col gap-3'>
                <span className='flex items-center gap-1 label-medium text-text-sub-500'>
                  <RiImageLine size={20} />
                  Completion photo
                </span>
                <PhotoCarousel items={completionPhotoItems} emptyLabel='No completion photos' />
              </div>
            </div>
          </TabMenuHorizontal.Content>

          {hasLayoutTab ? (
            <TabMenuHorizontal.Content
              value='layout'
              className='flex-1 min-h-0 overflow-hidden flex flex-col'
            >
              <FacilityTaskLayoutPanel
                layoutImageUrl={buildFullFileUrl(taskLayout.layout_image)}
                layoutCoordinate={taskLayout.layout_coordinate}
                markerCoordinate={taskLayout.marker_coordinate}
                spaceId={taskLayout.space_id}
                spaceName={taskLayout.space_name}
                floorLabel={taskInfo.floor ?? taskLayout.block_floor_id}
              />
            </TabMenuHorizontal.Content>
          ) : null}

          <TabMenuHorizontal.Content
            value='comments'
            className='flex-1 overflow-hidden flex flex-col'
          >
            <FacilityTaskComments
              taskRef={taskRef}
              commentsData={commentsData}
              onAddComment={onAddComment}
              loading={commentsLoading}
              fetchStatus={commentsFetchStatus}
              onRefreshData={onRefreshComments}
            />
          </TabMenuHorizontal.Content>
        </TabMenuHorizontal.Root>
      </div>
    </div>
  );
};

const ExecuteTaskDrawerBody = ({
  task,
  detail,
  assigneeOptions = [],
  centerLabel,
  onSubmit,
  isSubmitting,
}) => {
  const taskInfo = detail?.task_info ?? {};
  const scheduleInfo = detail?.schedule_info ?? {};
  const fallbackAssignees = Array.isArray(task?.assignees) ? task.assignees : [];
  const assigneeIds = useMemo(() => {
    const raw =
      Array.isArray(taskInfo.assignees) && taskInfo.assignees.length > 0
        ? taskInfo.assignees
        : fallbackAssignees;
    return resolveAssigneeIdsFromApi(raw);
  }, [taskInfo.assignees, fallbackAssignees]);

  const checklistNames = useMemo(() => {
    const fromTaskInfo = Array.isArray(taskInfo.checklists)
      ? taskInfo.checklists.map((item) =>
          String(item?.checklist_name ?? item?.checklist ?? '').trim(),
        )
      : [];
    const fromCompletion = Array.isArray(detail?.completion_info?.checklist_items)
      ? detail.completion_info.checklist_items.map((item) =>
          String(item?.checklist_name ?? item?.checklist ?? '').trim(),
        )
      : [];
    return [...new Set([...fromTaskInfo, ...fromCompletion].filter(Boolean))];
  }, [detail?.completion_info?.checklist_items, taskInfo.checklists]);

  const referencePhotoItems = useMemo(() => {
    const raw = Array.isArray(taskInfo.reference_photos) ? taskInfo.reference_photos : [];
    return raw
      .map((row, index) => {
        const path = row?.photo || row?.file || row?.file_url;
        if (!path) return null;
        return {
          id: `ref-${index}`,
          src: buildFullFileUrl(path),
          caption: String(path).split('/').pop(),
        };
      })
      .filter(Boolean);
  }, [taskInfo.reference_photos]);

  const [checkedChecklist, setCheckedChecklist] = useState({});
  const [photos, setPhotos] = useState([]);
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmitPayload, setPendingSubmitPayload] = useState(null);
  const fileInputRef = useRef(null);
  const executePhotoItems = useMemo(
    () =>
      photos.map((file, index) => ({
        id: `${file.name}-${index}`,
        file,
        src: URL.createObjectURL(file),
        caption: file.name,
        meta: `${formatFileSize(file.size)}`,
      })),
    [photos],
  );

  useEffect(() => {
    setCheckedChecklist(
      checklistNames.reduce((acc, name) => {
        acc[name] = false;
        return acc;
      }, {}),
    );
    setPhotos([]);
    setPhotoDragActive(false);
  }, [task?.id, checklistNames]);

  const checkedCount = checklistNames.filter((name) => Boolean(checkedChecklist[name])).length;
  const allChecked = checklistNames.length > 0 && checkedCount === checklistNames.length;
  const canExecute =
    detail?.executable ?? task?.executable ?? normalizeStatusLabel(task?.state) === 'pending';
  const availabilityNote = String(
    detail?.availability_note ??
      task?.availability_note ??
      'This task can be performed at its scheduled start time.',
  ).trim();

  const handleSubmitClick = () => {
    if (!canExecute) return;
    const payload = {
      checklist_data: checklistNames.map((name) => ({
        checklist_name: name,
        status: checkedChecklist[name] ? 'pass' : 'fail',
      })),
      task_photos: photos,
    };

    const incomplete = !allChecked || photos.length === 0;
    if (incomplete) {
      setPendingSubmitPayload(payload);
      setConfirmOpen(true);
    } else {
      onSubmit?.(payload);
    }
  };
  const executeStatus = normalizeStatusLabel(task?.state);
  const executeStatusBadgeClass =
    executeStatus === 'missed' || executeStatus === 'overdue'
      ? 'bg-error-base'
      : executeStatus === 'pending'
        ? 'bg-blue-500'
        : 'bg-text-sub-400';
  const executeStatusBadgeLabel = (() => {
    if (executeStatus === 'missed' || executeStatus === 'overdue') {
      return 'MISSED';
    }
    return String(task?.state ?? 'pending').toUpperCase();
  })();

  return (
    <div className='flex h-full'>
      <div className='w-[420px] border-r border-stroke-soft-200 overflow-y-auto shrink-0'>
        <div className='px-5 pt-5 pb-6 flex flex-col gap-5'>
          <div>
            <span
              className={`rounded-lg text-white px-2 py-1 label-xsmall ${executeStatusBadgeClass}`}
            >
              {executeStatusBadgeLabel}
            </span>
          </div>
          <div className='title-h5 text-text-main-900'>{task?.task_name ?? task?.name ?? '—'}</div>
          <div className='divide-y divide-stroke-soft-200 rounded-xl border border-stroke-soft-200 bg-white'>
            <FieldRow icon={RiUserLine} label='Assignee'>
              <SupervisorAssigneeMultiSelect
                options={assigneeOptions}
                value={assigneeIds}
                readonly
                variant='borderless'
                size='xsmall'
                maxVisibleAvatars={4}
                placeholder='--'
                triggerClassName='w-auto min-h-0 p-0 h-auto hover:bg-transparent'
              />
            </FieldRow>
            <FieldRow icon={RiStackLine} label='Floor'>
              <span className='text-paragraph-sm text-text-main-900'>
                {taskInfo.floor ?? task?.floor ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiPriceTag3Line} label='Type'>
              <Badge.Root variant='stroke' color='gray'>
                {String(taskInfo.view_type ?? task?.view_type ?? task?.type ?? '—').toUpperCase()}
              </Badge.Root>
            </FieldRow>
            <FieldRow icon={RiBuilding2Line} label='Center'>
              <span className='text-paragraph-sm text-text-main-900'>
                {resolveFacilityTaskCenterLabel(centerLabel, taskInfo)}
              </span>
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Schedule start'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.start_date ?? task?.start_date ?? task?.startDate ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiCalendarLine} label='Schedule end'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.end_date ?? task?.end_date ?? task?.dueDate ?? '—'}
              </span>
            </FieldRow>
            <FieldRow icon={RiTimeLine} label='Start time'>
              <span className='text-paragraph-sm text-text-main-900'>
                {scheduleInfo.start_time ?? task?.start_time ?? task?.startTime ?? '—'}
              </span>
            </FieldRow>
          </div>

          <div className='flex flex-col gap-2'>
            <span className='flex items-center gap-1 label-medium text-text-sub-500'>
              <RiImageLine />
              Reference photo
            </span>
            <PhotoCarousel items={referencePhotoItems} emptyLabel='No reference photos' />
          </div>
        </div>
      </div>

      <div className='flex-1 min-w-0 overflow-y-auto px-6 py-5'>
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-3'>
            <span className='flex items-center gap-1 label-medium text-text-sub-500'>
              <RiCheckboxLine className='text-[var(--color-text-soft-400)]' size={20} />
              Checklist
            </span>
            {checklistNames.length === 0 ? (
              <p className='text-paragraph-sm text-text-sub-500'>
                No checklist available for this task.
              </p>
            ) : (
              <div className='flex flex-col gap-2'>
                {!canExecute ? (
                  <div className='flex items-start gap-2 rounded-xl bg-warning-light px-4 py-3 text-text-main-900'>
                    <RiAlertLine className='mt-0.5 size-4 shrink-0 text-warning-base' />
                    <span className='paragraph-small'>{availabilityNote}</span>
                  </div>
                ) : null}
                {checklistNames.map((name) => (
                  <label
                    key={name}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 bg-bg-weak-50',
                      canExecute ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                    )}
                  >
                    <input
                      type='checkbox'
                      className='accent-[var(--color-success-base)]'
                      checked={Boolean(checkedChecklist[name])}
                      disabled={!canExecute}
                      onChange={(event) =>
                        setCheckedChecklist((previous) => ({
                          ...previous,
                          [name]: Boolean(event.target.checked),
                        }))
                      }
                    />
                    <span className='text-paragraph-sm text-text-main-900'>{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className='flex flex-col gap-3'>
            <span className='flex items-center gap-1 label-medium text-text-sub-500'>
              <RiImageLine size={20} />
              Completion photo
            </span>
            <div className='flex items-center justify-end'>
              <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                accept='image/*'
                multiple
                disabled={!canExecute}
                onChange={(event) => {
                  if (!canExecute) return;
                  const fileList = [...(event.target.files ?? [])];
                  setPhotos((previous) => [...previous, ...fileList]);
                }}
              />
              {photos.length > 0 ? (
                <Button.Root
                  variant='neutral'
                  mode='stroke'
                  size='xsmall'
                  className='pl-2.5 pr-3 py-1.5 gap-0.5'
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || !canExecute}
                >
                  <Button.Icon as={RiUploadLine} />
                  <div className='text-label-sm px-1 text-text-sub-600'>Upload Files</div>
                </Button.Root>
              ) : null}
            </div>
            {photos.length === 0 ? (
              <div
                className={cn(
                  'rounded-xl border border-dashed border-stroke-soft-200 bg-bg-white-0 px-5 py-[19px]',
                  photoDragActive ? 'bg-bg-weak-50' : '',
                )}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canExecute) return;
                  setPhotoDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canExecute) return;
                  setPhotoDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setPhotoDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canExecute) return;
                  setPhotoDragActive(false);
                  const fileList = [...(event.dataTransfer.files ?? [])];
                  setPhotos((previous) => [...previous, ...fileList]);
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || !canExecute}
                  >
                    Browse File
                  </Button.Root>
                </div>
              </div>
            ) : (
              <PhotoCarousel
                items={executePhotoItems}
                emptyLabel='Upload completion photos'
                onRemove={(photoItem) =>
                  setPhotos((previous) => previous.filter((f) => f !== photoItem.file))
                }
              />
            )}
          </div>

          <div className='flex justify-end'>
            <Button.Root
              type='button'
              disabled={isSubmitting || !canExecute}
              onClick={handleSubmitClick}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </Button.Root>
          </div>
        </div>
      </div>

      {/* Submit confirmation when checklist is incomplete or no photos */}
      <Modal.Root
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmOpen(false);
            setPendingSubmitPayload(null);
          }
        }}
      >
        <Modal.Content className='max-w-[420px]'>
          <Modal.Header
            title='Submit incomplete task?'
            description='Some items are not complete. You can still submit, but please review:'
          />
          <Modal.Body className='flex flex-col gap-2'>
            {checklistNames.length > 0 && (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3',
                  !allChecked ? 'bg-warning-lighter' : 'bg-success-lighter',
                )}
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    !allChecked ? 'bg-warning-soft-200' : 'bg-success-soft-200',
                  )}
                >
                  {!allChecked ? (
                    <RiAlertLine className='size-4 text-warning-base' />
                  ) : (
                    <RiCheckLine className='size-4 text-success-base' />
                  )}
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='label-small text-text-main-900'>Checklist</span>
                  <span className='paragraph-small text-text-sub-600'>
                    {checkedCount} out of {checklistNames.length} item
                    {checklistNames.length !== 1 ? 's' : ''} completed
                  </span>
                </div>
              </div>
            )}
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3',
                photos.length === 0 ? 'bg-warning-lighter' : 'bg-success-lighter',
              )}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  photos.length === 0 ? 'bg-warning-soft-200' : 'bg-success-soft-200',
                )}
              >
                {photos.length === 0 ? (
                  <RiAlertLine className='size-4 text-warning-base' />
                ) : (
                  <RiCheckLine className='size-4 text-success-base' />
                )}
              </div>
              <div className='flex flex-col gap-0.5'>
                <span className='label-small text-text-main-900'>Completion photos</span>
                <span className='paragraph-small text-text-sub-600'>
                  {photos.length === 0
                    ? 'No photos uploaded'
                    : `${photos.length} photo${photos.length !== 1 ? 's' : ''} uploaded`}
                </span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root variant='neutral' mode='stroke' type='button' className='w-full'>
                Go back
              </Button.Root>
            </Modal.Close>
            <Button.Root
              type='button'
              className='w-full'
              onClick={() => {
                setConfirmOpen(false);
                onSubmit?.(pendingSubmitPayload);
                setPendingSubmitPayload(null);
              }}
            >
              Submit anyway
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
};

const formatFacilityDetailError = (err) => {
  if (err == null || err === '') return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && typeof err.message === 'string') {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'Failed to load task detail.';
  }
};

const FacilityTrackerViewDrawer = ({
  isOpen = false,
  onClose,
  drawerMode = 'myTask',
  task = null,
  facilityDetail = null,
  facilityDetailLoading = false,
  facilityDetailError = null,
  assigneeOptions = [],
  centerLabel = '',
  onExecuteSubmit,
  isExecuteSubmitting = false,
  commentsData,
  commentsLoading = false,
  commentsFetchStatus = 'idle',
  onAddComment,
  onRefreshComments,
}) => {
  if (!isOpen) return null;

  if (drawerMode === 'myTask') {
    if (!task) return null;
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => open === false && onClose?.()}>
        <Drawer.Content className='max-w-[1200px]'>
          <Drawer.Header
            className='px-6 py-3 border-b border-stroke-soft-200'
            showCloseButton={false}
          >
            <div className='flex items-center justify-end w-full'>
              <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 p-0 overflow-hidden'>
            <div className='flex h-full'>
              <div className='w-[420px] border-r border-stroke-soft-200 overflow-y-auto shrink-0'>
                <div className='px-5 pt-5 pb-6 flex flex-col gap-5'>
                  <MyTaskDrawerBody task={task} assigneeOptions={assigneeOptions} />
                </div>
              </div>
              <div className='flex-1 min-w-0 flex flex-col overflow-hidden'>
                <FacilityTaskComments
                  taskRef={String(task?.facility_task ?? task?.facility_task_ref ?? '')}
                  commentsData={commentsData}
                  onAddComment={onAddComment}
                  loading={commentsLoading}
                  fetchStatus={commentsFetchStatus}
                  onRefreshData={onRefreshComments}
                />
              </div>
            </div>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    );
  }

  if (drawerMode === 'facility') {
    const errText = formatFacilityDetailError(facilityDetailError);
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => open === false && onClose?.()}>
        <Drawer.Content className='max-w-[1200px]'>
          <Drawer.Header
            className='px-6 py-3 border-b border-stroke-soft-200'
            showCloseButton={false}
          >
            <div className='flex items-center justify-end w-full'>
              <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </Drawer.Header>

          <Drawer.Body className='flex-1 p-0 overflow-hidden'>
            {facilityDetailLoading ? (
              <div className='flex flex-1 items-center justify-center p-12'>
                <p className='text-paragraph-sm text-text-sub-500'>Loading task detail…</p>
              </div>
            ) : errText ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center'>
                <p className='text-paragraph-sm text-error-base'>Could not load task detail</p>
                <p className='text-paragraph-xs text-text-sub-500 max-w-md'>{errText}</p>
              </div>
            ) : facilityDetail ? (
              <FacilityDetailDrawerBody
                detail={facilityDetail}
                assigneeOptions={assigneeOptions}
                centerLabel={centerLabel}
                taskRef={String(task?.task_ref ?? task?.name ?? '')}
                commentsData={commentsData}
                commentsLoading={commentsLoading}
                commentsFetchStatus={commentsFetchStatus}
                onAddComment={onAddComment}
                onRefreshComments={onRefreshComments}
              />
            ) : (
              <div className='flex flex-1 items-center justify-center p-12'>
                <p className='text-paragraph-sm text-text-sub-500'>No task detail available.</p>
              </div>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    );
  }

  if (drawerMode === 'execute') {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => open === false && onClose?.()}>
        <Drawer.Content className='max-w-[1200px]'>
          <Drawer.Header
            className='px-6 py-3 border-b border-stroke-soft-200'
            showCloseButton={false}
          >
            <div className='flex items-center justify-end w-full'>
              <Button.Root variant='neutral' mode='stroke' size='xsmall' onClick={onClose}>
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          </Drawer.Header>
          <Drawer.Body className='flex-1 p-0 overflow-hidden'>
            {facilityDetailLoading ? (
              <div className='flex flex-1 items-center justify-center p-12'>
                <p className='text-paragraph-sm text-text-sub-500'>Loading task detail…</p>
              </div>
            ) : (
              <ExecuteTaskDrawerBody
                task={task}
                detail={facilityDetail}
                assigneeOptions={assigneeOptions}
                centerLabel={centerLabel}
                isSubmitting={isExecuteSubmitting}
                onSubmit={onExecuteSubmit}
              />
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    );
  }

  return null;
};

export default FacilityTrackerViewDrawer;
