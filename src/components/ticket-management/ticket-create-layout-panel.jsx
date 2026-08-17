import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hand, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { RiCloseLine, RiMapPinFill } from 'react-icons/ri';

import {
  FloorPlanEditor,
  GlassPanel,
  TOOL_IDS,
  findAssociatedSpaceRegionAt,
  findLayoutMarkerTargetAt,
  isPointInMarkerPlacementRegions,
} from '@/components/floor-plan-editor';
import * as Button from '@/components/ui/button';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { TICKET_MARKER_SOURCE } from '@/constants/layout/annotation-sources';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { annotationToLayoutCoordinate } from '@/utils/layout-coordinate-payload';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { resolveLayoutListAnnotationStyle } from '@/utils/space-layout-list-utils';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  areLayoutFloorRefsEquivalent,
  findSpaceAnnotationByRef,
  resolveLayoutMarkerFocusTargets,
  resolveSpaceDisplayName,
  TICKET_MARKER_ANNOTATION_ID,
  ticketMarkerCoordinateToAnnotation,
} from '@/utils/ticket-layout-marker-utils';

const TICKET_MARKER_ICON_SIZE = 70;

const DIMMED_SPACE_STYLE = {
  fill: 'rgba(148, 163, 184, 0.12)',
  stroke: '#94a3b8',
  strokeWidth: 1,
};

function resolveLayoutDetailFloorRef(layoutDetail) {
  const floor = layoutDetail?.floor_detail ?? layoutDetail?.layout ?? layoutDetail ?? null;
  if (!floor || typeof floor !== 'object') return '';
  return String(floor.name ?? floor.floor_ref ?? floor.block_floor_id ?? '').trim();
}

function resolveTicketLayoutAnnotationStyle(ann, highlightedSpaceId) {
  if (ann?.source === TICKET_MARKER_SOURCE) {
    return { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 };
  }
  if (highlightedSpaceId && ann?.id !== highlightedSpaceId) {
    return DIMMED_SPACE_STYLE;
  }
  return resolveLayoutListAnnotationStyle(ann);
}

function TicketMarkerPinIcon() {
  return (
    <div className='relative h-0 w-0'>
      <RiMapPinFill
        size={TICKET_MARKER_ICON_SIZE}
        color='#FF0052'
        className='absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-sm'
        aria-hidden
      />
    </div>
  );
}

/**
 * Floor layout canvas for ticket create/view drawers.
 *
 * @param {{
 *   layoutDetail: object | null,
 *   floorRef?: string,
 *   isLoading?: boolean,
 *   error?: string | null,
 *   onClose?: () => void,
 *   showCloseButton?: boolean,
 *   initialMarkerCoordinate?: object | null,
 *   ticketSpaceRef?: string,
 *   ticketSpaceDisplayName?: string,
 *   highlightLinkedSpace?: boolean,
 *   canMark?: boolean,
 *   onMarkerCoordinateChange?: (coordinate: object | null) => void,
 *   onMarkerSpaceResolved?: (spaceId: string, spaceName: string) => void,
 *   onMarkerSave?: (payload: object, spaceId: string, spaceName: string) => void | Promise<void>,
 *   saveButtonLabel?: string,
 *   autoSaveMarker?: boolean,
 * }} props
 */
