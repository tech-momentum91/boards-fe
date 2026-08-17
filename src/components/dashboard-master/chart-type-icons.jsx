import React from 'react';

/** Horizontal stacked segments — matches add-widget battery preview / Figma. */
export function BatteryChartTypeIcon({ className, active = false }) {
  const bars = [
    { x: 2, w: 8, color: active ? '#c3cefe' : '#dbeafe' },
    { x: 10.5, w: 4, color: active ? '#9baefd' : '#93c5fd' },
    { x: 15, w: 2.5, color: '#375dfb' },
    { x: 18, w: 4, color: active ? '#5f7dfc' : '#1e3a8a' },
  ];

  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden
    >
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x} y={9} width={bar.w} height={6} rx='1' fill={bar.color} />
      ))}
    </svg>
  );
}
