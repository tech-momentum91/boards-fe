import React from 'react';

/**
 * Pending/timer status icon: circle with thick stroke + filled wedge. Fill amount is dynamic by status.
 * @param {number} [fillFraction=0.25] - Fraction of circle filled (0.25 = 1/4, 0.5 = 1/2, 0.75 = 3/4). Uses currentColor.
 */
export function PendingStatusIcon({ size = 18, className, fillFraction = 0.25, ...props }) {
  const r = 8;
  const cx = 12;
  const cy = 12;
  // Arc from top (12 o'clock) clockwise; angle = fillFraction * 2π
  const angle = Math.min(1, Math.max(0, fillFraction)) * 2 * Math.PI;
  const endX = cx + r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = fillFraction > 0.5 ? 1 : 0;
  const wedgePath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden
      {...props}
    >
      <path d={wedgePath} fill='currentColor' />
      <circle cx={cx} cy={cy} r={r} stroke='currentColor' strokeWidth='2' fill='none' />
    </svg>
  );
}
