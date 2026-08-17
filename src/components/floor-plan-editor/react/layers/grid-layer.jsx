import React from 'react';
import { Line } from 'react-konva';

/**
 * Light grid in image pixel space (inside world Group).
 */
export function GridLayer({ width, height, gridSize = 40, stroke = 'rgba(148, 163, 184, 0.35)' }) {
  if (!width || !height || gridSize < 4) return null;
  const verticals = Math.ceil(width / gridSize) + 1;
  const horizontals = Math.ceil(height / gridSize) + 1;
  return (
    <>
      {Array.from({ length: verticals }, (_, i) => {
        const x = Math.min(i * gridSize, width);
        return (
          <Line
            key={`g-v-${x}`}
            points={[x, 0, x, height]}
            stroke={stroke}
            strokeWidth={1}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
      {Array.from({ length: horizontals }, (_, i) => {
        const y = Math.min(i * gridSize, height);
        return (
          <Line
            key={`g-h-${y}`}
            points={[0, y, width, y]}
            stroke={stroke}
            strokeWidth={1}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </>
  );
}
