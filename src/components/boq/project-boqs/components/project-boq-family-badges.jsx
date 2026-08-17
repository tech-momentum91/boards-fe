import React, { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArrowDownSLine } from 'react-icons/ri';

import * as Popover from '@/components/ui/popover';
import { cn } from '@/utils/cn';

const TAB_GAP_PX = 6;

const getBadgeButtonClassName = (isActive) =>
  cn(
    'inline-flex shrink-0 items-center rounded-md border bg-white px-3 py-1 text-[14px] font-medium leading-5 text-[#344054] transition-colors',
    isActive
      ? 'border-[rgba(71,84,103,0.5)] border-[1.5px]'
      : 'border-[#eaecf0] hover:bg-bg-weak-50',
  );

const fitTabCount = (tabWidths, availableWidth) => {
  let used = 0;
  let count = 0;

  for (let index = 0; index < tabWidths.length; index += 1) {
    const gap = count > 0 ? TAB_GAP_PX : 0;
    const nextWidth = gap + tabWidths[index];
    if (used + nextWidth > availableWidth) break;
    used += nextWidth;
    count += 1;
  }

  return count;
};

const measureFittingTabCount = (
  tabWidths,
  containerWidth,
  { addButtonWidth = 0, moreButtonWidth = 0, hasAddButton = false } = {},
) => {
  if (tabWidths.length === 0 || containerWidth <= 0) return tabWidths.length;

  const addReserve = hasAddButton ? addButtonWidth + TAB_GAP_PX : 0;

  const allTabsFit = fitTabCount(tabWidths, containerWidth - addReserve);
  if (allTabsFit >= tabWidths.length) return tabWidths.length;

  const moreReserve = moreButtonWidth + TAB_GAP_PX;
  return Math.max(1, fitTabCount(tabWidths, containerWidth - addReserve - moreReserve));
};

const ProjectBoqFamilyBadges = memo(({ members = [], activeId, onSelect, onAddAdditional }) => {
  const containerRef = useRef(null);
  const measureRowRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(members.length);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const options = useMemo(
    () =>
      members.map((member) => ({
        id: member.id || member.code,
        label: member.badgeLabel || member.familyLabel || member.boqName,
        member,
      })),
    [members],
  );

  const updateVisibleCount = useCallback(() => {
    const container = containerRef.current;
    const measureRow = measureRowRef.current;
    if (!container || !measureRow) return;

    const tabWidths = [...measureRow.querySelectorAll('[data-tab-measure="tab"]')].map(
      (element) => element.offsetWidth,
    );
    const addButton = measureRow.querySelector('[data-tab-measure="add"]');
    const moreButton = measureRow.querySelector('[data-tab-measure="more"]');

    const nextCount = measureFittingTabCount(tabWidths, container.clientWidth, {
      hasAddButton: Boolean(onAddAdditional),
      addButtonWidth: addButton?.offsetWidth ?? 0,
      moreButtonWidth: moreButton?.offsetWidth ?? 0,
    });

    setVisibleCount((previous) => (previous === nextCount ? previous : nextCount));
  }, [onAddAdditional]);

  useLayoutEffect(() => {
    updateVisibleCount();

    const container = containerRef.current;
    if (!container) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      updateVisibleCount();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [options, updateVisibleCount]);

  const { visibleOptions, overflowOptions } = useMemo(() => {
    if (options.length <= visibleCount) {
      return { visibleOptions: options, overflowOptions: [] };
    }

    const activeIndex = options.findIndex((option) => option.id === activeId);
    const visible = options.slice(0, visibleCount);

    // Keep tab order; surface the active overflow tab in the last visible slot.
    if (activeIndex >= visibleCount) {
      visible[visibleCount - 1] = options[activeIndex];
    }

    const visibleSet = new Set(visible.map((option) => option.id));
    const overflow = options.filter((option) => !visibleSet.has(option.id));

    return { visibleOptions: visible, overflowOptions: overflow };
  }, [activeId, options, visibleCount]);

  const handleSelect = (option) => {
    onSelect?.(option.member);
  };

  const handleOverflowSelect = (option) => {
    handleSelect(option);
    setIsMoreOpen(false);
  };

  if (options.length === 0 && !onAddAdditional) return null;

  const isOverflowActive = overflowOptions.some((option) => option.id === activeId);
  const hasOverflow = overflowOptions.length > 0;

  return (
    <div className='border-b border-stroke-soft-200 bg-[#e8e9ed]/30 px-8 py-4'>
      <div
        ref={measureRowRef}
        className='pointer-events-none absolute -left-[9999px] flex items-center gap-1.5 opacity-0'
        aria-hidden
      >
        {options.map((option) => (
          <span
            key={option.id}
            data-tab-measure='tab'
            className='shrink-0 rounded-md border bg-white px-3 py-1 text-[14px] font-medium leading-5'
          >
            {option.label}
          </span>
        ))}
        {onAddAdditional ? (
          <span
            data-tab-measure='add'
            className='flex shrink-0 items-center justify-center rounded-md border bg-white px-2.5 py-1'
          >
            <RiAddLine className='size-[18px]' />
          </span>
        ) : null}
        <span
          data-tab-measure='more'
          className='inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-white px-3 py-1 text-[14px] font-medium leading-5'
        >
          More
          <RiArrowDownSLine className='size-4' />
        </span>
      </div>

      <div ref={containerRef} className='flex w-full min-w-0 items-center gap-1.5'>
        {visibleOptions.map((option) => {
          const isActive = option.id === activeId;
          return (
            <button
              key={option.id}
              type='button'
              onClick={() => handleSelect(option)}
              className={getBadgeButtonClassName(isActive)}
            >
              {option.label}
            </button>
          );
        })}

        {onAddAdditional ? (
          <button
            type='button'
            onClick={onAddAdditional}
            aria-label='Add additional BOQ'
            className='flex shrink-0 items-center justify-center rounded-md border border-[#eaecf0] bg-white px-2.5 py-1 text-[#344054] transition-colors hover:bg-bg-weak-50'
          >
            <RiAddLine className='size-[18px]' aria-hidden />
          </button>
        ) : null}

        {hasOverflow ? (
          <Popover.Root open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <Popover.Trigger asChild>
              <button
                type='button'
                aria-haspopup='menu'
                aria-expanded={isMoreOpen}
                className={cn(getBadgeButtonClassName(isOverflowActive), 'gap-0.5')}
              >
                More
                <RiArrowDownSLine
                  className={cn('size-4 transition-transform', isMoreOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
            </Popover.Trigger>
            <Popover.Content align='start' sideOffset={8} className='w-[240px] p-2'>
              <div className='flex max-h-[280px] flex-col gap-1 overflow-y-auto'>
                {overflowOptions.map((option) => {
                  const isActive = option.id === activeId;
                  return (
                    <button
                      key={option.id}
                      type='button'
                      onClick={() => handleOverflowSelect(option)}
                      className={cn(
                        'w-full rounded-lg px-2.5 py-2 text-left text-[14px] font-medium leading-5 text-[#344054] hover:bg-bg-weak-50',
                        isActive && 'bg-bg-weak-50',
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Popover.Content>
          </Popover.Root>
        ) : null}
      </div>
    </div>
  );
});

ProjectBoqFamilyBadges.displayName = 'ProjectBoqFamilyBadges';

export default ProjectBoqFamilyBadges;
