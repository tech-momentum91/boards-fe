import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiExpandDiagonalLine, RiStackLine } from 'react-icons/ri';
import { useDispatch, useSelector } from 'react-redux';
import * as Button from '@/components/ui/button';
import { FloorPlanEditor } from '@/components/floor-plan-editor';
import { TOOL_IDS } from '@/components/floor-plan-editor/types/index.js';
import ProjectLayoutAddAreaModal from '@/components/projects/layouts/project-layout-add-area-modal';
import { ProjectLayoutAreaInfoContent } from '@/components/projects/layouts/project-layout-area-info-popover';
import ProjectLayoutFloorToolbar from '@/components/projects/layouts/project-layout-floor-toolbar';
import ProjectLayoutUploadVersionButton from '@/components/projects/layouts/project-layout-upload-version-button';
import { CanvasHoverScaleShell } from '@/pages/center/layout-annotation-space-info-popover';
import {
  buildEditLayoutAreaPayload,
  buildProjectLayoutEditorUrl,
  buildSaveLayoutAreasPayload,
  flattenProjectLayoutAreasToAnnotations,
  getProjectLayoutAreaBoundaryGeometrySignature,
  getProjectLayoutAreaCoordinatesSignature,
  getProjectLayoutAreaId,
  isProjectLayoutAnnotationSaved,
  isProjectLayoutAreaBoundaryCandidate,
  isProjectLayoutDraftArea,
  projectLayoutAreaBoundaryOverlapsAny,
} from '@/components/projects/layouts/project-layout-annotation-helpers';
import * as CompactButton from '@/components/ui/compact-button';
import {
  createProjectLayoutAreasThunk,
  deleteProjectLayoutAreaThunk,
  editProjectLayoutAreaThunk,
  selectProjectLayoutAreaMutationLoading,
} from '@/redux/projectSlice';
import { resolveFileUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';
import { extractErrorMessage, showErrorToast, showSuccessToast } from '@/utils/error-utils';

const LAYOUT_AREA_INFO_WIDTH_CLASS = 'w-[min(280px,calc(100vw-1.5rem))]';
const FLOOR_LAYOUT_ENABLED_TOOLS = [
  TOOL_IDS.SELECT,
  TOOL_IDS.PEN,
  TOOL_IDS.RECTANGLE,
  TOOL_IDS.CIRCLE,
];

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

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setRaster(null);

    const img = new Image();
    const onLoad = () => {
      if (cancelled) return;
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
      if (cancelled) return;
      setRaster(null);
      setHasError(true);
      setIsLoading(false);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = imageUrl;

    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [enabled, imageUrl]);

  return { raster, isLoading, hasError };
}

