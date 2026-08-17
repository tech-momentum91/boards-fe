import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { BOQ_ER_LAYOUT_AREA_COLOR } from '@/components/boq/shared/boq-er-estimation-areas-utils';
import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { taskMarkerToAnnotation } from '@/components/projects/global-layout/project-global-layout-helpers';
import ProjectGlobalLayoutTaskDetailBar from '@/components/projects/global-layout/project-global-layout-task-detail-bar';
import {
  ProjectGlobalLayoutTaskMarkerIcon,
  resolveGlobalLayoutMarkerHitRadius,
} from '@/components/projects/global-layout/project-global-layout-task-marker';
import { ProjectLayoutAreaInfoContent } from '@/components/projects/layouts/project-layout-area-info-popover';
import {
  flattenProjectLayoutAreasToAnnotations,
  isProjectLayoutAnnotationSaved,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import { CanvasHoverScaleShell } from '@/pages/center/layout-annotation-space-info-popover';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';

const ER_LAYOUT_AREA_STYLE = {
  stroke: BOQ_ER_LAYOUT_AREA_COLOR,
  fill: `${BOQ_ER_LAYOUT_AREA_COLOR}38`,
  strokeWidth: 2,
  dash: [8, 6],
};

const ER_LAYOUT_AREA_INFO_WIDTH_CLASS = 'w-[min(280px,calc(100vw-1.5rem))]';
const PROJECT_GLOBAL_LAYOUT_TASK_SOURCE = 'project-global-layout-task';

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

const BoqErEstimationLayoutView = ({
  className = '',
  floorLayout = null,
  isLoading = false,
  floorLabel = '',
  /** When set, only markers of this task type are shown (e.g. "3D Tasks" / "GFC Tasks"). */
  taskTypeFilter = '',
  /**
   * When true, selecting a matching task marker opens the gallery via `onTaskMarkerClick`
   * instead of the task detail bar.
   */
  openGalleryOnMarkerClick = false,
  onLayoutAreaSelect,
  onTaskMarkerClick,
  onViewTask,
  onDeleteTask,
}) => {
  const [activeTool, setActiveTool] = useState(
    openGalleryOnMarkerClick ? TOOL_IDS.SELECT : TOOL_IDS.HAND,
  );
  const [isViewportSettled, setIsViewportSettled] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [clearSelectionNonce, setClearSelectionNonce] = useState(0);

  const layoutImageUrl = resolveFileUrl(floorLayout?.layout_image);
  const {
    raster,
    isLoading: imageLoading,
    hasError: imageError,
  } = useLayoutRasterImage(layoutImageUrl, Boolean(layoutImageUrl));

  const imageSize = useMemo(
    () => ({
      imageWidth: raster?.naturalWidth ?? 0,
      imageHeight: raster?.naturalHeight ?? 0,
    }),
    [raster?.naturalHeight, raster?.naturalWidth],
  );

  const areaAnnotations = useMemo(
    () =>
      flattenProjectLayoutAreasToAnnotations(floorLayout?.areas, imageSize).map((annotation) => ({
        ...annotation,
        color: BOQ_ER_LAYOUT_AREA_COLOR,
        locked: true,
        visible: true,
        saved: true,
      })),
    [floorLayout?.areas, imageSize],
  );

  const normalizedTaskTypeFilter = String(taskTypeFilter ?? '').trim();

  const taskAnnotations = useMemo(() => {
    if (!raster) return [];
    return (Array.isArray(floorLayout?.tasks) ? floorLayout.tasks : [])
      .filter((task) => {
        if (!normalizedTaskTypeFilter) return true;
        const taskType = String(task?.type ?? task?.task_type ?? '').trim();
        return taskType === normalizedTaskTypeFilter;
      })
      .map((task) => taskMarkerToAnnotation(task, raster.naturalWidth, raster.naturalHeight))
      .filter(Boolean);
  }, [floorLayout?.tasks, normalizedTaskTypeFilter, raster]);

  const markerHitRadius = useMemo(
    () => resolveGlobalLayoutMarkerHitRadius(canvasScale),
    [canvasScale],
  );

  const annotations = useMemo(
    () => [
      ...areaAnnotations,
      ...taskAnnotations.map((annotation) => ({
        ...annotation,
        hitRadius: markerHitRadius,
      })),
    ],
    [areaAnnotations, markerHitRadius, taskAnnotations],
  );

  const imageProp = useMemo(() => {
    if (!raster || !layoutImageUrl) return null;
    return {
      url: layoutImageUrl,
      raster,
      width: raster.naturalWidth,
      height: raster.naturalHeight,
    };
  }, [layoutImageUrl, raster]);

  useEffect(() => {
    setIsViewportSettled(false);
    setClearSelectionNonce((previous) => previous + 1);
    setActiveTool(openGalleryOnMarkerClick ? TOOL_IDS.SELECT : TOOL_IDS.HAND);
    if (!imageProp) return undefined;

    const timerId = window.setTimeout(() => {
      setIsViewportSettled(true);
    }, 400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [imageProp, floorLayout?.layout_id, floorLayout?.floor, openGalleryOnMarkerClick]);

  const handleActiveToolChange = useCallback((nextTool) => {
    setActiveTool(nextTool);
  }, []);

  const handleViewStateChange = useCallback((viewState) => {
    const nextScale = Math.max(Number(viewState?.scale) || 1, 0.05);
    setCanvasScale((previous) => (previous === nextScale ? previous : nextScale));
  }, []);

  const resolveAnnotationStyle = useCallback((annotation) => {
    if (annotation?.source === PROJECT_GLOBAL_LAYOUT_TASK_SOURCE || annotation?.marker) {
      return {};
    }
    return ER_LAYOUT_AREA_STYLE;
  }, []);

  const isSelectTool = activeTool === TOOL_IDS.SELECT;

  const handleAnnotationSelect = useCallback(
    (annotation) => {
      if (!isSelectTool || !annotation) return;

      const isTaskMarker =
        annotation?.source === PROJECT_GLOBAL_LAYOUT_TASK_SOURCE || Boolean(annotation?.marker);

      if (openGalleryOnMarkerClick && isTaskMarker && annotation.task) {
        onTaskMarkerClick?.(annotation.task);
        setClearSelectionNonce((previous) => previous + 1);
        return;
      }

      onLayoutAreaSelect?.(annotation);
    },
    [isSelectTool, onLayoutAreaSelect, onTaskMarkerClick, openGalleryOnMarkerClick],
  );

  const handleViewTaskClick = useCallback(
    (task) => {
      onViewTask?.(task);
    },
    [onViewTask],
  );

  const handleDeleteTaskClick = useCallback(
    async (task) => {
      const deleted = await onDeleteTask?.(task);
      if (deleted) {
        setClearSelectionNonce((previous) => previous + 1);
      }
    },
    [onDeleteTask],
  );

  const resolveSelectedOverlayPlacement = useCallback((annotation) => {
    if (annotation?.source === PROJECT_GLOBAL_LAYOUT_TASK_SOURCE) return 'center';
    return 'above';
  }, []);

  const renderAnnotationOverlay = useCallback(
    (annotation) => {
      if (annotation?.source !== PROJECT_GLOBAL_LAYOUT_TASK_SOURCE) return null;

      return (
        <ProjectGlobalLayoutTaskMarkerIcon
          taskType={annotation.task_type}
          canvasScale={canvasScale}
        />
      );
    },
    [canvasScale],
  );

  const renderSelectedAnnotationOverlay = useCallback(
    (annotation, center, overlayContext) => {
      if (!isSelectTool || !annotation) return null;

      const scale = overlayContext?.canvasScale ?? canvasScale;

      if (annotation?.source === PROJECT_GLOBAL_LAYOUT_TASK_SOURCE && annotation.task) {
        if (openGalleryOnMarkerClick) return null;

        const imageWidth = raster?.naturalWidth ?? 0;
        const openOnLeft = imageWidth > 0 && center?.x > imageWidth * 0.62;
        const transformOrigin = openOnLeft ? 'center right' : 'center left';

        return (
          <div
            className={cn(
              'pointer-events-auto absolute bottom-0 z-30 -translate-y-1/2',
              openOnLeft ? 'right-4' : 'left-4',
            )}
          >
            <CanvasHoverScaleShell canvasScale={scale} transformOrigin={transformOrigin}>
              <ProjectGlobalLayoutTaskDetailBar
                task={annotation.task}
                floor={floorLayout}
                onView={handleViewTaskClick}
                onDelete={handleDeleteTaskClick}
                className='shadow-regular-lg'
              />
            </CanvasHoverScaleShell>
          </div>
        );
      }

      if (isProjectLayoutAnnotationSaved(annotation)) {
        return (
          <CanvasHoverScaleShell canvasScale={scale}>
            <div
              className={cn(
                'pointer-events-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0/95 p-4 shadow-regular-md',
                ER_LAYOUT_AREA_INFO_WIDTH_CLASS,
              )}
            >
              <ProjectLayoutAreaInfoContent annotation={annotation} />
            </div>
          </CanvasHoverScaleShell>
        );
      }

      return null;
    },
    [
      canvasScale,
      floorLayout,
      handleDeleteTaskClick,
      handleViewTaskClick,
      isSelectTool,
      openGalleryOnMarkerClick,
      raster?.naturalWidth,
    ],
  );

  if (!layoutImageUrl && !isLoading) {
    return (
      <div
        className={`flex h-full min-h-0 items-center justify-center bg-bg-weak-100 px-6 text-center text-paragraph-sm text-text-sub-600 ${className}`}
      >
        {floorLabel ? `No layout image for ${floorLabel}.` : 'No layout image for this floor.'}
      </div>
    );
  }

  const showLoadingOverlay = isLoading || imageLoading || !imageProp;

  return (
    <div className={`relative h-full min-h-0 w-full ${className}`}>
      {imageProp ? (
        <div
          className={cn(
            'h-full transition-opacity duration-200',
            !isViewportSettled && 'pointer-events-none opacity-0',
          )}
        >
          <FloorPlanEditor
            key={`${layoutImageUrl}-${floorLayout?.layout_id ?? floorLabel}`}
            image={imageProp}
            annotations={annotations}
            onChange={() => {}}
            readOnly
            toolbarToolsInteractive
            showSidebar={false}
            fitContentOnMount
            fillViewport
            fitContentMode='cover'
            fitContentPadding={0}
            activeToolId={activeTool}
            onActiveToolChange={handleActiveToolChange}
            onViewStateChange={handleViewStateChange}
            toolbarEnabledToolIds={[TOOL_IDS.SELECT, TOOL_IDS.HAND]}
            toolbarShowUndoRedoDelete={false}
            toolbarPanelClassName='border-stroke-soft-200 bg-bg-white-0 shadow-md backdrop-blur-none dark:border-stroke-soft-200 dark:bg-bg-white-0'
            config={{ showGrid: false }}
            canvasListening
            listenForAnnotationHits={isSelectTool}
            clearSelectionOnBackgroundClick
            clearSelectionNonce={clearSelectionNonce}
            onAnnotationSelect={handleAnnotationSelect}
            resolveAnnotationStyle={resolveAnnotationStyle}
            renderAnnotationOverlay={renderAnnotationOverlay}
            renderSelectedAnnotationOverlay={renderSelectedAnnotationOverlay}
            resolveSelectedOverlayPlacement={resolveSelectedOverlayPlacement}
            className='h-full min-h-0 w-full flex-1 gap-0 lg:flex-col'
          />
        </div>
      ) : null}

      {showLoadingOverlay && !imageError ? (
        <div className='absolute inset-0 flex items-center justify-center bg-bg-weak-100 text-paragraph-sm text-text-sub-600'>
          Loading floor plan…
        </div>
      ) : null}

      {imageError ? (
        <div className='absolute inset-0 flex items-center justify-center bg-bg-weak-100 text-paragraph-sm text-text-sub-600'>
          Failed to load layout image.
        </div>
      ) : null}
    </div>
  );
};

export default memo(BoqErEstimationLayoutView);
