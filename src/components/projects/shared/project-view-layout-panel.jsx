import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiMapPinFill } from 'react-icons/ri';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import ProjectLayoutAreaInfoPopover, {
  ProjectLayoutAreaInfoContent,
} from '@/components/projects/layouts/project-layout-area-info-popover';
import {
  findSavedProjectLayoutAreaAt,
  flattenProjectLayoutAreasToAnnotations,
  getProjectLayoutAreaId,
  isProjectLayoutAnnotationSaved,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import ProjectCreateLayoutToolbar from '@/components/projects/shared/project-create-layout-toolbar';
import {
  PROJECT_CREATE_TASK_MARKER_ID,
  projectCreateMarkerPixelToAnnotation,
} from '@/components/projects/shared/project-create-layout-marker-utils';
import { resolveFileUrl } from '@/lib/utils';

const PROJECT_VIEW_MARKER_ICON_SIZE = 40;

function ProjectViewMarkerPinIcon({ color = '#6E3FF3' }) {
  return (
    <div className='pointer-events-none relative h-0 w-0'>
      <RiMapPinFill
        size={PROJECT_VIEW_MARKER_ICON_SIZE}
        color={color}
        className='absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-sm'
        aria-hidden
      />
    </div>
  );
}

function useLayoutRasterImage(imageUrl, enabled = true) {
  const [raster, setRaster] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!enabled || !imageUrl) {
      setRaster(null);
      setIsLoading(false);
      setHasError(false);
      return undefined;
    }

    setIsLoading(true);
    setHasError(false);
    setRaster(null);

    const img = new Image();
    const onLoad = () => {
      if (img.naturalWidth > 0) {
        setRaster(img);
        setHasError(false);
      } else {
        setRaster(null);
        setHasError(true);
      }
      setIsLoading(false);
    };
    const onError = () => {
      setRaster(null);
      setHasError(true);
      setIsLoading(false);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = imageUrl;

    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [enabled, imageUrl]);

  return { raster, isLoading, hasError };
}

/**
 * Read-only floor layout for project task view — areas, selected area, and saved marker.
 *
 * @param {{
 *   layout?: object | null,
 *   selectedAreaId?: string,
 *   floorLabel?: string,
 *   markerColor?: string,
 *   markerCoordinates?: { x?: number, y?: number } | null,
 * }} props
 */
