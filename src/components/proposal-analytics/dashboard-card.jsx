import React from 'react';

import { cn } from '@/utils/cn';

export function DashboardCard({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default DashboardCard;
