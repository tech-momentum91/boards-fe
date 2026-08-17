import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PiChairDuotone } from 'react-icons/pi';

import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { CLIENT_SUBSPACE_SLOT_SOURCE } from '@/constants/layout/annotation-sources';
import { cn } from '@/utils/cn';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { computeDeskOverlayCounterScale } from '@/utils/layout-desk-overlay-scale';
import {
  buildLayoutDeskMetaMap,
  buildSpaceLayoutDeskPickerAnnotations,
  findCurrentSpaceLayoutAnnotationId,
  isLayoutDeskSelectable,
  resolveSpaceAllocateLayoutAnnotationStyle,
} from '@/utils/space-layout-desk-picker-utils';

const DESK_OVERLAY_BASE_PX = 32;

function DeskSelectionOverlay({
  isSelected,
  isUnavailable,
  isPreviouslyAssigned,
  isMarkedForRemoval,
  isDeselectMode,
  isSelectionMode,
  sequenceLabel,
  companyLogo,
  clientName,
  canvasScale = 1,
  onClick,
}) {
  const counterScale = computeDeskOverlayCounterScale(canvasScale, DESK_OVERLAY_BASE_PX);
  const logoUrl = companyLogo ? toLayoutAssetUrl(companyLogo) : '';
  const showAssignedClientAvatar = isPreviouslyAssigned && !isDeselectMode && Boolean(clientName);
  const avatarSize = DESK_OVERLAY_BASE_PX - 4;

  const isKeptAssigned = isDeselectMode && isSelected && !isMarkedForRemoval;
  const isInteractive =
    isSelectionMode && (isDeselectMode ? !isUnavailable : !isPreviouslyAssigned);

  return (
    <button
      type='button'
      onClick={(event) => {
        event.stopPropagation();
        if (!isInteractive) return;
        onClick?.();
      }}
      style={{
        width: DESK_OVERLAY_BASE_PX,
        height: DESK_OVERLAY_BASE_PX,
        transform: `scale(${counterScale})`,
        transformOrigin: 'center center',
      }}
      className={cn(
        'relative z-50 flex size-8 flex-col items-center justify-center border transition-colors',
        showAssignedClientAvatar ? 'overflow-hidden rounded-full p-0.5' : 'rounded-md',
        isMarkedForRemoval
          ? 'pointer-events-auto cursor-pointer border-error-base bg-error-lighter text-error-base'
          : isKeptAssigned || (isDeselectMode && isSelected)
            ? 'pointer-events-auto cursor-pointer border-[var(--color-success-dark)] bg-[var(--color-success-light)] text-[var(--color-success-darker)]'
            : isPreviouslyAssigned
              ? 'pointer-events-none cursor-default border-[var(--color-success-dark)] bg-[var(--color-success-light)] text-[var(--color-success-darker)]'
              : isSelectionMode
                ? 'pointer-events-auto'
                : 'pointer-events-none',
        !isMarkedForRemoval && !isKeptAssigned && !isPreviouslyAssigned
          ? isSelected
            ? 'border-success-base bg-success-lighter text-success-base'
            : isUnavailable
              ? 'cursor-not-allowed border-stroke-soft-200 bg-bg-white-0 text-text-soft-400 opacity-60'
              : isSelectionMode
                ? 'cursor-pointer border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-sm hover:border-success-base hover:bg-success-lighter'
                : 'cursor-default border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 opacity-90'
          : undefined,
      )}
      aria-label={
        isMarkedForRemoval
          ? sequenceLabel
            ? `Desk ${sequenceLabel} marked for removal`
            : 'Desk marked for removal'
          : isPreviouslyAssigned || isKeptAssigned
            ? clientName
              ? `Desk assigned to ${clientName}`
              : sequenceLabel
                ? `Desk ${sequenceLabel} (assigned)`
                : 'Assigned desk'
            : sequenceLabel
              ? `Desk ${sequenceLabel}`
              : 'Desk'
      }
      aria-pressed={isSelected}
      aria-disabled={!isInteractive}
    >
      {showAssignedClientAvatar ? (
        <CrmAccountAvatar
          name={clientName}
          image={logoUrl || null}
          size={avatarSize}
          showNativeTitle={false}
          className='size-full'
        />
      ) : (
        <>
          <PiChairDuotone
            size={16}
            className={
              isMarkedForRemoval
                ? 'text-error-base'
                : isPreviouslyAssigned || isKeptAssigned
                  ? 'text-[var(--color-success-darker)]'
                  : isSelected
                    ? 'text-success-base'
                    : undefined
            }
          />
          {sequenceLabel ? (
            <span className='text-[10px] leading-none text-text-sub-500'>{sequenceLabel}</span>
          ) : null}
        </>
      )}
    </button>
  );
}