export default function ProjectViewLayoutPanel({
  layout = null,
  selectedAreaId = '',
  floorLabel = '',
  markerColor = '#6E3FF3',
  markerCoordinates = null,
}) {
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);
  const [infoPopoverAnnotation, setInfoPopoverAnnotation] = useState(null);
  const viewportContainerRef = useRef(null);

  const layoutImageUrl = resolveFileUrl(layout?.layout_image);
  const {
    raster,
    isLoading: imageLoading,
    hasError: imageError,
  } = useLayoutRasterImage(layoutImageUrl, Boolean(layout));

  const imageSize = useMemo(
    () => ({
      imageWidth: raster?.naturalWidth ?? 0,
      imageHeight: raster?.naturalHeight ?? 0,
    }),
    [raster?.naturalHeight, raster?.naturalWidth],
  );

  const areaAnnotations = useMemo(() => {
    return flattenProjectLayoutAreasToAnnotations(layout?.areas, imageSize).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
  }, [imageSize, layout?.areas]);

  const markerAnnotation = useMemo(() => {
    if (!raster) return null;
    const ann = projectCreateMarkerPixelToAnnotation(
      markerCoordinates,
      raster.naturalWidth,
      raster.naturalHeight,
    );
    if (!ann) return null;
    return {
      ...ann,
      id: PROJECT_CREATE_TASK_MARKER_ID,
      color: markerColor,
      hitRadius: 24,
    };
  }, [markerColor, markerCoordinates, raster]);

  const focusAnnotationId = useMemo(() => {
    const selected = String(selectedAreaId ?? '').trim();
    if (selected) {
      const match = areaAnnotations.find((ann) => getProjectLayoutAreaId(ann) === selected);
      if (match?.id) return match.id;
    }

    if (markerAnnotation) {
      const parentArea = findSavedProjectLayoutAreaAt(
        markerAnnotation.x,
        markerAnnotation.y,
        areaAnnotations,
      );
      if (parentArea?.id) return parentArea.id;
      return markerAnnotation.id;
    }

    return '';
  }, [areaAnnotations, markerAnnotation, selectedAreaId]);

  const shouldFocusTarget = Boolean(focusAnnotationId);

  const bumpRecenterToFit = useCallback(() => {
    setRecenterToFitNonce((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (!raster) return undefined;

    const timerIds = [0, 150, 400, 800].map((ms) =>
      window.setTimeout(() => {
        bumpRecenterToFit();
      }, ms),
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [bumpRecenterToFit, focusAnnotationId, layoutImageUrl, raster, shouldFocusTarget]);

  useEffect(() => {
    const container = viewportContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width >= 16 && height >= 16) {
        bumpRecenterToFit();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [bumpRecenterToFit, layoutImageUrl]);

  const annotations = useMemo(() => {
    const list = [...areaAnnotations];
    if (markerAnnotation) list.push(markerAnnotation);
    return list;
  }, [areaAnnotations, markerAnnotation]);

  const resolveAnnotationStyle = useCallback(
    (annotation) => {
      if (annotation?.type === 'point' && annotation?.marker) {
        return { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 };
      }

      const color = String(annotation?.color ?? '').trim() || '#2563eb';
      const areaId = getProjectLayoutAreaId(annotation);
      const isSelected = Boolean(selectedAreaId && areaId === selectedAreaId);
      return {
        stroke: color,
        fill: isSelected ? `${color}66` : `${color}38`,
        strokeWidth: isSelected ? 3 : 2,
      };
    },
    [selectedAreaId],
  );

  const handleSelectedIdsChange = useCallback(
    (selectedIds) => {
      if (selectedIds.length !== 1) {
        setInfoPopoverAnnotation(null);
        return;
      }
      const annotation = areaAnnotations.find((item) => item.id === selectedIds[0]);
      if (annotation && isProjectLayoutAnnotationSaved(annotation)) {
        setInfoPopoverAnnotation(annotation);
        return;
      }
      setInfoPopoverAnnotation(null);
    },
    [areaAnnotations],
  );

  const renderAnnotationOverlay = useCallback(
    (annotation) => {
      if (annotation?.type === 'point' && annotation?.marker) {
        return <ProjectViewMarkerPinIcon color={markerColor} />;
      }

      if (!isProjectLayoutAnnotationSaved(annotation)) return null;
      return (
        <ProjectLayoutAreaInfoPopover
          annotation={annotation}
          open={infoPopoverAnnotation?.id === annotation.id}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setInfoPopoverAnnotation(null);
          }}
          anchorStyle={{ width: 1, height: 1 }}
        />
      );
    },
    [infoPopoverAnnotation?.id, markerColor],
  );

  const renderHoveredAnnotationOverlay = useCallback(
    (annotation) => {
      if (annotation?.type === 'point' && annotation?.marker) return null;
      if (!isProjectLayoutAnnotationSaved(annotation)) return null;
      if (activeTool !== TOOL_IDS.HAND) return null;
      return (
        <div className='pointer-events-none rounded-xl border border-stroke-soft-200 bg-bg-white-0/95 p-3 shadow-regular-md'>
          <ProjectLayoutAreaInfoContent annotation={annotation} />
        </div>
      );
    },
    [activeTool],
  );

  const renderToolbar = useCallback(
    (ctx) => (
      <ProjectCreateLayoutToolbar
        activeToolId={ctx.activeToolId}
        setActiveTool={ctx.setActiveTool}
        markerColor={markerColor}
        zoomPercent={ctx.zoomPercent}
        onZoomIn={ctx.onZoomIn}
        onZoomOut={ctx.onZoomOut}
        showMarkerTool={false}
      />
    ),
    [markerColor],
  );

  const handleViewportFocusApplied = useCallback(() => {
    bumpRecenterToFit();
  }, [bumpRecenterToFit]);

  if (!layoutImageUrl) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center bg-bg-weak-50 px-6 text-center text-paragraph-sm text-text-sub-600'>
        No layout image for this floor.
      </div>
    );
  }

  if (imageLoading || !raster) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        {imageError ? 'Failed to load layout image.' : 'Loading floor plan…'}
      </div>
    );
  }

  return (
    <div className='relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-bg-weak-50'>
      <div className='absolute left-3 top-3 z-30 max-w-[min(100%,280px)] rounded-lg bg-bg-white-0/95 px-3 py-2 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200'>
        <p className='truncate text-label-sm font-medium text-text-strong-950'>
          {floorLabel || layout?.floor || 'Floor layout'}
        </p>
        {layout?.subject ? (
          <p className='truncate text-paragraph-xs text-text-sub-600'>{layout.subject}</p>
        ) : null}
      </div>

      <div ref={viewportContainerRef} className='relative min-h-0 flex-1'>
        <FloorPlanEditor
          key={`${layoutImageUrl}-${raster.naturalWidth}x${raster.naturalHeight}-${focusAnnotationId}`}
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
          viewportClassName='h-full min-h-0'
          image={{
            url: raster.src,
            width: raster.naturalWidth,
            height: raster.naturalHeight,
            raster,
          }}
          annotations={annotations}
          readOnly
          listenForAnnotationHits
          showSidebar={false}
          fillViewport
          fitContentOnMount={!shouldFocusTarget}
          focusAnnotationIdOnMount={shouldFocusTarget ? focusAnnotationId : ''}
          onFocusViewportToAnnotationApplied={
            shouldFocusTarget ? handleViewportFocusApplied : undefined
          }
          focusViewportFitRatio={0.52}
          focusViewportPadding={56}
          focusViewportMaxScale={2.5}
          recenterToFitNonce={recenterToFitNonce}
          fitContentPadding={32}
          activeToolId={activeTool}
          onActiveToolChange={setActiveTool}
          toolbarEnabledToolIds={[TOOL_IDS.HAND]}
          toolbarShowUndoRedoDelete={false}
          config={{ showGrid: false }}
          resolveAnnotationStyle={resolveAnnotationStyle}
          renderAnnotationOverlay={renderAnnotationOverlay}
          renderHoveredAnnotationOverlay={renderHoveredAnnotationOverlay}
          renderToolbar={renderToolbar}
          onSelectedIdsChange={handleSelectedIdsChange}
          hoverOverlayCloseDelayMs={900}
        />
      </div>
    </div>
  );
}
