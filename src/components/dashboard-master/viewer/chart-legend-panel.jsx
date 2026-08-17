import React, { useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';

const HIDDEN_MARKER = '#525252';
const ITEMS_PER_PAGE = 8;
const LEGEND_ROWS = 2;

/**
 * Inline legend filter for dashboard chart tiles (matches Figma reference).
 * Click toggles visibility — never triggers drill-down.
 */
export default function ChartLegendPanel({ items = [], hiddenItems = null, onToggle, className }) {
  const hidden = hiddenItems ?? new Set();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [items.length, totalPages]);

  const pageItems = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    const slice = items.slice(start, start + ITEMS_PER_PAGE);
    const padded = [...slice];
    while (padded.length < ITEMS_PER_PAGE) {
      padded.push(null);
    }
    return padded;
  }, [items, page]);

  if (items.length === 0) return null;

  const canGoPrev = page > 0;
  const canGoNext = page < totalPages - 1;

  return (
    <div
      data-devx-dashboard-no-drag
      className={cn('w-full shrink-0 border-t border-stroke-soft-200 px-5 pb-4 pt-4', className)}
      role='list'
      aria-label='Chart legend filters'
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ul
        className='grid grid-cols-4 grid-rows-2 gap-x-4 gap-y-2.5'
        style={{ minHeight: `${LEGEND_ROWS * 24 + (LEGEND_ROWS - 1) * 10}px` }}
      >
        {pageItems.map((item, index) => {
          if (!item) {
            return (
              <li
                key={`legend-placeholder-${page}-${index}`}
                className='min-h-[24px]'
                aria-hidden
              />
            );
          }

          const isHidden = hidden.has(item.label);
          return (
            <li key={item.label} role='listitem'>
              <button
                type='button'
                className={cn(
                  'flex w-full min-w-0 items-center gap-2 rounded-md py-0.5 text-left',
                  'transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-base/40',
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggle?.(item.label);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-pressed={!isHidden}
                title={isHidden ? `Show ${item.label}` : `Hide ${item.label}`}
              >
                <span
                  className='size-3 shrink-0 rounded-[4px]'
                  style={{ backgroundColor: isHidden ? HIDDEN_MARKER : item.color }}
                  aria-hidden
                />
                <span
                  className={cn(
                    'min-w-0 truncate text-[13px] leading-4 text-text-strong-950',
                    isHidden && 'text-text-sub-500 line-through decoration-text-sub-500',
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <div className='mt-2.5 flex items-center justify-center gap-2'>
          <button
            type='button'
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-md border border-stroke-soft-200',
              'bg-bg-white-0 text-text-sub-600 transition',
              'hover:border-stroke-soft-300 hover:bg-bg-weak-50 hover:text-text-strong-950',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/40',
              !canGoPrev &&
                'cursor-not-allowed opacity-40 hover:border-stroke-soft-200 hover:bg-bg-white-0',
            )}
            aria-label='Previous legend page'
            disabled={!canGoPrev}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canGoPrev) setPage((current) => current - 1);
            }}
          >
            <RiArrowUpSLine className='size-4' aria-hidden />
          </button>
          <span className='min-w-[2.5rem] text-center text-[12px] font-medium tabular-nums text-text-sub-500'>
            {page + 1} / {totalPages}
          </span>
          <button
            type='button'
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-md border border-stroke-soft-200',
              'bg-bg-white-0 text-text-sub-600 transition',
              'hover:border-stroke-soft-300 hover:bg-bg-weak-50 hover:text-text-strong-950',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/40',
              !canGoNext &&
                'cursor-not-allowed opacity-40 hover:border-stroke-soft-200 hover:bg-bg-white-0',
            )}
            aria-label='Next legend page'
            disabled={!canGoNext}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canGoNext) setPage((current) => current + 1);
            }}
          >
            <RiArrowDownSLine className='size-4' aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
