import React from 'react';
import { cn } from '@/utils/cn';
import { darkenHex } from '@/components/crm-leads/constants';

/** Shared pipeline / stage / status colour pill (lead table, edit popover, lifecycle). */
export function StageColorPill({ value, stageColor, className }) {
  const display = value && value !== '-' ? String(value).trim() : '';
  const pillClass = cn(
    'inline-flex min-w-0 max-w-full items-center justify-center rounded-[999px] px-2.5 py-1 text-xs font-medium leading-normal text-center',
    className,
  );
  const labelClass = 'block min-w-0 max-w-full truncate';

  if (!display) {
    return (
      <span
        className={cn(
          pillClass,
          'border border-stroke-soft-200 bg-white text-paragraph-xs text-text-sub-600',
        )}
      >
        -
      </span>
    );
  }
  if (!stageColor) {
    return (
      <span
        title={display}
        className={cn(
          pillClass,
          'border border-stroke-soft-200 bg-white text-paragraph-xs text-text-sub-600',
        )}
      >
        <span className={labelClass}>{display}</span>
      </span>
    );
  }
  const bg = stageColor.length === 7 ? `${stageColor}28` : `${stageColor}20`;
  const textColor = stageColor.length === 7 ? darkenHex(stageColor, 0.6) : stageColor;
  return (
    <span
      title={display}
      className={pillClass}
      style={{ backgroundColor: bg, color: textColor }}
    >
      <span className={labelClass}>{display}</span>
    </span>
  );
}
