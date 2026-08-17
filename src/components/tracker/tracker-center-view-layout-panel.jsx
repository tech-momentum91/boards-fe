import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { RiMapPinFill } from 'react-icons/ri';

import { FloorPlanEditor, GlassPanel, TOOL_IDS } from '@/components/floor-plan-editor';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { TICKET_MARKER_SOURCE } from '@/constants/layout/annotation-sources';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { getLayoutImagePathFromRecord } from '@/utils/layout-image-path';
import { toLayoutAssetUrl } from '@/utils/layout-asset-url';
import { resolveLayoutListAnnotationStyle } from '@/utils/space-layout-list-utils';
import {
  resolveLayoutMarkerFocusTargets,
  ticketMarkerCoordinateToAnnotation,
} from '@/utils/ticket-layout-marker-utils';

const DIMMED_SPACE_STYLE = {
  fill: 'rgba(148, 163, 184, 0.12)',
  stroke: '#94a3b8',
  strokeWidth: 1,
};

const MARKER_ICON_SIZE = 50;

function TrackerMarkerPinIcon() {
  return (
    <div className='relative h-0 w-0'>
      <RiMapPinFill
        size={MARKER_ICON_SIZE}
        color='#FF0052'
        className='absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-sm'
        aria-hidden
      />
    </div>
  );
}

function resolveViewLayoutAnnotationStyle(ann, highlightedSpaceId) {
  if (ann?.source === TICKET_MARKER_SOURCE) {
    return { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 };
  }
  if (highlightedSpaceId && ann?.id !== highlightedSpaceId) {
    return DIMMED_SPACE_STYLE;
  }
  return resolveLayoutListAnnotationStyle(ann);
}

/**
 * Read-only center tracker task layout with saved marker pin (ticket view pattern).
 */
export default function TrackerCenterViewLayoutPanel({
  layoutDetail = null,
  floorRef = '',
  floorLabel = '',
  markerCoordinate = null,
  spaceId = '',
  isLoading = false,
  error = null,
  canEditMarker = false,
  onUpdateMarker,
}) {
  const [imgEl, setImgEl] = useState(null);
  const [viewportReady, setViewportReady] = useState(false);

  const floorRecord = layoutDetail?.floor_detail ?? layoutDetail?.layout ?? layoutDetail ?? null;
  const layoutImagePath = useMemo(() => getLayoutImagePathFromRecord(floorRecord), [floorRecord]);
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

  const serverAnnotations = useMemo(() => {
    if (!layoutDetail) return [];
    return flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
  }, [layoutDetail]);

  const markerAnnotation = useMemo(
    () => ticketMarkerCoordinateToAnnotation(markerCoordinate),
    [markerCoordinate],
  );

  const { focusAnnotationId, highlightedAnnotationId } = useMemo(
    () =>
      resolveLayoutMarkerFocusTargets({
        markerCoordinate,
        markerAnnotation,
        spaceId,
        serverAnnotations,
      }),
    [markerCoordinate, markerAnnotation, spaceId, serverAnnotations],
  );

  const annotations = useMemo(() => {
    const list = [...serverAnnotations];
    if (markerAnnotation) list.push(markerAnnotation);
    return list;
  }, [serverAnnotations, markerAnnotation]);

  const resolveAnnotationStyle = useCallback(
    (ann) => resolveViewLayoutAnnotationStyle(ann, highlightedAnnotationId),
    [highlightedAnnotationId],
  );

  const shouldFocusMarker = Boolean(focusAnnotationId);

  useEffect(() => {
    setViewportReady(!shouldFocusMarker);
  }, [layoutImagePath, shouldFocusMarker]);

  const handleViewportFocusApplied = useCallback(() => {
    setViewportReady(true);
  }, []);

  const renderAnnotationOverlay = useCallback((ann) => {
    if (ann?.source !== TICKET_MARKER_SOURCE) return null;
    return <TrackerMarkerPinIcon />;
  }, []);

  const renderHoveredAnnotationOverlay = useCallback((ann, _center, hoverSchedule) => {
    if (ann?.source === TICKET_MARKER_SOURCE) return null;
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
      <div className='pointer-events-none absolute bottom-4 left-1/2 z-20 flex w-full -translate-x-1/2 justify-center px-2'>
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
                onClick={() => ctx.setActiveTool(TOOL_IDS.HAND)}
              >
                <Hand className='size-4 shrink-0' aria-hidden />
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Hand</p>
            </Tooltip.Content>
          </Tooltip.Root>

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
    [],
  );

  if (!markerCoordinate) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
        No location marker saved for this floor.
      </div>
    );
  }

  if (!floorRef) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
        Floor reference is missing. Cannot load layout.
      </div>
    );
  }

  if (isLoading && !layoutDetail) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error && !layoutDetail) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-error-base'>
        {error}
      </div>
    );
  }

  if (!layoutImagePath) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center px-6 text-center text-paragraph-sm text-text-sub-600'>
        No layout image for {floorLabel || 'this floor'}.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center text-paragraph-sm text-text-sub-600'>
        Loading floor plan…
      </div>
    );
  }

  return (
    <div
      className='relative flex min-h-[420px] flex-1 flex-col'
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {floorLabel ? (
        <div className='absolute left-3 top-3 z-30 rounded-lg border border-stroke-soft-200 bg-bg-white-0/95 px-3 py-1.5 text-label-sm font-medium text-text-strong-950 shadow-regular-xs'>
          {floorLabel}
        </div>
      ) : null}

      {canEditMarker && onUpdateMarker ? (
        <div className='absolute right-3 top-3 z-30'>
          <Button.Root
            type='button'
            size='small'
            variant='primary'
            mode='filled'
            onClick={onUpdateMarker}
          >
            Update coordinate
          </Button.Root>
        </div>
      ) : null}

      <div
        className={cn(
          'h-full min-h-0 flex-1 transition-opacity duration-300',
          shouldFocusMarker && !viewportReady && 'pointer-events-none opacity-0',
        )}
      >
        <FloorPlanEditor
          key={`${floorRef}-${layoutImagePath}`}
          image={imageProp}
          annotations={annotations}
          readOnly
          listenForAnnotationHits
          showSidebar={false}
          fitContentOnMount={!shouldFocusMarker}
          focusAnnotationIdOnMount={shouldFocusMarker ? focusAnnotationId : ''}
          onFocusViewportToAnnotationApplied={
            shouldFocusMarker ? handleViewportFocusApplied : undefined
          }
          fillViewport
          fitContentPadding={32}
          focusViewportFitRatio={0.52}
          focusViewportPadding={56}
          focusViewportMaxScale={2.5}
          activeToolId={TOOL_IDS.HAND}
          toolbarEnabledToolIds={[TOOL_IDS.HAND]}
          toolbarShowUndoRedoDelete={false}
          config={{ showGrid: false }}
          resolveAnnotationStyle={resolveAnnotationStyle}
          renderAnnotationOverlay={renderAnnotationOverlay}
          renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
          renderToolbar={renderToolbar}
          focusDimAnnotationId={highlightedAnnotationId}
          focusDimBrightIds={
            highlightedAnnotationId
              ? [highlightedAnnotationId, markerAnnotation?.id].filter(Boolean)
              : []
          }
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
        />
      </div>
    </div>
  );
}
