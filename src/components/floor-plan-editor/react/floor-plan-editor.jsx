import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import { cn } from '@/utils/cn';

import {
  CLIENT_SUBSPACE_SLOT_SOURCE,
  DESK_COWORKER_MARKER,
  SERVER_SUBSPACE_PIN_SOURCE,
} from '@/constants/layout/annotation-sources';

import {
  annotationGroup,
  annotationMatchesAvailabilityFilters,
  deriveInventoryGroups,
} from '../core/inventory-group.js';
import { toggleSelection } from '../core/selection.js';
import { DEFAULT_EDITOR_CONFIG, TOOL_IDS } from '../types/index.js';
import { useFloorPlanAnnotations } from '../hooks/use-floor-plan-annotations.js';
import { useBezierDrawing } from '../hooks/use-bezier-drawing.js';
import { distanceNormPx } from '../core/geometry.js';
import {
  computeAnnotationCenter,
  computeAnnotationViewportTransform,
} from '../core/annotation-bounds.js';
import { fitImageToContainer, fitImageToContainerCover } from '../core/viewport.js';
import {
  CLOSE_DISTANCE_PX,
  EditorCanvas,
  isCanvasBackgroundTarget,
  isShapeDrawingSurfaceTarget,
  pointerToNormalizedFromEvent,
} from './editor-canvas.jsx';
import { SubSpaceFocusFrame } from './sub-space-focus-frame.jsx';
import { DefaultFloorPlanToolbar } from './ui/default-toolbar.jsx';
import { DefaultFloorPlanSidebar } from './ui/default-sidebar.jsx';

/**
 * Zoom-with-scroll only while ⌘ (Mac) or Ctrl (Win/Linux) is held — matches Figma.
 * Library syncs Meta/Control onto pressed-keys state from wheel events (syncModifierKeys).
 *
 * @param {string[]} pressedKeyNames
 */
function isCmdOrCtrlZoomWheelActive(pressedKeyNames) {
  return pressedKeyNames.includes('Meta') || pressedKeyNames.includes('Control');
}

/**
 * @param {import('react-zoom-pan-pinch').ReactZoomPanPinchRef | null | undefined} transformRef
 * @param {HTMLElement | null | undefined} containerEl
 * @returns {{ w: number, h: number } | null}
 */
function resolveTransformViewportSize(transformRef, containerEl) {
  const wrapper = transformRef?.instance?.wrapperComponent;
  if (wrapper && wrapper.clientWidth >= 16 && wrapper.clientHeight >= 16) {
    return { w: wrapper.clientWidth, h: wrapper.clientHeight };
  }
  if (containerEl && containerEl.clientWidth >= 16 && containerEl.clientHeight >= 16) {
    return { w: containerEl.clientWidth, h: containerEl.clientHeight };
  }
  return null;
}

/**
 * Zoom/pan so the full annotation bbox is visible, centered in the transform viewport.
 *
 * @param {object} args
 * @returns {boolean} true if transform was applied
 */
function applyZoomToAnnotationViewport(args) {
  const {
    transformRef,
    containerEl,
    ann,
    imageWidth,
    imageHeight,
    config,
    fitRatio,
    maxScale,
    durationMs,
    padding = 48,
    panOffsetX = 0,
    panOffsetY = 0,
    maxScaleRelativeToImageFit = 0,
  } = args;
  if (!transformRef?.setTransform) return false;

  const viewport = resolveTransformViewportSize(transformRef, containerEl);
  if (!viewport) return false;

  const scaleCap =
    typeof maxScale === 'number' && Number.isFinite(maxScale) && maxScale > 0
      ? Math.min(maxScale, config.maxZoom)
      : config.maxZoom;

  const view = computeAnnotationViewportTransform({
    ann,
    imageW: imageWidth,
    imageH: imageHeight,
    viewportW: viewport.w,
    viewportH: viewport.h,
    fitRatio,
    padding,
    minZoom: config.minZoom,
    maxZoom: scaleCap,
    maxScaleRelativeToImageFit,
  });
  if (!view) return false;

  transformRef.setTransform(
    view.x + panOffsetX,
    view.y + panOffsetY,
    view.scale,
    durationMs ?? 380,
    'easeOut',
  );
  return true;
}

/**
 * Fit the full floor image inside the transform wrapper (centered, with padding).
 *
 * @param {object} args
 * @returns {boolean}
 */
function applyFitImageToViewport(args) {
  const {
    transformRef,
    containerEl,
    imageWidth,
    imageHeight,
    config,
    padding = 24,
    fitMode = 'contain',
  } = args;
  if (!transformRef?.setTransform || !imageWidth || !imageHeight) return false;

  const viewport = resolveTransformViewportSize(transformRef, containerEl);
  if (!viewport) return false;

  const fitArgs = {
    containerW: viewport.w,
    containerH: viewport.h,
    imageW: imageWidth,
    imageH: imageHeight,
    padding,
  };
  const { x, y, scale } =
    fitMode === 'cover' ? fitImageToContainerCover(fitArgs) : fitImageToContainer(fitArgs);
  const clampedScale = Math.min(Math.max(scale, config.minZoom), config.maxZoom);
  transformRef.setTransform(x, y, clampedScale, 0);
  return true;
}

