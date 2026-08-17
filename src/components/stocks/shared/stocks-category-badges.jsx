import React from 'react';

import * as Badge from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';

export const STOCKS_CATEGORY_BADGE_MAX_VISIBLE = 2;

/** Normalize API category field (string | string[] | null) to unique trimmed labels. */
export function normalizeStockCategoryLabels(value) {
  const raw = Array.isArray(value) ? value : value != null && String(value).trim() ? [value] : [];
  const seen = new Set();
  const labels = [];

  for (const item of raw) {
    const label = String(item ?? '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  return labels;
}

export default function StocksCategoryBadges({
  categories,
  maxVisible = STOCKS_CATEGORY_BADGE_MAX_VISIBLE,
  overflowLabel = 'Additional categories',
  className = '',
  emptyFallback = '—',
}) {
  const labels = normalizeStockCategoryLabels(categories);

  if (labels.length === 0) {
    return <span className='text-paragraph-sm text-text-soft-400'>{emptyFallback}</span>;
  }

  const visibleLabels = labels.slice(0, maxVisible);
  const overflowLabels = labels.slice(maxVisible);
  const overflowCount = overflowLabels.length;

  return (
    <div className={`flex min-w-0 max-w-full flex-wrap items-center gap-2 ${className}`}>
      {visibleLabels.map((label, index) => (
        <Tooltip.Root key={`${label}-${index}`}>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='max-w-[min(100%,10rem)]'
            >
              <span className='paragraph-small block min-w-0 truncate font-medium text-text-strong-950'>
                {label}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content side='bottom' className='max-w-sm break-words'>
            {label}
          </Tooltip.Content>
        </Tooltip.Root>
      ))}
      {overflowCount > 0 ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Badge.Root
              variant='lighter'
              color='gray'
              size='medium'
              className='shrink-0 cursor-default'
            >
              <span className='text-label-xs font-semibold text-text-strong-950'>
                +{overflowCount}
              </span>
            </Badge.Root>
          </Tooltip.Trigger>
          <Tooltip.Content size='small' variant='light' side='top' className='max-w-xs'>
            <div className='flex flex-col gap-1'>
              <span className='mb-1 text-paragraph-sm font-medium text-text-strong-950'>
                {overflowLabel} ({overflowCount})
              </span>
              {overflowLabels.map((label, index) => (
                <div key={index} className='text-paragraph-sm text-text-sub-600'>
                  {label}
                </div>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
    </div>
  );
}