export default function TicketCreateLayoutPanel({
  layoutDetail = null,
  floorRef = '',
  isLoading = false,
  error = null,
  onClose,
  showCloseButton,
  initialMarkerCoordinate = null,
  ticketSpaceRef = '',
  ticketSpaceDisplayName = '',
  highlightLinkedSpace = true,
  canMark: canMarkProp,
  onMarkerCoordinateChange,
  onMarkerSpaceResolved,
  onMarkerSave,
  saveButtonLabel = 'Save location',
  autoSaveMarker = false,
}) {
  const canMark = canMarkProp ?? Boolean(onMarkerSave || onMarkerCoordinateChange);
  const shouldShowCloseButton = showCloseButton ?? Boolean(onClose);

  const [imgEl, setImgEl] = useState(null);
  const [activeTool, setActiveTool] = useState(canMark ? TOOL_IDS.POINT : TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);
  const [markAnnotations, setMarkAnnotations] = useState([]);
  const [hasUnsavedMarker, setHasUnsavedMarker] = useState(false);
  const [isSavingMarker, setIsSavingMarker] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const [isLayoutSessionReady, setIsLayoutSessionReady] = useState(false);

  const activeToolRef = useRef(canMark ? TOOL_IDS.POINT : TOOL_IDS.HAND);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    if (!canMark && activeTool !== TOOL_IDS.HAND) {
      setActiveTool(TOOL_IDS.HAND);
    }
  }, [activeTool, canMark]);

  const resolvedFloorRef = String(floorRef || '').trim();
  const layoutDetailFloorRef = useMemo(
    () => resolveLayoutDetailFloorRef(layoutDetail),
    [layoutDetail],
  );
  const isLayoutStale = Boolean(
    resolvedFloorRef &&
    layoutDetailFloorRef &&
    !areLayoutFloorRefsEquivalent(resolvedFloorRef, layoutDetailFloorRef),
  );

  const floorRecord = layoutDetail?.floor_detail ?? layoutDetail?.layout ?? layoutDetail ?? null;
  const layoutImagePath = useMemo(() => getLayoutImagePathFromRecord(floorRecord), [floorRecord]);
  const src = useMemo(() => toLayoutAssetUrl(layoutImagePath), [layoutImagePath]);
  const canvasKey = `${resolvedFloorRef}-${layoutImagePath}`;

  const serverAnnotations = useMemo(() => {
    if (!layoutDetail || isLayoutStale) return [];
    return flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
  }, [isLayoutStale, layoutDetail]);

  const clearMarkerState = useCallback(() => {
    setMarkAnnotations([]);
    setHasUnsavedMarker(false);
    if (!onMarkerSave && canMark) {
      onMarkerCoordinateChange?.(null);
    }
  }, [canMark, onMarkerCoordinateChange, onMarkerSave]);

  const buildMarkerCoordinatePayload = useCallback(
    (marker) => {
      if (!marker) return null;

      const target = findLayoutMarkerTargetAt(marker.x, marker.y, serverAnnotations);
      if (!target?.spaceId && !target?.subSpaceId) return null;

      const coordinate = annotationToLayoutCoordinate(marker);
      if (!coordinate) return null;

      const spaceId = String(target.spaceId || '').trim();
      const subSpaceId = String(target.subSpaceId || '').trim();

      return {
        ...coordinate,
        ...(resolvedFloorRef ? { floor_ref: resolvedFloorRef } : {}),
        ...(spaceId ? { space_id: spaceId } : {}),
        ...(subSpaceId ? { sub_space_id: subSpaceId } : {}),
      };
    },
    [resolvedFloorRef, serverAnnotations],
  );

  const resolveMarkerSpaceMeta = useCallback(
    (marker, payload) => {
      const spaceId = String(payload?.space_id ?? '').trim();
      const subSpaceId = String(payload?.sub_space_id ?? '').trim();
      const target = findLayoutMarkerTargetAt(marker.x, marker.y, serverAnnotations);
      const spaceName =
        subSpaceId && target?.kind === 'subspace'
          ? String(
              target.ann?.sub_space_meta?.sub_space_name ?? target.ann?.label ?? subSpaceId,
            ).trim()
          : resolveSpaceDisplayName(spaceId, serverAnnotations);
      return { spaceId, spaceName };
    },
    [serverAnnotations],
  );

  const saveMarkerImmediately = useCallback(
    async (marker) => {
      const payload = buildMarkerCoordinatePayload(marker);
      if (!payload) {
        showErrorToast(null, {
          defaultMessage: 'Could not determine which space this marker belongs to.',
        });
        return;
      }

      const { spaceId, spaceName } = resolveMarkerSpaceMeta(marker, payload);
      setIsSavingMarker(true);
      try {
        if (onMarkerSave) {
          await onMarkerSave(payload, spaceId, spaceName);
        }
        onMarkerCoordinateChange?.(payload);
        onMarkerSpaceResolved?.(spaceId, spaceName);
        setHasUnsavedMarker(false);
        if (!onMarkerSave && !autoSaveMarker) {
          showSuccessToast(spaceName ? `Location saved in ${spaceName}.` : 'Location saved.');
        }
      } catch (saveError) {
        showErrorToast(saveError, { defaultMessage: 'Failed to save marker location.' });
      } finally {
        setIsSavingMarker(false);
      }
    },
    [
      autoSaveMarker,
      buildMarkerCoordinatePayload,
      onMarkerCoordinateChange,
      onMarkerSave,
      onMarkerSpaceResolved,
      resolveMarkerSpaceMeta,
    ],
  );

  const seedMarkerFromInitial = useCallback(() => {
    const ann = ticketMarkerCoordinateToAnnotation(initialMarkerCoordinate);
    if (!ann) {
      clearMarkerState();
      return;
    }
    setMarkAnnotations([
      {
        ...ann,
        locked: canMark ? false : true,
        visible: true,
        suppressCanvasShape: true,
        hitRadius: 24,
      },
    ]);
    setHasUnsavedMarker(false);
  }, [canMark, clearMarkerState, initialMarkerCoordinate]);

  useEffect(() => {
    setImgEl(null);
    setViewportReady(false);
    setIsLayoutSessionReady(false);
    setRecenterToFitNonce((previous) => previous + 1);
  }, [canvasKey]);

  useEffect(() => {
    if (initialMarkerCoordinate) {
      seedMarkerFromInitial();
      return;
    }
    clearMarkerState();
  }, [canvasKey, initialMarkerCoordinate, seedMarkerFromInitial, clearMarkerState]);

  useEffect(() => {
    if (!src || isLayoutStale) {
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
  }, [isLayoutStale, src]);

  const imageProp = useMemo(() => {
    if (!imgEl || isLayoutStale) return null;
    return {
      url: src,
      raster: imgEl,
      width: imgEl.naturalWidth,
      height: imgEl.naturalHeight,
    };
  }, [imgEl, isLayoutStale, src]);

  const activeMarkerAnnotation = useMemo(() => {
    if (markAnnotations[0]) return markAnnotations[0];
    return ticketMarkerCoordinateToAnnotation(initialMarkerCoordinate);
  }, [initialMarkerCoordinate, markAnnotations]);

  const linkedSpaceRef = useMemo(() => {
    const fromProp = String(ticketSpaceRef || '').trim();
    if (fromProp) return fromProp;
    return String(initialMarkerCoordinate?.space_id ?? '').trim();
  }, [initialMarkerCoordinate?.space_id, ticketSpaceRef]);

  const highlightedSpaceAnnotation = useMemo(() => {
    if (!highlightLinkedSpace) return null;

    const byRef = findSpaceAnnotationByRef(
      linkedSpaceRef,
      serverAnnotations,
      ticketSpaceDisplayName,
    );
    if (byRef) return byRef;

    if (activeMarkerAnnotation) {
      return findAssociatedSpaceRegionAt(
        activeMarkerAnnotation.x,
        activeMarkerAnnotation.y,
        serverAnnotations,
      );
    }
    return null;
  }, [
    activeMarkerAnnotation,
    highlightLinkedSpace,
    linkedSpaceRef,
    serverAnnotations,
    ticketSpaceDisplayName,
  ]);

  const highlightedSpaceId = highlightedSpaceAnnotation?.id ?? null;

  const annotations = useMemo(() => {
    const list = [...serverAnnotations];
    if (activeMarkerAnnotation) {
      const existing = list.some((ann) => ann?.id === activeMarkerAnnotation.id);
      if (!existing) {
        list.push({
          ...activeMarkerAnnotation,
          locked: !canMark,
          visible: true,
          suppressCanvasShape: true,
          hitRadius: 24,
        });
      }
    }
    return list;
  }, [activeMarkerAnnotation, canMark, serverAnnotations]);

  const { focusAnnotationId } = useMemo(
    () =>
      resolveLayoutMarkerFocusTargets({
        markerCoordinate: initialMarkerCoordinate,
        markerAnnotation: activeMarkerAnnotation,
        spaceId: linkedSpaceRef,
        serverAnnotations,
      }),
    [activeMarkerAnnotation, initialMarkerCoordinate, linkedSpaceRef, serverAnnotations],
  );

  const shouldFocusMarker = Boolean(focusAnnotationId);
  const shouldFocusOnMount = shouldFocusMarker && !isLayoutSessionReady;
  const shouldHideForFocus = shouldFocusOnMount && !viewportReady;

  useEffect(() => {
    if (isLayoutSessionReady) return;
    if (!shouldFocusMarker) {
      setViewportReady(true);
      setIsLayoutSessionReady(true);
      return;
    }
    setViewportReady(false);
  }, [canvasKey, isLayoutSessionReady, shouldFocusMarker]);

  const handleViewportFocusApplied = useCallback(() => {
    setViewportReady(true);
    setIsLayoutSessionReady(true);
  }, []);

  useEffect(() => {
    if (!shouldFocusOnMount || viewportReady) return undefined;
    const timerId = window.setTimeout(() => {
      setViewportReady(true);
      setIsLayoutSessionReady(true);
    }, 2500);
    return () => window.clearTimeout(timerId);
  }, [canvasKey, shouldFocusOnMount, viewportReady]);

  const resolveAnnotationStyle = useCallback(
    (ann) => resolveTicketLayoutAnnotationStyle(ann, highlightedSpaceId),
    [highlightedSpaceId],
  );

  useEffect(() => {
    if (!imageProp || focusAnnotationId) return undefined;
    const timerIds = [0, 150, 400].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );
    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [canvasKey, focusAnnotationId, imageProp]);

  const handleBeforeAnnotationAdd = useCallback(
    ({ type, nx, ny }) => {
      if (!canMark || type !== 'point') return false;
      const allowed = isPointInMarkerPlacementRegions(nx, ny, serverAnnotations);
      if (!allowed) {
        showErrorToast(null, {
          defaultMessage: 'Place the marker inside a highlighted space or sub-space area.',
        });
      }
      return allowed;
    },
    [canMark, serverAnnotations],
  );

  const handleAnnotationsChange = useCallback(
    (next) => {
      if (!canMark) return;

      const nextList = Array.isArray(next) ? next : [];
      const pointAnns = nextList.filter((ann) => ann?.type === 'point');

      if (pointAnns.length === 0) {
        clearMarkerState();
        return;
      }

      const latest = pointAnns[pointAnns.length - 1];
      const marker = {
        ...latest,
        id: TICKET_MARKER_ANNOTATION_ID,
        type: 'point',
        source: TICKET_MARKER_SOURCE,
        locked: false,
        visible: true,
        suppressCanvasShape: true,
        hitRadius: 24,
      };
      setMarkAnnotations([marker]);

      if (autoSaveMarker) {
        void saveMarkerImmediately(marker);
        return;
      }

      setHasUnsavedMarker(true);
      if (!onMarkerSave) {
        onMarkerCoordinateChange?.(null);
      }
    },
    [
      autoSaveMarker,
      canMark,
      clearMarkerState,
      onMarkerCoordinateChange,
      onMarkerSave,
      saveMarkerImmediately,
    ],
  );

  const handleSaveMarker = useCallback(async () => {
    const marker = markAnnotations[0];
    if (!marker) return;
    await saveMarkerImmediately(marker);
  }, [markAnnotations, saveMarkerImmediately]);

  const renderAnnotationOverlay = useCallback((ann) => {
    if (ann?.source !== TICKET_MARKER_SOURCE) return null;
    return <TicketMarkerPinIcon />;
  }, []);

  const renderHoveredAnnotationOverlay = useCallback((ann, _center, hoverSchedule) => {
    if (ann?.source === TICKET_MARKER_SOURCE) return null;
    if (activeToolRef.current !== TOOL_IDS.HAND) return null;
    const space = ann?.space;
    if (!space) return null;
    return (
      <SpaceInfoCanvasHoverPopover
        space={space}
        canManageSubSpaces={false}
        hoverOverlaySchedule={hoverSchedule}
      />
    );
  }, []);

  const renderToolbar = useCallback(
    (ctx) => (
      <div
        className={cn(
          'pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-full -translate-x-1/2 justify-center px-2',
        )}
      >
        <GlassPanel className='pointer-events-auto flex flex-wrap items-center gap-1 px-2 py-2'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button.Root
                type='button'
                size='small'
                variant={ctx.activeToolId === TOOL_IDS.HAND ? 'primary' : 'neutral'}
                mode={ctx.activeToolId === TOOL_IDS.HAND ? 'filled' : 'stroke'}
                title='Hand (H)'
                aria-label='Hand (H)'
                aria-pressed={ctx.activeToolId === TOOL_IDS.HAND}
                onClick={() => ctx.setActiveTool(TOOL_IDS.HAND)}
              >
                <Hand className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Hand</p>
            </Tooltip.Content>
          </Tooltip.Root>

          {canMark ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button.Root
                  type='button'
                  size='small'
                  variant={ctx.activeToolId === TOOL_IDS.POINT ? 'primary' : 'neutral'}
                  mode={ctx.activeToolId === TOOL_IDS.POINT ? 'filled' : 'stroke'}
                  title='Mark location (D)'
                  aria-label='Mark location (D)'
                  aria-pressed={ctx.activeToolId === TOOL_IDS.POINT}
                  onClick={() => ctx.setActiveTool(TOOL_IDS.POINT)}
                >
                  <RiMapPinFill className='size-4 shrink-0' aria-hidden />
                </Button.Root>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>Mark location</p>
              </Tooltip.Content>
            </Tooltip.Root>
          ) : null}

          <div className='mx-1 h-6 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

          <Button.Root
            type='button'
            size='small'
            variant='neutral'
            mode='stroke'
            onClick={() => ctx.transformRef.current?.zoomOut()}
            aria-label='Zoom out'
          >
            <ZoomOut className='size-4' aria-hidden />
          </Button.Root>

          <span className='min-w-[3.25rem] text-center tabular-nums text-paragraph-xs text-text-sub-600'>
            {ctx.zoomPercent}%
          </span>

          <Button.Root
            type='button'
            size='small'
            variant='neutral'
            mode='stroke'
            onClick={() => ctx.transformRef.current?.zoomIn()}
            aria-label='Zoom in'
          >
            <ZoomIn className='size-4' aria-hidden />
          </Button.Root>
        </GlassPanel>
      </div>
    ),
    [canMark],
  );

  if (!resolvedFloorRef) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
        Select a floor in ticket details to view the layout.
      </div>
    );
  }

  if ((isLoading || isLayoutStale) && !imageProp) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error && !layoutDetail) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 flex-col items-center justify-center gap-3 bg-bg-weak-50 px-6 text-center'>
        <p className='text-paragraph-sm text-error-base'>{error}</p>
        {onClose ? (
          <button
            type='button'
            onClick={onClose}
            className='text-label-sm font-medium text-primary-base hover:underline'
          >
            Close layout view
          </button>
        ) : null}
      </div>
    );
  }

  if (!layoutImagePath) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        No layout image for this floor.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div className='flex h-full min-h-[420px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor plan…
      </div>
    );
  }

  const focusDimBrightIds = highlightedSpaceId
    ? [highlightedSpaceId, activeMarkerAnnotation?.id].filter(Boolean)
    : activeMarkerAnnotation?.id
      ? [activeMarkerAnnotation.id]
      : [];

  const isLayoutRendering = Boolean(imageProp) && !isLayoutSessionReady;

  return (
    <div
      className='relative flex h-full min-h-0 flex-1 flex-col'
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {shouldShowCloseButton && onClose ? (
        <div className='absolute right-3 top-3 z-30 flex items-center gap-2'>
          {!autoSaveMarker && (hasUnsavedMarker || markAnnotations.length > 0) ? (
            <Button.Root
              type='button'
              size='small'
              variant='primary'
              mode='filled'
              disabled={
                isSavingMarker ||
                markAnnotations.length === 0 ||
                (!onMarkerSave && !hasUnsavedMarker)
              }
              onClick={handleSaveMarker}
            >
              {saveButtonLabel}
            </Button.Root>
          ) : null}
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            aria-label='Close layout view'
            onClick={onClose}
          >
            <CompactButton.Icon as={RiCloseLine} />
          </CompactButton.Root>
        </div>
      ) : null}

      <div
        className={cn(
          'h-full min-h-0 flex-1 transition-opacity duration-300',
          shouldHideForFocus && 'pointer-events-none opacity-0',
        )}
      >
        <FloorPlanEditor
          key={canvasKey}
          image={imageProp}
          annotations={annotations}
          onChange={canMark ? handleAnnotationsChange : undefined}
          onBeforeAnnotationAdd={canMark ? handleBeforeAnnotationAdd : undefined}
          readOnly={!canMark}
          listenForAnnotationHits
          showSidebar={false}
          fitContentOnMount={!shouldFocusOnMount}
          focusAnnotationIdOnMount={shouldFocusOnMount ? focusAnnotationId : ''}
          onFocusViewportToAnnotationApplied={
            shouldFocusOnMount ? handleViewportFocusApplied : undefined
          }
          fillViewport
          fitContentPadding={32}
          recenterToFitNonce={shouldFocusOnMount ? 0 : recenterToFitNonce}
          focusViewportFitRatio={0.52}
          focusViewportPadding={56}
          focusViewportMaxScale={2.5}
          activeToolId={activeTool}
          onActiveToolChange={canMark ? setActiveTool : undefined}
          toolbarEnabledToolIds={canMark ? [TOOL_IDS.HAND, TOOL_IDS.POINT] : [TOOL_IDS.HAND]}
          toolbarShowUndoRedoDelete={false}
          config={{ showGrid: false }}
          resolveAnnotationStyle={resolveAnnotationStyle}
          renderAnnotationOverlay={activeMarkerAnnotation ? renderAnnotationOverlay : undefined}
          renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
          renderToolbar={renderToolbar}
          focusDimAnnotationId={highlightedSpaceId}
          focusDimBrightIds={focusDimBrightIds}
          hoverOverlayCloseDelayMs={900}
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
        />
      </div>

      {isLayoutRendering ? (
        <div className='absolute inset-0 z-20 flex items-center justify-center bg-bg-weak-50/90 backdrop-blur-[1px]'>
          <div className='flex flex-col items-center gap-3 rounded-2xl border border-stroke-soft-200 bg-bg-white-0 px-8 py-7 shadow-regular-md'>
            <Loader2 className='size-8 animate-spin text-primary-base' aria-hidden />
            <div className='text-center'>
              <p className='text-label-sm font-medium text-text-strong-950'>Loading floor layout</p>
              <p className='mt-1 text-paragraph-xs text-text-sub-600'>
                Preparing spaces and marker on the plan…
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
