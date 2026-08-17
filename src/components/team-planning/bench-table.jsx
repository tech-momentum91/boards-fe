import React, { useEffect, useRef, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import * as Tooltip from '@/components/ui/tooltip';
import ErrorStateCard from '@/components/ui/error-state-card';
import { cn } from '@/utils/cn';
import { BENCH_MAX_VISIBLE_MEMBERS, getFreePercentageBadgeClass } from './constants';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const RESOURCE_COL_WIDTH = 'w-[300px] min-w-[300px] max-w-[300px]';
const MONTH_COL_WIDTH = 'min-w-[201px]';
const CELL_HEIGHT = '!h-auto min-h-[48px] py-0 !rounded-none';
const STICKY_RESOURCE_CELL = cn(
  RESOURCE_COL_WIDTH,
  'sticky left-0 z-20 border-r border-b border-stroke-soft-200 !rounded-none',
);
const STICKY_RESOURCE_HEAD = cn(STICKY_RESOURCE_CELL, 'z-30 bg-bg-weak-100');
const STICKY_RESOURCE_BODY = cn(
  STICKY_RESOURCE_CELL,
  'bg-bg-white-0 group-hover/row:bg-bg-weak-50',
);
const MONTH_CELL_BORDER =
  'border-r border-b border-stroke-soft-200 align-top last:border-r-0 !rounded-none';

const BenchMemberChip = ({ member, showJoinBadge = false }) => {
  const freePct = Number(member.free_percentage);
  const showFreeBadge = Number.isFinite(freePct) && freePct > 0 && freePct < 100;

  return (
    <div className='flex w-full shrink-0 items-center justify-between rounded-md border border-stroke-soft-200 bg-bg-weak-100 py-1 pl-[7px] pr-[3px] shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'>
      <div className='flex min-w-0 items-center gap-1.5'>
        <Avatar.Root size={16}>
          <Avatar.Image src={member.image || DEFAULT_AVATAR} alt={member.name} />
        </Avatar.Root>
        <span className='min-w-0 truncate text-label-xs font-medium text-[#162664] opacity-80'>
          {member.name}
        </span>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        {showFreeBadge ? (
          <span
            className={cn(
              'rounded-full px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px]',
              getFreePercentageBadgeClass(freePct),
            )}
          >
            {Math.round(freePct)}%
          </span>
        ) : null}
        {showJoinBadge && member.joining_day_label ? (
          <span className='shrink-0 rounded-full bg-[#E4E5E7] px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px] text-text-sub-500'>
            {member.joining_day_label}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const MoreChip = ({ count, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex w-full shrink-0 items-center justify-center rounded-md border border-dashed border-stroke-soft-200 bg-bg-white-0 py-1 px-2 transition hover:bg-bg-weak-50'
  >
    <span className='text-label-xs font-medium text-text-soft-400'>+{count} More</span>
  </button>
);

const SeeLessChip = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex w-full shrink-0 items-center justify-center rounded-md border border-dashed border-stroke-soft-200 bg-bg-white-0 py-1 px-2 transition hover:bg-bg-weak-50'
  >
    <span className='text-label-xs font-medium text-text-soft-400'>See less</span>
  </button>
);

const BenchCell = ({ cell, row, column, onAddJoinee }) => {
  const [expanded, setExpanded] = useState(false);
  const members = cell?.members || [];
  const newJoining = cell?.new_joining || [];
  const overflow = Math.max(0, members.length - BENCH_MAX_VISIBLE_MEMBERS);
  const visible = expanded ? members : members.slice(0, BENCH_MAX_VISIBLE_MEMBERS);
  const isEmpty = members.length === 0 && newJoining.length === 0;

  useEffect(() => {
    setExpanded(false);
  }, [cell, column?.id]);

  if (isEmpty) {
    return (
      <div className='flex min-h-[48px] flex-col items-center justify-center gap-2 p-2'>
        <span className='text-label-xs text-text-soft-400'>No Members</span>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={() => onAddJoinee?.({ row, column })}
              className='flex size-5 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 text-text-soft-400 transition hover:bg-bg-weak-50'
              aria-label='Add New Joinee'
            >
              <RiAddLine className='size-3.5' />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content variant='dark' size='xsmall'>
            Add New Joinee
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-1 p-2'>
      <div className='flex w-full flex-col gap-1'>
        {visible.map((member) => (
          <BenchMemberChip key={`${member.team_type}-${member.member_id}`} member={member} />
        ))}
        {!expanded && overflow > 0 ? (
          <MoreChip count={overflow} onClick={() => setExpanded(true)} />
        ) : null}
        {expanded && overflow > 0 ? <SeeLessChip onClick={() => setExpanded(false)} /> : null}
      </div>

      <div className='mt-1 flex items-center justify-between gap-2 pt-1'>
        <span className='text-[10px] font-medium uppercase tracking-[0.6px] text-text-soft-400'>
          New Joining
        </span>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={() => onAddJoinee?.({ row, column })}
              className='flex size-5 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 text-text-soft-400 transition hover:bg-bg-weak-50'
              aria-label='Add New Joinee'
            >
              <RiAddLine className='size-3.5' />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content variant='dark' size='xsmall'>
            Add New Joinee
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      {newJoining.map((member) => (
        <BenchMemberChip
          key={`join-${member.team_type}-${member.member_id}`}
          member={member}
          showJoinBadge
        />
      ))}
    </div>
  );
};

const BenchDepartmentRow = ({ row, columns, onAddJoinee }) => (
  <Table.Row className='group/row'>
    <Table.Cell className={cn(STICKY_RESOURCE_BODY, CELL_HEIGHT)}>
      <div className='flex items-center py-2 pl-3'>
        <span className='truncate text-label-sm font-medium text-text-strong-950'>{row.label}</span>
      </div>
    </Table.Cell>
    {columns.map((column) => (
      <Table.Cell
        key={`${row.id}-${column.id}`}
        data-month-column={column.id}
        data-is-current={column.is_current ? 'true' : undefined}
        className={cn(
          MONTH_COL_WIDTH,
          CELL_HEIGHT,
          MONTH_CELL_BORDER,
          '!px-0',
          column.is_current && 'bg-[#F3FBF8]',
        )}
      >
        <BenchCell
          cell={row.cells?.[column.id]}
          row={row}
          column={column}
          onAddJoinee={onAddJoinee}
        />
      </Table.Cell>
    ))}
  </Table.Row>
);

const BenchTable = ({
  columns = [],
  rows = [],
  isLoading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  onRetry,
  onAddJoinee,
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const currentColumn = container.querySelector('[data-month-column][data-is-current="true"]');
    if (!currentColumn) return;

    const columnLeft = currentColumn.offsetLeft;
    const columnWidth = currentColumn.offsetWidth;
    const containerWidth = container.clientWidth;
    const resourceWidth = 300;
    const scrollLeft =
      columnLeft - resourceWidth - (containerWidth - resourceWidth - columnWidth) / 2;

    container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
  }, [columns, rows]);

  if (error) {
    return (
      <ErrorStateCard
        title='Failed to load bench'
        message={
          typeof error === 'string' ? error : 'Something went wrong while loading the bench.'
        }
        onRetry={onRetry}
      />
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] items-center justify-center rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
        <span className='text-label-sm text-text-soft-400'>Loading…</span>
      </div>
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex min-h-[240px] flex-col items-center justify-center gap-1 rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-6 text-center'>
        <p className='text-label-sm font-medium text-text-strong-950'>
          {emptyTitle || 'No bench members'}
        </p>
        <p className='text-paragraph-sm text-text-sub-500'>
          {emptyDescription || 'No free capacity found for the selected filters.'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className='overflow-x-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0'
    >
      <Table.Root className='w-max min-w-full'>
        <Table.Header>
          <Table.Row>
            <Table.Head className={cn(STICKY_RESOURCE_HEAD, 'text-label-xs text-text-sub-500')}>
              Departments
            </Table.Head>
            {columns.map((column) => (
              <Table.Head
                key={column.id}
                data-month-column={column.id}
                data-is-current={column.is_current ? 'true' : undefined}
                className={cn(
                  MONTH_COL_WIDTH,
                  'border-r border-b border-stroke-soft-200 text-center text-label-xs uppercase tracking-[0.4px] text-text-sub-500 last:border-r-0',
                  column.is_current && 'bg-[#E6F4EE] text-text-strong-950',
                )}
              >
                {column.label}
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <BenchDepartmentRow
              key={row.id}
              row={row}
              columns={columns}
              onAddJoinee={onAddJoinee}
            />
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
};

export default BenchTable;