/**
 * Domain-agnostic floor plan editor (Konva). Redux-free; host supplies persistence & association UI.
 *
 * @param {object} props
 * @param {{ url?: string, width?: number, height?: number, raster?: HTMLImageElement }} props.image
 * @param {object[]} [props.annotations]
 * @param {(next: object[], meta?: object) => void} [props.onChange]
 * @param {object[]} [props.defaultAnnotations]
 * @param {(next: object[], meta?: object) => void} [props.onAnnotationsChange]
 * @param {string | number} [props.resetKey]
 * @param {{ x: number, y: number, scale: number }} [props.viewState]
 * @param {(v: object) => void} [props.onViewStateChange]
 * @param {(annotationId: string, annotation: object) => void} [props.onAssociate]
 * @param {(associationId: string) => string | undefined} [props.resolveAssociationLabel]
 * @param {(ctx: object) => React.ReactNode} [props.renderToolbar]
 * @param {(ctx: object) => React.ReactNode} [props.topSlot] renders above default toolbar (ignored when renderToolbar is set)
 * @param {(ctx: object) => React.ReactNode} [props.toolbarTrailingActions]
 *   Contextual actions appended to the right of the default toolbar (after a
 *   divider). Ignored when `renderToolbar` is set. Use this in place of
 *   `topSlot` so save/close/selection buttons live inside the toolbar.
 * @param {(ctx: object) => React.ReactNode} [props.renderSidebar]
 * @param {object} [props.config]
 * @param {boolean} [props.readOnly]
 * @param {(ann: object) => { fill?: string, stroke?: string, dash?: number[] }} [props.resolveAnnotationStyle]
 * @param {(ctx: { type: string, nx: number, ny: number, clientX?: number, clientY?: number }) => boolean | void} [props.onBeforeAnnotationAdd]
 * @param {import('react').ReactNode} [props.maskShape] optional Konva overlay (e.g. spotlight mask) drawn above the floor image
 * @param {boolean} [props.maskReplacesBaseImage] when true with maskShape, hide the sharp base raster (spotlight provides floor image)
 * @param {string | null} [props.focusDimAnnotationId] when set, dims other annotations (Konva opacity) like a single-space focus
 * @param {string | null} [props.pendingAnnotationSource] annotations with this `source` render on a top Konva Layer (e.g. sub-space draft)
 * @param {(ann: object) => boolean} [props.extraCanvasAnnotationFilter] when set, annotations must pass this in addition to sidebar availability filters
 * @param {boolean} [props.layoutImageDimmed] when true, blurs/dims the floor plan image while keeping HTML overlays sharp
 * @param {boolean} [props.allowSubSpacePinTransform] allow Transformer on locked rectangle server sub-space pins (edit mode)
 * @param {(annotation: object) => boolean | void} [props.onRequestDeleteSelected] return true if host handled delete (e.g. API), skip local removal
 * @param {(annotation: object, pixelCenter: {x: number, y: number}, overlaySchedule?: { canvasScale?: number }) => React.ReactNode} [props.renderAnnotationOverlay] render an HTML overlay at each annotation's center
 * @param {(annotation: object, pixelCenter: {x: number, y: number}, hoverSchedule?: { cancelClose?: () => void, scheduleClose?: () => void, dismissHoverNow?: () => void }) => React.ReactNode} [props.renderHoveredAnnotationOverlay] optional overlay while pointer hovers an annotation (e.g. space summary). `hoverSchedule` keeps the overlay open while the pointer moves into portaled UI.
 * @param {(annotation: object, pixelCenter: {x: number, y: number}, overlayContext?: { canvasScale?: number }) => React.ReactNode} [props.renderSelectedAnnotationOverlay] optional overlay while an annotation is the sole selected one (e.g. click-triggered detail popover).
 * @param {(annotation: object) => 'above' | 'center'} [props.resolveSelectedOverlayPlacement] anchor placement for selected overlay (`above` = default popover above marker, `center` = centered on marker).
 * @param {boolean} [props.clearSelectionOnBackgroundClick] when true, clicking empty canvas clears selection while using the hand tool.
 * @param {number} [props.clearSelectionNonce] increment to programmatically clear canvas selection.
 * @param {(id: string, label: string) => void} [props.onRenameAnnotation] called after local rename so host can persist to backend
 * @param {string} [props.className]
 * @param {boolean} [props.fitContentOnMount] zoom so the full floor image fits the viewport (no custom viewState)
 * @param {(el: HTMLElement | null) => void} [props.onCanvasContainerRef] called with the pan/zoom viewport element
 * @param {string} [props.layoutId] saved Layout document id/name for sidebar AI analyze
 * @param {boolean} [props.listenForAnnotationHits] when read-only, still allow hover/click on shapes (no drag unless select tool)
 * @param {(annotation: object) => void} [props.onAnnotationSelect] optional callback when user clicks an annotation (read-only pickers)
 * @param {string} [props.focusAnnotationIdOnMount] zoom to this annotation once (same math as sidebar hover); skips fitContentOnMount on first layout
 * @param {{ annotationId: string, requestId: number } | null} [props.focusViewportToAnnotationRequest] when requestId changes, zoom to annotation (runtime)
 * @param {number} [props.focusViewportFitRatio] max fraction of viewport the bbox may fill (default 0.4)
 * @param {number} [props.focusViewportPadding] edge padding in px when focusing an annotation (default 48)
 * @param {number} [props.focusViewportMaxScale] optional upper bound for focus zoom scale (avoids over-zoom on small shapes)
 * @param {number} [props.focusViewportMaxScaleRelativeToImageFit] cap zoom as a multiple of full-image fit scale (0 = off)
 * @param {{ x?: number, y?: number }} [props.focusViewportPanOffset] optional pixel nudge after centering on annotation
 * @param {() => void} [props.onFocusViewportToAnnotationApplied] called after zoom animation (~400ms)
 * @param {number} [props.recenterToFitNonce] increment to refit full image in viewport
 * @param {number} [props.fitContentPadding] padding in px when fitting image on mount (default 24)
 * @param {'contain' | 'cover'} [props.fitContentMode] contain = full image visible; cover = fill viewport
 * @param {boolean} [props.fillViewport] when true, editor canvas fills parent height instead of min 70vh
 * @param {string[]} [props.toolbarEnabledToolIds] if set, only these tools appear in the default toolbar
 * @param {boolean} [props.toolbarShowUndoRedoDelete]
 * @param {boolean} [props.toolbarToolsInteractive] when true with readOnly, tool buttons stay clickable (e.g. Dot in client preview)
 * @param {string} [props.toolbarPanelClassName] optional class overrides for the default toolbar glass panel
 * @param {{ annotationId: string, title: string, inventoryType?: string } | null} [props.subSpaceFocusFrame] border + title tab for sub-space mode (host renders Save/Close in viewport chrome)
 * @param {(selectedIds: string[]) => void} [props.onSelectedIdsChange] called when canvas/sidebar selection changes
 * @param {{ color?: string, marker?: boolean } | undefined} [props.pointAnnotationDefaults] merged into new point/dot annotations
 */
