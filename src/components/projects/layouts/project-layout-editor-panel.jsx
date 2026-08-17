import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine, RiLockLine } from 'react-icons/ri';
import { useDispatch } from 'react-redux';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import ProjectLayoutFloorEditor from '@/components/projects/layouts/project-layout-floor-editor';
import ProjectLayoutUploadVersionButton, {
  layoutHasUploadedImage,
} from '@/components/projects/layouts/project-layout-upload-version-button';
import ProjectFloorVersionWarningAction from '@/components/projects/shared/project-floor-version-warning';
import { getProjectLayoutVersionSections } from '@/components/projects/layouts/project-layout-annotation-helpers';
import { lockProjectFloorLayout } from '@/redux/projectSlice';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

function canLockFloorLayout(layout) {
  if (!layout) return false;
  const layoutType = String(layout.layout_type ?? layout.custom_layout_type ?? '').trim();
  if (layoutType !== 'Floor Layout') return false;
  const status = String(layout.status ?? '').trim();
  if (!status || status === 'Superseded') return false;
  if (!String(layout.layout_image ?? '').trim()) return false;
  return Number(layout.locked_version ?? 0) <= 0;
}

function isChildLayoutType(layout) {
  const layoutType = String(layout?.layout_type ?? layout?.custom_layout_type ?? '').trim();
  return layoutType === 'Designer Layout' || layoutType === 'MEPF Layout';
}

function getFloorLockedVersion(layout) {
  return Number(layout?.floor_locked_version ?? 0);
}

/** Designer/MEPF can upload only after a Floor Layout version is locked. */
function canUploadChildLayout(layout) {
  if (!isChildLayoutType(layout)) return true;
  return getFloorLockedVersion(layout) > 0;
}

const getStatusBadgeColor = (status) => {
  if (!status) return 'gray';

  const statusMap = {
    Superseded: 'red',
    Active: 'green',
  };

  return statusMap[status] || 'gray';
};

const VERSION_KIND_BADGES = {
  locked: { label: 'Locked', color: 'blue' },
  // v{N}.{m} is already clear from the label — no "Sub" badge.
};

