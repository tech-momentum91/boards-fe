import React, { memo, useMemo } from 'react';

import * as Button from '@/components/ui/button';
import { cn } from '@/utils/cn';

/**
 * Floating family switcher for Project BOQ fullscreen (Figma 34910:266984).
 * Main / Design / Additional BOQ pills — no Raise PO in BOQ.
 */
const ProjectBoqFullscreenFamilyDock = memo(({ members = [], activeId, onSelect, className }) => {
  const options = useMemo(
    () =>
      members.map((member) => ({
        id: member.id || member.code,
        label: member.badgeLabel || member.familyLabel || member.boqName,
        member,
      })),
    [members],
  );

  if (options.length === 0) return null;

  return (
    <div className={cn('pointer-events-none sticky bottom-4 z-20 flex justify-center', className)}>
      <div className='pointer-events-auto flex items-center rounded-xl border border-stroke-soft-200/60 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
        <div className='flex items-center gap-1.5 p-1.5'>
          {options.map((option) => {
            const isActive = option.id === activeId;
            return (
              <Button.Root
                key={option.id}
                type='button'
                variant='neutral'
                mode={isActive ? 'lighter' : 'stroke'}
                size='medium'
                className={cn(
                  'h-8 shrink-0 gap-0.5 px-1.5',
                  isActive
                    ? 'border-transparent bg-bg-weak-100 text-text-main-900 shadow-none'
                    : 'shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                )}
                aria-pressed={isActive}
                onClick={() => onSelect?.(option.member)}
              >
                <span
                  className={cn(
                    'px-1 text-label-sm font-medium',
                    isActive ? 'text-text-main-900' : 'text-text-sub-500',
                  )}
                >
                  {option.label}
                </span>
              </Button.Root>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ProjectBoqFullscreenFamilyDock.displayName = 'ProjectBoqFullscreenFamilyDock';

export default ProjectBoqFullscreenFamilyDock;
