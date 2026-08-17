import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Rect, Shape } from 'react-konva';

import {
  bezierPointsToWorld,
  buildBezierPath,
  closestSegmentPoint,
  insertPoint,
  synthesizeHandles,
} from '../../core/bezier.js';
import { clamp01 } from '../../core/geometry.js';

const ANCHOR_SIZE = 9;
const HANDLE_RADIUS = 5;
const ANCHOR_FILL = '#fff';
const ANCHOR_STROKE = '#6366f1';
const HANDLE_FILL = '#6366f1';
const SEL_FILL = '#6366f1';
const LINE_COLOR = 'rgba(99,102,241,0.6)';

/**
 * Interactive Konva Layer for post-draw bezier handle editing.
 * Supports real-time drag preview, corner↔curve toggle, segment insertion, and deletion.
 *
 * @param {{ annotation: object, imageW: number, imageH: number, onUpdate: Function }} props
 */
export function BezierHandleEditor({ annotation, imageW, imageH, onUpdate }) {
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  // Local live bezierPoints during drag — avoids flooding undo history and prevents React
  // re-render lag from making the path appear to snap only on mouse-up.
  const [livePts, setLivePts] = useState(null);
  const altHeldRef = useRef(false);
  // Stores the bezierPoints snapshot at the start of each drag so all moves compute from a
  // stable base (avoids float drift from incremental deltas).
  const dragStartPtsRef = useRef(null);

  const pts = annotation.bezierPoints;
  // During an active drag, use the live preview; otherwise use the committed annotation state.
  const currentPts = livePts ?? pts;
  const currentPtsRef = useRef(currentPts);
  currentPtsRef.current = currentPts;

  // Drop any stale live state when the annotation identity changes.
  useEffect(() => {
    setLivePts(null);
    dragStartPtsRef.current = null;
  }, [annotation.id]);

  useEffect(() => {
    const kd = (e) => {
      if (e.key === 'Alt') altHeldRef.current = true;
    };
    const ku = (e) => {
      if (e.key === 'Alt') altHeldRef.current = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  useEffect(() => {
    if (selectedAnchor === null) return;
    const onKey = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      e.preventDefault();
      const p = currentPtsRef.current;
      if (p.length <= 2) return;
      const next = p.filter((_, i) => i !== selectedAnchor);
      setSelectedAnchor(null);
      onUpdate(annotation.id, { bezierPoints: next });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedAnchor, annotation.id, onUpdate]);

  const isClosed = annotation.closed ?? false;
  const worldPts = useMemo(
    () => bezierPointsToWorld(currentPts, imageW, imageH),
    [currentPts, imageW, imageH],
  );

  // ── Anchor drag ────────────────────────────────────────────────────────────

  const handleAnchorDragStart = useCallback((e, index) => {
    dragStartPtsRef.current = currentPtsRef.current;
  }, []);

  const handleAnchorDragMove = useCallback(
    (e, index) => {
      const initPts = dragStartPtsRef.current;
      if (!initPts) return;
      const node = e.target;
      const initPt = initPts[index];
      const newNx = clamp01((node.x() + ANCHOR_SIZE / 2) / imageW);
      const newNy = clamp01((node.y() + ANCHOR_SIZE / 2) / imageH);
      const dx = newNx - initPt.x;
      const dy = newNy - initPt.y;
      setLivePts(
        initPts.map((pt, i) => {
          if (i !== index) return pt;
          return {
            ...pt,
            x: newNx,
            y: newNy,
            handleIn: pt.handleIn
              ? { x: clamp01(pt.handleIn.x + dx), y: clamp01(pt.handleIn.y + dy) }
              : null,
            handleOut: pt.handleOut
              ? { x: clamp01(pt.handleOut.x + dx), y: clamp01(pt.handleOut.y + dy) }
              : null,
          };
        }),
      );
    },
    [imageW, imageH],
  );

  const handleAnchorDragEnd = useCallback(
    (e, index) => {
      const initPts = dragStartPtsRef.current ?? currentPtsRef.current;
      dragStartPtsRef.current = null;
      const node = e.target;
      const initPt = initPts[index];
      const newNx = clamp01((node.x() + ANCHOR_SIZE / 2) / imageW);
      const newNy = clamp01((node.y() + ANCHOR_SIZE / 2) / imageH);
      const dx = newNx - initPt.x;
      const dy = newNy - initPt.y;
      const updated = initPts.map((pt, i) => {
        if (i !== index) return pt;
        return {
          ...pt,
          x: newNx,
          y: newNy,
          handleIn: pt.handleIn
            ? { x: clamp01(pt.handleIn.x + dx), y: clamp01(pt.handleIn.y + dy) }
            : null,
          handleOut: pt.handleOut
            ? { x: clamp01(pt.handleOut.x + dx), y: clamp01(pt.handleOut.y + dy) }
            : null,
        };
      });
      // Reset Konva node to the final position so it aligns once livePts is cleared.
      node.position({ x: newNx * imageW - ANCHOR_SIZE / 2, y: newNy * imageH - ANCHOR_SIZE / 2 });
      setLivePts(null);
      onUpdate(annotation.id, { bezierPoints: updated });
    },
    [imageW, imageH, annotation.id, onUpdate],
  );

  const handleAnchorClick = useCallback(
    (e, index) => {
      e.cancelBubble = true;
      setSelectedAnchor(index);
      const p = currentPtsRef.current;
      const pt = p[index];
      if (pt.pointType === 'curve') {
        const updated = p.map((q, i) =>
          i === index ? { ...q, handleIn: null, handleOut: null, pointType: 'corner' } : q,
        );
        onUpdate(annotation.id, { bezierPoints: updated });
      } else {
        const { handleIn, handleOut } = synthesizeHandles(p, index);
        const updated = p.map((q, i) =>
          i === index ? { ...q, handleIn, handleOut, pointType: 'curve' } : q,
        );
        onUpdate(annotation.id, { bezierPoints: updated });
      }
    },
    [annotation.id, onUpdate],
  );

  // ── Handle drag ────────────────────────────────────────────────────────────

  const handleHandleDragMove = useCallback(
    (e, anchorIndex, which) => {
      const node = e.target;
      const nx = clamp01(node.x() / imageW);
      const ny = clamp01(node.y() / imageH);
      const p = currentPtsRef.current;
      setLivePts(
        p.map((pt, i) => {
          if (i !== anchorIndex) return pt;
          const anchor = { x: pt.x, y: pt.y };
          if (which === 'out') {
            return {
              ...pt,
              handleOut: { x: nx, y: ny },
              handleIn: altHeldRef.current
                ? pt.handleIn
                : { x: clamp01(2 * anchor.x - nx), y: clamp01(2 * anchor.y - ny) },
            };
          }
          return {
            ...pt,
            handleIn: { x: nx, y: ny },
            handleOut: altHeldRef.current
              ? pt.handleOut
              : { x: clamp01(2 * anchor.x - nx), y: clamp01(2 * anchor.y - ny) },
          };
        }),
      );
    },
    [imageW, imageH],
  );

  const handleHandleDragEnd = useCallback(
    (e, anchorIndex, which) => {
      const node = e.target;
      const nx = clamp01(node.x() / imageW);
      const ny = clamp01(node.y() / imageH);
      const p = currentPtsRef.current;
      const updated = p.map((pt, i) => {
        if (i !== anchorIndex) return pt;
        const anchor = { x: pt.x, y: pt.y };
        if (which === 'out') {
          return {
            ...pt,
            handleOut: { x: nx, y: ny },
            handleIn: altHeldRef.current
              ? pt.handleIn
              : { x: clamp01(2 * anchor.x - nx), y: clamp01(2 * anchor.y - ny) },
          };
        }
        return {
          ...pt,
          handleIn: { x: nx, y: ny },
          handleOut: altHeldRef.current
            ? pt.handleOut
            : { x: clamp01(2 * anchor.x - nx), y: clamp01(2 * anchor.y - ny) },
        };
      });
      // Snap the Konva node back to the final normalized position.
      node.position({ x: nx * imageW, y: ny * imageH });
      setLivePts(null);
      onUpdate(annotation.id, { bezierPoints: updated });
    },
    [imageW, imageH, annotation.id, onUpdate],
  );

  // ── Segment click (insert point) ───────────────────────────────────────────

  const handlePathClick = useCallback(
    (e) => {
      e.cancelBubble = true;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      const result = closestSegmentPoint(worldPts, pos.x, pos.y, isClosed);
      if (!result || result.dist > 10) return;
      const newPts = insertPoint(currentPtsRef.current, result.segIndex, result.t, imageW, imageH);
      onUpdate(annotation.id, { bezierPoints: newPts });
    },
    [worldPts, isClosed, imageW, imageH, annotation.id, onUpdate],
  );

  return (
    <Layer>
      {/* Invisible wide-hit path for segment insertion */}
      <Shape
        sceneFunc={(ctx, shape) => {
          buildBezierPath(ctx, worldPts, isClosed);
          ctx.fillStrokeShape(shape);
        }}
        fill='transparent'
        stroke='transparent'
        hitStrokeWidth={12}
        onClick={handlePathClick}
        onTap={handlePathClick}
      />

      {worldPts.map((wp, i) => {
        const isSelected = selectedAnchor === i;
        return (
          <Group key={i}>
            {wp.handleIn && (
              <>
                <Line
                  points={[wp.handleIn.x, wp.handleIn.y, wp.x, wp.y]}
                  stroke={LINE_COLOR}
                  strokeWidth={1}
                  listening={false}
                />
                <Circle
                  x={wp.handleIn.x}
                  y={wp.handleIn.y}
                  radius={HANDLE_RADIUS}
                  fill={HANDLE_FILL}
                  stroke='#fff'
                  strokeWidth={1}
                  draggable
                  onDragMove={(e) => handleHandleDragMove(e, i, 'in')}
                  onDragEnd={(e) => handleHandleDragEnd(e, i, 'in')}
                  onClick={(e) => {
                    e.cancelBubble = true;
                  }}
                />
              </>
            )}
            {wp.handleOut && (
              <>
                <Line
                  points={[wp.x, wp.y, wp.handleOut.x, wp.handleOut.y]}
                  stroke={LINE_COLOR}
                  strokeWidth={1}
                  listening={false}
                />
                <Circle
                  x={wp.handleOut.x}
                  y={wp.handleOut.y}
                  radius={HANDLE_RADIUS}
                  fill={HANDLE_FILL}
                  stroke='#fff'
                  strokeWidth={1}
                  draggable
                  onDragMove={(e) => handleHandleDragMove(e, i, 'out')}
                  onDragEnd={(e) => handleHandleDragEnd(e, i, 'out')}
                  onClick={(e) => {
                    e.cancelBubble = true;
                  }}
                />
              </>
            )}
            <Rect
              x={wp.x - ANCHOR_SIZE / 2}
              y={wp.y - ANCHOR_SIZE / 2}
              width={ANCHOR_SIZE}
              height={ANCHOR_SIZE}
              fill={isSelected ? SEL_FILL : ANCHOR_FILL}
              stroke={ANCHOR_STROKE}
              strokeWidth={1.5}
              draggable
              onDragStart={(e) => handleAnchorDragStart(e, i)}
              onDragMove={(e) => handleAnchorDragMove(e, i)}
              onDragEnd={(e) => handleAnchorDragEnd(e, i)}
              onClick={(e) => handleAnchorClick(e, i)}
              onTap={(e) => handleAnchorClick(e, i)}
            />
          </Group>
        );
      })}
    </Layer>
  );
}
