import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { RiMapPinFill } from 'react-icons/ri';

import { FloorPlanEditor, GlassPanel, TOOL_IDS } from '@/components/floor-plan-editor';
import * as Button from '@/components/ui/button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { TICKET_MARKER_SOURCE } from '@/constants/layout/annotation-sources';
import { SpaceInfoCanvasHoverPopover } from '@/pages/center/layout-annotation-space-info-popover';
import { layoutCoordinatePointsToAnnotation } from '@/utils/layout-coordinate-payload';
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
const COMPACT_MARKER_ICON_SIZE = 36;
const FACILITY_SPACE_ANNOTATION_ID = 'facility-task-space';

function FacilityMarkerPinIcon({ size = MARKER_ICON_SIZE }) {
  return (
    <div className='relative h-0 w-0'>
      <RiMapPinFill
        size={size}
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
 * Read-only facility tracker task layout from API `task_info` fields.
 */
export default function FacilityTaskLayoutPanel({
  layoutImageUrl = '',
  layoutCoordinate = null,
  markerCoordinate = null,
  spaceId = '',
  spaceName = '',
  floorLabel = '',
  compact = false,
  className = '',
}) {
  const [imgEl, setImgEl] = useState(null);
  const [viewportReady, setViewportReady] = useState(false);

  const src = useMemo(() => toLayoutAssetUrl(layoutImageUrl), [layoutImageUrl]);

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

  const resolvedSpaceId = String(spaceId || markerCoordinate?.space_id || '').trim();

  const spaceAnnotation = useMemo(() => {
    const points = layoutCoordinate?.points;
    if (!Array.isArray(points) || points.length === 0) return null;

    const spaceMeta = resolvedSpaceId
      ? {
          name: resolvedSpaceId,
          inventory_name: String(spaceName || '').trim() || resolvedSpaceId,
          label: String(spaceName || '').trim() || resolvedSpaceId,
        }
      : null;

    return {
      ...layoutCoordinatePointsToAnnotation(
        FACILITY_SPACE_ANNOTATION_ID,
        resolvedSpaceId,
        points,
        spaceMeta,
      ),
      locked: true,
      visible: true,
    };
  }, [layoutCoordinate, resolvedSpaceId, spaceName]);

  const serverAnnotations = useMemo(
    () => (spaceAnnotation ? [spaceAnnotation] : []),
    [spaceAnnotation],
  );

  const markerAnnotation = useMemo(
    () => ticketMarkerCoordinateToAnnotation(markerCoordinate),
    [markerCoordinate],
  );

  const { focusAnnotationId, highlightedAnnotationId } = useMemo(
    () =>
      resolveLayoutMarkerFocusTargets({
        markerCoordinate,
        markerAnnotation,
        spaceId: resolvedSpaceId,
        serverAnnotations,
      }),
    [markerCoordinate, markerAnnotation, resolvedSpaceId, serverAnnotations],
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
  }, [src, shouldFocusMarker]);

  const handleViewportFocusApplied = useCallback(() => {
    setViewportReady(true);
  }, []);

  const markerIconSize = compact ? COMPACT_MARKER_ICON_SIZE : MARKER_ICON_SIZE;
  const emptyStateMinHeight = compact ? 'min-h-[200px]' : 'min-h-[320px]';
  const containerMinHeight = compact ? 'min-h-0 h-full' : 'min-h-[420px]';

  const renderAnnotationOverlay = useCallback(
    (ann) => {
      if (ann?.source !== TICKET_MARKER_SOURCE) return null;
      return <FacilityMarkerPinIcon size={markerIconSize} />;
    },
    [markerIconSize],
  );

  const renderHoveredAnnotationOverlay = useCallback(
    (ann, _center, hoverSchedule) => {
      if (compact || ann?.source === TICKET_MARKER_SOURCE) return null;
      const space = ann?.space;
      if (!space) return null;
      return (
        <SpaceInfoCanvasHoverPopover
          space={space}
          canManageSubSpaces={false}
          hoverOverlaySchedule={hoverSchedule}
        />
      );
    },
    [compact],
  );

  const renderToolbar = useCallback(
    (ctx) => (
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 z-20 flex w-full -translate-x-1/2 justify-center',
          compact ? 'bottom-2 px-1' : 'bottom-4 px-2',
        )}
      >
        <GlassPanel
          className={cn(
            'pointer-events-auto flex flex-wrap items-center gap-1',
            compact ? 'px-1.5 py-1' : 'px-2 py-2',
          )}
        >
          {compact ? (
            <Button.Root
              type='button'
              size='xsmall'
              variant={ctx.activeToolId === TOOL_IDS.HAND ? 'primary' : 'neutral'}
              mode={ctx.activeToolId === TOOL_IDS.HAND ? 'filled' : 'stroke'}
              aria-label='Hand'
              onClick={() => ctx.setActiveTool(TOOL_IDS.HAND)}
            >
              <Hand className='size-3.5 shrink-0' aria-hidden />
            </Button.Root>
          ) : (
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
          )}

          <div className='mx-0.5 h-5 w-px shrink-0 bg-stroke-soft-200' aria-hidden />

          <Button.Root
            type='button'
            size={compact ? 'xsmall' : 'small'}
            variant='neutral'
            mode='stroke'
            onClick={() => ctx.transformRef.current?.zoomOut()}
            aria-label='Zoom out'
          >
            <ZoomOut className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
          </Button.Root>

          <span
            className={cn(
              'min-w-[2.75rem] text-center tabular-nums text-text-sub-600',
              compact ? 'text-paragraph-2xs' : 'text-paragraph-xs',
            )}
          >
            {ctx.zoomPercent}%
          </span>

          <Button.Root
            type='button'
            size={compact ? 'xsmall' : 'small'}
            variant='neutral'
            mode='stroke'
            onClick={() => ctx.transformRef.current?.zoomIn()}
            aria-label='Zoom in'
          >
            <ZoomIn className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
          </Button.Root>
        </GlassPanel>
      </div>
    ),
    [compact],
  );

  if (!src) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center px-4 text-center text-paragraph-sm text-text-sub-600',
          emptyStateMinHeight,
          className,
        )}
      >
        No layout image available for this task.
      </div>
    );
  }

  if (!spaceAnnotation && !markerAnnotation) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center px-4 text-center text-paragraph-sm text-text-sub-600',
          emptyStateMinHeight,
          className,
        )}
      >
        No space or marker coordinates saved for this task.
      </div>
    );
  }

  if (!imageProp) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center text-paragraph-sm text-text-sub-600',
          emptyStateMinHeight,
          className,
        )}
      >
        Loading floor plan…
      </div>
    );
  }

  return (
    <div
      className={cn('relative flex flex-1 flex-col', containerMinHeight, className)}
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: compact ? '14px 14px' : '18px 18px',
      }}
    >
      {!compact && floorLabel ? (
        <div className='absolute left-3 top-3 z-30 rounded-lg border border-stroke-soft-200 bg-bg-white-0/95 px-3 py-1.5 text-label-sm font-medium text-text-strong-950 shadow-regular-xs'>
          {floorLabel}
        </div>
      ) : null}

      <div
        className={cn(
          'h-full min-h-0 flex-1 transition-opacity duration-300',
          shouldFocusMarker && !viewportReady && 'pointer-events-none opacity-0',
        )}
      >
        <FloorPlanEditor
          key={src}
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
          fitContentPadding={compact ? 16 : 32}
          focusViewportFitRatio={compact ? 0.58 : 0.52}
          focusViewportPadding={compact ? 28 : 56}
          focusViewportMaxScale={compact ? 3 : 2.5}
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
