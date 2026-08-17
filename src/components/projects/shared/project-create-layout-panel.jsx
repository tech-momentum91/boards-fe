import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCloseLine, RiMapPinFill } from 'react-icons/ri';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import ProjectLayoutAreaInfoPopover, {
  ProjectLayoutAreaInfoContent,
} from '@/components/projects/layouts/project-layout-area-info-popover';
import {
  findSavedProjectLayoutAreaAt,
  flattenProjectLayoutAreasToAnnotations,
  getProjectLayoutAreaId,
  isPointInSavedProjectLayoutAreas,
  isProjectLayoutAnnotationSaved,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import ProjectCreateLayoutToolbar from '@/components/projects/shared/project-create-layout-toolbar';
import {
  PROJECT_CREATE_TASK_MARKER_ID,
  projectCreateMarkerNormalizedToPixel,
  projectCreateMarkerPixelToAnnotation,
} from '@/components/projects/shared/project-create-layout-marker-utils';
import * as CompactButton from '@/components/ui/compact-button';
import { resolveFileUrl } from '@/lib/utils';
import { showErrorToast } from '@/utils/error-utils';

const PROJECT_CREATE_MARKER_ICON_SIZE = 40;

function ProjectCreateMarkerPinIcon({ color = '#6E3FF3' }) {
  return (
    <div className='pointer-events-none relative h-0 w-0'>
      <RiMapPinFill
        size={PROJECT_CREATE_MARKER_ICON_SIZE}
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
 * Project task create layout panel — floor plan with highlighted areas and marker placement.
 *
 * @param {{
 *   layout?: object | null,
 *   selectedAreaId?: string,
 *   floorLabel?: string,
 *   markerColor?: string,
 *   markerCoordinates?: { x?: number, y?: number } | null,
 *   onMarkerChange?: (payload: { coordinates: { x: number, y: number }, areaId: string } | null) => void,
 *   isLoading?: boolean,
 *   error?: string | null,
 *   onClose?: () => void,
 * }} props
 */
export default function ProjectCreateLayoutPanel({
  layout = null,
  selectedAreaId = '',
  floorLabel = '',
  markerColor = '#6E3FF3',
  markerCoordinates = null,
  onMarkerChange,
  isLoading = false,
  error = null,
  onClose,
}) {
  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [recenterToFitNonce, setRecenterToFitNonce] = useState(0);
  const [infoPopoverAnnotation, setInfoPopoverAnnotation] = useState(null);
  const [markAnnotations, setMarkAnnotations] = useState([]);
  const areaAnnotationsRef = useRef([]);

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
    const list = flattenProjectLayoutAreasToAnnotations(layout?.areas, imageSize).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
    areaAnnotationsRef.current = list;
    return list;
  }, [imageSize, layout?.areas]);

  const focusAnnotationId = useMemo(() => {
    const selected = String(selectedAreaId ?? '').trim();
    if (!selected) return '';
    const match = areaAnnotations.find((ann) => getProjectLayoutAreaId(ann) === selected);
    return match?.id ?? '';
  }, [areaAnnotations, selectedAreaId]);

  useEffect(() => {
    if (!raster) return;
    const markerAnn = projectCreateMarkerPixelToAnnotation(
      markerCoordinates,
      raster.naturalWidth,
      raster.naturalHeight,
    );
    if (!markerAnn) {
      setMarkAnnotations([]);
      return;
    }
    setMarkAnnotations([
      {
        ...markerAnn,
        color: markerColor,
        hitRadius: 24,
      },
    ]);
  }, [markerColor, markerCoordinates, raster]);

  useEffect(() => {
    if (!raster || focusAnnotationId) return undefined;
    const timerIds = [0, 150, 400].map((ms) =>
      window.setTimeout(() => {
        setRecenterToFitNonce((previous) => previous + 1);
      }, ms),
    );
    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [focusAnnotationId, layoutImageUrl, raster]);

  const annotations = useMemo(() => {
    const list = [...areaAnnotations, ...markAnnotations];
    return list;
  }, [areaAnnotations, markAnnotations]);

  const pointAnnotationDefaults = useMemo(
    () => ({
      color: markerColor,
      marker: true,
      suppressCanvasShape: true,
      source: 'project-create-task-marker',
    }),
    [markerColor],
  );

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

  const handleBeforeAnnotationAdd = useCallback(({ type, nx, ny }) => {
    if (type !== 'point') return false;
    const allowed = isPointInSavedProjectLayoutAreas(nx, ny, areaAnnotationsRef.current);
    if (!allowed) {
      showErrorToast(null, { defaultMessage: 'Place the marker inside a highlighted area.' });
    }
    return allowed;
  }, []);

  const handleAnnotationsChange = useCallback(
    (next) => {
      if (!raster) return;

      const nextList = Array.isArray(next) ? next : [];
      const pointAnns = nextList.filter((ann) => ann?.type === 'point' && ann?.marker);

      if (pointAnns.length === 0) {
        setMarkAnnotations([]);
        onMarkerChange?.(null);
        return;
      }

      const latest = pointAnns[pointAnns.length - 1];
      const parentArea = findSavedProjectLayoutAreaAt(
        latest.x,
        latest.y,
        areaAnnotationsRef.current,
      );
      const areaId = parentArea ? getProjectLayoutAreaId(parentArea) : '';
      const coordinates = projectCreateMarkerNormalizedToPixel(
        latest.x,
        latest.y,
        raster.naturalWidth,
        raster.naturalHeight,
      );

      if (!coordinates) {
        onMarkerChange?.(null);
        return;
      }

      setMarkAnnotations([
        {
          ...latest,
          id: PROJECT_CREATE_TASK_MARKER_ID,
          color: markerColor,
          suppressCanvasShape: true,
          hitRadius: 24,
          area_ref: areaId,
        },
      ]);

      onMarkerChange?.({ coordinates, areaId });
    },
    [markerColor, onMarkerChange, raster],
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
        return <ProjectCreateMarkerPinIcon color={markerColor} />;
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
      />
    ),
    [markerColor],
  );

  if (isLoading && !layout) {
    return (
      <div className='flex h-full min-h-[480px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        Loading floor layout…
      </div>
    );
  }

  if (error && !layout) {
    return (
      <div className='flex h-full min-h-[480px] flex-1 flex-col items-center justify-center gap-3 bg-bg-weak-50 px-6 text-center'>
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

  if (!layoutImageUrl) {
    return (
      <div className='flex h-full min-h-[480px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        No layout image for this floor.
      </div>
    );
  }

  if (imageLoading || !raster) {
    return (
      <div className='flex h-full min-h-[480px] flex-1 items-center justify-center bg-bg-weak-50 text-paragraph-sm text-text-sub-600'>
        {imageError ? 'Failed to load layout image.' : 'Loading floor plan…'}
      </div>
    );
  }

  return (
    <div className='relative flex h-full min-h-0 min-w-0 flex-1 flex-col border-l border-stroke-soft-200 bg-bg-weak-50'>
      <div className='absolute left-3 top-3 z-30 max-w-[min(100%,280px)] rounded-lg bg-bg-white-0/95 px-3 py-2 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200'>
        <p className='truncate text-label-sm font-medium text-text-strong-950'>
          {floorLabel || layout?.floor || 'Floor layout'}
        </p>
        {layout?.subject ? (
          <p className='truncate text-paragraph-xs text-text-sub-600'>{layout.subject}</p>
        ) : null}
      </div>

      <div className='absolute right-3 top-3 z-30'>
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

      <div className='relative min-h-0 flex-1'>
        <FloorPlanEditor
          key={`${layoutImageUrl}-${raster.naturalWidth}x${raster.naturalHeight}`}
          className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
          viewportClassName='h-full min-h-0'
          image={{
            url: raster.src,
            width: raster.naturalWidth,
            height: raster.naturalHeight,
            raster,
          }}
          annotations={annotations}
          onChange={handleAnnotationsChange}
          onBeforeAnnotationAdd={handleBeforeAnnotationAdd}
          readOnly={false}
          listenForAnnotationHits
          showSidebar={false}
          fillViewport
          fitContentOnMount
          recenterToFitNonce={recenterToFitNonce}
          fitContentPadding={32}
          activeToolId={activeTool}
          onActiveToolChange={setActiveTool}
          toolbarEnabledToolIds={[TOOL_IDS.HAND, TOOL_IDS.POINT]}
          toolbarShowUndoRedoDelete={false}
          pointAnnotationDefaults={pointAnnotationDefaults}
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
