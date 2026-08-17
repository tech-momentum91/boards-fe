import React from 'react';

/**
 * Vector 1 – vertical connector line with curved end (e.g. reply/thread connector).
 * Inline SVG; use className (e.g. text-[color:var(--color-stroke-soft-200)]) to set stroke color.
 */
const Vector1Icon = ({ className, ...props }) => (
  <svg
    width={13}
    height={43}
    viewBox='0 0 13 43'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    aria-hidden
    {...props}
  >
    <path d='M0.5 0L0.5 35C0.5 38.866 3.63401 42 7.5 42H12.5' stroke='currentColor' />
  </svg>
);

export default Vector1Icon;
