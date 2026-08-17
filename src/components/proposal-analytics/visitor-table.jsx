import React, { useMemo } from 'react';

import { AnalyticsEmptyState } from '@/components/proposal-analytics/analytics-empty-state';
import { ChartCard } from '@/components/proposal-analytics/chart-card';
import {
  asArray,
  formatDateTime,
  formatDuration,
  formatNumber,
  truncateId,
} from '@/components/proposal-analytics/analytics-format-helpers';
import { forwardWheelToParentWhenAtEdge } from '@/components/proposal-analytics/scroll-helpers';
import * as Table from '@/components/ui/table';

export function VisitorTable({ data, title = 'Visitors' }) {
  const rows = useMemo(() => {
    return [...asArray(data)].sort(
      (a, b) =>
        Number(b.total_time ?? 0) - Number(a.total_time ?? 0) ||
        Number(b.visits ?? 0) - Number(a.visits ?? 0),
    );
  }, [data]);

  return (
    <ChartCard
      title={title}
      bodyClassName='min-h-0 overflow-hidden p-0'
      className='h-[320px] min-h-[320px]'
    >
      {rows.length === 0 ? (
        <div className='p-5'>
          <AnalyticsEmptyState
            title='No visitors yet'
            description='Visitor rows appear after someone opens the shared proposal.'
          />
        </div>
      ) : (
        <div
          className='min-h-0 flex-1 overflow-auto overscroll-y-auto [scrollbar-gutter:stable]'
          onWheel={forwardWheelToParentWhenAtEdge}
        >
          <Table.Root variant='compact' stickyHeader className='overflow-visible'>
            <Table.Header>
              <tr>
                <Table.Head className='px-3 py-2 text-[12px] font-medium text-text-sub-500'>
                  Visitor
                </Table.Head>
                <Table.Head className='px-3 py-2 text-[12px] font-medium text-text-sub-500'>
                  Visits
                </Table.Head>
                <Table.Head className='px-3 py-2 text-[12px] font-medium text-text-sub-500'>
                  Visit duration
                </Table.Head>
                <Table.Head className='px-3 py-2 text-[12px] font-medium text-text-sub-500'>
                  Last viewed
                </Table.Head>
              </tr>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.visitor_id || `${row.last_viewed}-${row.visits}`}>
                  <Table.Cell className='px-3 py-2.5 text-[13px]'>
                    <p className='truncate font-medium text-text-strong-950' title={row.visitor_id}>
                      {row.visitor_name || truncateId(row.visitor_id, 14)}
                    </p>
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2.5 text-[13px] tabular-nums text-text-sub-500'>
                    {formatNumber(row.visits ?? 0)}
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2.5 text-[13px] font-medium tabular-nums text-text-strong-950'>
                    {formatDuration(row.total_time)}
                  </Table.Cell>
                  <Table.Cell className='px-3 py-2.5 text-[13px] tabular-nums text-text-sub-500'>
                    {formatDateTime(row.last_viewed)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      )}
    </ChartCard>
  );
}

export default VisitorTable;
