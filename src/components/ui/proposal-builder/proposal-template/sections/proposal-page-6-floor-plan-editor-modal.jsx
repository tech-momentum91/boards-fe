import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiPencilLine } from 'react-icons/ri';

import { FloorPlanEditor, TOOL_IDS } from '@/components/floor-plan-editor';
import { flattenLayoutShapesToAnnotations } from '@/utils/layout-annotation-space';
import { buildLayoutAnnotationSpaceFilterOptions } from '@/utils/layout-annotation-filter-utils';
import { LAYOUT_FILTER_ALL } from '@/constants/layout/center-filter-constants';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';
import ProposalPage6FloorPlanEditorFilters from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-editor-filters';
import ProposalPage6FloorPlanViewportFrameOverlay from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-viewport-frame-overlay';
import { renderProposalFloorPlanToDataUrl } from '@/components/ui/proposal-builder/proposal-template/sections/proposal-floor-plan-canvas-renderer';
import {
  PROPOSAL_CUSTOM_ANNOTATION_SOURCE,
  computeEditorTransformForViewportInProposalFrame,
  computeEditorTransformToFitImageInProposalFrame,
  computeProposalPage6FrameRect,
  computeVisibleImageViewportFromEditorFrame,
  filterProposalSystemAnnotations,
  hydrateProposalCustomAnnotations,
  mergeProposalFloorPlanAnnotations,
  normalizeProposalFloorPlanEditorSettings,
  resolveProposalCustomAnnotationStyle,
  resolveProposalFloorPlanAnnotationStyle,
  serializeProposalCustomAnnotations,
} from '@/components/ui/proposal-builder/proposal-template/sections/proposal-page-6-floor-plan-utils';

const DRAW_TOOL_IDS = [
  TOOL_IDS.SELECT,
  TOOL_IDS.HAND,
  TOOL_IDS.RECTANGLE,
  TOOL_IDS.CIRCLE,
  TOOL_IDS.PEN,
];

const VIEWPORT_TOOL_IDS = [TOOL_IDS.HAND];

/** @typedef {'edit' | 'frame'} EditorStep */

/**
 * Modal editor for proposal page 6 floor plan — edit highlights, then frame step on save.
 */
