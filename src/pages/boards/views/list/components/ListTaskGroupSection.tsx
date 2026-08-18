import { RiAddLine, RiArrowDownSLine, RiFlagLine } from 'react-icons/ri';
import CircularProgress, { resolveBadgeColor } from '@/components/ui/circular-progress';
import * as Badge from '@/components/ui/badge';
import { getPriorityColor } from '@/components/clients-management/constants';
import { getSortingIcon } from '@/components/ui/table';
import { cn } from '@/utils/cn';
import {
  getGridTemplateColumns,
  getListTableGridStyle,
  getListTableRowStyle,
  LIST_TABLE_ACTIONS_HEADER_CLASS,
  LIST_TABLE_TITLE_HEADER_CLASS,
} from '../utils/list-columns';
import { getColumnSortState, isColumnSortable } from '../utils/task-list-sort-utils';
import { resolveColumnFieldType } from '../utils/task-list-filter-utils';

function GroupStatusBadge({ option }) {
  const statusOption = option?.option ?? option;
  const bgColor = resolveBadgeColor(statusOption?.color) || statusOption?.color || '#525866';

  return (
    <span
      className='inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium uppercase tracking-[0.48px] text-white'
      style={{ backgroundColor: bgColor }}
    >
      <CircularProgress
        percentage={statusOption?.percentage ?? 0}
        color='#FFFFFF'
        size={15}
        variant='sector'
        aria-hidden
      />
      <span className='whitespace-nowrap'>{statusOption?.label}</span>
    </span>
  );
}

function GroupColoredOptionBadge({ label, color }) {
  const bgColor = resolveBadgeColor(color) || color || '#64748B';

  return (
    <span
      className='inline-flex h-6 max-w-full items-center rounded-md px-2 text-xs font-medium text-text-white-0'
      style={{ backgroundColor: bgColor }}
    >
      <span className='truncate'>{label}</span>
    </span>
  );
}

function GroupPriorityBadge({ label, value }) {
  return (
    <span className='inline-flex max-w-full items-center gap-1.5'>
      <RiFlagLine size={16} className='shrink-0 text-icon-sub-500' />
      <Badge.Root
        variant='light'
        color={getPriorityColor(value ?? label)}
        className='max-w-full truncate text-nowrap uppercase'
      >
        {label}
      </Badge.Root>
    </span>
  );
}

function GroupTagBadge({ label }) {
  return (
    <Badge.Root
      variant='stroke'
      color='gray'
      size='small'
      className='max-w-full truncate whitespace-nowrap bg-bg-white-0 normal-case text-text-sub-500 ring-stroke-soft-200'
    >
      {label}
    </Badge.Root>
  );
}

function GroupDefaultBadge({ label }) {
  return (
    <span className='inline-flex h-6 max-w-full items-center rounded-md border border-dashed border-stroke-soft-200 bg-bg-weak-50 px-2 text-xs font-medium uppercase tracking-[0.48px] text-text-sub-500'>
      <span className='truncate'>{label}</span>
    </span>
  );
}

export function GroupLabelBadge({ group, groupColumn }) {
  const meta = group.meta;
  const label = meta?.label ?? group.label;

  if (meta?.type === 'status' && meta.option) {
    return <GroupStatusBadge option={meta.option} />;
  }

  if (meta?.type === 'priority') {
    return <GroupPriorityBadge label={label} value={meta.value ?? group.key} />;
  }

  if (meta?.type === 'option') {
    return <GroupColoredOptionBadge label={label} color={meta.color} />;
  }

  if (meta?.type === 'tag') {
    return <GroupTagBadge label={label} />;
  }

  if (groupColumn && resolveColumnFieldType(groupColumn) === 'status' && meta?.option) {
    return <GroupStatusBadge option={meta} />;
  }

  if (groupColumn && resolveColumnFieldType(groupColumn) === 'priority') {
    return <GroupPriorityBadge label={label} value={group.key} />;
  }

  return <GroupDefaultBadge label={label} />;
}

