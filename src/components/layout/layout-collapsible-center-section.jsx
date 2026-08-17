import React from 'react';
import { RiArrowUpSLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

/**
 * Collapsible section header for center-grouped layout listings.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   isCollapsed: boolean,
 *   onToggle: () => void,
 *   children?: React.ReactNode,
 * }} props
 */
export default function LayoutCollapsibleCenterSection({
  title,
  subtitle,
  icon: Icon,
  isCollapsed,
  onToggle,
  children,
}) {
  return (
    <section className='flex flex-col gap-3'>
      <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center gap-2 text-left'
        aria-expanded={!isCollapsed}
      >
        {Icon ? <Icon className='size-4 shrink-0 text-text-sub-500' aria-hidden /> : null}
        <span className='label-small font-semibold text-text-main-900'>{title}</span>
        {subtitle ? (
          <span className='text-paragraph-xs text-text-soft-400'>({subtitle})</span>
        ) : null}
        <RiArrowUpSLine
          className={cn(
            'ml-1 size-4 shrink-0 text-text-sub-500 transition-transform',
            !isCollapsed && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {!isCollapsed ? null : children}
    </section>
  );
}
