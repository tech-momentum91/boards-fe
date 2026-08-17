import React from 'react';

import { cn } from '@/utils/cn';

export function GlassPanel({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stroke-soft-200/80 bg-bg-white-0/75 shadow-lg backdrop-blur-md',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
