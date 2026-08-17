/**
 * Geometry helpers for Bézier pen tool — pure math, no React/Konva dependencies.
 * All stored coordinates are normalized (0–1); world-pixel coords are runtime only.
 */

/**
 * Convert normalized bezierPoints to world-pixel coords.
 * @param {object[]} bezierPoints
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function bezierPointsToWorld(bezierPoints, imageW, imageH) {
  return bezierPoints.map((pt) => ({
    x: pt.x * imageW,
    y: pt.y * imageH,
    handleIn: pt.handleIn ? { x: pt.handleIn.x * imageW, y: pt.handleIn.y * imageH } : null,
    handleOut: pt.handleOut ? { x: pt.handleOut.x * imageW, y: pt.handleOut.y * imageH } : null,
    pointType: pt.pointType,
  }));
}

/**
 * Draw a bezier path onto a Konva/canvas2d context.
 * Does NOT call fillStrokeShape — caller is responsible.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} worldPoints  — already in pixels
 * @param {boolean} closed
 */
export function buildBezierPath(ctx, worldPoints, closed) {
  if (worldPoints.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(worldPoints[0].x, worldPoints[0].y);
  for (let i = 1; i < worldPoints.length; i++) {
    const prev = worldPoints[i - 1];
    const curr = worldPoints[i];
    if (prev.handleOut && curr.handleIn) {
      ctx.bezierCurveTo(
        prev.handleOut.x,
        prev.handleOut.y,
        curr.handleIn.x,
        curr.handleIn.y,
        curr.x,
        curr.y,
      );
    } else if (prev.handleOut) {
      ctx.quadraticCurveTo(prev.handleOut.x, prev.handleOut.y, curr.x, curr.y);
    } else if (curr.handleIn) {
      ctx.quadraticCurveTo(curr.handleIn.x, curr.handleIn.y, curr.x, curr.y);
    } else {
      ctx.lineTo(curr.x, curr.y);
    }
  }
  if (closed) ctx.closePath();
}

/**
 * Find the closest point on a bezier path to a world-pixel position.
 * Samples each segment at N_SAMPLES evenly-spaced t values.
 * @param {object[]} worldPoints
 * @param {number} px  world pixels
 * @param {number} py
 * @param {boolean} closed
 * @returns {{ segIndex: number, t: number, x: number, y: number, dist: number } | null}
 */
export function closestSegmentPoint(worldPoints, px, py, closed) {
  const N_SAMPLES = 20;
  const n = worldPoints.length;
  const numSegs = closed ? n : n - 1;
  if (numSegs <= 0) return null;

  let best = null;
  for (let s = 0; s < numSegs; s++) {
    const prev = worldPoints[s];
    const curr = worldPoints[(s + 1) % n];
    const cp1 = prev.handleOut ?? prev;
    const cp2 = curr.handleIn ?? curr;

    for (let k = 0; k <= N_SAMPLES; k++) {
      const t = k / N_SAMPLES;
      const mt = 1 - t;
      const x =
        mt * mt * mt * prev.x +
        3 * mt * mt * t * cp1.x +
        3 * mt * t * t * cp2.x +
        t * t * t * curr.x;
      const y =
        mt * mt * mt * prev.y +
        3 * mt * mt * t * cp1.y +
        3 * mt * t * t * cp2.y +
        t * t * t * curr.y;
      const dist = Math.hypot(x - px, y - py);
      if (!best || dist < best.dist) best = { segIndex: s, t, x, y, dist };
    }
  }
  return best;
}

/**
 * Insert a new anchor into bezierPoints at segment segIndex, parameter t (0–1).
 * Uses De Casteljau subdivision. Works for both open and closed paths.
 * @param {object[]} bezierPoints  — normalized
 * @param {number} segIndex
 * @param {number} t
 * @param {number} imageW
 * @param {number} imageH
 * @returns {object[]}
 */
export function insertPoint(bezierPoints, segIndex, t, imageW, imageH) {
  const iw = imageW;
  const ih = imageH;
  const n = bezierPoints.length;
  const nextIndex = (segIndex + 1) % n;
  const prevN = bezierPoints[segIndex];
  const currN = bezierPoints[nextIndex];

  const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

  const p0 = { x: prevN.x * iw, y: prevN.y * ih };
  const p3 = { x: currN.x * iw, y: currN.y * ih };
  const p1 = prevN.handleOut ? { x: prevN.handleOut.x * iw, y: prevN.handleOut.y * ih } : { ...p0 };
  const p2 = currN.handleIn ? { x: currN.handleIn.x * iw, y: currN.handleIn.y * ih } : { ...p3 };

  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const mid = lerp(r0, r1, t);

  const toNorm = (wp) => ({ x: wp.x / iw, y: wp.y / ih });

  const result = [...bezierPoints];
  result[segIndex] = { ...prevN, handleOut: prevN.handleOut ? toNorm(q0) : null };
  result[nextIndex] = { ...currN, handleIn: currN.handleIn ? toNorm(q2) : null };
  result.splice(segIndex + 1, 0, {
    x: mid.x / iw,
    y: mid.y / ih,
    handleIn: toNorm(r0),
    handleOut: toNorm(r1),
    pointType: 'curve',
  });
  return result;
}

/**
 * Synthesize smooth handles for a corner point being converted to a curve.
 * Direction is derived from neighbours; length is 1/3 of neighbour distance.
 * Returns normalized coords.
 * @param {object[]} bezierPoints  — normalized
 * @param {number} index
 * @returns {{ handleIn: {x,y}|null, handleOut: {x,y}|null }}
 */
export function synthesizeHandles(bezierPoints, index) {
  const pt = bezierPoints[index];
  const prev = index > 0 ? bezierPoints[index - 1] : null;
  const next = index < bezierPoints.length - 1 ? bezierPoints[index + 1] : null;

  const fromX = prev?.x ?? pt.x;
  const fromY = prev?.y ?? pt.y;
  const toX = next?.x ?? pt.x;
  const toY = next?.y ?? pt.y;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { handleIn: null, handleOut: null };

  const ux = dx / len;
  const uy = dy / len;

  const dPrev = prev ? Math.hypot(pt.x - prev.x, pt.y - prev.y) : 0;
  const dNext = next ? Math.hypot(next.x - pt.x, next.y - pt.y) : 0;

  return {
    handleIn: prev ? { x: pt.x - ux * (dPrev / 3), y: pt.y - uy * (dPrev / 3) } : null,
    handleOut: next ? { x: pt.x + ux * (dNext / 3), y: pt.y + uy * (dNext / 3) } : null,
  };
}
