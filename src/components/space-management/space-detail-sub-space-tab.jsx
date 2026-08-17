import React, { useMemo } from 'react';
import { RiStackLine } from 'react-icons/ri';

import * as Badge from '@/components/ui/badge';
import * as Table from '@/components/ui/table';
import { getSpaceStatusBadge } from '@/components/space-management/constants';
import { mapSpaceDetailSubSpaces } from '@/components/space-management/space-detail-sub-space-helpers';

const TABLE_COLUMNS = [
  { key: 'subSpaceId', label: 'Sub Space ID', className: 'min-w-[180px]' },
  { key: 'name', label: 'Name', className: 'min-w-[160px]' },
  { key: 'type', label: 'Type', className: 'min-w-[140px]' },
  { key: 'areaType', label: 'Area Type', className: 'min-w-[140px]' },
  { key: 'deskCount', label: 'Desk Count', className: 'min-w-[100px]' },
  { key: 'status', label: 'Status', className: 'min-w-[120px]' },
];

function SubSpaceStatusBadge({ status }) {
  const normalized = String(status ?? '').trim();
  if (!normalized || normalized === '—') {
    return <span className='text-text-sub-500'>—</span>;
  }

  const badge = getSpaceStatusBadge(normalized);
  return (
    <Badge.Root size='small' variant='light' color={badge.color}>
      {badge.label}
    </Badge.Root>
  );
}

/**
 * @param {{
 *   spaceOriginal?: object | null,
 *   isLoading?: boolean,
 * }} props
 */
export default function SpaceDetailSubSpaceTab({ spaceOriginal = null, isLoading = false }) {
  const rows = useMemo(() => mapSpaceDetailSubSpaces(spaceOriginal), [spaceOriginal]);

  if (isLoading) {
    return (
      <div className='flex min-h-[240px] items-center justify-center px-6 py-10 text-paragraph-sm text-text-sub-600'>
        Loading sub spaces…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
        <RiStackLine className='size-8 text-text-soft-400' aria-hidden />
        <p className='text-paragraph-sm font-medium text-text-main-900'>No sub spaces found</p>
        <p className='text-paragraph-sm text-text-sub-500'>
          Sub spaces defined for this space will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden py-6 px-6'>
      <Table.Root variant='compact' className='rounded-xl border border-stroke-soft-200'>
        <Table.Header>
          <Table.Row>
            {TABLE_COLUMNS.map((column) => (
              <Table.Head key={column.key} className={column.className}>
                {column.label}
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {rows.map((row, rowIndex) => (
            <React.Fragment key={row.id}>
              <Table.Row>
                <Table.Cell className='font-medium text-text-main-900'>{row.subSpaceId}</Table.Cell>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell>{row.type}</Table.Cell>
                <Table.Cell>{row.areaType}</Table.Cell>
                <Table.Cell className='tabular-nums'>{row.deskCount}</Table.Cell>
                <Table.Cell>
                  <SubSpaceStatusBadge status={row.status} />
                </Table.Cell>
              </Table.Row>
              {rowIndex < rows.length - 1 ? <Table.RowDivider /> : null}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