function LayoutVersionSection({
  versionLabel,
  statusLabel,
  versionKind,
  showCurrentBadge = false,
  indentLevel = 0,
  expanded,
  onToggle,
  showLockButton = false,
  isLockingFloor = false,
  onLockFloor,
  layoutId = '',
  children,
}) {
  const kindBadge = VERSION_KIND_BADGES[versionKind];

  return (
    <div
      className={cn(
        'border-y rounded-lg bg-bg-weak-100 border-stroke-soft-200',
        indentLevel > 0 && 'border-l-2 border-l-stroke-soft-200',
      )}
      style={indentLevel > 0 ? { marginLeft: `${indentLevel * 12}px` } : undefined}
    >
      <div className='flex items-center gap-2 px-3 my-1'>
        <button
          type='button'
          onClick={onToggle}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 py-3 text-left text-label-sm transition-colors',
            expanded ? 'text-text-main-900' : 'text-text-sub-500 hover:text-text-main-900',
          )}
        >
          {expanded ? (
            <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
          ) : (
            <RiArrowRightSLine className='size-4 shrink-0 text-text-soft-400' />
          )}
          <span className='font-medium'>{versionLabel}</span>
          {showCurrentBadge ? (
            <Badge.Root variant='light' color='orange' size='small'>
              Current
            </Badge.Root>
          ) : null}
          {kindBadge ? (
            <Badge.Root variant='light' color={kindBadge.color} size='small'>
              {kindBadge.label}
            </Badge.Root>
          ) : null}

          {!showCurrentBadge && statusLabel ? (
            <Badge.Root variant='light' color={getStatusBadgeColor(statusLabel)} size='small'>
              {statusLabel}
            </Badge.Root>
          ) : null}
        </button>

        {showLockButton ? (
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='xsmall'
            className='shrink-0'
            disabled={!layoutId || isLockingFloor}
            aria-label={isLockingFloor ? 'Locking floor version' : 'Lock floor version'}
            title={isLockingFloor ? 'Locking…' : 'Lock floor version'}
            onClick={(event) => {
              event.stopPropagation();
              void onLockFloor?.();
            }}
          >
            <Button.Icon as={RiLockLine} />
          </Button.Root>
        ) : null}
      </div>

      {expanded ? (
        <div className='pb-4'>
          <div className='relative h-[clamp(240px,min(52vh,calc(100dvh-300px)),520px)] min-h-0'>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectLayoutEditorPanel({
  layout,
  projectId,
  onLayoutRefresh,
  onAcknowledgeFloorVersion,
  isAcknowledgingFloorVersion = false,
  onViewedVersionChange,
  showExpand = true,
  showUploadVersion = true,
}) {
  const dispatch = useDispatch();
  const versionSections = useMemo(() => getProjectLayoutVersionSections(layout), [layout]);
  const hasLayoutImage = layoutHasUploadedImage(layout);
  const [expandedVersionId, setExpandedVersionId] = useState('');
  const [isLockingFloor, setIsLockingFloor] = useState(false);

  const layoutId = String(layout?.name ?? layout?.id ?? '').trim();
  const canLockFloor = canLockFloorLayout(layout);
  const childUploadAllowed = canUploadChildLayout(layout);
  const allowVersionUpload = showUploadVersion && childUploadAllowed;

  const handleLockFloor = useCallback(async () => {
    if (!layoutId || !canLockFloor || isLockingFloor) return;

    setIsLockingFloor(true);
    try {
      const result = await dispatch(lockProjectFloorLayout(layoutId)).unwrap();
      showSuccessToast(result?.message ?? 'Floor layout locked successfully');
      await onLayoutRefresh?.(result?.layout_id ?? layoutId, result);
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'Failed to lock floor layout'));
    } finally {
      setIsLockingFloor(false);
    }
  }, [canLockFloor, dispatch, isLockingFloor, layoutId, onLayoutRefresh]);

  useEffect(() => {
    const currentVersionId = versionSections[0]?.id;
    if (!currentVersionId) return;
    setExpandedVersionId(currentVersionId);
  }, [layout?.id, layout?.name, versionSections]);

  useEffect(() => {
    onViewedVersionChange?.(expandedVersionId || layoutId);
  }, [expandedVersionId, layoutId, onViewedVersionChange]);

  const toggleVersion = (versionId) => {
    setExpandedVersionId((previous) => (previous === versionId ? '' : versionId));
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {layout?.show_warning ? (
        <div className='shrink-0 border-b border-stroke-soft-200 px-6 py-2'>
          <ProjectFloorVersionWarningAction
            compact
            showWarning={layout.show_warning}
            canAcknowledge={layout.can_acknowledge}
            floorVersionOptions={layout.floor_version_options}
            warningReason={layout.warning_reason}
            onAcknowledge={(floorLockedVersion) =>
              onAcknowledgeFloorVersion?.(layout, floorLockedVersion)
            }
            isAcknowledging={isAcknowledgingFloorVersion}
          />
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4'>
        {versionSections.map((section) => (
          <div key={section.id} className='mt-2'>
            <LayoutVersionSection
              versionLabel={section.label}
              statusLabel={section.layout?.status}
              versionKind={section.versionKind}
              showCurrentBadge={section.showCurrentBadge}
              indentLevel={section.indentLevel}
              expanded={expandedVersionId === section.id}
              onToggle={() => toggleVersion(section.id)}
              showLockButton={canLockFloor && section.isCurrent}
              isLockingFloor={isLockingFloor}
              onLockFloor={handleLockFloor}
              layoutId={layoutId}
            >
              <ProjectLayoutFloorEditor
                key={section.id}
                layout={section.layout}
                projectId={projectId}
                onLayoutRefresh={onLayoutRefresh}
                showExpand={showExpand && section.isCurrent}
                readOnly={section.readOnly}
                allowUpload={allowVersionUpload && section.isCurrent && !section.readOnly}
                floorUploadBlockedMessage={
                  isChildLayoutType(layout) && !childUploadAllowed
                    ? 'No Floor Layout is locked yet. Lock a Floor Layout version first, then you can upload Designer / MEPF layouts.'
                    : ''
                }
                fillContainer
                className='h-full'
              />
            </LayoutVersionSection>
          </div>
        ))}
      </div>

      {allowVersionUpload && hasLayoutImage ? (
        <div className='shrink-0 border-t border-stroke-soft-200 px-6 py-4'>
          <div className='flex flex-col gap-2'>
            <ProjectLayoutUploadVersionButton
              layoutId={layout?.name ?? layout?.id}
              onUploaded={onLayoutRefresh}
              isFirstUpload={false}
              className='w-full justify-center'
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