/**
 * Read-only floor layout with selectable desk markers for space allocation.
 *
 * @param {{
 *   layoutData: object,
 *   selectedDeskIds?: string[],
 *   assignedDeskIds?: string[],
 *   mode?: 'select' | 'deselect',
 *   onDeskToggle?: (deskId: string) => void,
 *   onDeskUnavailable?: (deskId: string) => void,
 *   className?: string,
 * }} props
 */
export default function SpaceAllocateLayoutDeskPicker({
  layoutData,
  selectedDeskIds = [],
  assignedDeskIds = [],
  mode = 'select',
  onDeskToggle,
  onDeskUnavailable,
  className = '',
}) {
  const [imgEl, setImgEl] = useState(null);
  const [activeToolId, setActiveToolId] = useState(TOOL_IDS.SELECT);
  const isDeskSelectionMode = activeToolId === TOOL_IDS.SELECT;
  const isDeselectMode = mode === 'deselect';

  const layoutImagePath =
    layoutData?.layout_image_url || layoutData?.layout_image || layoutData?.layoutImage || '';
  const src = useMemo(() => toLayoutAssetUrl(layoutImagePath), [layoutImagePath]);

  useEffect(() => {
    if (!src) {
      setImgEl(null);
      return undefined;
    }
    const img = new window.Image();
    const onLoad = () => setImgEl(img);
    const onErr = () => setImgEl(null);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onErr);
    img.src = src;
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
  }, [src]);

  const imageProp = useMemo(() => {
    if (!imgEl) return null;
    return {
      url: src,
      raster: imgEl,
      width: imgEl.naturalWidth,
      height: imgEl.naturalHeight,
    };
  }, [imgEl, src]);

  const annotations = useMemo(() => {
    if (!layoutData || !imageProp?.width || !imageProp?.height) return [];
    return buildSpaceLayoutDeskPickerAnnotations(layoutData, imageProp.width, imageProp.height);
  }, [layoutData, imageProp?.width, imageProp?.height]);

  const currentSpaceAnnotationId = useMemo(
    () => findCurrentSpaceLayoutAnnotationId(annotations),
    [annotations],
  );

  const shouldFocusCurrentSpace = Boolean(currentSpaceAnnotationId);

  const selectedSet = useMemo(() => new Set(selectedDeskIds), [selectedDeskIds]);
  const assignedSet = useMemo(() => new Set(assignedDeskIds), [assignedDeskIds]);

  const handleDeskPress = useCallback(
    (deskId, { isUnavailable, isPreviouslyAssigned, isAssignedDesk }) => {
      if (!isDeskSelectionMode || !deskId) return;
      if (isDeselectMode) {
        if (!isAssignedDesk) return;
        onDeskToggle?.(deskId);
        return;
      }
      if (isPreviouslyAssigned) return;
      if (isUnavailable) {
        onDeskUnavailable?.(deskId);
        return;
      }
      onDeskToggle?.(deskId);
    },
    [isDeskSelectionMode, isDeselectMode, onDeskToggle, onDeskUnavailable],
  );

  const handleAnnotationSelect = useCallback(
    (ann) => {
      if (!isDeskSelectionMode) return;
      if (ann?.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return;
      const deskId = String(ann?.desk_id ?? '').trim();
      if (!deskId) return;
      const isAssignedDesk = isDeselectMode
        ? assignedSet.has(deskId) || ann?.previously_assigned === true
        : false;
      handleDeskPress(deskId, {
        isUnavailable: isDeselectMode ? !isAssignedDesk : ann?.desk_selectable === false,
        isPreviouslyAssigned: !isDeselectMode && ann?.previously_assigned === true,
        isAssignedDesk,
      });
    },
    [assignedSet, handleDeskPress, isDeskSelectionMode, isDeselectMode],
  );

  const renderAnnotationOverlay = useCallback(
    (ann, _center, overlaySchedule) => {
      if (ann?.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return null;
      const deskId = String(ann?.desk_id ?? '').trim();
      const isPreviouslyAssigned = !isDeselectMode && ann?.previously_assigned === true;
      const isAssignedDesk =
        isDeselectMode &&
        (assignedSet.has(deskId) ||
          ann?.previously_assigned === true ||
          ann?.is_client_assigned === true);
      const isKept = deskId ? selectedSet.has(deskId) : false;
      const isMarkedForRemoval = isDeselectMode && isAssignedDesk && !isKept;
      const isSelected = isDeselectMode ? isKept : !isPreviouslyAssigned && deskId ? isKept : false;
      const isUnavailable = isDeselectMode
        ? !isAssignedDesk
        : !isPreviouslyAssigned && ann?.desk_selectable === false;
      const sequenceLabel =
        ann?.sequence != null && ann.sequence !== '' ? String(ann.sequence) : '';
      const companyLogo = String(
        ann?.company_logo ?? ann?.assigned_client?.company_logo ?? '',
      ).trim();
      const clientName = String(
        ann?.client_name ??
          ann?.assigned_client?.customer_name ??
          ann?.assigned_client?.customer_legal_name ??
          '',
      ).trim();
      const canvasScale = overlaySchedule?.canvasScale ?? 1;
      return (
        <DeskSelectionOverlay
          isSelected={isSelected}
          isUnavailable={isUnavailable}
          isPreviouslyAssigned={isPreviouslyAssigned}
          isMarkedForRemoval={isMarkedForRemoval}
          isDeselectMode={isDeselectMode}
          isSelectionMode={isDeskSelectionMode}
          sequenceLabel={sequenceLabel}
          companyLogo={companyLogo}
          clientName={clientName}
          canvasScale={canvasScale}
          onClick={() =>
            handleDeskPress(deskId, {
              isUnavailable,
              isPreviouslyAssigned,
              isAssignedDesk,
            })
          }
        />
      );
    },
    [assignedSet, handleDeskPress, isDeskSelectionMode, isDeselectMode, selectedSet],
  );

  const resolveAnnotationStyle = useCallback(
    (ann) => resolveSpaceAllocateLayoutAnnotationStyle(ann),
    [],
  );

  const annotationsWithSelection = useMemo(() => {
    const deskMetaMap = buildLayoutDeskMetaMap(layoutData);
    return annotations.map((ann) => {
      if (ann?.source !== CLIENT_SUBSPACE_SLOT_SOURCE) return ann;
      const deskId = String(ann?.desk_id ?? '').trim();
      const meta = deskId ? deskMetaMap.get(deskId) : null;

      if (isDeselectMode) {
        const isAssigned =
          assignedSet.has(deskId) ||
          meta?.previouslyAssigned === true ||
          ann?.is_client_assigned === true;
        return {
          ...ann,
          desk_selectable: isAssigned,
          previously_assigned: isAssigned,
          is_client_assigned: isAssigned,
        };
      }

      const selectable = meta?.previouslyAssigned
        ? false
        : meta
          ? isLayoutDeskSelectable(meta)
          : !ann?.hasDeskAssignment && !ann?.hasAssignedCoworker;
      return {
        ...ann,
        desk_selectable: selectable,
        previously_assigned: meta?.previouslyAssigned === true,
      };
    });
  }, [annotations, assignedSet, isDeselectMode, layoutData]);

  if (!layoutImagePath) {
    return (
      <div
        className={cn(
          'flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-4 text-center text-paragraph-sm text-text-sub-600',
          className,
        )}
      >
        No layout image available for this space.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div
        className={cn(
          'flex min-h-[320px] items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600',
          className,
        )}
      >
        Loading floor plan…
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-[320px] flex-col gap-2', className)}>
      {!isDeskSelectionMode ? (
        <p className='shrink-0 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2 text-paragraph-xs text-text-sub-600'>
          Select the <span className='font-medium text-text-sub-900'>Select</span> tool above, then
          click desks on the layout to {isDeselectMode ? 'mark seats for removal' : 'mark them'}.
        </p>
      ) : null}
      <div
        className='relative h-[min(58vh,460px)] min-h-[280px] w-full overflow-hidden'
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <FloorPlanEditor
          key={src}
          image={imageProp}
          annotations={annotationsWithSelection}
          readOnly
          toolbarToolsInteractive
          listenForAnnotationHits={isDeskSelectionMode}
          canvasListening
          showSidebar={false}
          fitContentOnMount={!shouldFocusCurrentSpace}
          fillViewport
          fitContentPadding={20}
          focusAnnotationIdOnMount={shouldFocusCurrentSpace ? currentSpaceAnnotationId : undefined}
          focusViewportFitRatio={0.52}
          focusViewportPadding={40}
          focusViewportMaxScale={2.5}
          activeToolId={activeToolId}
          onActiveToolChange={setActiveToolId}
          toolbarEnabledToolIds={[TOOL_IDS.HAND, TOOL_IDS.SELECT]}
          toolbarShowUndoRedoDelete={false}
          config={{ showGrid: false }}
          resolveAnnotationStyle={resolveAnnotationStyle}
          renderAnnotationOverlay={renderAnnotationOverlay}
          onAnnotationSelect={handleAnnotationSelect}
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
        />
      </div>
    </div>
  );
}