export default function ProjectLayoutFloorEditor({
  layout,
  projectId,
  onLayoutRefresh,
  showExpand = true,
  className,
  minHeightClassName,
  fillContainer = false,
  readOnly = false,
  allowUpload = false,
  floorUploadBlockedMessage = '',
}) {
  const dispatch = useDispatch();
  const isSavingArea = useSelector(selectProjectLayoutAreaMutationLoading);
  const containerClassName = fillContainer
    ? cn('h-full min-h-0', minHeightClassName)
    : cn('min-h-[420px]', minHeightClassName);
  const layoutId = String(layout?.name ?? layout?.id ?? '').trim();
  const layoutImageUrl = resolveFileUrl(layout?.layout_image);
  const { raster, isLoading, hasError } = useLayoutRasterImage(layoutImageUrl, Boolean(layout));

  const [annotations, setAnnotations] = useState([]);
  const [activeTool, setActiveTool] = useState(TOOL_IDS.SELECT);
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);

  const lastSyncedCoordsRef = useRef({});
  const editTimersRef = useRef({});
  const isRefreshingRef = useRef(false);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const canvasResetKey = `${layoutId}-${layoutImageUrl}`;

  const imageSize = useMemo(
    () => ({
      imageWidth: raster?.naturalWidth ?? 0,
      imageHeight: raster?.naturalHeight ?? 0,
    }),
    [raster?.naturalHeight, raster?.naturalWidth],
  );

  const seedAnnotations = useMemo(
    () => flattenProjectLayoutAreasToAnnotations(layout?.areas, imageSize),
    [imageSize, layout?.areas],
  );

  useEffect(() => {
    if (!raster) return;

    isRefreshingRef.current = true;
    setAnnotations(seedAnnotations);

    const nextSignatures = {};
    seedAnnotations.forEach((annotation) => {
      if (!isProjectLayoutAnnotationSaved(annotation)) return;
      const areaId = getProjectLayoutAreaId(annotation);
      nextSignatures[areaId] = getProjectLayoutAreaCoordinatesSignature(
        annotation,
        raster.naturalWidth,
        raster.naturalHeight,
      );
    });
    lastSyncedCoordsRef.current = nextSignatures;
    isRefreshingRef.current = false;
  }, [raster, seedAnnotations, layoutId, layoutImageUrl]);

  useEffect(
    () => () => {
      Object.values(editTimersRef.current).forEach((timerId) => clearTimeout(timerId));
    },
    [],
  );

  const handleExpand = () => {
    const url = buildProjectLayoutEditorUrl(projectId, layoutId);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openAddAreaModal = useCallback((annotation) => {
    setSelectedAnnotation(annotation);
    setIsAddAreaModalOpen(true);
  }, []);

  const scheduleAreaEdit = useCallback(
    (annotation) => {
      if (readOnly || !raster || isRefreshingRef.current) return;
      if (!isProjectLayoutAnnotationSaved(annotation)) return;

      const areaId = getProjectLayoutAreaId(annotation);
      if (!areaId) return;

      const signature = getProjectLayoutAreaCoordinatesSignature(
        annotation,
        raster.naturalWidth,
        raster.naturalHeight,
      );

      if (lastSyncedCoordsRef.current[areaId] === signature) return;

      if (editTimersRef.current[areaId]) {
        clearTimeout(editTimersRef.current[areaId]);
      }

      editTimersRef.current[areaId] = setTimeout(async () => {
        try {
          const payload = buildEditLayoutAreaPayload(
            annotation,
            raster.naturalWidth,
            raster.naturalHeight,
          );
          await dispatch(editProjectLayoutAreaThunk(payload)).unwrap();
          lastSyncedCoordsRef.current[areaId] = signature;
          await onLayoutRefresh?.();
        } catch (error) {
          showErrorToast(extractErrorMessage(error, 'Failed to update layout area'));
        }
      }, 700);
    },
    [dispatch, onLayoutRefresh, raster, readOnly],
  );

  const handleAnnotationsChange = useCallback(
    (next, meta) => {
      if (meta?.kind === 'undo' || meta?.kind === 'redo') {
        setAnnotations(next);
        return true;
      }

      const prev = annotationsRef.current;
      const prevById = new Map(prev.map((item) => [item.id, item]));
      const prevIds = new Set(prev.map((item) => item.id));
      const added = next.filter((item) => !prevIds.has(item.id));

      for (const item of added) {
        if (!isProjectLayoutAreaBoundaryCandidate(item)) continue;
        if (projectLayoutAreaBoundaryOverlapsAny(item, next)) {
          showErrorToast('This shape overlaps an existing area. Draw in an empty region.');
          return false;
        }
      }

      for (const item of next) {
        if (!isProjectLayoutAreaBoundaryCandidate(item)) continue;
        const previous = prevById.get(item.id);
        if (!previous) continue;
        if (
          getProjectLayoutAreaBoundaryGeometrySignature(item) ===
          getProjectLayoutAreaBoundaryGeometrySignature(previous)
        ) {
          continue;
        }
        if (projectLayoutAreaBoundaryOverlapsAny(item, next)) {
          showErrorToast('This shape overlaps an existing area. Adjust within empty space.');
          return false;
        }
      }

      const merged = next;

      setAnnotations(merged);
      if (readOnly || isRefreshingRef.current || !raster) return true;
      merged.filter(isProjectLayoutAnnotationSaved).forEach(scheduleAreaEdit);
      return true;
    },
    [raster, readOnly, scheduleAreaEdit],
  );

  const handleRequestDeleteSelected = useCallback(
    (annotation) => {
      if (readOnly) return true;

      if (!isProjectLayoutAnnotationSaved(annotation)) {
        return false;
      }

      const areaId = getProjectLayoutAreaId(annotation);
      if (!areaId) return false;

      setAnnotations((prev) => prev.filter((item) => item.id !== annotation.id));

      delete lastSyncedCoordsRef.current[areaId];
      if (editTimersRef.current[areaId]) {
        clearTimeout(editTimersRef.current[areaId]);
        delete editTimersRef.current[areaId];
      }

      void (async () => {
        try {
          await dispatch(deleteProjectLayoutAreaThunk(areaId)).unwrap();
        } catch (error) {
          showErrorToast(extractErrorMessage(error, 'Failed to delete layout area'));
          await onLayoutRefresh?.();
        }
      })();

      return true;
    },
    [dispatch, onLayoutRefresh, readOnly],
  );

  const handleBeforeAnnotationAdd = useCallback(({ type }) => {
    // Floor layout is areas-only; task pins belong on Global Layout.
    if (type === 'point') return false;
    return true;
  }, []);

  const handleSaveArea = useCallback(
    async (formValues) => {
      if (!layoutId || !selectedAnnotation || !raster) return;

      try {
        const savedCount = annotations.filter(isProjectLayoutAnnotationSaved).length;
        const payload = buildSaveLayoutAreasPayload(
          layoutId,
          selectedAnnotation,
          formValues,
          raster.naturalWidth,
          raster.naturalHeight,
          savedCount,
        );

        await dispatch(createProjectLayoutAreasThunk(payload)).unwrap();
        showSuccessToast('Area saved successfully');
        setIsAddAreaModalOpen(false);
        setSelectedAnnotation(null);
        await onLayoutRefresh?.();
      } catch (error) {
        showErrorToast(extractErrorMessage(error, 'Failed to save layout area'));
      }
    },
    [annotations, dispatch, layoutId, onLayoutRefresh, raster, selectedAnnotation],
  );

  const handleViewStateChange = useCallback((viewState) => {
    const nextScale = Math.max(Number(viewState?.scale) || 1, 0.05);
    setCanvasScale((previous) => (previous === nextScale ? previous : nextScale));
  }, []);

  const resolveSelectedOverlayPlacement = useCallback((annotation) => {
    if (isProjectLayoutAnnotationSaved(annotation)) return 'above';
    return 'center';
  }, []);

  const renderSelectedAnnotationOverlay = useCallback(
    (annotation) => {
      if (!isProjectLayoutAnnotationSaved(annotation)) return null;

      return (
        <CanvasHoverScaleShell canvasScale={canvasScale}>
          <div
            className={cn(
              'pointer-events-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0/95 p-4 shadow-regular-md',
              LAYOUT_AREA_INFO_WIDTH_CLASS,
            )}
          >
            <ProjectLayoutAreaInfoContent annotation={annotation} />
          </div>
        </CanvasHoverScaleShell>
      );
    },
    [canvasScale],
  );

  const renderAnnotationOverlay = useCallback(
    (annotation) => {
      if (!isProjectLayoutDraftArea(annotation) || readOnly) return null;

      return (
        <div
          className='pointer-events-auto'
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Button.Root
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              openAddAreaModal(annotation);
            }}
            variant='primary'
            mode='filled'
            size='xsmall'
            className='gap-1'
          >
            <Button.Icon as={RiAddLine} />
            Add
          </Button.Root>
        </div>
      );
    },
    [openAddAreaModal, readOnly],
  );

  const resolveAnnotationStyle = useCallback((annotation) => {
    const color = String(annotation?.color ?? '').trim();
    if (!color) return undefined;
    return {
      stroke: color,
      fill: `${color}38`,
    };
  }, []);

  const renderToolbar = useCallback(
    (ctx) => (
      <ProjectLayoutFloorToolbar
        activeToolId={ctx.activeToolId}
        setActiveTool={ctx.setActiveTool}
        zoomPercent={ctx.zoomPercent}
        onZoomIn={ctx.onZoomIn}
        onZoomOut={ctx.onZoomOut}
        readOnly={ctx.readOnly}
        draftPoints={ctx.draftPoints}
        draftKind={ctx.draftKind}
        draftClosed={ctx.draftClosed}
        onFinishPath={ctx.onFinishPath}
        canUndo={ctx.canUndo}
        canRedo={ctx.canRedo}
        onUndo={ctx.undo}
        onRedo={ctx.redo}
      />
    ),
    [],
  );

  if (!layoutImageUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-6 text-center',
          containerClassName,
          className,
        )}
      >
        <div className='flex flex-col items-center gap-4 text-text-soft-400'>
          <RiStackLine className='size-10 text-text-soft-300' />
          {floorUploadBlockedMessage ? (
            <p className='max-w-md text-paragraph-sm text-text-sub-500'>
              {floorUploadBlockedMessage}
            </p>
          ) : (
            <p className='text-paragraph-sm text-text-sub-500'>No layout image uploaded yet.</p>
          )}
          {allowUpload && !readOnly && !floorUploadBlockedMessage ? (
            <ProjectLayoutUploadVersionButton
              layoutId={layoutId}
              onUploaded={onLayoutRefresh}
              isFirstUpload
              variant='primary'
              mode='filled'
              className='min-w-[160px]'
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (isLoading || !raster) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-500',
          containerClassName,
          className,
        )}
      >
        {hasError ? 'Failed to load layout image.' : 'Loading layout image…'}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50',
          containerClassName,
          className,
        )}
      >
        {showExpand ? (
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='medium'
            className='absolute right-3 top-3 z-30 bg-bg-white-0/90 shadow-regular-xs'
            aria-label='Open layout editor in new tab'
            onClick={handleExpand}
          >
            <CompactButton.Icon as={RiExpandDiagonalLine} />
          </CompactButton.Root>
        ) : null}

        <FloorPlanEditor
          key={`${layoutId}-${layoutImageUrl}`}
          layoutId={layoutId}
          className={cn('h-full min-h-0', fillContainer && 'flex-1')}
          viewportClassName={fillContainer ? 'h-full min-h-0' : undefined}
          image={{
            url: raster.src,
            width: raster.naturalWidth,
            height: raster.naturalHeight,
            raster,
          }}
          annotations={annotations}
          onChange={handleAnnotationsChange}
          onRequestDeleteSelected={handleRequestDeleteSelected}
          resetKey={canvasResetKey}
          fitContentOnMount
          showSidebar={false}
          readOnly={readOnly}
          activeToolId={activeTool}
          onActiveToolChange={setActiveTool}
          onViewStateChange={handleViewStateChange}
          clearSelectionOnBackgroundClick
          toolbarEnabledToolIds={FLOOR_LAYOUT_ENABLED_TOOLS}
          onBeforeAnnotationAdd={handleBeforeAnnotationAdd}
          renderToolbar={renderToolbar}
          renderAnnotationOverlay={renderAnnotationOverlay}
          renderSelectedAnnotationOverlay={renderSelectedAnnotationOverlay}
          resolveSelectedOverlayPlacement={resolveSelectedOverlayPlacement}
          resolveAnnotationStyle={resolveAnnotationStyle}
        />
      </div>

      <ProjectLayoutAddAreaModal
        open={isAddAreaModalOpen}
        onOpenChange={(nextOpen) => {
          setIsAddAreaModalOpen(nextOpen);
          if (!nextOpen) setSelectedAnnotation(null);
        }}
        onSave={handleSaveArea}
        isSaving={isSavingArea}
      />
    </>
  );
}
