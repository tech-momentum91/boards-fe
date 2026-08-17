import React, { memo, useCallback, useEffect, useRef } from 'react';

import { cn } from '@/utils/cn';

const getSheetTabClassName = (isActive) =>
  cn(
    'inline-flex max-w-[220px] shrink-0 items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-left transition-colors',
    isActive
      ? 'border-[rgba(71,84,103,0.5)] border-[1.5px] shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'
      : 'border-[#eaecf0] hover:bg-bg-weak-50',
  );

const CategoryLetterBadge = ({ letter, isActive }) => (
  <span
    className={cn(
      'flex size-[18.5px] shrink-0 items-center justify-center rounded-[2px] text-[11px] font-bold leading-none',
      isActive ? 'bg-[#cfe0d4] text-[#123227]' : 'bg-bg-weak-100 text-text-sub-500',
    )}
  >
    {letter}
  </span>
);

const BoqCategorySheetTab = ({ category, isActive, onSelect }) => (
  <button
    type='button'
    role='tab'
    aria-selected={isActive}
    onClick={() => onSelect?.(category.categoryId)}
    className={getSheetTabClassName(isActive)}
  >
    <CategoryLetterBadge letter={category.letter} isActive={isActive} />
    <span
      className={cn(
        'truncate text-[14px] font-medium leading-5',
        isActive ? 'text-[#344054]' : 'text-text-sub-500',
      )}
    >
      {category.label}
    </span>
  </button>
);

const BoqCategorySheetTabs = memo(
  ({
    categories = [],
    activeCategoryId,
    onSelect,
    className,
    placement = 'bottom',
    disableAutoScroll = false,
  }) => {
    const activeTabRef = useRef(null);

    const scrollActiveTabIntoView = useCallback(() => {
      if (disableAutoScroll) return;

      activeTabRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }, [disableAutoScroll]);

    useEffect(() => {
      scrollActiveTabIntoView();
    }, [activeCategoryId, scrollActiveTabIntoView]);

    if (categories.length === 0) return null;

    return (
      <div
        className={cn(
          'h-auto shrink-0 grow-0 bg-[#e8e9ed]/30 px-8 py-2',
          placement === 'top'
            ? 'border-b border-stroke-soft-200'
            : 'border-t border-stroke-soft-200',
          className,
        )}
        role='tablist'
        aria-label='BOQ category sheets'
      >
        <div className='flex items-center gap-1.5 overflow-x-auto [scrollbar-width:thin]'>
          {categories.map((category) => {
            const isActive = category.categoryId === activeCategoryId;
            return (
              <div
                key={category.categoryId}
                ref={isActive ? activeTabRef : null}
                className='shrink-0'
              >
                <BoqCategorySheetTab category={category} isActive={isActive} onSelect={onSelect} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

BoqCategorySheetTabs.displayName = 'BoqCategorySheetTabs';

export default BoqCategorySheetTabs;
