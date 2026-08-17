import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { distanceNormPx } from '../core/geometry.js';

const CLOSE_SNAP_PX = 8;
const DRAG_THRESHOLD_PX = 4;

/**
 * Manages all drawing-mode state for the Bézier pen tool.
 * Call onMouseDown/onMouseMove/onMouseUp from the editor's stage handlers.
 * Call finishBezier() on Enter / double-click.
 * Call discardBezier() on Escape / tool switch.
 *
 * @param {{ imageWidth: number, imageHeight: number, addAnnotation: Function, onBeforeAnnotationAdd?: Function }} opts
 */
export function useBezierDrawing({
  imageWidth,
  imageHeight,
  addAnnotation,
  onBeforeAnnotationAdd,
}) {
  const [draftBezierPoints, setDraftBezierPoints] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [livePos, setLivePos] = useState(null);

  const draftRef = useRef(draftBezierPoints);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const altHeldRef = useRef(false);

  draftRef.current = draftBezierPoints;

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Alt') altHeldRef.current = true;
    };
    const up = (e) => {
      if (e.key === 'Alt') altHeldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const _commit = useCallback(
    (closed) => {
      const pts = draftRef.current;
      if (pts.length < 2) {
        setDraftBezierPoints([]);
        return;
      }
      const candidate = { type: 'pen', bezierPoints: pts, closed };
      const anchor = pts[0];
      if (
        onBeforeAnnotationAdd &&
        !onBeforeAnnotationAdd({
          type: 'pen',
          nx: Number(anchor?.x ?? 0),
          ny: Number(anchor?.y ?? 0),
          annotation: candidate,
        })
      ) {
        return;
      }
      addAnnotation(candidate);
      setDraftBezierPoints([]);
      setIsDragging(false);
      setDragStart(null);
      setLivePos(null);
      draggingRef.current = false;
      dragStartRef.current = null;
    },
    [addAnnotation, onBeforeAnnotationAdd],
  );

  const onMouseDown = useCallback(
    (n) => {
      const pts = draftRef.current;
      if (pts.length >= 2) {
        const first = pts[0];
        const d = distanceNormPx(n.nx, n.ny, first.x, first.y, imageWidth, imageHeight);
        if (d <= CLOSE_SNAP_PX) {
          _commit(true);
          return;
        }
      }
      dragStartRef.current = { nx: n.nx, ny: n.ny };
      draggingRef.current = false;
      setDragStart({ nx: n.nx, ny: n.ny });
      setIsDragging(false);
    },
    [imageWidth, imageHeight, _commit],
  );

  const onMouseMove = useCallback(
    (n) => {
      setLivePos({ nx: n.nx, ny: n.ny });
      if (!dragStartRef.current) return;
      const d = distanceNormPx(
        n.nx,
        n.ny,
        dragStartRef.current.nx,
        dragStartRef.current.ny,
        imageWidth,
        imageHeight,
      );
      if (d > DRAG_THRESHOLD_PX) {
        draggingRef.current = true;
        setIsDragging(true);
      }
    },
    [imageWidth, imageHeight],
  );

  const onMouseUp = useCallback((n) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;

    const pos = n ?? start;
    const wasDragging = draggingRef.current;
    draggingRef.current = false;

    if (wasDragging) {
      const dx = pos.nx - start.nx;
      const dy = pos.ny - start.ny;
      const handleOut = { x: start.nx + dx, y: start.ny + dy };
      const handleIn = altHeldRef.current ? null : { x: start.nx - dx, y: start.ny - dy };
      setDraftBezierPoints((prev) => [
        ...prev,
        { x: start.nx, y: start.ny, handleIn, handleOut, pointType: 'curve' },
      ]);
    } else {
      setDraftBezierPoints((prev) => [
        ...prev,
        { x: start.nx, y: start.ny, handleIn: null, handleOut: null, pointType: 'corner' },
      ]);
    }
    setDragStart(null);
    setIsDragging(false);
  }, []);

  const finishBezier = useCallback(() => _commit(false), [_commit]);

  const discardBezier = useCallback(() => {
    setDraftBezierPoints([]);
    setIsDragging(false);
    setDragStart(null);
    setLivePos(null);
    draggingRef.current = false;
    dragStartRef.current = null;
  }, []);

  const draftState = useMemo(
    () => ({ points: draftBezierPoints, dragStart, isDragging, livePos }),
    [draftBezierPoints, dragStart, isDragging, livePos],
  );

  const isNearFirstPoint = useMemo(() => {
    if (draftBezierPoints.length < 2 || !livePos) return false;
    const first = draftBezierPoints[0];
    return (
      distanceNormPx(livePos.nx, livePos.ny, first.x, first.y, imageWidth, imageHeight) <=
      CLOSE_SNAP_PX
    );
  }, [draftBezierPoints, livePos, imageWidth, imageHeight]);

  const hasDraft = draftBezierPoints.length > 0 || dragStart != null;

  return {
    draftState,
    hasDraft,
    isNearFirstPoint,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    finishBezier,
    discardBezier,
  };
}
