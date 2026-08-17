import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const PROPOSAL_PAGE_WIDTH = 2480;
export const PROPOSAL_PAGE_HEIGHT = 3508;

export const PROPOSAL_ZOOM_MIN = 0.1;
export const PROPOSAL_ZOOM_MAX = 1;

export const PROPOSAL_ZOOM_MODES = {
  FIT_PAGE: 'fit-page',
  FILL_PAGE: 'fill-page',
  MANUAL: 'manual',
};

const VIEWPORT_PADDING = 40;

function clampScale(value) {
  return Math.min(PROPOSAL_ZOOM_MAX, Math.max(PROPOSAL_ZOOM_MIN, value));
}

function isCmdOrCtrlZoomWheelActive(pressedKeys) {
  return pressedKeys.includes('Meta') || pressedKeys.includes('Control');
}

/**
 * @param {import('react-zoom-pan-pinch').ReactZoomPanPinchRef | null | undefined} transformRef
 * @param {HTMLElement | null | undefined} containerEl
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

function getCenteredPositionX(viewportW, scale) {
  return (viewportW - PROPOSAL_PAGE_WIDTH * scale) / 2;
}

function clampHorizontalPosition(viewportW, contentW, scale, positionX) {
  const scaledW = contentW * scale;

  if (scaledW <= viewportW) {
    return (viewportW - scaledW) / 2;
  }

  const minX = viewportW - scaledW;
  const maxX = 0;
  return Math.min(maxX, Math.max(minX, positionX));
}

function clampVerticalPosition(viewportH, contentH, scale, positionY) {
  const scaledH = contentH * scale;

  if (scaledH <= viewportH) {
    return (viewportH - scaledH) / 2;
  }

  const minY = viewportH - scaledH;
  const maxY = 0;
  return Math.min(maxY, Math.max(minY, positionY));
}

function resolveContentHeight(ref, fallback = PROPOSAL_PAGE_HEIGHT) {
  const content = ref?.instance?.contentComponent;
  const deck = content?.querySelector?.('.proposal-template-deck');
  const measured = deck?.offsetHeight || content?.offsetHeight || content?.scrollHeight;
  return Math.max(PROPOSAL_PAGE_HEIGHT, measured || fallback);
}

function computeFitPageTransform(viewportW, viewportH) {
  const cw = Math.max(1, viewportW - VIEWPORT_PADDING * 2);
  const ch = Math.max(1, viewportH - VIEWPORT_PADDING * 2);
  const scale = clampScale(Math.min(cw / PROPOSAL_PAGE_WIDTH, ch / PROPOSAL_PAGE_HEIGHT));
  const x = getCenteredPositionX(viewportW, scale);
  const y = (viewportH - PROPOSAL_PAGE_HEIGHT * scale) / 2;
  return { x, y, scale };
}

function computeFillPageTransform(viewportW, viewportH) {
  const cw = Math.max(1, viewportW - VIEWPORT_PADDING * 2);
  const ch = Math.max(1, viewportH - VIEWPORT_PADDING * 2);
  const scale = clampScale(Math.max(cw / PROPOSAL_PAGE_WIDTH, ch / PROPOSAL_PAGE_HEIGHT));
  const x = getCenteredPositionX(viewportW, scale);
  const y = (viewportH - PROPOSAL_PAGE_HEIGHT * scale) / 2;
  return { x, y, scale };
}

/**
 * Zoom/pan controls for proposal preview via react-zoom-pan-pinch.
 */
