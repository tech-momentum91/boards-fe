import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { FloorPlanEditor } from '@/components/floor-plan-editor';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';
import { ProjectLayoutAreaInfoContent } from '@/components/projects/layouts/project-layout-area-info-popover';
import {
  findSavedProjectLayoutAreaAt,
  flattenProjectLayoutAreasToAnnotations,
  getProjectLayoutAreaId,
  isPointInSavedProjectLayoutAreas,
  isProjectLayoutAnnotationSaved,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import {
  PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_ID,
  PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE,
  buildGlobalLayoutDraftMarkerAnnotation,
  buildProjectGlobalLayoutTaskCreateFormData,
} from '@/components/projects/global-layout/project-global-layout-task-create-helpers';
import { taskMarkerToAnnotation } from '@/components/projects/global-layout/project-global-layout-helpers';
import { PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS } from '@/components/projects/global-layout/project-global-layout-task-icons';
import ProjectGlobalLayoutTaskCreateBar from '@/components/projects/global-layout/project-global-layout-task-create-bar';
import ProjectGlobalLayoutTaskDetailBar from '@/components/projects/global-layout/project-global-layout-task-detail-bar';
import {
  ProjectGlobalLayoutTaskMarkerIcon,
  resolveGlobalLayoutMarkerHitRadius,
} from '@/components/projects/global-layout/project-global-layout-task-marker';
import ProjectGlobalLayoutToolbar from '@/components/projects/global-layout/project-global-layout-toolbar';
import { filterTasksByGlobalLayoutStatusFilters } from '@/components/projects/global-layout/project-global-layout-status-filter-helpers';
import { projectCreateMarkerNormalizedToPixel } from '@/components/projects/shared/project-create-layout-marker-utils';
import { CanvasHoverScaleShell } from '@/pages/center/layout-annotation-space-info-popover';
import { createProjectTask } from '@/redux/projectSlice';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const DEFAULT_PLACEMENT_TASK_TYPE =
  PROJECT_GLOBAL_LAYOUT_TASK_ICON_OPTIONS[0]?.taskType ?? 'Project Tasks';

const GLOBAL_LAYOUT_AREA_INFO_WIDTH_CLASS = 'w-[min(440px,calc(100vw-1.5rem))]';

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

export default function ProjectGlobalLayoutViewer({
  projectId,
  floor,
  filterTaskType = '',
  statusFiltersByTaskType = {},
  showAreas = true,
  floorNavigation = null,
  onTaskCreated,
  onViewTask,
  onDeleteTask,
  className,
}) {
  const dispatch = useDispatch();
  const layoutId = String(floor?.layout_id ?? '').trim();
  const layoutImageUrl = resolveFileUrl(floor?.layout_image);
  const { raster, isLoading, hasError } = useLayoutRasterImage(layoutImageUrl, Boolean(floor));

  const [activeTool, setActiveTool] = useState(TOOL_IDS.HAND);
  const [placementTaskType, setPlacementTaskType] = useState(DEFAULT_PLACEMENT_TASK_TYPE);
  const [pendingCreate, setPendingCreate] = useState(null);
  const [draftMarkerAnnotation, setDraftMarkerAnnotation] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [clearSelectionNonce, setClearSelectionNonce] = useState(0);
  const [canvasScale, setCanvasScale] = useState(1);

  const areaAnnotationsRef = useRef([]);
  const pendingCreateRef = useRef(null);
  pendingCreateRef.current = pendingCreate;

  useEffect(() => {
    if (filterTaskType) {
      setPlacementTaskType(filterTaskType);
    }
  }, [filterTaskType]);

  const imageSize = useMemo(
    () => ({
      imageWidth: raster?.naturalWidth ?? 0,
      imageHeight: raster?.naturalHeight ?? 0,
    }),
    [raster?.naturalHeight, raster?.naturalWidth],
  );

  const areaAnnotations = useMemo(() => {
    const list = flattenProjectLayoutAreasToAnnotations(floor?.areas ?? [], imageSize).map(
      (annotation) => ({
        ...annotation,
        locked: true,
        saved: true,
      }),
    );
    areaAnnotationsRef.current = list;
    return list;
  }, [floor?.areas, imageSize]);

  const layoutTasks = useMemo(() => {
    const tasks = Array.isArray(floor?.tasks) ? floor.tasks : [];
    const typeFilter = String(filterTaskType ?? '').trim();
    const typeFiltered = typeFilter
      ? tasks.filter((task) => String(task.type ?? task.task_type ?? '').trim() === typeFilter)
      : tasks;

    return filterTasksByGlobalLayoutStatusFilters(typeFiltered, statusFiltersByTaskType);
  }, [filterTaskType, floor?.tasks, statusFiltersByTaskType]);

  const isTaskTypeFocusMode = Boolean(String(filterTaskType ?? '').trim());

  const taskAnnotations = useMemo(() => {
    if (!raster) return [];
    return layoutTasks
      .map((task) => taskMarkerToAnnotation(task, raster.naturalWidth, raster.naturalHeight))
      .filter(Boolean);
  }, [layoutTasks, raster]);

  const markerHitRadius = useMemo(
    () =>
      resolveGlobalLayoutMarkerHitRadius(canvasScale, {
        highlighted: isTaskTypeFocusMode,
      }),
    [canvasScale, isTaskTypeFocusMode],
  );

  const annotations = useMemo(() => {
    const list = showAreas ? [...areaAnnotations] : [];
    list.push(
      ...taskAnnotations.map((annotation) => ({ ...annotation, hitRadius: markerHitRadius })),
    );
    if (draftMarkerAnnotation) {
      list.push({ ...draftMarkerAnnotation, hitRadius: markerHitRadius });
    }
    return list;
  }, [areaAnnotations, draftMarkerAnnotation, markerHitRadius, showAreas, taskAnnotations]);

  const canvasResetKey = `${layoutId}-${layoutImageUrl}`;

  const clearDraftCreate = useCallback(() => {
    setPendingCreate(null);
    setDraftMarkerAnnotation(null);
  }, []);

  useEffect(() => {
    clearDraftCreate();
    setClearSelectionNonce((previous) => previous + 1);
  }, [clearDraftCreate, floor?.layout_id, floor?.floor, filterTaskType]);

  useEffect(() => {
    if (!pendingCreate || !placementTaskType) return;
    setDraftMarkerAnnotation(
      buildGlobalLayoutDraftMarkerAnnotation(
        pendingCreate.nx,
        pendingCreate.ny,
        placementTaskType,
        pendingCreate.areaId,
      ),
    );
  }, [pendingCreate, placementTaskType]);

  const pointAnnotationDefaults = useMemo(
    () => ({
      id: PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_ID,
      marker: true,
      suppressCanvasShape: true,
      hitRadius: markerHitRadius,
      source: PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE,
      task_type: placementTaskType,
    }),
    [markerHitRadius, placementTaskType],
  );

  const beginDraftCreate = useCallback(
    (nx, ny) => {
      if (!raster || !placementTaskType) return false;

      const parentArea = findSavedProjectLayoutAreaAt(nx, ny, areaAnnotationsRef.current);
      const areaId = parentArea ? getProjectLayoutAreaId(parentArea) : '';
      const coordinates = projectCreateMarkerNormalizedToPixel(
        nx,
        ny,
        raster.naturalWidth,
        raster.naturalHeight,
      );

      if (!coordinates) return false;

      const draft = buildGlobalLayoutDraftMarkerAnnotation(nx, ny, placementTaskType, areaId);

      setDraftMarkerAnnotation(draft);
      setPendingCreate({ nx, ny, areaId, coordinates });
      setClearSelectionNonce((previous) => previous + 1);
      return true;
    },
    [placementTaskType, raster],
  );

  const handleBeforeAnnotationAdd = useCallback(
    ({ type, nx, ny }) => {
      if (type !== 'point') return false;
      if (!placementTaskType) {
        showErrorToast('Select a task marker type first');
        return false;
      }
      if (pendingCreateRef.current) {
        showErrorToast('Finish or cancel the current task before placing another marker');
        return false;
      }
      if (!isPointInSavedProjectLayoutAreas(nx, ny, areaAnnotationsRef.current)) {
        showErrorToast('Place the marker inside an existing area');
        return false;
      }

      return beginDraftCreate(nx, ny);
    },
    [beginDraftCreate, placementTaskType],
  );

  const handleAnnotationsChange = useCallback(
    (next) => {
      if (!raster || !placementTaskType || pendingCreateRef.current) return;

      const prevIds = new Set(
        [...areaAnnotations, ...taskAnnotations, draftMarkerAnnotation]
          .filter(Boolean)
          .map((item) => item.id),
      );
      const added = next.filter((item) => !prevIds.has(item.id) && item.type === 'point');

      if (added.length === 0) return;

      const latest = added[added.length - 1];
      beginDraftCreate(latest.x, latest.y);
    },
    [
      areaAnnotations,
      beginDraftCreate,
      draftMarkerAnnotation,
      placementTaskType,
      raster,
      taskAnnotations,
    ],
  );

  const handleCancelCreate = useCallback(() => {
    clearDraftCreate();
  }, [clearDraftCreate]);

  const handleSaveCreate = useCallback(
    async (values) => {
      if (!projectId || !pendingCreate?.coordinates) return;

      setIsSavingTask(true);
      try {
        const formData = buildProjectGlobalLayoutTaskCreateFormData(
          projectId,
          values,
          pendingCreate.coordinates,
        );
        const result = await dispatch(createProjectTask(formData)).unwrap();
        showSuccessToast(result?.message ?? 'Task created successfully');
        clearDraftCreate();
        setActiveTool(TOOL_IDS.POINT);
        await onTaskCreated?.();
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to create task'));
      } finally {
        setIsSavingTask(false);
      }
    },
    [clearDraftCreate, dispatch, onTaskCreated, pendingCreate, projectId],
  );

  const resolveAnnotationStyle = useCallback(
    (annotation) => {
      if (
        annotation?.source === 'project-global-layout-task' ||
        annotation?.source === PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE
      ) {
        return { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 };
      }

      const color = String(annotation?.color ?? '').trim();
      if (!color) return undefined;

      const isHighlighted =
        pendingCreate?.areaId && getProjectLayoutAreaId(annotation) === pendingCreate.areaId;

      return {
        stroke: color,
        fill: isHighlighted ? `${color}66` : `${color}38`,
        strokeWidth: isHighlighted ? 3 : 2,
      };
    },
    [pendingCreate?.areaId],
  );

  const handleViewTaskClick = useCallback(
    (task) => {
      setClearSelectionNonce((previous) => previous + 1);
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
    if (annotation?.source === 'project-global-layout-task') return 'center';
    return 'above';
  }, []);

  const renderAnnotationOverlay = useCallback(
    (annotation, center) => {
      if (annotation?.source === PROJECT_GLOBAL_LAYOUT_DRAFT_MARKER_SOURCE) {
        const imageWidth = raster?.naturalWidth ?? 0;
        const openOnLeft = imageWidth > 0 && center?.x > imageWidth * 0.62;
        const transformOrigin = openOnLeft ? 'center right' : 'center left';

        return (
          <div className='relative h-0 w-0' style={{ zIndex: 30 }}>
            <ProjectGlobalLayoutTaskMarkerIcon
              taskType={annotation.task_type}
              highlighted={isTaskTypeFocusMode}
              canvasScale={canvasScale}
            />
            {pendingCreate ? (
              <div
                className={cn(
                  'pointer-events-auto absolute bottom-0 z-30 -translate-y-1/2',
                  openOnLeft ? 'right-4' : 'left-4',
                )}
              >
                <CanvasHoverScaleShell canvasScale={canvasScale} transformOrigin={transformOrigin}>
                  <ProjectGlobalLayoutTaskCreateBar
                    floor={floor}
                    projectId={projectId}
                    defaultAreaId={pendingCreate.areaId}
                    taskType={placementTaskType}
                    isSaving={isSavingTask}
                    onCancel={handleCancelCreate}
                    onSave={handleSaveCreate}
                    className='shadow-regular-lg'
                  />
                </CanvasHoverScaleShell>
              </div>
            ) : null}
          </div>
        );
      }

      if (annotation?.source === 'project-global-layout-task') {
        return (
          <ProjectGlobalLayoutTaskMarkerIcon
            taskType={annotation.task_type}
            highlighted={isTaskTypeFocusMode}
            canvasScale={canvasScale}
          />
        );
      }

      return null;
    },
    [
      canvasScale,
      floor,
      handleCancelCreate,
      handleSaveCreate,
      isSavingTask,
      isTaskTypeFocusMode,
      pendingCreate,
      placementTaskType,
      raster?.naturalWidth,
    ],
  );

  const renderSelectedAnnotationOverlay = useCallback(
    (annotation, center, overlayContext) => {
      if (pendingCreate) return null;

      const canvasScale = overlayContext?.canvasScale ?? 1;

      if (annotation?.source === 'project-global-layout-task' && annotation.task) {
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
            <CanvasHoverScaleShell canvasScale={canvasScale} transformOrigin={transformOrigin}>
              <ProjectGlobalLayoutTaskDetailBar
                task={annotation.task}
                floor={floor}
                onView={handleViewTaskClick}
                onDelete={handleDeleteTaskClick}
                className='shadow-regular-lg'
              />
            </CanvasHoverScaleShell>
          </div>
        );
      }

      if (showAreas && isProjectLayoutAnnotationSaved(annotation)) {
        return (
          <CanvasHoverScaleShell canvasScale={canvasScale}>
            <div
              className={cn(
                'pointer-events-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0/95 p-4 shadow-regular-md',
                GLOBAL_LAYOUT_AREA_INFO_WIDTH_CLASS,
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
      floor,
      handleViewTaskClick,
      handleDeleteTaskClick,
      pendingCreate,
      raster?.naturalWidth,
      showAreas,
    ],
  );

  const handleViewStateChange = useCallback((viewState) => {
    const nextScale = Math.max(Number(viewState?.scale) || 1, 0.05);
    setCanvasScale((previous) => (previous === nextScale ? previous : nextScale));
  }, []);

  const renderToolbar = useCallback(
    (ctx) => (
      <ProjectGlobalLayoutToolbar
        activeToolId={ctx.activeToolId}
        setActiveTool={ctx.setActiveTool}
        placementTaskType={placementTaskType}
        onPlacementTaskTypeChange={setPlacementTaskType}
        zoomPercent={ctx.zoomPercent}
        onZoomIn={ctx.onZoomIn}
        onZoomOut={ctx.onZoomOut}
        floorNavigation={floorNavigation}
      />
    ),
    [floorNavigation, placementTaskType],
  );

  const renderStandaloneToolbar = useCallback(
    () => (
      <ProjectGlobalLayoutToolbar
        activeToolId={activeTool}
        setActiveTool={setActiveTool}
        placementTaskType={placementTaskType}
        onPlacementTaskTypeChange={setPlacementTaskType}
        zoomPercent={Math.round(canvasScale * 100)}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        floorNavigation={floorNavigation}
      />
    ),
    [activeTool, canvasScale, floorNavigation, placementTaskType],
  );

  const hasLayoutImage = Boolean(layoutImageUrl);
  const canRenderCanvas = hasLayoutImage && Boolean(raster) && !hasError;

  const emptyStateMessage = useMemo(() => {
    if (!hasLayoutImage) {
      const floorLabel = String(floor?.floor ?? '').trim();
      return floorLabel
        ? `No layout image uploaded for ${floorLabel}. Use the floor controls below to view other floors.`
        : 'No layout image available for this floor.';
    }
    if (hasError) return 'Failed to load layout image.';
    if (isLoading || !raster) return 'Loading layout image…';
    return '';
  }, [floor?.floor, hasError, hasLayoutImage, isLoading, raster]);

  if (!canRenderCanvas) {
    return (
      <div
        className={cn(
          'relative h-full min-h-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50',
          className,
        )}
      >
        <div className='flex h-full min-h-0 items-center justify-center px-6 pb-20 text-center text-paragraph-sm text-text-sub-500'>
          {emptyStateMessage}
        </div>
        {renderStandaloneToolbar()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-full min-h-0 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50',
        className,
      )}
    >
      <FloorPlanEditor
        key={canvasResetKey}
        layoutId={layoutId}
        className='h-full min-h-0 flex-1'
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
        onViewStateChange={handleViewStateChange}
        resetKey={canvasResetKey}
        fillViewport
        fitContentOnMount
        showSidebar={false}
        readOnly={false}
        activeToolId={activeTool}
        onActiveToolChange={setActiveTool}
        clearSelectionOnBackgroundClick
        clearSelectionNonce={clearSelectionNonce}
        toolbarEnabledToolIds={[TOOL_IDS.HAND, TOOL_IDS.SELECT, TOOL_IDS.POINT]}
        toolbarShowUndoRedoDelete={false}
        pointAnnotationDefaults={pointAnnotationDefaults}
        renderToolbar={renderToolbar}
        renderAnnotationOverlay={renderAnnotationOverlay}
        renderSelectedAnnotationOverlay={renderSelectedAnnotationOverlay}
        resolveSelectedOverlayPlacement={resolveSelectedOverlayPlacement}
        resolveAnnotationStyle={resolveAnnotationStyle}
        layoutImageDimmed={isTaskTypeFocusMode}
      />
    </div>
  );
}