function GroupColumnHeaderRow({ columns, columnSort = [], onSortClick }) {
  return (
    <div
      className='grid border-b border-stroke-soft-200 bg-bg-weak-100'
      style={getListTableRowStyle()}
    >
      {columns.map((column) => {
        const { direction: sortDirection, priority: sortPriority } = getColumnSortState(
          columnSort,
          column.key,
        );

        return (
          <div
            key={column.key}
            className={cn(
              'group/col-header flex h-10 min-w-0 select-none items-center gap-2 overflow-hidden px-3',
              column.key === 'title' && LIST_TABLE_TITLE_HEADER_CLASS,
            )}
          >
            <span className='inline-flex min-w-0 flex-1 items-center gap-0.5'>
              <span className='truncate text-sm font-medium text-text-soft-400'>
                {column.label}
              </span>
              {isColumnSortable(column) && onSortClick ? (
                <button
                  type='button'
                  className={cn(
                    'relative flex shrink-0 items-center justify-center rounded transition-all hover:text-text-strong-950',
                    sortDirection
                      ? 'text-text-sub-600 opacity-100'
                      : 'text-icon-soft-400 opacity-0 group-hover/col-header:opacity-100 focus-visible:opacity-100',
                  )}
                  aria-label={`Sort by ${column.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSortClick(column.key)(event);
                  }}
                >
                  {getSortingIcon(sortDirection)}
                  {sortPriority ? (
                    <span className='absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-primary-base text-[9px] font-semibold leading-none text-text-white-0'>
                      {sortPriority}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </span>
          </div>
        );
      })}

      <div className={LIST_TABLE_ACTIONS_HEADER_CLASS}>
        <span className='flex h-5 w-5 items-center justify-center rounded-full border border-stroke-soft-200 bg-white'>
          <RiAddLine size={12} className='text-icon-soft-400' />
        </span>
      </div>
    </div>
  );
}

function GroupTitleButton({ group, groupColumn, collapsed, onToggleCollapsed }) {
  return (
    <button
      type='button'
      onClick={onToggleCollapsed}
      className='flex w-full items-center gap-2 border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5 text-left transition hover:bg-bg-weak-50'
    >
      <RiArrowDownSLine
        size={18}
        className={cn('shrink-0 text-icon-sub-500 transition-transform', collapsed && '-rotate-90')}
      />

      <GroupLabelBadge group={group} groupColumn={groupColumn} />

      <span className='text-xs font-medium text-text-soft-400'>
        {group.totalCount ?? group.tasks.length}
      </span>
    </button>
  );
}

export default function ListTaskGroupSection({
  group,
  groupColumn,
  columns,
  columnSort = [],
  collapsed = false,
  onToggleCollapsed,
  onSortClick,
  footer = null,
  children,
}) {
  const gridTemplateColumns = getGridTemplateColumns(columns);
  const gridStyle = getListTableGridStyle(gridTemplateColumns);

  return (
    // min-w-min stretches the section to the grid's track minimums so the
    // sticky-left (100cqw) title/footer bars have a wide containing block to
    // stick within during horizontal scroll.
    <section className='min-w-min border-b border-stroke-soft-200 last:border-b-0'>
      {collapsed ? (
        <>
          <div className='sticky left-0 w-[100cqw]'>
            <GroupTitleButton
              group={group}
              groupColumn={groupColumn}
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
            />
          </div>
          {/* Zero-height width-holder keeping the collapsed section as wide as
              the expanded ones so the sticky title above stays pinned. */}
          <div style={gridStyle} className='h-0' aria-hidden />
        </>
      ) : (
        <>
          {/* Sticky within the board scrollport; constrained to this section so
              the next group's header naturally replaces it. The title bar is
              additionally pinned horizontally (100cqw = scrollport width). */}
          <div className='sticky top-0 z-20 bg-bg-white-0'>
            <div className='sticky left-0 w-[100cqw]'>
              <GroupTitleButton
                group={group}
                groupColumn={groupColumn}
                collapsed={collapsed}
                onToggleCollapsed={onToggleCollapsed}
              />
            </div>
            <div style={gridStyle}>
              <GroupColumnHeaderRow
                columns={columns}
                columnSort={columnSort}
                onSortClick={onSortClick}
              />
            </div>
          </div>

          <div style={gridStyle}>{children}</div>

          {footer ? (
            <div className='sticky left-0 w-[100cqw] border-t border-stroke-soft-200 bg-bg-weak-50'>
              {footer}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
