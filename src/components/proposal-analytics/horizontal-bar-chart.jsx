import React, { useMemo } from 'react';

import { AnalyticsEmptyState } from '@/components/proposal-analytics/analytics-empty-state';
import { ChartCard } from '@/components/proposal-analytics/chart-card';
import { formatNumber } from '@/components/proposal-analytics/analytics-format-helpers';
import { forwardWheelToParentWhenAtEdge } from '@/components/proposal-analytics/scroll-helpers';
import { cn } from '@/utils/cn';

/**
 * Ranking list with primary bar value and optional secondary metric (e.g. duration).
 */
export function HorizontalBarChart({
  title,
  description,
  data,
  labelKey,
  valueKey,
  valueLabel = 'Count',
  formatValue,
  secondaryKey,
  formatSecondary,
  secondaryLabel = '',
  emptyTitle,
  emptyDescription,
  className,
  maxItems = 12,
  sortByValue = true,
}) {
  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const mapped = data
      .map((row) => {
        const label = String(row?.[labelKey] || '').trim();
        if (!label) return null;
        const value = Number(row?.[valueKey] || 0);
        return {
          ...row,
          [labelKey]: label,
          [valueKey]: Number.isFinite(value) ? value : 0,
        };
      })
      .filter(Boolean);

    const sorted = sortByValue ? mapped.sort((a, b) => b[valueKey] - a[valueKey]) : mapped;
    return sorted.slice(0, maxItems);
  }, [data, labelKey, valueKey, maxItems, sortByValue]);

  const maxValue = rows.reduce((max, row) => Math.max(max, row[valueKey] || 0), 0) || 1;

  return (
    <ChartCard
      title={title}
      description={description}
      className={cn('h-[320px] min-h-[320px]', className)}
      bodyClassName='min-h-0 overflow-hidden'
    >
      {rows.length === 0 ? (
        <AnalyticsEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div
          className='min-h-0 flex-1 overflow-y-auto overscroll-y-auto pr-1 [scrollbar-gutter:stable]'
          onWheel={forwardWheelToParentWhenAtEdge}
        >
          <ul className='flex flex-col gap-1.5' aria-label={title}>
            {rows.map((row) => {
              const value = row[valueKey] || 0;
              const widthPct = Math.max(4, Math.round((value / maxValue) * 100));
              const display =
                typeof formatValue === 'function' ? formatValue(value, row) : formatNumber(value);

              let secondary = null;
              if (secondaryKey) {
                const rawSecondary = row[secondaryKey];
                secondary =
                  typeof formatSecondary === 'function'
                    ? formatSecondary(rawSecondary, row)
                    : rawSecondary != null && rawSecondary !== ''
                      ? String(rawSecondary)
                      : null;
              }

              return (
                <li
                  key={`${row[labelKey]}-${value}-${secondary || ''}`}
                  className='relative overflow-hidden rounded-md'
                >
                  <div
                    className='absolute inset-y-0 left-0 rounded-md bg-primary-light'
                    style={{ width: `${widthPct}%` }}
                    aria-hidden
                  />
                  <div className='relative flex items-center justify-between gap-3 px-3 py-2.5'>
                    <span
                      className='min-w-0 truncate text-[13px] font-medium text-text-strong-950 capitalize'
                      title={row[labelKey]}
                    >
                      {row[labelKey]}
                    </span>
                    <span className='flex shrink-0 items-center gap-2 text-[13px] tabular-nums text-text-sub-500'>
                      <span title={`${valueLabel}: ${display}`}>{display}</span>
                      {secondary ? (
                        <>
                          <span className='text-text-soft-400' aria-hidden>
                            ·
                          </span>
                          <span
                            className='font-medium text-text-strong-950'
                            title={secondaryLabel ? `${secondaryLabel}: ${secondary}` : secondary}
                          >
                            {secondary}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

export default HorizontalBarChart;
