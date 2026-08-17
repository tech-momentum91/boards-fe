import React, { useMemo } from 'react';

import { AnalyticsEmptyState } from '@/components/proposal-analytics/analytics-empty-state';
import { ChartCard } from '@/components/proposal-analytics/chart-card';
import {
  asArray,
  formatDuration,
  formatNumber,
} from '@/components/proposal-analytics/analytics-format-helpers';
import { forwardWheelToParentWhenAtEdge } from '@/components/proposal-analytics/scroll-helpers';
import {
  getProposalSectionSortIndex,
  resolveProposalSectionLabel,
} from '@/components/proposal-analytics/section-labels';

/**
 * Merge views + duration fields into one row list for the sections ranking card.
 */
function buildSectionRows(sectionsData, viewsData, totalTimeData, averageTimeData) {
  const byName = new Map();

  const upsert = (name, patch) => {
    const label = resolveProposalSectionLabel(name);
    if (!label) return;
    const existing = byName.get(label) || {
      section_name: label,
      views: 0,
      duration: 0,
      average_duration: 0,
      sort_index: getProposalSectionSortIndex(label),
    };
    byName.set(label, {
      ...existing,
      ...patch,
      section_name: label,
      sort_index: getProposalSectionSortIndex(label),
    });
  };

  asArray(sectionsData).forEach((row) => {
    upsert(row.section_name, {
      views: Number(row.views ?? 0),
      duration: Number(row.duration ?? row.total_time ?? 0),
      average_duration: Number(row.average_duration ?? row.average_time ?? 0),
    });
  });

  asArray(viewsData).forEach((row) => {
    upsert(row.section_name, { views: Number(row.views ?? 0) });
  });

  asArray(totalTimeData).forEach((row) => {
    upsert(row.section_name, { duration: Number(row.total_time ?? row.duration ?? 0) });
  });

  asArray(averageTimeData).forEach((row) => {
    upsert(row.section_name, {
      average_duration: Number(row.average_time ?? row.average_duration ?? 0),
    });
  });

  return [...byName.values()]
    .filter((row) => row.views > 0 || row.duration > 0)
    .sort((a, b) => a.sort_index - b.sort_index || b.views - a.views);
}

export function SectionChart({ data, totalTime, averageTime, deckSections = [] }) {
  const rows = useMemo(() => {
    // `data` may already be unified sections rows, or plain views rows.
    const looksUnified =
      Array.isArray(data) &&
      data.some(
        (row) =>
          row &&
          (row.duration != null ||
            row.average_duration != null ||
            row.total_time != null ||
            row.average_time != null),
      );

    if (looksUnified) {
      return buildSectionRows(data, null, totalTime, averageTime);
    }
    return buildSectionRows(null, data, totalTime, averageTime);
  }, [data, totalTime, averageTime]);

  // Scaffold from deck_json when no analytics data is available yet.
  const scaffoldRows = useMemo(() => {
    if (rows.length > 0 || deckSections.length === 0) return [];
    return deckSections
      .map((s) => ({
        section_name: resolveProposalSectionLabel(s.section_name),
        views: 0,
        duration: 0,
        average_duration: 0,
        sort_index: getProposalSectionSortIndex(s.section_name),
      }))
      .filter((r) => Boolean(r.section_name))
      .sort((a, b) => a.sort_index - b.sort_index);
  }, [rows, deckSections]);

  const isScaffold = rows.length === 0 && scaffoldRows.length > 0;
  const displayRows = isScaffold ? scaffoldRows : rows;
  const maxViews = displayRows.reduce((max, row) => Math.max(max, Number(row.views) || 0), 0) || 1;

  return (
    <ChartCard
      title='Sections'
      className='h-[320px] min-h-[320px]'
      bodyClassName='min-h-0 overflow-hidden'
    >
      {displayRows.length === 0 ? (
        <AnalyticsEmptyState title='No section views' />
      ) : (
        <div
          className='min-h-0 flex-1 overflow-y-auto overscroll-y-auto pr-1 [scrollbar-gutter:stable]'
          onWheel={forwardWheelToParentWhenAtEdge}
        >
          <ul className='flex flex-col gap-1.5' aria-label='Sections'>
            {displayRows.map((row) => {
              const views = Number(row.views) || 0;
              const totalDuration = Number(row.duration) || 0;
              const averageDuration = Number(row.average_duration) || 0;
              const duration =
                totalDuration > 0
                  ? formatDuration(totalDuration)
                  : averageDuration > 0
                    ? formatDuration(averageDuration)
                    : null;
              // Scaffold rows show no bar so the 0-data state is visually clear.
              const widthPct = isScaffold ? 0 : Math.max(4, Math.round((views / maxViews) * 100));

              return (
                <li key={row.section_name} className='relative overflow-hidden rounded-md'>
                  <div
                    className='absolute inset-y-0 left-0 rounded-md bg-primary-light'
                    style={{ width: `${widthPct}%` }}
                    aria-hidden
                  />
                  <div className='relative grid grid-cols-[minmax(0,1fr)_40px_72px] items-center gap-2 px-3 py-2.5'>
                    <span
                      className='min-w-0 truncate text-[13px] font-medium text-text-strong-950'
                      title={row.section_name}
                    >
                      {row.section_name}
                    </span>
                    <span className='text-right text-[13px] tabular-nums text-text-sub-500'>
                      {isScaffold ? '—' : formatNumber(views)}
                    </span>
                    <span className='text-right text-[13px] font-medium tabular-nums text-text-strong-950'>
                      {duration || '—'}
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

export default SectionChart;
