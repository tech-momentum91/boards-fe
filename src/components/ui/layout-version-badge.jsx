import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Small pill showing a layout's display version (e.g. "V2").
 * Shared between comment items and task/activity history rows so the
 * styling lives in one place.
 */
const LayoutVersionBadge = ({ version, className }) => {
  if (!version) return null;

  return (
    <span
      className={cn(
        'shrink-0 rounded-md bg-bg-weak-100 px-1.5 py-0.5 text-[11px] font-medium text-text-sub-500',
        className,
      )}
    >
      {version}
    </span>
  );
};

export default LayoutVersionBadge;