export default function FloorPlanEditor({
  image: imageProp,
  annotations: annotationsControlled,
  onChange,
  defaultAnnotations,
  onAnnotationsChange,
  resetKey,
  stageRef,
  viewState,
  defaultViewState,
  onViewStateChange,
  onAssociate: _onAssociate,
  resolveAssociationLabel,
  renderToolbar,
  topSlot,
  toolbarTrailingActions,
  renderSidebar,
  config: userConfig,
  readOnly = false,
  resolveAnnotationStyle,
  onRequestDeleteSelected,
  renderAnnotationOverlay,
  renderHoveredAnnotationOverlay,
  renderSelectedAnnotationOverlay,
  resolveSelectedOverlayPlacement,
  clearSelectionOnBackgroundClick = false,
  clearSelectionNonce = 0,
  onRenameAnnotation,
  className,
  activeToolId: activeToolControlled,
  onActiveToolChange,
  onReorderAnnotations,
  showSidebar = true,
  fitContentOnMount = false,
  layoutId = '',
  listenForAnnotationHits = false,
  onAnnotationSelect,
  focusAnnotationIdOnMount = '',
  focusViewportToAnnotationRequest = null,
  focusViewportFitRatio = 0.4,
  focusViewportPadding = 48,
  focusViewportMaxScale,
  focusViewportMaxScaleRelativeToImageFit = 0,
  focusViewportPanOffset = null,
  onFocusViewportToAnnotationApplied,
  recenterToFitNonce = 0,
  fitContentPadding = 24,
  fitContentMode = 'contain',
  fillViewport = false,
  onCanvasContainerRef,
  canvasListening = undefined,
  toolbarEnabledToolIds = null,
  toolbarShowUndoRedoDelete = true,
  toolbarToolsInteractive = false,
  toolbarPanelClassName,
  onBeforeAnnotationAdd,
  maskShape,
  maskReplacesBaseImage = false,
  focusDimAnnotationId = null,
  pendingAnnotationSource = null,
  extraCanvasAnnotationFilter = null,
  focusDimBrightIds = null,
  layoutImageDimmed = false,
  allowSubSpacePinTransform = false,
  hoverOverlayCloseDelayMs = 520,
  hoverOverlayZIndex = 14,
  selectedOverlayZIndex,
  subSpaceFocusFrame = null,
  onSelectedIdsChange,
  pointAnnotationDefaults,
}) {
  const isToolEnabledInToolbar = useCallback(
    (toolId) => {
      if (!Array.isArray(toolbarEnabledToolIds) || toolbarEnabledToolIds.length === 0) return true;
      return toolbarEnabledToolIds.includes(toolId);
    },
    [toolbarEnabledToolIds],
  );
  const config = useMemo(() => ({ ...DEFAULT_EDITOR_CONFIG, ...userConfig }), [userConfig]);

  const hasFocusViewportRequest = Boolean(
    focusViewportToAnnotationRequest?.annotationId?.trim() &&
    typeof focusViewportToAnnotationRequest?.requestId === 'number',
  );

  const containerRef = useRef(null);
  const assignContainerRef = useCallback(
    (node) => {
      containerRef.current = node;
      onCanvasContainerRef?.(node);
    },
    [onCanvasContainerRef],
  );
  const transformRef = useRef(null);
  const imageNodeRef = useRef(null);
  const rectRef = useRef(null);
  const transformerRef = useRef(null);
  const lastPointerDownRef = useRef(0);
  const rectCommitLockRef = useRef(false);
  const lastShapeCommitSigRef = useRef('');
  const lastShapeCommitAtRef = useRef(0);

  const [raster, setRaster] = useState(null);
  const [naturalW, setNaturalW] = useState(imageProp?.width || 0);
  const [naturalH, setNaturalH] = useState(imageProp?.height || 0);

  useEffect(() => {
    let cancelled = false;

    if (imageProp?.raster && imageProp.raster.complete && imageProp.raster.naturalWidth) {
      setRaster(imageProp.raster);
      setNaturalW(imageProp.raster.naturalWidth);
      setNaturalH(imageProp.raster.naturalHeight);
      return undefined;
    }
    if (!imageProp?.url) {
      setRaster(null);
      setNaturalW(0);
      setNaturalH(0);
      return undefined;
    }
    const img = new Image();
    // Do not set crossOrigin by default: cookie-auth file URLs on the API host and
    // some S3 objects fail with crossOrigin 'anonymous' when CORS headers are missing.
    const onLoad = () => {
      if (cancelled) return;
      setRaster(img);
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
    };
    const onErr = () => {
      if (cancelled) return;
      setRaster(null);
      setNaturalW(0);
      setNaturalH(0);
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onErr);
    img.src = imageProp.url;
    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
  }, [imageProp?.url, imageProp?.raster]);

  const imageWidth = naturalW || imageProp?.width || 0;
  const imageHeight = naturalH || imageProp?.height || 0;

  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    toggleVisibility,
    toggleLock,
    toggleGroupVisibility,
    reorderAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFloorPlanAnnotations({
    annotations: annotationsControlled,
    defaultAnnotations,
    onChange,
    onAnnotationsChange,
    resetKey,
    maxHistory: config.maxHistory,
  });

  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const [zoomPercent, setZoomPercent] = useState(100);

  const initialView = viewState ?? defaultViewState;
  const transformMountKey = `${resetKey ?? imageProp?.url ?? 'default'}-${imageWidth}x${imageHeight}`;

  const handleTransform = useCallback(
    (_ref, state) => {
      setZoomPercent(Math.round(state.scale * 100));
      onViewStateChange?.({
        x: state.positionX,
        y: state.positionY,
        scale: state.scale,
      });
    },
    [onViewStateChange],
  );

  useLayoutEffect(() => {
    if (
      !fitContentOnMount ||
      initialView ||
      !imageWidth ||
      !imageHeight ||
      focusAnnotationIdOnMount ||
      hasFocusViewportRequest
    ) {
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 48;
    const fit = () => {
      if (cancelled || attempts++ >= maxAttempts) return;
      const ref = transformRef.current;
      if (!ref?.setTransform) {
        requestAnimationFrame(fit);
        return;
      }
      const applied = applyFitImageToViewport({
        transformRef: ref,
        containerEl: containerRef.current,
        imageWidth,
        imageHeight,
        config,
        padding: fitContentPadding,
        fitMode: fitContentMode,
      });
      if (!applied) requestAnimationFrame(fit);
    };
    const id = requestAnimationFrame(fit);
    const retryTimers = [120, 350, 700, 1200, 2000].map((ms) =>
      window.setTimeout(() => {
        if (cancelled) return;
        applyFitImageToViewport({
          transformRef: transformRef.current,
          containerEl: containerRef.current,
          imageWidth,
          imageHeight,
          config,
          padding: fitContentPadding,
          fitMode: fitContentMode,
        });
      }, ms),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      retryTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    fitContentOnMount,
    fitContentPadding,
    fitContentMode,
    initialView,
    imageWidth,
    imageHeight,
    transformMountKey,
    config.minZoom,
    config.maxZoom,
    focusAnnotationIdOnMount,
    hasFocusViewportRequest,
  ]);

  const zoomFocusAppliedRef = useRef('');

  useLayoutEffect(() => {
    if (!focusAnnotationIdOnMount || fitContentOnMount) return undefined;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 64;

    const applyZoomToAnnotation = () => {
      if (cancelled || attempts++ >= maxAttempts) return;
      const ann = annotations.find((a) => a.id === focusAnnotationIdOnMount);
      if (!ann) {
        requestAnimationFrame(applyZoomToAnnotation);
        return;
      }
      const ref = transformRef.current;
      const container = containerRef.current;
      if (
        !ref?.setTransform ||
        !container ||
        container.clientWidth < 16 ||
        container.clientHeight < 16
      ) {
        requestAnimationFrame(applyZoomToAnnotation);
        return;
      }

      const sessionKey = `${transformMountKey}:${focusAnnotationIdOnMount}`;
      if (zoomFocusAppliedRef.current === sessionKey) return;

      const applied = applyZoomToAnnotationViewport({
        transformRef: ref,
        containerEl: container,
        ann,
        imageWidth,
        imageHeight,
        config,
        fitRatio: focusViewportFitRatio,
        padding: focusViewportPadding,
        maxScale: focusViewportMaxScale,
        maxScaleRelativeToImageFit: focusViewportMaxScaleRelativeToImageFit,
        panOffsetX: focusViewportPanOffset?.x ?? 0,
        panOffsetY: focusViewportPanOffset?.y ?? 0,
        durationMs: 320,
      });
      if (applied) {
        zoomFocusAppliedRef.current = sessionKey;
        if (onFocusViewportToAnnotationApplied) {
          window.setTimeout(() => {
            if (!cancelled) onFocusViewportToAnnotationApplied();
          }, 320);
        }
      }
    };

    const id = requestAnimationFrame(() => requestAnimationFrame(applyZoomToAnnotation));
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [
    annotations,
    config.maxZoom,
    config.minZoom,
    fitContentOnMount,
    focusAnnotationIdOnMount,
    focusViewportFitRatio,
    focusViewportPadding,
    focusViewportMaxScale,
    focusViewportMaxScaleRelativeToImageFit,
    focusViewportPanOffset,
    imageHeight,
    imageWidth,
    onFocusViewportToAnnotationApplied,
    transformMountKey,
  ]);

  const focusViewportAppliedRequestIdRef = useRef(null);

  useLayoutEffect(() => {
    const req = focusViewportToAnnotationRequest;
    if (!req || typeof req.annotationId !== 'string' || !req.annotationId.trim()) {
      focusViewportAppliedRequestIdRef.current = null;
      return undefined;
    }
    if (typeof req.requestId !== 'number') return undefined;

    if (focusViewportAppliedRequestIdRef.current === req.requestId) {
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 72;
    let appliedCallbackTimeoutId = null;

    const run = () => {
      if (cancelled || attempts++ >= maxAttempts) return;
      const ann = annotationsRef.current.find((a) => a.id === req.annotationId);
      if (!ann) {
        requestAnimationFrame(run);
        return;
      }
      const ref = transformRef.current;
      const container = containerRef.current;
      if (
        !ref?.setTransform ||
        !container ||
        container.clientWidth < 16 ||
        container.clientHeight < 16
      ) {
        requestAnimationFrame(run);
        return;
      }
      const applied = applyZoomToAnnotationViewport({
        transformRef: ref,
        containerEl: container,
        ann,
        imageWidth,
        imageHeight,
        config,
        fitRatio: focusViewportFitRatio,
        padding: focusViewportPadding,
        maxScale: focusViewportMaxScale,
        maxScaleRelativeToImageFit: focusViewportMaxScaleRelativeToImageFit,
        panOffsetX: focusViewportPanOffset?.x ?? 0,
        panOffsetY: focusViewportPanOffset?.y ?? 0,
        durationMs: 320,
      });
      if (applied) {
        focusViewportAppliedRequestIdRef.current = req.requestId;
        if (onFocusViewportToAnnotationApplied) {
          appliedCallbackTimeoutId = window.setTimeout(() => {
            if (!cancelled) onFocusViewportToAnnotationApplied();
          }, 450);
        }
      }
    };

    const id = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      if (appliedCallbackTimeoutId) window.clearTimeout(appliedCallbackTimeoutId);
    };
  }, [
    config.maxZoom,
    config.minZoom,
    focusViewportFitRatio,
    focusViewportPadding,
    focusViewportMaxScale,
    focusViewportMaxScaleRelativeToImageFit,
    focusViewportPanOffset?.x,
    focusViewportPanOffset?.y,
    focusViewportToAnnotationRequest,
    imageHeight,
    imageWidth,
    onFocusViewportToAnnotationApplied,
  ]);

  const lastRecenterToFitNonceRef = useRef(0);

  useEffect(() => {
    lastRecenterToFitNonceRef.current = 0;
  }, [transformMountKey]);

  const handleTransformInit = useCallback(
    (ref) => {
      transformRef.current = ref;
      if (
        !fitContentOnMount ||
        initialView ||
        !imageWidth ||
        !imageHeight ||
        focusAnnotationIdOnMount ||
        hasFocusViewportRequest
      ) {
        return;
      }

      let attempts = 0;
      const maxAttempts = 32;
      const runFit = () => {
        if (attempts++ >= maxAttempts) return;
        const applied = applyFitImageToViewport({
          transformRef: ref,
          containerEl: containerRef.current,
          imageWidth,
          imageHeight,
          config,
          padding: fitContentPadding,
        });
        if (applied) {
          const state = ref?.instance?.transformState;
          if (state) {
            handleTransform(ref, state);
          }
          return;
        }
        requestAnimationFrame(runFit);
      };
      requestAnimationFrame(runFit);
    },
    [
      config,
      fitContentOnMount,
      fitContentPadding,
      handleTransform,
      imageHeight,
      imageWidth,
      initialView,
      focusAnnotationIdOnMount,
      hasFocusViewportRequest,
    ],
  );

  useLayoutEffect(() => {
    if (!recenterToFitNonce) return undefined;
    if (recenterToFitNonce === lastRecenterToFitNonceRef.current) return undefined;
    lastRecenterToFitNonceRef.current = recenterToFitNonce;

    if (!fitContentOnMount || initialView || !imageWidth || !imageHeight) {
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 64;
    const fit = () => {
      if (cancelled || attempts++ >= maxAttempts) return;
      const ref = transformRef.current;
      if (!ref?.setTransform) {
        requestAnimationFrame(fit);
        return;
      }
      const applied = applyFitImageToViewport({
        transformRef: ref,
        containerEl: containerRef.current,
        imageWidth,
        imageHeight,
        config,
        padding: fitContentPadding,
        fitMode: fitContentMode,
      });
      if (!applied) requestAnimationFrame(fit);
    };
    const id = requestAnimationFrame(fit);
    const retryTimers = [120, 350, 700, 1200].map((ms) =>
      window.setTimeout(() => {
        if (cancelled) return;
        applyFitImageToViewport({
          transformRef: transformRef.current,
          containerEl: containerRef.current,
          imageWidth,
          imageHeight,
          config,
          padding: fitContentPadding,
        });
      }, ms),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      retryTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    recenterToFitNonce,
    fitContentOnMount,
    fitContentPadding,
    fitContentMode,
    initialView,
    imageWidth,
    imageHeight,
    transformMountKey,
    config.minZoom,
    config.maxZoom,
  ]);

  useEffect(() => {
    if (
      !fitContentOnMount ||
      initialView ||
      !imageWidth ||
      !imageHeight ||
      focusAnnotationIdOnMount ||
      hasFocusViewportRequest
    ) {
      return undefined;
    }
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    let rafId = 0;
    const fitOnResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyFitImageToViewport({
          transformRef: transformRef.current,
          containerEl: el,
          imageWidth,
          imageHeight,
          config,
          padding: fitContentPadding,
          fitMode: fitContentMode,
        });
      });
    };

    const observer = new ResizeObserver(fitOnResize);
    observer.observe(el);
    fitOnResize();
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [
    fitContentOnMount,
    fitContentPadding,
    fitContentMode,
    initialView,
    imageWidth,
    imageHeight,
    transformMountKey,
    config.minZoom,
    config.maxZoom,
    focusAnnotationIdOnMount,
    hasFocusViewportRequest,
  ]);

  const [internalTool, setInternalTool] = useState(TOOL_IDS.SELECT);
  const activeTool = activeToolControlled ?? internalTool;
  const setActiveTool = useCallback(
    (id) => {
      if (!isToolEnabledInToolbar(id)) return;
      if (activeToolControlled === undefined) {
        setInternalTool(id);
      }
      onActiveToolChange?.(id);
    },
    [activeToolControlled, isToolEnabledInToolbar, onActiveToolChange],
  );

  const [selectedIds, setSelectedIds] = useState([]);
  const updateSelectedIds = useCallback(
    (updater) => {
      setSelectedIds((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onSelectedIdsChange?.(next);
        return next;
      });
    },
    [onSelectedIdsChange],
  );

  useEffect(() => {
    if (!clearSelectionNonce) return;
    updateSelectedIds([]);
  }, [clearSelectionNonce, updateSelectedIds]);

  const [hoveredId, setHoveredId] = useState(null);
  const hoverOverlayCloseTimerRef = useRef(null);
  const hoverOverlayPointerInsideRef = useRef(false);
  const [focusedAnnotationId, setFocusedAnnotationId] = useState(null);

  const HOVER_OVERLAY_CLOSE_DELAY_MS = Math.max(320, Number(hoverOverlayCloseDelayMs) || 520);
  const resolvedHoverOverlayZIndex = Math.max(1, Number(hoverOverlayZIndex) || 14);
  const resolvedSelectedOverlayZIndex = Math.max(
    resolvedHoverOverlayZIndex,
    Number(selectedOverlayZIndex) || resolvedHoverOverlayZIndex,
  );

  const cancelScheduledHoverClear = useCallback(() => {
    if (hoverOverlayCloseTimerRef.current != null) {
      window.clearTimeout(hoverOverlayCloseTimerRef.current);
      hoverOverlayCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClear = useCallback(() => {
    cancelScheduledHoverClear();
    hoverOverlayCloseTimerRef.current = window.setTimeout(() => {
      hoverOverlayCloseTimerRef.current = null;
      if (hoverOverlayPointerInsideRef.current) return;
      setHoveredId(null);
    }, HOVER_OVERLAY_CLOSE_DELAY_MS);
  }, [cancelScheduledHoverClear, HOVER_OVERLAY_CLOSE_DELAY_MS]);

  const dismissCanvasHoverNow = useCallback(() => {
    cancelScheduledHoverClear();
    setHoveredId(null);
  }, [cancelScheduledHoverClear]);

  useEffect(
    () => () => {
      if (hoverOverlayCloseTimerRef.current != null) {
        window.clearTimeout(hoverOverlayCloseTimerRef.current);
      }
    },
    [],
  );

  const canvasHoverSchedule = useMemo(
    () => ({
      cancelClose: () => {
        hoverOverlayPointerInsideRef.current = true;
        cancelScheduledHoverClear();
      },
      scheduleClose: () => {
        hoverOverlayPointerInsideRef.current = false;
        scheduleHoverClear();
      },
      dismissHoverNow: () => {
        hoverOverlayPointerInsideRef.current = false;
        dismissCanvasHoverNow();
      },
      canvasScale: Math.max(zoomPercent / 100, 0.05),
    }),
    [cancelScheduledHoverClear, dismissCanvasHoverNow, scheduleHoverClear, zoomPercent],
  );
  const panTimerRef = useRef(null);
  const [draftPoints, setDraftPoints] = useState([]);
  const [draftKind, setDraftKind] = useState(null);
  const [draftClosed, setDraftClosed] = useState(false);
  const [rectDrag, setRectDrag] = useState(null);
  const [draftLivePos, setDraftLivePos] = useState(null);

  const addAnnotationAndSelect = useCallback(
    (item) => {
      const row = {
        ...item,
        id: item.id || crypto.randomUUID(),
      };
      addAnnotation(row);
      setActiveTool(TOOL_IDS.SELECT);
      setSelectedIds([row.id]);
      return row;
    },
    [addAnnotation, setActiveTool, setSelectedIds],
  );

  const bezierDrawing = useBezierDrawing({
    imageWidth,
    imageHeight,
    addAnnotation: addAnnotationAndSelect,
    onBeforeAnnotationAdd,
  });

  /** Per inventory-group: `{ available, occupied }` — both default true (show all). */
  const [groupAvailabilityFilter, setGroupAvailabilityFilter] = useState({});

  const annotationsWithoutPendingLayer = useMemo(() => {
    if (!pendingAnnotationSource) return annotations;
    return annotations.filter((a) => a.source !== pendingAnnotationSource);
  }, [annotations, pendingAnnotationSource]);

  const inventoryGroupSig = useMemo(
    () =>
      deriveInventoryGroups(annotationsWithoutPendingLayer)
        .map(({ key }) => key)
        .sort()
        .join('\0'),
    [annotationsWithoutPendingLayer],
  );

  useEffect(() => {
    const keys = inventoryGroupSig ? inventoryGroupSig.split('\0') : [];
    setGroupAvailabilityFilter((prev) => {
      const next = { ...prev };
      const defaults = { available: true, occupied: true };
      for (const key of keys) {
        if (next[key] === undefined) next[key] = { ...defaults };
      }
      for (const k of Object.keys(next)) {
        if (!keys.includes(k)) delete next[k];
      }
      return next;
    });
  }, [inventoryGroupSig]);

  const annotationsForCanvas = useMemo(() => {
    return annotationsWithoutPendingLayer.filter((ann) => {
      if (ann.visible === false) return false;
      if (typeof extraCanvasAnnotationFilter === 'function' && !extraCanvasAnnotationFilter(ann)) {
        return false;
      }
      if (ann?.source === DESK_COWORKER_MARKER || ann?.source === CLIENT_SUBSPACE_SLOT_SOURCE) {
        return true;
      }
      // While defining a sub-space, unassociated strokes must stay on-canvas even if the sidebar
      // "Unassociated / Available" chip is off — otherwise the shape disappears on mouse-up.
      if (
        pendingAnnotationSource &&
        ann?.source !== 'server-subspace-pin' &&
        !String(ann?.space_ref ?? '').trim()
      ) {
        return true;
      }
      const g = annotationGroup(ann);
      const filter = groupAvailabilityFilter[g] ?? { available: true, occupied: true };
      return annotationMatchesAvailabilityFilters(ann, filter);
    });
  }, [
    annotationsWithoutPendingLayer,
    groupAvailabilityFilter,
    extraCanvasAnnotationFilter,
    pendingAnnotationSource,
  ]);

  const pendingLayerAnnotations = useMemo(() => {
    if (!pendingAnnotationSource) return [];
    return annotations.filter((a) => a.source === pendingAnnotationSource && a.visible !== false);
  }, [annotations, pendingAnnotationSource]);

  const showSelectedAnnotationOverlay = Boolean(
    renderSelectedAnnotationOverlay && (readOnly || activeTool === TOOL_IDS.SELECT),
  );

  /** Hide Konva resize handles only when a selected-overlay popover is actually rendered. */
  const selectionChromeHiddenId = useMemo(() => {
    if (!showSelectedAnnotationOverlay || selectedIds.length !== 1) return null;
    const selectedId = selectedIds[0];
    const ann =
      annotationsForCanvas.find((a) => a.id === selectedId) ??
      pendingLayerAnnotations.find((a) => a.id === selectedId);
    if (!ann || ann.visible === false) return null;
    const center = computeAnnotationCenter(ann, imageWidth, imageHeight);
    if (!center) return null;
    const node = renderSelectedAnnotationOverlay(ann, center, canvasHoverSchedule);
    if (!node) return null;
    if (allowSubSpacePinTransform && ann.source === SERVER_SUBSPACE_PIN_SOURCE) {
      return null;
    }
    return selectedId;
  }, [
    showSelectedAnnotationOverlay,
    renderSelectedAnnotationOverlay,
    selectedIds,
    annotationsForCanvas,
    pendingLayerAnnotations,
    imageWidth,
    imageHeight,
    canvasHoverSchedule,
    allowSubSpacePinTransform,
  ]);

  const handleGroupAvailabilityChange = useCallback((groupKey, field, checked) => {
    setGroupAvailabilityFilter((prev) => {
      const defaults = { available: true, occupied: true };
      const cur = prev[groupKey] ?? defaults;
      return {
        ...prev,
        [groupKey]: { ...cur, [field]: Boolean(checked) },
      };
    });
  }, []);

  const selectMode = activeTool === TOOL_IDS.SELECT && !readOnly;
  const isHandTool = activeTool === TOOL_IDS.HAND;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !listenForAnnotationHits) return undefined;

    const applyCursor = () => {
      const canvas = el.querySelector('canvas');
      if (!canvas) return;
      if (hoveredId) {
        canvas.style.cursor = 'pointer';
      } else if (isHandTool) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = '';
      }
    };

    applyCursor();
    const observer = new MutationObserver(applyCursor);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hoveredId, isHandTool, listenForAnnotationHits, transformMountKey]);

  const finishPolygon = useCallback(() => {
    if (draftKind !== 'polygon' || draftPoints.length < 6) return;
    addAnnotationAndSelect({ type: 'polygon', points: [...draftPoints], closed: true });
    setDraftPoints([]);
    setDraftKind(null);
    setDraftLivePos(null);
  }, [draftKind, draftPoints, addAnnotationAndSelect]);

  const finishPolyline = useCallback(() => {
    if (draftKind !== 'polyline' || draftPoints.length < 4) return;
    addAnnotationAndSelect({ type: 'polyline', points: [...draftPoints] });
    setDraftPoints([]);
    setDraftKind(null);
    setDraftClosed(false);
    setDraftLivePos(null);
  }, [draftKind, draftPoints, addAnnotationAndSelect]);

  const finishPen = useCallback(() => {
    bezierDrawing.finishBezier();
    setDraftKind(null);
  }, [bezierDrawing]);

  const handleFinishPath = useCallback(() => {
    if (draftKind === 'polygon') finishPolygon();
    else if (draftKind === 'polyline') finishPolyline();
    else if (draftKind === 'pen') finishPen();
  }, [draftKind, finishPolygon, finishPolyline, finishPen]);

  const commitShapeDrag = useCallback(
    (drag, candidate) => {
      if (!drag || !candidate) return;
      const sig = JSON.stringify(candidate);
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      if (sig === lastShapeCommitSigRef.current && now - lastShapeCommitAtRef.current < 120) {
        return;
      }
      lastShapeCommitSigRef.current = sig;
      lastShapeCommitAtRef.current = now;
      const candidateWithId = {
        ...candidate,
        id: candidate.id || crypto.randomUUID(),
      };
      if (
        onBeforeAnnotationAdd &&
        !onBeforeAnnotationAdd({
          type: candidateWithId.type,
          nx:
            candidateWithId.type === 'rectangle'
              ? candidateWithId.x + candidateWithId.width / 2
              : candidateWithId.x,
          ny:
            candidateWithId.type === 'rectangle'
              ? candidateWithId.y + candidateWithId.height / 2
              : candidateWithId.y,
          annotation: candidateWithId,
        })
      ) {
        return;
      }
      addAnnotationAndSelect(candidateWithId);
    },
    [addAnnotationAndSelect, onBeforeAnnotationAdd],
  );

  const commitRectDrag = useCallback(
    (drag) => {
      if (!drag) return;
      const { ax, ay, bx, by } = drag;
      const x = Math.min(ax, bx);
      const y = Math.min(ay, by);
      const width = Math.abs(bx - ax);
      const height = Math.abs(by - ay);
      if (width < 0.005 || height < 0.005) return;
      commitShapeDrag(drag, { type: 'rectangle', x, y, width, height });
    },
    [commitShapeDrag],
  );

  const commitCircleDrag = useCallback(
    (drag) => {
      if (!drag) return;
      const { ax, ay, bx, by } = drag;
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const radiusX = Math.abs(bx - ax) / 2;
      const radiusY = Math.abs(by - ay) / 2;
      if (radiusX < 0.005 || radiusY < 0.005) return;
      commitShapeDrag(drag, { type: 'circle', x: cx, y: cy, radiusX, radiusY });
    },
    [commitShapeDrag],
  );

  const handleStageMouseDown = useCallback(
    (e) => {
      if (readOnly) return;
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      if (now - lastPointerDownRef.current < 45) return;
      lastPointerDownRef.current = now;

      const n = pointerToNormalizedFromEvent(e, imageWidth, imageHeight);
      if (!n) return;

      // Mark/dot tool: allow placement on space polygons, not only empty canvas.
      if (activeTool === TOOL_IDS.POINT) {
        const clientX = typeof e.evt?.clientX === 'number' ? e.evt.clientX : 0;
        const clientY = typeof e.evt?.clientY === 'number' ? e.evt.clientY : 0;
        if (
          onBeforeAnnotationAdd &&
          !onBeforeAnnotationAdd({
            type: 'point',
            nx: n.nx,
            ny: n.ny,
            clientX,
            clientY,
          })
        ) {
          return;
        }
        addAnnotation({
          type: 'point',
          x: n.nx,
          y: n.ny,
          ...(pointAnnotationDefaults && typeof pointAnnotationDefaults === 'object'
            ? pointAnnotationDefaults
            : {}),
        });
        return;
      }

      if (!isShapeDrawingSurfaceTarget(e, imageNodeRef, activeTool)) return;

      if (
        activeTool === TOOL_IDS.SELECT ||
        (activeTool === TOOL_IDS.HAND && clearSelectionOnBackgroundClick)
      ) {
        updateSelectedIds([]);
        return;
      }
      if (activeTool === TOOL_IDS.RECTANGLE || activeTool === TOOL_IDS.CIRCLE) {
        setRectDrag({ ax: n.nx, ay: n.ny, bx: n.nx, by: n.ny });
        return;
      }
      if (activeTool === TOOL_IDS.CIRCLE) {
        setRectDrag({ ax: n.nx, ay: n.ny, bx: n.nx, by: n.ny, kind: 'circle' });
        return;
      }
      if (activeTool === TOOL_IDS.PEN) {
        setDraftKind('pen');
        bezierDrawing.onMouseDown(n);
        return;
      }
      if (activeTool === TOOL_IDS.POLYGON || activeTool === TOOL_IDS.POLYLINE) {
        const toolKind = activeTool === TOOL_IDS.POLYGON ? 'polygon' : 'polyline';
        if (draftKind && draftKind !== toolKind) {
          setDraftPoints([]);
          setDraftClosed(false);
        }
        setDraftKind(toolKind);

        if (toolKind === 'polyline') {
          if (draftClosed) return;
          if (draftPoints.length >= 6) {
            const first = { x: draftPoints[0], y: draftPoints[1] };
            if (
              distanceNormPx(n.nx, n.ny, first.x, first.y, imageWidth, imageHeight) <
              CLOSE_DISTANCE_PX
            ) {
              setDraftClosed(true);
              return;
            }
          }
        }

        setDraftPoints((prev) => [...prev, n.nx, n.ny]);
      }
    },
    [
      activeTool,
      addAnnotation,
      bezierDrawing,
      draftClosed,
      draftKind,
      draftPoints,
      imageHeight,
      imageWidth,
      onBeforeAnnotationAdd,
      pointAnnotationDefaults,
      readOnly,
    ],
  );

  const handleStageMouseMove = useCallback(
    (e) => {
      const n = pointerToNormalizedFromEvent(e, imageWidth, imageHeight);
      if (!n) return;
      if (rectDrag) {
        setRectDrag((r) => (r ? { ...r, bx: n.nx, by: n.ny } : null));
      }
      if (activeTool === TOOL_IDS.PEN) {
        bezierDrawing.onMouseMove(n);
      }
      if (
        (activeTool === TOOL_IDS.POLYGON || activeTool === TOOL_IDS.POLYLINE) &&
        draftPoints.length >= 2
      ) {
        setDraftLivePos({ nx: n.nx, ny: n.ny });
      }
    },
    [rectDrag, imageHeight, imageWidth, activeTool, bezierDrawing, draftPoints.length],
  );

  const handleStageMouseUp = useCallback(
    (e) => {
      if (rectDrag) {
        if (rectCommitLockRef.current) return;
        rectCommitLockRef.current = true;
        const drag = rectDrag;
        setRectDrag(null);
        if (activeTool === TOOL_IDS.CIRCLE) commitCircleDrag(drag);
        else commitRectDrag(drag);
        window.setTimeout(() => {
          rectCommitLockRef.current = false;
        }, 120);
        return;
      }
      if (activeTool === TOOL_IDS.PEN) {
        const n = pointerToNormalizedFromEvent(e, imageWidth, imageHeight);
        bezierDrawing.onMouseUp(n);
      }
    },
    [
      rectDrag,
      commitRectDrag,
      commitCircleDrag,
      activeTool,
      imageWidth,
      imageHeight,
      bezierDrawing,
    ],
  );

  const handleStageDblClick = useCallback(
    (e) => {
      if (!isShapeDrawingSurfaceTarget(e, imageNodeRef, activeTool)) return;
      if (activeTool !== TOOL_IDS.POLYGON || draftPoints.length < 6) return;
      const n = pointerToNormalizedFromEvent(e, imageWidth, imageHeight);
      if (!n || draftPoints.length < 2) return;
      const first = { x: draftPoints[0], y: draftPoints[1] };
      if (
        distanceNormPx(n.nx, n.ny, first.x, first.y, imageWidth, imageHeight) < CLOSE_DISTANCE_PX
      ) {
        e.cancelBubble = true;
        finishPolygon();
      }
    },
    [activeTool, draftPoints, finishPolygon, imageHeight, imageWidth],
  );

  const onSelectShape = useCallback(
    (id, ev) => {
      // Drawing / pan tools still listen for hover hits; only the select tool
      // (or read-only pickers) should change selection and open detail popovers.
      if (!readOnly && activeTool !== TOOL_IDS.SELECT) return;
      const ann = annotations.find((a) => a.id === id);
      if (ann) onAnnotationSelect?.(ann);
      const shift = Boolean(ev?.evt?.shiftKey);
      updateSelectedIds((prev) => toggleSelection(prev, id, shift));
    },
    [activeTool, annotations, onAnnotationSelect, readOnly, updateSelectedIds],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idsToRemove = [];
    for (const id of selectedIds) {
      const ann = annotations.find((a) => a.id === id);
      if (!ann) continue;
      const handled = Boolean(onRequestDeleteSelected?.(ann));
      if (!handled) idsToRemove.push(id);
    }
    idsToRemove.forEach((id) => removeAnnotation(id));
    updateSelectedIds([]);
  }, [annotations, onRequestDeleteSelected, removeAnnotation, selectedIds, updateSelectedIds]);

  const handleDeleteSidebarRow = useCallback(
    (id) => {
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;
      const handled = Boolean(onRequestDeleteSelected?.(ann));
      if (!handled) removeAnnotation(id);
      updateSelectedIds((prev) => prev.filter((s) => s !== id));
    },
    [annotations, onRequestDeleteSelected, removeAnnotation, updateSelectedIds],
  );

  const handleRenameAnnotation = useCallback(
    (id, label) => {
      updateAnnotation(id, { label });
      onRenameAnnotation?.(id, label);
    },
    [updateAnnotation, onRenameAnnotation],
  );

  const handleHoverSidebarRow = useCallback(
    (id) => {
      cancelScheduledHoverClear();
      setHoveredId(id);
      setFocusedAnnotationId(id);
      clearTimeout(panTimerRef.current);
      panTimerRef.current = setTimeout(() => {
        const ann = annotations.find((a) => a.id === id);
        if (!ann) return;
        const container = containerRef.current;
        const ref = transformRef.current;
        if (!container || !ref?.setTransform) return;
        applyZoomToAnnotationViewport({
          transformRef: ref,
          containerEl: container,
          ann,
          imageWidth,
          imageHeight,
          config,
          fitRatio: 0.2,
          durationMs: 320,
        });
      }, 350);
    },
    [
      annotations,
      cancelScheduledHoverClear,
      config.maxZoom,
      config.minZoom,
      imageWidth,
      imageHeight,
    ],
  );

  const handleUnhoverSidebarRow = useCallback(() => {
    clearTimeout(panTimerRef.current);
    cancelScheduledHoverClear();
    setHoveredId(null);
    setFocusedAnnotationId(null);
  }, [cancelScheduledHoverClear]);

  const cancelActiveDrawingDraft = useCallback(() => {
    setDraftPoints([]);
    setDraftKind(null);
    setDraftClosed(false);
    setRectDrag(null);
    setDraftLivePos(null);
    bezierDrawing.discardBezier();
  }, [bezierDrawing]);

  const runUndo = useCallback(() => {
    cancelActiveDrawingDraft();
    undo();
  }, [cancelActiveDrawingDraft, undo]);

  const runRedo = useCallback(() => {
    cancelActiveDrawingDraft();
    redo();
  }, [cancelActiveDrawingDraft, redo]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'Escape') {
        const hasPenDraft = bezierDrawing.hasDraft;
        const hasPathDraft =
          (draftKind === 'polygon' || draftKind === 'polyline') && draftPoints.length > 0;
        const hasShapeDraft = Boolean(rectDrag) || hasPathDraft || hasPenDraft;
        if (hasShapeDraft) {
          e.preventDefault();
          e.stopImmediatePropagation();
          cancelActiveDrawingDraft();
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !readOnly) {
        e.preventDefault();
        handleDeleteSelected();
      }
      if (readOnly) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) runRedo();
          else runUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          runRedo();
        }
      }
      if (e.key === 'Enter' && !readOnly) {
        if (draftKind === 'polyline' && draftPoints.length >= 4) {
          e.preventDefault();
          finishPolyline();
        } else if (draftKind === 'polygon' && draftPoints.length >= 6) {
          e.preventDefault();
          finishPolygon();
        } else if (draftKind === 'pen' && bezierDrawing.hasDraft) {
          e.preventDefault();
          finishPen();
        }
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') setActiveTool(TOOL_IDS.SELECT);
        if (e.key === 'h' || e.key === 'H') setActiveTool(TOOL_IDS.HAND);
        if (e.key === 'p' || e.key === 'P') setActiveTool(TOOL_IDS.POLYGON);
        if (e.key === 'l' || e.key === 'L') setActiveTool(TOOL_IDS.POLYLINE);
        if (e.key === 'n' || e.key === 'N') setActiveTool(TOOL_IDS.PEN);
        if (e.key === 'r' || e.key === 'R') setActiveTool(TOOL_IDS.RECTANGLE);
        if (e.key === 'c' || e.key === 'C') setActiveTool(TOOL_IDS.CIRCLE);
        if ((e.key === 'd' || e.key === 'D') && isToolEnabledInToolbar(TOOL_IDS.POINT)) {
          setActiveTool(TOOL_IDS.POINT);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    bezierDrawing,
    cancelActiveDrawingDraft,
    draftKind,
    draftPoints.length,
    finishPen,
    finishPolygon,
    finishPolyline,
    handleDeleteSelected,
    isToolEnabledInToolbar,
    readOnly,
    rectDrag,
    runRedo,
    runUndo,
    selectedIds.length,
    setActiveTool,
  ]);

  const primarySelected = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return annotations.find((a) => a.id === selectedIds[0]) ?? null;
  }, [annotations, selectedIds]);

  const bezierHandleAnnotation = useMemo(() => {
    if (!selectMode || selectedIds.length !== 1) return null;
    const ann = annotations.find((a) => a.id === selectedIds[0]);
    if (!ann || ann.type !== 'pen' || !ann.bezierPoints) return null;
    if (ann.closed !== false) return null;
    if (ann.preferBezierHandles === true) return ann;
    return null;
  }, [selectMode, selectedIds, annotations]);

  const toolbarCtx = useMemo(
    () => ({
      activeToolId: activeTool,
      setActiveTool,
      canUndo,
      canRedo,
      undo: runUndo,
      redo: runRedo,
      selectedIds,
      primarySelectedAnnotation: primarySelected,
      annotations,
      zoomPercent,
      transformRef,
      readOnly,
      onZoomIn: () => transformRef.current?.zoomIn(),
      onZoomOut: () => transformRef.current?.zoomOut(),
      onRecenter: () => transformRef.current?.centerView?.(0.9, 0),
      draftPoints,
      draftKind,
      draftClosed,
      onFinishPath: handleFinishPath,
    }),
    [
      activeTool,
      annotations,
      canRedo,
      canUndo,
      draftClosed,
      draftKind,
      draftPoints,
      handleFinishPath,
      primarySelected,
      readOnly,
      runRedo,
      runUndo,
      selectedIds,
      setActiveTool,
      zoomPercent,
    ],
  );

  const reorderAnnotationsWithNotify = useCallback(
    (orderedIds) => {
      reorderAnnotations(orderedIds);
      onReorderAnnotations?.(orderedIds);
    },
    [reorderAnnotations, onReorderAnnotations],
  );

  const sidebarCtx = useMemo(
    () => ({
      annotations,
      selectedIds,
      setSelectedIds,
      resolveAssociationLabel,
      toggleVisibility,
      toggleLock,
      toggleGroupVisibility,
      reorderAnnotations: reorderAnnotationsWithNotify,
      deleteRow: handleDeleteSidebarRow,
      renameAnnotation: handleRenameAnnotation,
      hoverRow: handleHoverSidebarRow,
      unhoverRow: handleUnhoverSidebarRow,
      groupAvailabilityFilter,
      onGroupAvailabilityChange: handleGroupAvailabilityChange,
    }),
    [
      annotations,
      groupAvailabilityFilter,
      handleDeleteSidebarRow,
      handleGroupAvailabilityChange,
      handleHoverSidebarRow,
      handleRenameAnnotation,
      handleUnhoverSidebarRow,
      reorderAnnotationsWithNotify,
      resolveAssociationLabel,
      selectedIds,
      toggleGroupVisibility,
      toggleLock,
      toggleVisibility,
    ],
  );

  const hasMountFocusTarget = Boolean(String(focusAnnotationIdOnMount ?? '').trim());

  const suppressDefaultCenterOnInit =
    Boolean(initialView) || fitContentOnMount || hasFocusViewportRequest || hasMountFocusTarget;

  if (!raster || !imageWidth || !imageHeight) {
    return (
      <div
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600',
          className,
        )}
      >
        Load a floor plan image to annotate.
      </div>
    );
  }

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col gap-3 lg:flex-row', className)}>
      <div
        ref={assignContainerRef}
        className={cn(
          'relative flex w-full min-w-0 flex-1 overflow-hidden border border-stroke-soft-200 bg-bg-weak-50 touch-manipulation',
          fillViewport ? 'h-full min-h-0' : 'min-h-[min(70vh,720px)]',
          isHandTool &&
            listenForAnnotationHits &&
            (hoveredId ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'),
          isHandTool && !listenForAnnotationHits && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <TransformWrapper
          key={transformMountKey}
          ref={transformRef}
          minScale={config.minZoom}
          maxScale={config.maxZoom}
          initialScale={initialView?.scale}
          initialPositionX={initialView?.x}
          initialPositionY={initialView?.y}
          centerOnInit={!suppressDefaultCenterOnInit}
          limitToBounds={false}
          centerZoomedOut={!suppressDefaultCenterOnInit}
          doubleClick={{ disabled: true }}
          wheel={{
            activationKeys: isCmdOrCtrlZoomWheelActive,
            // Small base; with smooth wheel zoom, library uses step * |deltaY|.
            step: 0.005,
          }}
          trackPadPanning={{ disabled: false }}
          panning={{
            allowLeftClickPan: isHandTool,
            allowMiddleClickPan: true,
            activationKeys: isHandTool ? [] : [' '],
          }}
          onTransform={handleTransform}
          onInit={handleTransformInit}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: imageWidth, height: imageHeight, position: 'relative' }}
          >
            <div
              className={cn(
                layoutImageDimmed &&
                  'blur-[4px] opacity-45 saturate-75 transition-[filter,opacity] duration-200',
              )}
            >
              <EditorCanvas
                width={imageWidth}
                height={imageHeight}
                rasterImage={raster}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                showGrid={config.showGrid}
                gridSize={config.gridSize}
                annotations={annotationsForCanvas}
                selectedIds={selectedIds}
                hoveredId={hoveredId}
                focusedAnnotationId={focusedAnnotationId}
                selectMode={selectMode}
                listenForAnnotationHits={listenForAnnotationHits}
                canvasListening={canvasListening ?? !isHandTool}
                resolveAnnotationStyle={resolveAnnotationStyle}
                draftPoints={draftPoints}
                draftKind={draftKind}
                draftClosed={draftClosed}
                draftLivePos={draftLivePos}
                rectDrag={rectDrag}
                activeToolId={activeTool}
                bezierDraft={
                  activeTool === TOOL_IDS.PEN && bezierDrawing.hasDraft
                    ? bezierDrawing.draftState
                    : null
                }
                bezierHandleAnnotation={bezierHandleAnnotation}
                readOnly={readOnly}
                imageNodeRef={imageNodeRef}
                rectRef={rectRef}
                transformerRef={transformerRef}
                onStageMouseDown={handleStageMouseDown}
                onStageMouseMove={handleStageMouseMove}
                onStageMouseUp={handleStageMouseUp}
                onStageDblClick={handleStageDblClick}
                onSelect={onSelectShape}
                onHoverStart={(id) => {
                  cancelScheduledHoverClear();
                  setHoveredId(id);
                }}
                onHoverEnd={scheduleHoverClear}
                onUpdateAnnotation={updateAnnotation}
                stageRef={stageRef}
                maskShape={maskShape}
                maskReplacesBaseImage={maskReplacesBaseImage}
                pendingLayerAnnotations={pendingLayerAnnotations}
                pendingAnnotationSource={pendingAnnotationSource}
                focusDimAnnotationId={focusDimAnnotationId}
                focusDimBrightIds={focusDimBrightIds}
                allowSubSpacePinTransform={allowSubSpacePinTransform}
              />
            </div>
            {renderAnnotationOverlay &&
              annotationsForCanvas
                .filter(
                  (a) =>
                    a.visible !== false &&
                    (!pendingAnnotationSource || a.source !== pendingAnnotationSource),
                )
                .map((ann) => {
                  const center = computeAnnotationCenter(ann, imageWidth, imageHeight);
                  if (!center) return null;
                  const node = renderAnnotationOverlay(ann, center, canvasHoverSchedule);
                  if (!node) return null;
                  return (
                    <div
                      key={ann.id}
                      style={{
                        position: 'absolute',
                        left: center.x,
                        top: center.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        lineHeight: 0,
                        // Let clicks reach Konva for selection/drag; interactive children set pointer-events-auto.
                        pointerEvents: 'none',
                      }}
                    >
                      {node}
                    </div>
                  );
                })}
            {renderHoveredAnnotationOverlay &&
              hoveredId &&
              !(selectedIds.length === 1 && hoveredId === selectedIds[0]) &&
              (() => {
                const ann = annotationsForCanvas.find((a) => a.id === hoveredId);
                if (!ann || ann.visible === false) return null;
                if (pendingAnnotationSource && ann.source === pendingAnnotationSource) return null;
                const center = computeAnnotationCenter(ann, imageWidth, imageHeight);
                if (!center) return null;
                const node = renderHoveredAnnotationOverlay(ann, center, canvasHoverSchedule);
                if (!node) return null;
                return (
                  <div
                    key={`hover-${hoveredId}`}
                    style={{
                      position: 'absolute',
                      left: center.x,
                      top: center.y,
                      transform: 'translate(-50%, -100%)',
                      marginTop: -8,
                      zIndex: resolvedHoverOverlayZIndex,
                      lineHeight: 0,
                      pointerEvents: 'auto',
                    }}
                    onPointerEnter={() => {
                      hoverOverlayPointerInsideRef.current = true;
                      cancelScheduledHoverClear();
                    }}
                    onPointerLeave={() => {
                      hoverOverlayPointerInsideRef.current = false;
                      scheduleHoverClear();
                    }}
                  >
                    {node}
                  </div>
                );
              })()}
            {subSpaceFocusFrame
              ? (() => {
                  const focusAnn = annotationsForCanvas.find(
                    (a) => a.id === subSpaceFocusFrame.annotationId,
                  );
                  if (!focusAnn) return null;
                  return (
                    <SubSpaceFocusFrame
                      annotation={focusAnn}
                      imageWidth={imageWidth}
                      imageHeight={imageHeight}
                      title={subSpaceFocusFrame.title}
                      inventoryType={subSpaceFocusFrame.inventoryType}
                    />
                  );
                })()
              : null}
            {showSelectedAnnotationOverlay &&
              selectedIds.length === 1 &&
              (() => {
                const ann = annotationsForCanvas.find((a) => a.id === selectedIds[0]);
                if (!ann || ann.visible === false) return null;
                if (pendingAnnotationSource && ann.source === pendingAnnotationSource) return null;
                const center = computeAnnotationCenter(ann, imageWidth, imageHeight);
                if (!center) return null;
                const placement = resolveSelectedOverlayPlacement?.(ann) ?? 'above';
                const node = renderSelectedAnnotationOverlay(ann, center, {
                  canvasScale: Math.max(zoomPercent / 100, 0.05),
                });
                if (!node) return null;
                const isCenterPlacement = placement === 'center';
                return (
                  <div
                    key={`selected-${ann.id}`}
                    style={{
                      position: 'absolute',
                      left: center.x,
                      top: center.y,
                      transform: isCenterPlacement
                        ? 'translate(-50%, -50%)'
                        : 'translate(-50%, -100%)',
                      marginTop: isCenterPlacement ? 0 : -8,
                      zIndex: 15,
                      lineHeight: 0,
                      pointerEvents: 'auto',
                    }}
                  >
                    {node}
                  </div>
                );
              })()}
          </TransformComponent>
        </TransformWrapper>

        {renderToolbar ? (
          renderToolbar(toolbarCtx)
        ) : (
          <>
            {topSlot ? (
              <div className='pointer-events-none absolute bottom-[5.5rem] left-1/2 z-20 flex w-full max-w-[min(100%,42rem)] -translate-x-1/2 justify-center px-2'>
                <div className='pointer-events-auto flex flex-wrap items-center justify-center gap-2'>
                  {topSlot(toolbarCtx)}
                </div>
              </div>
            ) : null}
            <DefaultFloorPlanToolbar
              activeToolId={activeTool}
              onToolChange={(id) => {
                setActiveTool(id);
                if (id !== TOOL_IDS.POLYGON && id !== TOOL_IDS.POLYLINE && id !== TOOL_IDS.PEN) {
                  setDraftPoints([]);
                  setDraftKind(null);
                  setDraftClosed(false);
                  setDraftLivePos(null);
                  bezierDrawing.discardBezier();
                }
              }}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={runUndo}
              onRedo={runRedo}
              onDelete={handleDeleteSelected}
              hasSelection={selectedIds.length > 0}
              zoomPercent={zoomPercent}
              onZoomIn={() => transformRef.current?.zoomIn()}
              onZoomOut={() => transformRef.current?.zoomOut()}
              onRecenter={() => transformRef.current?.centerView(undefined, 0)}
              readOnly={readOnly}
              toolButtonsDisabled={readOnly && !toolbarToolsInteractive}
              enabledToolIds={toolbarEnabledToolIds}
              showUndoRedoDelete={toolbarShowUndoRedoDelete}
              draftPoints={draftPoints}
              draftKind={draftKind}
              draftClosed={draftClosed}
              onFinishPath={handleFinishPath}
              trailingActions={toolbarTrailingActions ? toolbarTrailingActions(toolbarCtx) : null}
              panelClassName={toolbarPanelClassName}
            />
          </>
        )}
      </div>

      {/* {showSidebar ? (
        <div className='flex w-full shrink-0 flex-col gap-2 lg:w-auto'>
          {renderSidebar ? (
            renderSidebar(sidebarCtx)
          ) : (
            <DefaultFloorPlanSidebar
              annotations={annotations}
              image={imageProp}
              layoutId={layoutId}
              selectedIds={selectedIds}
              groupAvailabilityFilter={groupAvailabilityFilter}
              onGroupAvailabilityChange={handleGroupAvailabilityChange}
              onSelectRow={(id, ev) => {
                const shift = Boolean(ev.shiftKey);
                updateSelectedIds((prev) => toggleSelection(prev, id, shift));
              }}
              onToggleVisibility={toggleVisibility}
              onToggleLock={toggleLock}
              onToggleGroupVisibility={toggleGroupVisibility}
              onReorderAnnotations={reorderAnnotationsWithNotify}
              onDeleteRow={handleDeleteSidebarRow}
              onRenameAnnotation={handleRenameAnnotation}
              onHoverRow={handleHoverSidebarRow}
              onUnhoverRow={handleUnhoverSidebarRow}
            />
          )}
        </div>
      ) : null} */}
    </div>
  );
}
