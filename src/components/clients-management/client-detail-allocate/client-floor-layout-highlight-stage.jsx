import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Image, Layer, Line, Stage, Text } from 'react-konva';

import { toLayoutAssetUrl } from '@/utils/layout-asset-url';

const STROKE_PALETTE = ['#2563eb', '#16a34a', '#c026d3', '#ea580c', '#0891b2'];

function pickPoints(space) {
  const lc = space?.layout_coordinate ?? space?.coordinates;
  const pts = lc && typeof lc === 'object' ? lc.points : null;
  return Array.isArray(pts) ? pts : [];
}

function polygonCentroidPx(points, stageW, stageH) {
  if (!Array.isArray(points) || points.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of points) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const nx = Number(p[0]);
    const ny = Number(p[1]);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;
    sx += nx * stageW;
    sy += ny * stageH;
    n += 1;
  }
  if (n === 0) return null;
  return { x: sx / n, y: sy / n };
}

/**
 * Full-floor image with heavy blur; allocated regions stay sharp (clipped).
 *
 * @param {{ layoutImagePath: string, spaces?: object[] }} props
 */
export default function ClientFloorLayoutHighlightStage({
  layoutImagePath,
  spaces = [],
  className = '',
}) {
  const wrapRef = useRef(null);
  const blurImgRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 900, h: 520 });
  const [imgEl, setImgEl] = useState(null);

  const src = useMemo(() => toLayoutAssetUrl(layoutImagePath), [layoutImagePath]);

  useEffect(() => {
    if (!src) {
      setImgEl(null);
      return undefined;
    }
    const img = new window.Image();
    const onLoad = () => setImgEl(img);
    const onErr = () => setImgEl(null);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onErr);
    img.src = src;
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onErr);
    };
  }, [src]);

  const aspect =
    imgEl?.naturalWidth && imgEl?.naturalHeight ? imgEl.naturalWidth / imgEl.naturalHeight : 16 / 9;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr?.width) return;
      const w = Math.max(320, Math.floor(cr.width));
      const h = Math.max(200, Math.round(w / aspect));
      setStageSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  useEffect(() => {
    const node = blurImgRef.current;
    if (!node || !imgEl) return;
    node.clearCache();
    node.cache();
    node.filters([Konva.Filters.Blur]);
    node.blurRadius(18);
    node.getLayer()?.batchDraw();
  }, [imgEl, stageSize.w, stageSize.h]);

  const normalizedSpaces = useMemo(() => {
    const list = Array.isArray(spaces) ? spaces : [];
    return list
      .map((space, index) => {
        const points = pickPoints(space);
        return {
          key: String(space?.space_id ?? space?.name ?? index),
          label: String(space?.space_name ?? space?.inventory_name ?? space?.space_id ?? '').trim(),
          points,
          stroke: STROKE_PALETTE[index % STROKE_PALETTE.length],
        };
      })
      .filter((s) => s.points.length >= 3);
  }, [spaces]);

  const clipFuncForPoints = useCallback(
    (points) => {
      return (ctx) => {
        ctx.beginPath();
        points.forEach(([nx, ny], idx) => {
          const px = Number(nx) * stageSize.w;
          const py = Number(ny) * stageSize.h;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      };
    },
    [stageSize.w, stageSize.h],
  );

  if (!layoutImagePath) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600 ${className}`}
      >
        No layout image for this floor.
      </div>
    );
  }

  if (!imgEl) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600 ${className}`}
      >
        Loading floor plan…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`w-full ${className}`}>
      <Stage
        width={stageSize.w}
        height={stageSize.h}
        className='rounded-xl border border-stroke-soft-200'
      >
        <Layer listening={false}>
          <Image
            ref={blurImgRef}
            image={imgEl}
            x={0}
            y={0}
            width={stageSize.w}
            height={stageSize.h}
            listening={false}
          />
        </Layer>
        <Layer listening={false}>
          {normalizedSpaces.map((space) => (
            <Group key={space.key} clipFunc={clipFuncForPoints(space.points)} listening={false}>
              <Image
                image={imgEl}
                x={0}
                y={0}
                width={stageSize.w}
                height={stageSize.h}
                listening={false}
              />
            </Group>
          ))}
        </Layer>
        <Layer listening={false}>
          {normalizedSpaces.map((space) => {
            const flat = space.points.flatMap(([nx, ny]) => [
              Number(nx) * stageSize.w,
              Number(ny) * stageSize.h,
            ]);
            const c = polygonCentroidPx(space.points, stageSize.w, stageSize.h);
            return (
              <Group key={`${space.key}-outline`}>
                <Line
                  points={flat}
                  closed
                  stroke={space.stroke}
                  strokeWidth={2}
                  fill='rgba(37, 99, 235, 0.12)'
                  listening={false}
                />
                {c && space.label ? (
                  <Text
                    x={c.x - 72}
                    y={c.y - 10}
                    width={144}
                    align='center'
                    text={space.label}
                    fontSize={11}
                    fontStyle='600'
                    fill='#0f172a'
                    listening={false}
                  />
                ) : null}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
