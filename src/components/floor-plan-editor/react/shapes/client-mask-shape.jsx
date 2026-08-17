import React, { useMemo } from 'react';
import { Shape } from 'react-konva';

/**
 * Konva Shape that dims the entire canvas except allocated polygon regions.
 * Uses even-odd fill rule: outer rect fills dark, polygon sub-paths punch holes.
 *
 * @param {{ imageWidth: number, imageHeight: number, spaceAnnotations: object[], opacity?: number }} props
 */
export function ClientMaskShape({ imageWidth, imageHeight, spaceAnnotations, opacity = 0.78 }) {
  const allocatedPolygons = useMemo(
    () =>
      spaceAnnotations.flatMap((a) => {
        if (a.type === 'polygon' && Array.isArray(a.points) && a.points.length >= 6) {
          return [a.points];
        }
        if (a.type === 'rectangle') {
          const { x = 0, y = 0, width = 0, height = 0 } = a;
          if (!(width > 0 && height > 0)) return [];
          return [[x, y, x + width, y, x + width, y + height, x, y + height]];
        }
        return [];
      }),
    [spaceAnnotations],
  );

  const sceneFunc = useMemo(
    () => (ctx) => {
      ctx.beginPath();
      ctx.rect(0, 0, imageWidth, imageHeight);
      for (const pts of allocatedPolygons) {
        ctx.moveTo(pts[0] * imageWidth, pts[1] * imageHeight);
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(pts[i] * imageWidth, pts[i + 1] * imageHeight);
        }
        ctx.closePath();
      }
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.fill('evenodd');
    },
    [allocatedPolygons, imageWidth, imageHeight, opacity],
  );

  if (!imageWidth || !imageHeight) return null;

  return (
    <Shape sceneFunc={sceneFunc} hitFunc={() => {}} listening={false} perfectDrawEnabled={false} />
  );
}
