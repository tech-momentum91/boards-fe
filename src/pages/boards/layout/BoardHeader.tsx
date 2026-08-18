import React from 'react';
import { RiSearchLine, RiMenuFoldLine, RiMenuUnfoldLine } from 'react-icons/ri';

import * as CompactButton from '@/components/ui/compact-button';

export default function BoardHeader({
  selectedItem,
  onOpenSearch,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) {
  const title = selectedItem?.label ?? 'Boards';
  const ToggleIcon = isSidebarCollapsed ? RiMenuUnfoldLine : RiMenuFoldLine;

  return (
    <header className='grid h-12 shrink-0 grid-cols-3 items-center border-b border-stroke-soft-200 bg-bg-white-0 px-4'>
      <div className='flex min-w-0 items-center gap-3 justify-self-start'>
        <CompactButton.Root
          variant='secondary'
          size='medium'
          className='rounded-full'
          type='button'
          onClick={() => onToggleSidebar?.()}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={!isSidebarCollapsed}
        >
          <CompactButton.Icon as={ToggleIcon} />
        </CompactButton.Root>

        <h1 className='truncate text-label-lg font-medium text-text-main-900'>{title}</h1>
      </div>

      <div className='w-full max-w-md justify-self-center px-3'>
        <button
          type='button'
          onClick={onOpenSearch}
          className='flex h-8 w-full items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 shadow-sm transition-colors hover:bg-bg-weak-50'
          aria-label='Open task search'
        >
          <RiSearchLine size={16} className='shrink-0 text-text-soft-400' />
          <span className='flex-1 text-left text-xs text-text-soft-400'>Search...</span>
          <kbd className='rounded bg-bg-weak-100 px-1 py-0.5 text-[10px] text-text-soft-400'>
            ⌘ K
          </kbd>
        </button>
      </div>

      <div aria-hidden='true' />
    </header>
  );
}
