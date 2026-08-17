import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAddCircleLine,
  RiAddLine,
  RiCloseLine,
  RiLayoutGridLine,
  RiSaveLine,
} from 'react-icons/ri';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { ClientMaskShape } from '@/components/floor-plan-editor/react/shapes/client-mask-shape';
import * as Button from '@/components/ui/button';
import {
  SERVER_SUBSPACE_PIN_SOURCE,
  getSubSpaceRowsForParentSpace,
  mergeSpaceWithClientsForPopover,
  DESK_COWORKER_MARKER,
  isLayoutCoworkingDeskMarkerType,
  isLayoutCoworkingSpace,
  isLayoutManagedOfficeSpace,
  isLayoutSpaceExcludedFromAllocateAndSubSpace,
  layoutCoworkingParentHasDeskMarkerTargets,
  normalizeCoworkingInventoryType,
} from '@/utils/layout-annotation-space';
import { hasActiveLayoutDetailFilters } from '@/utils/layout-annotation-filter-utils';
import {
  CENTER_SUBSPACE_MARKER,
  SUBSPACE_LAYOUT_PENDING_SOURCE,
  annotationsForEditSubSpaceSpotlightHoles,
  annotationsForSpotlightMask,
  findContainingParentSpaceForUnassociatedChild,
  readSubSpaceTypeFromAnnotation,
  resolveManagedOfficeSubSpaceAnnotationStyle,
} from '@/utils/layout-annotation-subspace';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { SubSpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-sub-space-hover-popover';
import SubSpacePinOverlay from '@/pages/center/layout-annotation-sub-space-pin-overlay';
import LayoutAnnotationDeskMarkerOverlay from '@/pages/center/layout-annotation-desk-marker-overlay';

const SUB_SPACE_SESSION_TOOL_IDS_BASE = [
  TOOL_IDS.SELECT,
  TOOL_IDS.HAND,
  TOOL_IDS.RECTANGLE,
  TOOL_IDS.CIRCLE,
  TOOL_IDS.PEN,
];

const SUB_SPACE_SESSION_TOOL_IDS_EDIT = [
  TOOL_IDS.SELECT,
  TOOL_IDS.HAND,
  TOOL_IDS.POINT,
  TOOL_IDS.RECTANGLE,
  TOOL_IDS.CIRCLE,
  TOOL_IDS.PEN,
];

function AssociateSpaceOverlayButton({ onClick, title = 'Associate space' }) {
  return (
    <button
      type='button'
      title={title}
      onClick={onClick}
      className='pointer-events-auto inline-flex items-center gap-1 rounded-md bg-[#166534] px-2.5 py-1 text-label-xs font-medium text-white shadow-sm transition hover:bg-[#14532d]'
    >
      <RiAddLine size={14} aria-hidden />
      Add
    </button>
  );
}

/** Mark CoWorkers: markers only — no shape drawing tools. */
const SUB_SPACE_SESSION_TOOL_IDS_COWORKING_MARKER = [
  TOOL_IDS.SELECT,
  TOOL_IDS.HAND,
  TOOL_IDS.POINT,
];

function resolveAnnotationStyleBySpaceType(ann) {
  if (ann.source === SERVER_SUBSPACE_PIN_SOURCE || ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE) {
    return resolveManagedOfficeSubSpaceAnnotationStyle(readSubSpaceTypeFromAnnotation(ann));
  }
  if (ann.space_ref && ann.space) {
    const t = String(ann.space.inventory_type || '')
      .trim()
      .toLowerCase();
    if (t === 'managed office') {
      return { fill: 'rgba(107, 33, 168, 0.2)', stroke: '#9333ea', strokeWidth: 2 };
    }
    if (t.includes('co-work') || t.includes('cowork')) {
      return { fill: 'rgba(234, 88, 12, 0.22)', stroke: '#ea580c', strokeWidth: 2 };
    }
    if (t.includes('resource')) {
      return { fill: 'rgba(220, 40, 145, 0.22)', stroke: '#dc2891', strokeWidth: 2.5 };
    }
    if (t.includes('pure rental')) {
      return { fill: 'rgba(37, 99, 235, 0.22)', stroke: '#2563eb', strokeWidth: 2 };
    }
    if (t.includes('common')) {
      return { fill: 'rgba(68, 172, 255, 0.4)', stroke: '#44a2ff', strokeWidth: 2.5 };
    }
  }
  return undefined;
}

function resolveLayoutAnnotationStyle(ann, session) {
  if (session && ann?.id === session.parentAnnotationId) {
    const base = resolveAnnotationStyleBySpaceType(ann) ?? {};
    return {
      ...base,
      fill: 'transparent',
    };
  }
  if (session && ann?.source === DESK_COWORKER_MARKER) {
    return {
      fill: 'rgba(15, 118, 110, 0.9)',
      stroke: '#0f766e',
      strokeWidth: 2,
    };
  }
  if (
    session &&
    ann?.source === SERVER_SUBSPACE_PIN_SOURCE &&
    String(ann?.space_ref || '') === String(session?.parentSpaceRef || '')
  ) {
    return resolveManagedOfficeSubSpaceAnnotationStyle(readSubSpaceTypeFromAnnotation(ann), {
      emphasized: true,
    });
  }
  return resolveAnnotationStyleBySpaceType(ann);
}

/**
 * @param {{
 *   stageRef: import('react').RefObject<unknown>,
 *   showBlockingLayoutSpinner: boolean,
 *   layoutDetailError: unknown,
 *   layoutImage: HTMLImageElement | null,
 *   floorRef: string,
 *   imageUrl: string,
 *   localAnnotations: unknown[],
 *   onAnnotationsChange: (next: unknown[]) => void,
 *   onRenameAnnotation: () => void,
 *   onReorderAnnotations: () => void,
 *   layoutToolbarToolIds: string[] | null | undefined,
 *   isSuperAdmin: boolean,
 *   canWriteSpace?: boolean,
 *   canMarkDesks?: boolean,
 *   onBeforeAnnotationAdd: (args: { type: string, nx: number, ny: number, clientX?: number, clientY?: number }) => boolean,
 *   onClickAssociateNew: (ann: unknown) => void,
 *   onClickAssociateEdit: (ann: unknown) => void,
 *   onRemoveAssociation: (ann: unknown) => void,
 *   onDeleteSubSpace?: (ann: unknown) => void,
 *   onRequestDeleteSelected?: (ann: unknown) => boolean | void,
 *   isSavingLayoutCoordinates: boolean,
 *   isDeletingSubSpace?: boolean,
 *   subSpaceCanvasSession: object | null,
 *   onExitSubSpaceCanvasMode: () => void,
 *   layoutDetailData?: object | null,
 *   onBeginSubSpaceCanvasZoom: (ann: unknown, options?: { mode?: 'create' | 'edit' }) => void,
 *   onAllocateClientFromAnnotation?: (ann: unknown) => void,
 *   onSaveDeskCoworkerMarkers?: () => void | Promise<void>,
 *   isSavingDeskCoworkerMarkers?: boolean,
 *   isDeskCoworkerSaveDisabled?: boolean,
 *   onRemoveDeskCoworkerMarker?: (markerId: string) => void,
 *   layoutCanvasFilters?: { clientId?: string, spaceRef?: string, spaceTypes?: string[], occupancy?: string, agreementDateFilterType?: string, fromDate?: string, toDate?: string },
 *   annotationsMatchActiveFilters?: boolean,
 *   isLayoutDirty?: boolean,
 *   isSavingLayout?: boolean,
 *   onSaveLayoutChanges?: () => void | Promise<void>,
 * }} props
 */
export default function LayoutAnnotationFloorPlanSection({
  stageRef,
  showBlockingLayoutSpinner,
  layoutDetailError,
  layoutImage,
  floorRef,
  imageUrl,
  localAnnotations,
  onAnnotationsChange,
  onRenameAnnotation,
  onReorderAnnotations,
  layoutToolbarToolIds,
  isSuperAdmin,
  canWriteSpace = false,
  canMarkDesks = false,
  onBeforeAnnotationAdd,
  onClickAssociateNew,
  onClickAssociateEdit,
  onRemoveAssociation,
  onDeleteSubSpace,
  onRequestDeleteSelected,
  isSavingLayoutCoordinates,
  isDeletingSubSpace = false,
  subSpaceCanvasSession,
  onExitSubSpaceCanvasMode,
  onBeginSubSpaceCanvasZoom,
  onAllocateClientFromAnnotation,
  layoutDetailData,
  onSaveDeskCoworkerMarkers,
  isSavingDeskCoworkerMarkers = false,
  isDeskCoworkerSaveDisabled = true,
  onRemoveDeskCoworkerMarker,
  layoutCanvasFilters,
  /** When false, header filters changed but canvas still shows the previous response — skip dim mask. */
  annotationsMatchActiveFilters = true,
  isLayoutDirty = false,
  isSavingLayout = false,
  onSaveLayoutChanges,
  historyResetKey = '',
}) {
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);
  const [activeToolId, setActiveToolId] = useState(TOOL_IDS.SELECT);

  const exitSubSpaceCanvasMode = useCallback(() => {
    onExitSubSpaceCanvasMode();
    setRecenterToFitNonce((n) => n + 1);
  }, [onExitSubSpaceCanvasMode]);

  useEffect(() => {
    if (subSpaceCanvasSession) {
      const isCoworking = isLayoutCoworkingSpace(subSpaceCanvasSession.inventoryType);
      const isManagedOffice = isLayoutManagedOfficeSpace(subSpaceCanvasSession.inventoryType);
      // Marker workflows (edit + desks/coworking seats) should start on the point tool so
      // clicks place seats instead of selecting shapes and opening detail popovers.
      if (
        canMarkDesks &&
        subSpaceCanvasSession.mode === 'edit' &&
        (isCoworking || isManagedOffice)
      ) {
        setActiveToolId(TOOL_IDS.POINT);
      } else {
        setActiveToolId(TOOL_IDS.RECTANGLE);
      }
    } else {
      setActiveToolId(TOOL_IDS.SELECT);
    }
  }, [subSpaceCanvasSession, canMarkDesks]);

  useEffect(() => {
    if (!subSpaceCanvasSession) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      exitSubSpaceCanvasMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [subSpaceCanvasSession, exitSubSpaceCanvasMode]);

  const resolveAnnotationStyle = useCallback(
    (ann) => resolveLayoutAnnotationStyle(ann, subSpaceCanvasSession),
    [subSpaceCanvasSession],
  );

  const editSpotlightPins = useMemo(() => {
    if (!subSpaceCanvasSession || subSpaceCanvasSession.mode !== 'edit') return [];
    const ref = String(subSpaceCanvasSession.parentSpaceRef || '').trim();
    if (!ref) return [];
    return localAnnotations.filter(
      (a) => a.source === SERVER_SUBSPACE_PIN_SOURCE && String(a.space_ref || '').trim() === ref,
    );
  }, [subSpaceCanvasSession, localAnnotations]);

  const hasActiveHeaderFilters =
    annotationsMatchActiveFilters && hasActiveLayoutDetailFilters(layoutCanvasFilters ?? {});

  const filterSpotlightShapes = useMemo(() => {
    if (!hasActiveHeaderFilters || subSpaceCanvasSession) return [];
    return localAnnotations.filter((a) => {
      if (!a || typeof a !== 'object') return false;
      if (!String(a.space_ref || '').trim()) return false;
      if (a.source === SERVER_SUBSPACE_PIN_SOURCE || a.source === DESK_COWORKER_MARKER)
        return false;
      if (a.source === CENTER_SUBSPACE_MARKER || a.source === SUBSPACE_LAYOUT_PENDING_SOURCE) {
        return false;
      }
      return true;
    });
  }, [hasActiveHeaderFilters, subSpaceCanvasSession, localAnnotations]);

  const filterSpotlightMask = useMemo(() => {
    if (filterSpotlightShapes.length === 0 || !layoutImage?.naturalWidth) return null;
    return (
      <ClientMaskShape
        imageWidth={layoutImage.naturalWidth}
        imageHeight={layoutImage.naturalHeight}
        spaceAnnotations={filterSpotlightShapes}
        opacity={0.88}
      />
    );
  }, [filterSpotlightShapes, layoutImage]);

  const spotlightMask = useMemo(() => {
    if (!subSpaceCanvasSession || !layoutImage?.naturalWidth) return null;
    const ann = localAnnotations.find((a) => a.id === subSpaceCanvasSession.parentAnnotationId);
    const maskList =
      subSpaceCanvasSession.mode === 'edit'
        ? annotationsForEditSubSpaceSpotlightHoles(ann, editSpotlightPins)
        : annotationsForSpotlightMask(ann);
    if (!maskList || maskList.length === 0) return null;
    return (
      <ClientMaskShape
        imageWidth={layoutImage.naturalWidth}
        imageHeight={layoutImage.naturalHeight}
        spaceAnnotations={maskList}
        opacity={0.9}
      />
    );
  }, [subSpaceCanvasSession, layoutImage, localAnnotations, editSpotlightPins]);

  const extraCanvasAnnotationFilter = useCallback(
    (ann) => {
      if (ann?.source === CENTER_SUBSPACE_MARKER) return false;
      if (ann?.source === SUBSPACE_LAYOUT_PENDING_SOURCE) {
        return Boolean(subSpaceCanvasSession);
      }

      const parentRef = String(subSpaceCanvasSession?.parentSpaceRef || '').trim();

      if (ann?.source === SERVER_SUBSPACE_PIN_SOURCE) {
        if (!subSpaceCanvasSession) return false;
        return String(ann.space_ref || '').trim() === parentRef;
      }

      if (ann?.source === DESK_COWORKER_MARKER) {
        if (!subSpaceCanvasSession) return false;
        return String(ann.parent_space_ref || '').trim() === parentRef;
      }

      if (String(ann?.space_ref || '').trim()) return true;
      const drawableTypes = ['rectangle', 'circle', 'pen'];
      return drawableTypes.includes(ann?.type);
    },
    [subSpaceCanvasSession],
  );

  const focusDimBrightIds = useMemo(() => {
    if (!subSpaceCanvasSession) return [];
    const ref = String(subSpaceCanvasSession.parentSpaceRef || '').trim();
    if (!ref) return [];
    return localAnnotations
      .filter((a) => {
        if (!a || typeof a !== 'object') return false;
        if (a.source === SERVER_SUBSPACE_PIN_SOURCE) {
          return String(a.space_ref || '').trim() === ref;
        }
        if (a.source === DESK_COWORKER_MARKER) {
          return String(a.parent_space_ref || '').trim() === ref;
        }
        return false;
      })
      .map((a) => a.id);
  }, [subSpaceCanvasSession, localAnnotations]);

  const editorPerfConfig = useMemo(
    () => (subSpaceCanvasSession ? { showGrid: false } : {}),
    [subSpaceCanvasSession],
  );

  const effectiveToolbarIds = useMemo(() => {
    if (!subSpaceCanvasSession) return layoutToolbarToolIds ?? undefined;

    if (!canWriteSpace && !canMarkDesks) {
      return layoutToolbarToolIds ?? undefined;
    }

    // Center read + Space write required for desk / coworker point markers.
    if (!canMarkDesks) {
      return SUB_SPACE_SESSION_TOOL_IDS_BASE;
    }

    const parentRef = String(subSpaceCanvasSession.parentSpaceRef || '').trim();
    const isCoworking = isLayoutCoworkingSpace(subSpaceCanvasSession.inventoryType);
    const isManagedOffice = isLayoutManagedOfficeSpace(subSpaceCanvasSession.inventoryType);
    const coworkingInventoryType = normalizeCoworkingInventoryType(
      subSpaceCanvasSession.coworkingInventoryType ?? '',
    );
    const usesDeskMarkerWorkflow =
      isCoworking && isLayoutCoworkingDeskMarkerType(coworkingInventoryType);
    const serverSubSpaceCount = getSubSpaceRowsForParentSpace(layoutDetailData, parentRef).length;
    const pinSubSpaceCount = localAnnotations.filter(
      (a) =>
        a?.source === SERVER_SUBSPACE_PIN_SOURCE && String(a.space_ref || '').trim() === parentRef,
    ).length;
    const hasDeskMarkerTargets =
      usesDeskMarkerWorkflow &&
      layoutCoworkingParentHasDeskMarkerTargets(layoutDetailData, parentRef);
    const canPlaceCoworkingMarkers =
      isCoworking &&
      (serverSubSpaceCount > 0 ||
        pinSubSpaceCount > 0 ||
        usesDeskMarkerWorkflow ||
        hasDeskMarkerTargets);

    if (isManagedOffice) {
      return SUB_SPACE_SESSION_TOOL_IDS_EDIT;
    }

    if (subSpaceCanvasSession.mode === 'edit') {
      if (isCoworking) {
        return SUB_SPACE_SESSION_TOOL_IDS_COWORKING_MARKER;
      }
      return SUB_SPACE_SESSION_TOOL_IDS_EDIT;
    }

    if (canPlaceCoworkingMarkers) {
      const withMarker = [...SUB_SPACE_SESSION_TOOL_IDS_BASE];
      if (!withMarker.includes(TOOL_IDS.POINT)) {
        const handIdx = withMarker.indexOf(TOOL_IDS.HAND);
        withMarker.splice(handIdx >= 0 ? handIdx + 1 : 1, 0, TOOL_IDS.POINT);
      }
      return withMarker;
    }

    return SUB_SPACE_SESSION_TOOL_IDS_BASE;
  }, [
    subSpaceCanvasSession,
    canMarkDesks,
    canWriteSpace,
    layoutToolbarToolIds,
    layoutDetailData,
    localAnnotations,
  ]);

  const subSpaceFocusFrame = useMemo(() => {
    if (!subSpaceCanvasSession) return null;
    return {
      annotationId: subSpaceCanvasSession.parentAnnotationId,
      title: subSpaceCanvasSession.title || 'Space',
      inventoryType: subSpaceCanvasSession.inventoryType || '',
    };
  }, [subSpaceCanvasSession]);

  const isSubSpaceCoworkingSession = isLayoutCoworkingSpace(
    subSpaceCanvasSession?.inventoryType ?? '',
  );

  const subSpaceFocusViewportFitRatio = subSpaceCanvasSession
    ? isSubSpaceCoworkingSession
      ? 0.3
      : 0.42
    : 0.52;

  const subSpaceFocusViewportMaxScale = subSpaceCanvasSession ? 2.25 : undefined;

  if (showBlockingLayoutSpinner) {
    return (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading layout...
      </div>
    );
  }

  if (layoutDetailError) {
    return (
      <div className='flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-error-lighter bg-bg-weak-50 px-6 text-paragraph-sm text-error-base'>
        {String(layoutDetailError)}
      </div>
    );
  }

  if (layoutImage) {
    return (
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <FloorPlanEditor
          stageRef={stageRef}
          key={floorRef}
          layoutId={floorRef}
          resetKey={historyResetKey || floorRef}
          className='min-h-full'
          image={{
            url: layoutImage.src,
            width: layoutImage.naturalWidth,
            height: layoutImage.naturalHeight,
            raster: layoutImage,
          }}
          annotations={localAnnotations}
          onChange={onAnnotationsChange}
          onRenameAnnotation={onRenameAnnotation}
          onReorderAnnotations={onReorderAnnotations}
          fitContentOnMount
          recenterToFitNonce={recenterToFitNonce}
          focusViewportToAnnotationRequest={subSpaceCanvasSession?.request ?? null}
          focusViewportFitRatio={subSpaceFocusViewportFitRatio}
          focusViewportMaxScale={subSpaceFocusViewportMaxScale}
          subSpaceFocusFrame={subSpaceFocusFrame}
          focusDimAnnotationId={subSpaceCanvasSession?.parentAnnotationId ?? null}
          focusDimBrightIds={focusDimBrightIds}
          extraCanvasAnnotationFilter={extraCanvasAnnotationFilter}
          allowSubSpacePinTransform={Boolean(subSpaceCanvasSession)}
          config={editorPerfConfig}
          pendingAnnotationSource={subSpaceCanvasSession ? SUBSPACE_LAYOUT_PENDING_SOURCE : null}
          maskShape={spotlightMask ?? filterSpotlightMask}
          hoverOverlayCloseDelayMs={subSpaceCanvasSession ? 1400 : 900}
          hoverOverlayZIndex={subSpaceCanvasSession ? 50 : 14}
          toolbarEnabledToolIds={effectiveToolbarIds}
          activeToolId={activeToolId}
          onActiveToolChange={setActiveToolId}
          onBeforeAnnotationAdd={
            isSuperAdmin || canWriteSpace ? onBeforeAnnotationAdd : () => false
          }
          onRequestDeleteSelected={isSuperAdmin ? onRequestDeleteSelected : undefined}
          resolveAnnotationStyle={resolveAnnotationStyle}
          renderAnnotationOverlay={(ann, _center, overlaySchedule) => {
            if (ann.source === SERVER_SUBSPACE_PIN_SOURCE) {
              // In sub-space edit mode the Konva pin is enough; details use click — no centroid + overlay.
              if (subSpaceCanvasSession) return null;
              return <SubSpacePinOverlay annotation={ann} />;
            }
            if (ann.space_ref) {
              return null;
            }
            if (ann.source === DESK_COWORKER_MARKER) {
              const companyLogo = String(
                ann?.company_logo ?? ann?.assigned_client?.company_logo ?? '',
              ).trim();
              const clientName = String(
                ann?.client_name ??
                  ann?.assigned_client?.customer_name ??
                  ann?.assigned_client?.customer_legal_name ??
                  '',
              ).trim();
              const sequenceLabel =
                ann?.desk_sequence != null && ann.desk_sequence !== ''
                  ? String(ann.desk_sequence)
                  : '';
              const inParentEditSession =
                canMarkDesks &&
                subSpaceCanvasSession &&
                String(ann.parent_space_ref || '').trim() ===
                  String(subSpaceCanvasSession.parentSpaceRef || '').trim();

              if (companyLogo || clientName || inParentEditSession || sequenceLabel) {
                return (
                  <LayoutAnnotationDeskMarkerOverlay
                    companyLogo={companyLogo}
                    clientName={clientName}
                    sequenceLabel={sequenceLabel}
                    showPlacementHint={inParentEditSession && !companyLogo && !clientName}
                    canvasScale={overlaySchedule?.canvasScale ?? 1}
                  />
                );
              }
              return null;
            }

            const parentForInner = canWriteSpace
              ? findContainingParentSpaceForUnassociatedChild(ann, localAnnotations)
              : null;

            if (parentForInner) {
              const parentLabel =
                String(
                  parentForInner.space?.inventory_name ?? parentForInner.space_ref ?? '',
                ).trim() || 'this space';
              const parentInnerInventoryType = String(
                parentForInner.space?.inventory_type ?? '',
              ).trim();
              const parentInnerSubSpaceTitle = isLayoutCoworkingSpace(parentInnerInventoryType)
                ? 'Mark CoWorkers'
                : 'Create sub-space in parent';
              return (
                <div className='pointer-events-auto flex flex-col items-center gap-1 rounded-lg border border-stroke-soft-200 bg-white/95 p-1 shadow-regular-sm'>
                  <span className='max-w-[10rem] truncate px-0.5 text-center text-[10px] font-medium leading-tight text-text-sub-600'>
                    Inside {parentLabel}
                  </span>
                  <div className='flex items-center gap-1'>
                    <button
                      type='button'
                      title={parentInnerSubSpaceTitle}
                      onClick={(e) => {
                        e.stopPropagation();
                        const ref = String(parentForInner.space_ref || '').trim();
                        const subs =
                          getSubSpaceRowsForParentSpace(layoutDetailData, ref).length > 0;
                        onBeginSubSpaceCanvasZoom(
                          parentForInner,
                          subs ? { mode: 'edit' } : { mode: 'create' },
                        );
                      }}
                      className='flex size-7 cursor-pointer items-center justify-center rounded-full border border-stroke-soft-200 bg-primary-base text-white shadow-sm hover:opacity-95'
                    >
                      <RiLayoutGridLine size={15} aria-hidden />
                    </button>
                    {canWriteSpace ? (
                      <AssociateSpaceOverlayButton
                        title='Associate as its own space'
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickAssociateNew(ann);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            }

            if (!canWriteSpace) return null;

            return (
              <AssociateSpaceOverlayButton
                onClick={(e) => {
                  e.stopPropagation();
                  onClickAssociateNew(ann);
                }}
              />
            );
          }}
          renderSelectedAnnotationOverlay={(ann, _center, hoverOverlaySchedule) => {
            if (activeToolId !== TOOL_IDS.SELECT) return null;

            if (ann.source === SERVER_SUBSPACE_PIN_SOURCE) {
              if (subSpaceCanvasSession) {
                const parentRef = String(subSpaceCanvasSession.parentSpaceRef || '').trim();
                if (String(ann.space_ref || '').trim() !== parentRef) return null;
              }
              return (
                <SubSpaceInfoCanvasHoverPopover
                  annotation={ann}
                  hoverOverlaySchedule={hoverOverlaySchedule}
                />
              );
            }

            if (subSpaceCanvasSession) return null;
            if (!ann.space_ref) return null;
            if (
              ann.source === CENTER_SUBSPACE_MARKER ||
              ann.source === DESK_COWORKER_MARKER ||
              ann.source === SUBSPACE_LAYOUT_PENDING_SOURCE
            ) {
              return null;
            }
            const merged = mergeSpaceWithClientsForPopover(ann.space, ann.clients) ?? ann.space;
            if (!merged) return null;
            const spaceRef = String(ann.space_ref || '').trim();
            const hasSubSpaces = layoutCoworkingParentHasDeskMarkerTargets(
              layoutDetailData,
              spaceRef,
            );
            const inventoryType = String(
              merged?.inventory_type ?? ann?.space?.inventory_type ?? '',
            );
            const canShowSubSpaceActions =
              canWriteSpace && !isLayoutSpaceExcludedFromAllocateAndSubSpace(inventoryType);
            return (
              <SpaceInfoCanvasHoverPopover
                space={merged}
                canCreateSubSpace={canShowSubSpaceActions}
                canAllocateClient={
                  isSuperAdmin && !isLayoutSpaceExcludedFromAllocateAndSubSpace(inventoryType)
                }
                hasSubSpaces={hasSubSpaces}
                onViewEditSubSpace={() => onBeginSubSpaceCanvasZoom(ann, { mode: 'edit' })}
                onCreateSubSpace={() => onBeginSubSpaceCanvasZoom(ann, { mode: 'create' })}
                onAllocateClient={() => {
                  onAllocateClientFromAnnotation?.(ann);
                }}
                hoverOverlaySchedule={hoverOverlaySchedule}
              />
            );
          }}
          listenForAnnotationHits={activeToolId === TOOL_IDS.SELECT}
          renderHoveredAnnotationOverlay={null}
          toolbarTrailingActions={(ctx) => {
            /**
             * Sub-space-mode actions (Save coordinates + Close) — always shown
             * while the user is inside the sub-space canvas session.
             */
            const subSpaceToolbarActions = subSpaceCanvasSession ? (
              <>
                {subSpaceCanvasSession.mode === 'edit' &&
                (isLayoutManagedOfficeSpace(subSpaceCanvasSession.inventoryType) ||
                  isLayoutCoworkingSpace(subSpaceCanvasSession.inventoryType)) &&
                onSaveDeskCoworkerMarkers ? (
                  <Button.Root
                    type='button'
                    variant='primary'
                    mode='filled'
                    size='small'
                    className='gap-1.5'
                    disabled={isDeskCoworkerSaveDisabled || isSavingDeskCoworkerMarkers}
                    onClick={() => void onSaveDeskCoworkerMarkers()}
                  >
                    <RiSaveLine className='size-4' aria-hidden />
                    {isSavingDeskCoworkerMarkers ? 'Saving…' : 'Save coordinates'}
                  </Button.Root>
                ) : null}
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='gap-1.5'
                  onClick={exitSubSpaceCanvasMode}
                >
                  <RiCloseLine className='size-4' aria-hidden />
                  Close
                </Button.Root>
              </>
            ) : null;

            /**
             * Top-level "Save changes" — only shown when the layout has unsaved
             * edits and we're not inside a sub-space session (the sub-space
             * "Save coordinates" button covers that flow).
             */
            const saveLayoutAction =
              !subSpaceCanvasSession && isLayoutDirty && onSaveLayoutChanges ? (
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  size='small'
                  className='gap-1.5'
                  disabled={isSavingLayout}
                  onClick={() => void onSaveLayoutChanges()}
                >
                  <RiSaveLine className='size-4' aria-hidden />
                  {isSavingLayout ? 'Saving…' : 'Save changes'}
                </Button.Root>
              ) : null;

            const baseActions = (
              <>
                {subSpaceToolbarActions}
                {saveLayoutAction}
              </>
            );

            if (ctx.activeToolId !== 'select' || !ctx.primarySelectedAnnotation) {
              return baseActions;
            }
            const ann = ctx.primarySelectedAnnotation;
            if (
              subSpaceCanvasSession?.mode === 'edit' &&
              ann.source === DESK_COWORKER_MARKER &&
              onRemoveDeskCoworkerMarker
            ) {
              return (
                <>
                  {subSpaceToolbarActions}
                  <Button.Root
                    type='button'
                    variant='error'
                    mode='stroke'
                    size='small'
                    className='gap-1.5'
                    onClick={() => onRemoveDeskCoworkerMarker(ann.id)}
                  >
                    Remove marker
                  </Button.Root>
                </>
              );
            }
            if (
              subSpaceCanvasSession?.mode === 'edit' &&
              ann.source === SERVER_SUBSPACE_PIN_SOURCE &&
              isLayoutManagedOfficeSpace(subSpaceCanvasSession.inventoryType) &&
              onDeleteSubSpace
            ) {
              return (
                <>
                  {subSpaceToolbarActions}
                  <Button.Root
                    type='button'
                    variant='error'
                    mode='stroke'
                    size='small'
                    disabled={isDeletingSubSpace}
                    className='gap-1.5'
                    onClick={() => onDeleteSubSpace(ann)}
                  >
                    Delete sub-space
                  </Button.Root>
                </>
              );
            }
            if (
              ann.source === SERVER_SUBSPACE_PIN_SOURCE ||
              ann.source === CENTER_SUBSPACE_MARKER ||
              ann.source === DESK_COWORKER_MARKER
            ) {
              return baseActions;
            }
            if (ann.space_ref) {
              return (
                <>
                  {subSpaceToolbarActions}
                  {saveLayoutAction}
                  <Button.Root
                    type='button'
                    variant='primary'
                    mode='stroke'
                    size='small'
                    disabled={isSavingLayoutCoordinates}
                    className='gap-1.5'
                    onClick={() => onClickAssociateEdit(ann)}
                  >
                    Edit association
                  </Button.Root>
                  <Button.Root
                    type='button'
                    variant='error'
                    mode='stroke'
                    size='small'
                    disabled={isSavingLayoutCoordinates}
                    className='gap-1.5'
                    onClick={() => onRemoveAssociation(ann)}
                  >
                    Remove association
                  </Button.Root>
                </>
              );
            }

            const parentInToolbar = canWriteSpace
              ? findContainingParentSpaceForUnassociatedChild(ann, localAnnotations)
              : null;

            if (parentInToolbar) {
              const parentRef = String(parentInToolbar.space_ref || '').trim();
              const parentHasSubs =
                getSubSpaceRowsForParentSpace(layoutDetailData, parentRef).length > 0;
              const parentInventoryType = String(
                parentInToolbar.space?.inventory_type ?? '',
              ).trim();
              const parentIsCoworking = isLayoutCoworkingSpace(parentInventoryType);
              const parentSubSpaceLabel = parentIsCoworking
                ? 'Mark CoWorkers'
                : parentHasSubs
                  ? 'View / Edit sub-space'
                  : 'Sub-space in parent';
              return (
                <>
                  {subSpaceToolbarActions}
                  {saveLayoutAction}
                  <Button.Root
                    type='button'
                    variant='primary'
                    mode='filled'
                    size='small'
                    disabled={isSavingLayoutCoordinates}
                    className='gap-1.5'
                    onClick={() =>
                      onBeginSubSpaceCanvasZoom(
                        parentInToolbar,
                        parentHasSubs ? { mode: 'edit' } : { mode: 'create' },
                      )
                    }
                  >
                    <RiLayoutGridLine size={16} aria-hidden />
                    {parentSubSpaceLabel}
                  </Button.Root>
                  {canWriteSpace ? (
                    <Button.Root
                      type='button'
                      variant='neutral'
                      mode='stroke'
                      size='small'
                      disabled={isSavingLayoutCoordinates}
                      className='gap-1.5'
                      onClick={() => onClickAssociateNew(ann)}
                    >
                      Associate as space
                    </Button.Root>
                  ) : null}
                </>
              );
            }

            if (!canWriteSpace) {
              return (
                <>
                  {subSpaceToolbarActions}
                  {saveLayoutAction}
                </>
              );
            }

            return (
              <>
                {subSpaceToolbarActions}
                {saveLayoutAction}
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  size='small'
                  disabled={isSavingLayoutCoordinates}
                  className='gap-1.5'
                  onClick={() => onClickAssociateNew(ann)}
                >
                  Associate space
                </Button.Root>
              </>
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600 '>
      <p className='font-medium text-text-strong-950'>Layout image not found</p>
      <p className='max-w-md'>
        No layout image path returned for this floor. Upload a layout image on the center Floors tab
        for this block/floor row.
      </p>
      {imageUrl ? (
        <p className='text-paragraph-xs break-all text-text-sub-500'>Attempted URL: {imageUrl}</p>
      ) : null}
    </div>
  );
}