export default function ProposalPage6FloorPlanEditorModal({
  open,
  onOpenChange,
  imageProp = null,
  layoutDetail = null,
  initialAnnotations = [],
  initialEditorSettings = null,
  floorGroup = null,
  layoutImagePath = '',
  onSave,
}) {
  const canvasContainerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const viewStateRef = useRef(null);
  const viewportTransformTokenRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draftAnnotations, setDraftAnnotations] = useState([]);
  const [draftViewport, setDraftViewport] = useState(null);
  const [editorSettings, setEditorSettings] = useState(() =>
    normalizeProposalFloorPlanEditorSettings(initialEditorSettings),
  );
  /** @type {[EditorStep, React.Dispatch<React.SetStateAction<EditorStep>>]} */
  const [step, setStep] = useState('edit');
  const [activeToolId, setActiveToolId] = useState(TOOL_IDS.SELECT);
  const [viewportTransformToken, setViewportTransformToken] = useState(0);

  const isFrameStep = step === 'frame';

  const normalizedInitialSettings = useMemo(
    () => normalizeProposalFloorPlanEditorSettings(initialEditorSettings),
    [initialEditorSettings],
  );

  useEffect(() => {
    if (!open) return;
    setDraftAnnotations(hydrateProposalCustomAnnotations(initialAnnotations));
    setEditorSettings(normalizedInitialSettings);
    setDraftViewport(normalizedInitialSettings.viewport);
    setStep('edit');
    setActiveToolId(TOOL_IDS.SELECT);
    setViewportTransformToken(0);
    viewportTransformTokenRef.current = 0;
  }, [initialAnnotations, normalizedInitialSettings, open]);

  const handleCanvasContainerRef = useCallback((node) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    canvasContainerRef.current = node;

    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ width, height });
      }
    });
    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  useEffect(() => {
    if (!open) {
      setCanvasSize({ width: 0, height: 0 });
    }
  }, [open]);

  useEffect(
    () => () => {
      resizeObserverRef.current?.disconnect();
    },
    [],
  );

  const layoutAnnotations = useMemo(() => {
    if (!layoutDetail) return [];
    return flattenLayoutShapesToAnnotations(layoutDetail).map((ann) => ({
      ...ann,
      locked: true,
      visible: true,
    }));
  }, [layoutDetail]);

  const spaceOptions = useMemo(
    () => buildLayoutAnnotationSpaceFilterOptions(layoutAnnotations),
    [layoutAnnotations],
  );

  const systemAnnotations = useMemo(
    () => filterProposalSystemAnnotations(layoutAnnotations, floorGroup, editorSettings),
    [editorSettings, floorGroup, layoutAnnotations],
  );

  const systemAnnotationIds = useMemo(
    () => new Set(systemAnnotations.map((ann) => ann.id)),
    [systemAnnotations],
  );

  const editorAnnotations = useMemo(
    () => mergeProposalFloorPlanAnnotations(systemAnnotations, draftAnnotations),
    [draftAnnotations, systemAnnotations],
  );

  const proposalFrameRect = useMemo(
    () => computeProposalPage6FrameRect(canvasSize.width, canvasSize.height, 32),
    [canvasSize.height, canvasSize.width],
  );

  const viewportModeTransform = useMemo(() => {
    if (!isFrameStep || !canvasSize.width || !imageProp?.width) {
      return null;
    }

    if (draftViewport) {
      return computeEditorTransformForViewportInProposalFrame({
        containerWidth: canvasSize.width,
        containerHeight: canvasSize.height,
        imageWidth: imageProp.width,
        imageHeight: imageProp.height,
        viewport: draftViewport,
        margin: 32,
      });
    }

    return computeEditorTransformToFitImageInProposalFrame({
      containerWidth: canvasSize.width,
      containerHeight: canvasSize.height,
      imageWidth: imageProp.width,
      imageHeight: imageProp.height,
      margin: 32,
    });
  }, [
    canvasSize.height,
    canvasSize.width,
    draftViewport,
    imageProp?.height,
    imageProp?.width,
    isFrameStep,
  ]);

  const handleAnnotationsChange = useCallback(
    (next) => {
      const customOnly = (Array.isArray(next) ? next : [])
        .filter((ann) => !systemAnnotationIds.has(ann?.id))
        .map((ann) => ({
          ...ann,
          source: PROPOSAL_CUSTOM_ANNOTATION_SOURCE,
          locked: false,
        }));
      setDraftAnnotations(hydrateProposalCustomAnnotations(customOnly));
    },
    [systemAnnotationIds],
  );

  const resolveAnnotationStyle = useCallback((ann) => {
    if (ann?.source === PROPOSAL_CUSTOM_ANNOTATION_SOURCE) {
      return resolveProposalCustomAnnotationStyle();
    }
    return resolveProposalFloorPlanAnnotationStyle(ann);
  }, []);

  const updateEditorSettings = useCallback((patch) => {
    setEditorSettings((prev) => normalizeProposalFloorPlanEditorSettings({ ...prev, ...patch }));
  }, []);

  const handleRequestDeleteSelected = useCallback(
    (ann) => {
      if (!ann?.id || ann.source === PROPOSAL_CUSTOM_ANNOTATION_SOURCE) {
        return false;
      }
      if (!layoutAnnotations.some((row) => row.id === ann.id)) {
        return false;
      }
      updateEditorSettings({
        excludedAnnotationIds: [
          ...new Set([...(editorSettings.excludedAnnotationIds || []), ann.id]),
        ],
      });
      return true;
    },
    [editorSettings.excludedAnnotationIds, layoutAnnotations, updateEditorSettings],
  );

  const handleViewStateChange = useCallback((next) => {
    viewStateRef.current = next;
  }, []);

  const bumpViewportTransform = useCallback(() => {
    viewportTransformTokenRef.current += 1;
    setViewportTransformToken(viewportTransformTokenRef.current);
  }, []);

  const handleProceedToFrameStep = useCallback(() => {
    setStep('frame');
    setActiveToolId(TOOL_IDS.HAND);
    bumpViewportTransform();
  }, [bumpViewportTransform]);

  const handleBackToEdit = useCallback(() => {
    setStep('edit');
    setActiveToolId(TOOL_IDS.SELECT);
    bumpViewportTransform();
  }, [bumpViewportTransform]);

  const captureViewportFromFrame = useCallback(() => {
    const frame = proposalFrameRect;
    const viewState = viewStateRef.current;
    if (!frame || !viewState || !imageProp?.width || !imageProp?.height) {
      return draftViewport;
    }

    return computeVisibleImageViewportFromEditorFrame({
      frameX: frame.x,
      frameY: frame.y,
      frameWidth: frame.width,
      frameHeight: frame.height,
      imageWidth: imageProp.width,
      imageHeight: imageProp.height,
      positionX: viewState.x,
      positionY: viewState.y,
      scale: viewState.scale,
    });
  }, [draftViewport, imageProp?.height, imageProp?.width, proposalFrameRect]);

  const commitSave = useCallback(
    (viewport) => {
      const customAnnotations = serializeProposalCustomAnnotations(draftAnnotations);

      const nextEditorSettings = normalizeProposalFloorPlanEditorSettings({
        ...editorSettings,
        viewport,
      });

      const customAnnotationMeta = floorGroup?.centerId
        ? {
            centerId: floorGroup.centerId,
            floor: floorGroup.floor,
            layoutImagePath,
          }
        : null;

      const mergedAnnotations = mergeProposalFloorPlanAnnotations(
        systemAnnotations,
        customAnnotations,
      );

      let compositionImage = null;
      if (imageProp?.raster) {
        compositionImage = renderProposalFloorPlanToDataUrl({
          image: imageProp.raster,
          annotations: mergedAnnotations,
          viewport: nextEditorSettings.viewport,
        });
      }

      onSave?.({
        customAnnotations,
        customAnnotationMeta,
        editorSettings: nextEditorSettings,
        compositionImage,
      });
      onOpenChange(false);
    },
    [
      draftAnnotations,
      editorSettings,
      floorGroup,
      imageProp,
      layoutImagePath,
      onOpenChange,
      onSave,
      systemAnnotations,
    ],
  );

  const handleSkipFrameAndSave = useCallback(() => {
    commitSave(draftViewport);
  }, [commitSave, draftViewport]);

  const handleSaveWithAdjustedFrame = useCallback(() => {
    commitSave(captureViewportFromFrame());
  }, [captureViewportFromFrame, commitSave]);

  const editorSceneKey = `${layoutImagePath}-${floorGroup?.centerId}-${floorGroup?.floor}-${step}-${viewportTransformToken}`;

  const editorInitialView = useMemo(() => {
    if (!isFrameStep || !viewportModeTransform) return undefined;
    return {
      x: viewportModeTransform.x,
      y: viewportModeTransform.y,
      scale: viewportModeTransform.scale,
    };
  }, [isFrameStep, viewportModeTransform]);

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className={cn(
          'flex max-h-[min(96vh,1200px)] max-w-[min(100vw-1rem,80rem)] flex-col overflow-hidden',
        )}
      >
        <Modal.Header
          title={isFrameStep ? 'Adjust proposal frame' : 'Edit floor plan highlights'}
          description={
            isFrameStep
              ? 'Pan and zoom inside the frame to set how this floor plan appears on proposal page 6.'
              : 'Choose spaces to show and draw custom regions.'
          }
          icon={RiPencilLine}
        />

        <Modal.Body className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-2'>
          {!isFrameStep ? (
            <ProposalPage6FloorPlanEditorFilters
              spaceTypes={editorSettings.spaceTypes}
              spaceRef={editorSettings.spaceRef}
              spaceOptions={spaceOptions}
              onSpaceTypesChange={(spaceTypes) => updateEditorSettings({ spaceTypes })}
              onSpaceRefChange={(spaceRef) =>
                updateEditorSettings({
                  spaceRef: spaceRef === LAYOUT_FILTER_ALL ? '' : spaceRef,
                })
              }
            />
          ) : (
            <p className='text-paragraph-sm text-text-sub-600'>
              The highlighted area matches the proposal page layout.{' '}
              <span className='font-medium text-text-sub-700'>Skip</span> keeps the current crop
              {draftViewport ? '' : ' (auto-fit on the proposal)'}.{' '}
              <span className='font-medium text-text-sub-700'>Save highlights</span> uses the frame
              you set now.
            </p>
          )}

          {imageProp?.raster ? (
            <div
              className='relative flex min-h-[min(60vh,720px)] flex-col overflow-hidden'
              aria-label='Floor plan annotation canvas'
            >
              <FloorPlanEditor
                key={editorSceneKey}
                image={imageProp}
                annotations={editorAnnotations}
                onChange={handleAnnotationsChange}
                onRequestDeleteSelected={handleRequestDeleteSelected}
                showSidebar={false}
                fitContentOnMount={!isFrameStep}
                fillViewport
                fitContentPadding={32}
                defaultViewState={editorInitialView}
                onViewStateChange={handleViewStateChange}
                onCanvasContainerRef={handleCanvasContainerRef}
                activeToolId={activeToolId}
                onActiveToolChange={setActiveToolId}
                toolbarEnabledToolIds={isFrameStep ? VIEWPORT_TOOL_IDS : DRAW_TOOL_IDS}
                toolbarShowUndoRedoDelete={!isFrameStep}
                config={{ showGrid: false }}
                resolveAnnotationStyle={resolveAnnotationStyle}
                className='h-full min-h-0 flex-1 gap-0 lg:flex-col'
              />

              {isFrameStep ? (
                <ProposalPage6FloorPlanViewportFrameOverlay frameRect={proposalFrameRect} />
              ) : null}
            </div>
          ) : (
            <p className='text-paragraph-sm text-text-sub-500'>
              Floor plan image is not available for this center.
            </p>
          )}
        </Modal.Body>

        <Modal.Footer className='relative z-20 justify-end gap-2 bg-bg-white-0'>
          {isFrameStep ? (
            <>
              <Button.Root type='button' variant='neutral' mode='stroke' onClick={handleBackToEdit}>
                Back
              </Button.Root>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={handleSkipFrameAndSave}
              >
                Skip
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                onClick={handleSaveWithAdjustedFrame}
              >
                Save highlights
              </Button.Root>
            </>
          ) : (
            <>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button.Root>
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                disabled={!imageProp?.raster}
                onClick={handleProceedToFrameStep}
              >
                Save highlights
              </Button.Root>
            </>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
