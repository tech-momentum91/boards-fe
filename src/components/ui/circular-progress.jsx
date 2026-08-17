import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

const clampPercentage = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

/** Badge color names → CSS variables (same as badge.jsx filled variant) */
const BADGE_COLOR_VARS = {
  gray: 'var(--color-faded-base)',
  blue: 'var(--color-information-base)',
  orange: 'var(--color-warning-base)',
  red: 'var(--color-error-base)',
  green: 'var(--color-success-base)',
  yellow: 'var(--color-away-base)',
  purple: 'var(--color-feature-base)',
  sky: 'var(--color-verified-base)',
  pink: 'var(--color-highlighted-base)',
  teal: 'var(--color-stable-base)',
};

/** Resolve color to CSS value; use badge tokens when color is a known name. */
export function resolveBadgeColor(color) {
  if (!color || typeof color !== 'string') return color;
  const name = color.toLowerCase().trim();
  if (BADGE_COLOR_VARS[name]) return BADGE_COLOR_VARS[name];
  return color;
}

const degToRad = (deg) => (deg * Math.PI) / 180;

// Builds a filled sector (pie slice) path for percentage from top, clockwise.
const buildSectorPath = ({ cx, cy, r, percentage }) => {
  const pct = clampPercentage(percentage);
  if (pct <= 0) return null;
  if (pct >= 100) return null; // handled separately (full circle)

  const startAngle = -90; // top
  const endAngle = startAngle + (pct / 100) * 360;
  const largeArcFlag = pct > 50 ? 1 : 0;

  const start = {
    x: cx + r * Math.cos(degToRad(startAngle)),
    y: cy + r * Math.sin(degToRad(startAngle)),
  };
  const end = {
    x: cx + r * Math.cos(degToRad(endAngle)),
    y: cy + r * Math.sin(degToRad(endAngle)),
  };

  // Move to start point, arc to end, line to center, close.
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${cx} ${cy} Z`;
};

/**
 * Generic circular progress indicator.
 *
 * Props:
 * - percentage: number (0-100)
 * - color: any valid CSS color (hex/rgb/hsl/var/currentColor)
 *
 * Optional props:
 * - size: px (number) or any CSS size (string)
 * - variant: 'sector' | 'stroke'
 *
 * Sector variant (matches DevX Figma ticket status icon):
 * - outerStrokeWidth, outerRadius, innerRadius, cx, cy, viewBox
 *
 * Stroke variant (dasharray ring):
 * - strokeWidth (viewBox=100), trackColor, linecap, animate
 */
const CircularProgress = ({
  percentage = 0,
  color = 'currentColor',
  size = 15,
  variant = 'sector',

  // --- sector variant defaults (15x15) ---
  viewBox = '0 0 15 15',
  cx = 7.2,
  cy = 7.2,
  outerRadius = 6.525,
  outerStrokeWidth = 1.35,
  innerRadius = 4.5,

  // --- stroke variant defaults (100x100) ---
  strokeWidth = 10,
  trackColor = 'rgba(134, 140, 152, 0.25)',
  linecap = 'round',
  animate = true,
  className,
  'aria-label': ariaLabel = 'Progress',
  ...rest
}) => {
  const pct = clampPercentage(percentage);
  const resolvedColor = resolveBadgeColor(color);

  const strokeMath = useMemo(() => {
    const r = 50 - strokeWidth / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - pct / 100);
    return { radius: r, circumference: c, dashOffset: offset };
  }, [pct, strokeWidth]);

  const sectorPath = useMemo(() => {
    if (variant !== 'sector') return null;
    return buildSectorPath({ cx, cy, r: innerRadius, percentage: pct });
  }, [variant, cx, cy, innerRadius, pct]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={variant === 'sector' ? viewBox : '0 0 100 100'}
      className={cn('shrink-0', className)}
      role='img'
      aria-label={ariaLabel}
      {...rest}
    >
      {variant === 'sector' ? (
        <>
          {/* Outer ring */}
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill='none'
            stroke={resolvedColor}
            strokeWidth={outerStrokeWidth}
          />

          {/* Inner filled sector (or full circle at 100%) */}
          {pct >= 100 ? (
            <circle cx={cx} cy={cy} r={innerRadius} fill={resolvedColor} />
          ) : sectorPath ? (
            <path d={sectorPath} fill={resolvedColor} />
          ) : null}
        </>
      ) : (
        <>
          <circle
            cx='50'
            cy='50'
            r={strokeMath.radius}
            fill='none'
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx='50'
            cy='50'
            r={strokeMath.radius}
            fill='none'
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeLinecap={linecap}
            strokeDasharray={`${strokeMath.circumference} ${strokeMath.circumference}`}
            strokeDashoffset={strokeMath.dashOffset}
            transform='rotate(-90 50 50)'
            style={
              animate
                ? {
                  transition: 'stroke-dashoffset 200ms ease, stroke 200ms ease',
                }
                : undefined
            }
          />
        </>
      )}
    </svg>
  );
};

export default CircularProgress;