export function useProposalPreviewZoom({ enabled = true, exportFullSize = false } = {}) {
  const transformRef = useRef(null);
  const containerRef = useRef(null);
  const zoomModeRef = useRef(PROPOSAL_ZOOM_MODES.FIT_PAGE);
  const isAdjustingTransformRef = useRef(false);
  const isProgrammaticNavRef = useRef(false);
  const contentHeightRef = useRef(PROPOSAL_PAGE_HEIGHT);
  const [wrapperEl, setWrapperEl] = useState(null);
  const [contentHeight, setContentHeight] = useState(PROPOSAL_PAGE_HEIGHT);
  const [zoomPercent, setZoomPercentState] = useState(25);
  const [zoomPercentInput, setZoomPercentInput] = useState('25');
  const [zoomMode, setZoomMode] = useState(PROPOSAL_ZOOM_MODES.FIT_PAGE);

  contentHeightRef.current = contentHeight;

  useEffect(() => {
    setZoomPercentInput(String(zoomPercent));
  }, [zoomPercent]);

  const applyModeTransform = useCallback(
    (mode, animationTime = 200, { preservePosition = true } = {}) => {
      const ref = transformRef.current;
      const viewport = resolveTransformViewportSize(ref, containerRef.current);
      if (!ref?.setTransform || !viewport) return false;

      const transform =
        mode === PROPOSAL_ZOOM_MODES.FILL_PAGE
          ? computeFillPageTransform(viewport.w, viewport.h)
          : computeFitPageTransform(viewport.w, viewport.h);

      // On initial load we always want page 1 at the top, so skip preservation.
      // For user-triggered zoom changes we keep the current content focal point so
      // the visible page doesn't jump (Mac-style zoom-in-place behaviour).
      let finalY = transform.y;
      if (preservePosition) {
        const currentState = ref.instance?.transformState ?? ref.state;
        if (currentState && currentState.scale > 0) {
          const contentCenterY = (viewport.h / 2 - currentState.positionY) / currentState.scale;
          const preservedY = viewport.h / 2 - contentCenterY * transform.scale;
          // Only guard against scrolling above the content start (maxY = 0).
          // Bottom-overflow is corrected by enforceTransformBounds on every onTransform.
          finalY = Math.min(0, preservedY);
        }
      }

      ref.setTransform(transform.x, finalY, transform.scale, animationTime, 'easeOut');
      zoomModeRef.current = mode;
      setZoomMode(mode);
      setZoomPercentState(Math.round(transform.scale * 100));
      return true;
    },
    [],
  );

  const applyFitPage = useCallback(() => {
    applyModeTransform(PROPOSAL_ZOOM_MODES.FIT_PAGE);
  }, [applyModeTransform]);

  const scheduleFitPage = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 48;

    const tryFit = () => {
      if (attempts++ >= maxAttempts) return;
      // Initial fit on mount — always start at page 1, never preserve a
      // centred position injected by react-zoom-pan-pinch's centerOnInit.
      const applied = applyModeTransform(PROPOSAL_ZOOM_MODES.FIT_PAGE, 0, {
        preservePosition: false,
      });
      if (!applied) requestAnimationFrame(tryFit);
    };

    requestAnimationFrame(tryFit);
  }, [applyModeTransform]);

  const measureContentHeight = useCallback((ref) => {
    const nextHeight = resolveContentHeight(ref, contentHeightRef.current);
    if (nextHeight !== contentHeightRef.current) {
      contentHeightRef.current = nextHeight;
      setContentHeight(nextHeight);
    }
    return nextHeight;
  }, []);

  const beginProgrammaticNav = useCallback((durationMs = 420) => {
    isProgrammaticNavRef.current = true;
    window.setTimeout(() => {
      isProgrammaticNavRef.current = false;
    }, durationMs);
  }, []);

  const deckResizeObserverRef = useRef(null);

  const enforceTransformBounds = useCallback(
    (ref, state, animationTime = 0) => {
      const viewport = resolveTransformViewportSize(ref, containerRef.current);
      if (!ref?.setTransform || !viewport) return state;

      const deckHeight = measureContentHeight(ref);
      const scale = clampScale(state.scale);
      const boundedX = clampHorizontalPosition(
        viewport.w,
        PROPOSAL_PAGE_WIDTH,
        scale,
        state.positionX,
      );
      const boundedY = clampVerticalPosition(viewport.h, deckHeight, scale, state.positionY);
      const needsUpdate =
        Math.abs(state.positionX - boundedX) > 0.5 ||
        Math.abs(state.positionY - boundedY) > 0.5 ||
        Math.abs(state.scale - scale) > 0.0001;

      if (!needsUpdate) return { positionX: state.positionX, positionY: state.positionY, scale };

      isAdjustingTransformRef.current = true;
      ref.setTransform(boundedX, boundedY, scale, animationTime);
      requestAnimationFrame(() => {
        isAdjustingTransformRef.current = false;
      });

      return { positionX: boundedX, positionY: boundedY, scale };
    },
    [measureContentHeight],
  );

  const handleTransform = useCallback(
    (ref, state) => {
      if (isAdjustingTransformRef.current || isProgrammaticNavRef.current) {
        setZoomPercentState(Math.round(clampScale(state.scale) * 100));
        return;
      }

      const nextState = enforceTransformBounds(ref, state);

      setZoomPercentState(Math.round(nextState.scale * 100));
      if (zoomModeRef.current !== PROPOSAL_ZOOM_MODES.MANUAL) {
        zoomModeRef.current = PROPOSAL_ZOOM_MODES.MANUAL;
        setZoomMode(PROPOSAL_ZOOM_MODES.MANUAL);
      }
    },
    [enforceTransformBounds],
  );

  const handlePanningStop = useCallback(
    (ref) => {
      if (isProgrammaticNavRef.current) return;
      const state = ref.state;
      if (!state) return;
      enforceTransformBounds(ref, state, 200);
    },
    [enforceTransformBounds],
  );

  const handleInit = useCallback(
    (ref) => {
      transformRef.current = ref;
      setWrapperEl(ref.instance?.wrapperComponent ?? null);
      measureContentHeight(ref);

      deckResizeObserverRef.current?.disconnect();
      const content = ref.instance?.contentComponent;
      const deck = content?.querySelector?.('.proposal-template-deck');
      if (deck) {
        const observer = new ResizeObserver(() => {
          measureContentHeight(ref);
          if (isProgrammaticNavRef.current) return;
          const state = ref.instance?.transformState;
          if (state) enforceTransformBounds(ref, state, 0);
        });
        observer.observe(deck);
        deckResizeObserverRef.current = observer;
      }

      if (enabled && !exportFullSize) {
        scheduleFitPage();
      }
    },
    [enabled, exportFullSize, scheduleFitPage, measureContentHeight, enforceTransformBounds],
  );

  useEffect(
    () => () => {
      deckResizeObserverRef.current?.disconnect();
    },
    [],
  );

  useEffect(() => {
    if (!enabled || exportFullSize || !containerRef.current) return undefined;

    const observer = new ResizeObserver(() => {
      if (
        zoomModeRef.current === PROPOSAL_ZOOM_MODES.FIT_PAGE ||
        zoomModeRef.current === PROPOSAL_ZOOM_MODES.FILL_PAGE
      ) {
        applyModeTransform(zoomModeRef.current, 0);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enabled, exportFullSize, applyModeTransform]);

  const applyZoomPercent = useCallback((percent) => {
    const ref = transformRef.current;
    const viewport = resolveTransformViewportSize(ref, containerRef.current);
    if (!ref?.setTransform || !viewport) return;

    const currentState = ref.instance?.transformState ?? ref.state;
    const scale = clampScale(percent / 100);
    const currentX = currentState?.positionX ?? 0;
    const currentY = currentState?.positionY ?? 0;
    const currentScale = currentState?.scale ?? 0;

    const contentCenterY = currentScale > 0 ? (viewport.h / 2 - currentY) / currentScale : 0;
    const x = clampHorizontalPosition(viewport.w, PROPOSAL_PAGE_WIDTH, scale, currentX);
    const y = Math.min(0, viewport.h / 2 - contentCenterY * scale);
    ref.setTransform(x, y, scale, 200, 'easeOut');
    zoomModeRef.current = PROPOSAL_ZOOM_MODES.MANUAL;
    setZoomMode(PROPOSAL_ZOOM_MODES.MANUAL);
    setZoomPercentState(Math.round(scale * 100));
  }, []);

  const zoomIn = useCallback(() => {
    const ref = transformRef.current;
    if (!ref) return;

    const currentState = ref.instance?.transformState ?? ref.state;
    if (!currentState || currentState.scale <= 0) return;

    const currentScale = clampScale(currentState.scale);
    const nextScale = clampScale(currentScale * 1.12);
    const viewport = resolveTransformViewportSize(ref, containerRef.current);
    if (!viewport) return;

    const contentCenterY = (viewport.h / 2 - currentState.positionY) / currentScale;
    const boundedX = clampHorizontalPosition(
      viewport.w,
      PROPOSAL_PAGE_WIDTH,
      nextScale,
      currentState.positionX,
    );
    const newY = Math.min(0, viewport.h / 2 - contentCenterY * nextScale);
    ref.setTransform(boundedX, newY, nextScale, 200, 'easeOut');
    zoomModeRef.current = PROPOSAL_ZOOM_MODES.MANUAL;
    setZoomMode(PROPOSAL_ZOOM_MODES.MANUAL);
    setZoomPercentState(Math.round(nextScale * 100));
  }, []);

  const zoomOut = useCallback(() => {
    const ref = transformRef.current;
    if (!ref) return;

    const currentState = ref.instance?.transformState ?? ref.state;
    if (!currentState || currentState.scale <= 0) return;

    const currentScale = clampScale(currentState.scale);
    const nextScale = clampScale(currentScale / 1.12);
    const viewport = resolveTransformViewportSize(ref, containerRef.current);
    if (!viewport) return;

    const contentCenterY = (viewport.h / 2 - currentState.positionY) / currentScale;
    const boundedX = clampHorizontalPosition(
      viewport.w,
      PROPOSAL_PAGE_WIDTH,
      nextScale,
      currentState.positionX,
    );
    const newY = Math.min(0, viewport.h / 2 - contentCenterY * nextScale);
    ref.setTransform(boundedX, newY, nextScale, 200, 'easeOut');
    zoomModeRef.current = PROPOSAL_ZOOM_MODES.MANUAL;
    setZoomMode(PROPOSAL_ZOOM_MODES.MANUAL);
    setZoomPercentState(Math.round(nextScale * 100));
  }, []);

  const fitPage = useCallback(() => {
    applyFitPage();
  }, [applyFitPage]);

  const fillPage = useCallback(() => {
    applyModeTransform(PROPOSAL_ZOOM_MODES.FILL_PAGE);
  }, [applyModeTransform]);

  const handleSliderChange = useCallback(
    (event) => {
      applyZoomPercent(Number(event.target.value));
    },
    [applyZoomPercent],
  );

  const minPercent = Math.round(PROPOSAL_ZOOM_MIN * 100);
  const maxPercent = Math.round(PROPOSAL_ZOOM_MAX * 100);

  const handleZoomPercentInputChange = useCallback((event) => {
    setZoomPercentInput(event.target.value.replaceAll(/\D/g, ''));
  }, []);

  const commitZoomPercentInput = useCallback(() => {
    const parsed = Number.parseInt(zoomPercentInput, 10);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(maxPercent, Math.max(minPercent, parsed));
      applyZoomPercent(clamped);
      return;
    }
    setZoomPercentInput(String(zoomPercent));
  }, [zoomPercentInput, zoomPercent, minPercent, maxPercent, applyZoomPercent]);

  return useMemo(
    () => ({
      transformRef,
      containerRef,
      wrapperEl,
      handleTransform,
      handleInit,
      handlePanningStop,
      beginProgrammaticNav,
      isCmdOrCtrlZoomWheelActive,
      zoomPercent,
      zoomPercentInput,
      zoomMode,
      setZoomPercent: applyZoomPercent,
      zoomIn,
      zoomOut,
      fitPage,
      fillPage,
      handleSliderChange,
      handleZoomPercentInputChange,
      commitZoomPercentInput,
      minPercent,
      maxPercent,
    }),
    [
      wrapperEl,
      handleTransform,
      handleInit,
      handlePanningStop,
      beginProgrammaticNav,
      zoomPercent,
      zoomPercentInput,
      zoomMode,
      applyZoomPercent,
      zoomIn,
      zoomOut,
      fitPage,
      fillPage,
      handleSliderChange,
      handleZoomPercentInputChange,
      commitZoomPercentInput,
      minPercent,
      maxPercent,
    ],
  );
}
