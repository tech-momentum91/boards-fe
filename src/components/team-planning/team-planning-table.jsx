import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiExpandUpDownFill } from 'react-icons/ri';
import * as Table from '@/components/ui/table';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import ErrorStateCard from '@/components/ui/error-state-card';
import { cn } from '@/utils/cn';
import { getAllocationCellFooterConfig, getProjectPercentageBadgeClass } from './constants';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const RESOURCE_COL_WIDTH = 'w-[300px] min-w-[300px] max-w-[300px]';
const MONTH_COL_WIDTH = 'min-w-[201px]';
const CELL_HEIGHT = '!h-auto min-h-[48px] py-0 !rounded-none';
const DEPT_CELL_HEIGHT = '!h-auto min-h-[40px] py-0 !rounded-none';
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
const ROW_CLASS = 'group/row';

const EXPANDABLE_ROW_TYPES = new Set(['role_type', 'team_lead', 'project']);

const collectExpandableRowIds = (rows = []) => {
  const ids = [];
  rows.forEach((row) => {
    if (EXPANDABLE_ROW_TYPES.has(row.type) && row.children?.length) {
      ids.push(row.id);
      ids.push(...collectExpandableRowIds(row.children));
    }
  });
  return ids;
};

const ResourceColumnHeader = ({
  allExpanded,
  onToggleExpandAll,
  hasExpandableRows,
  label = 'Resource',
}) => (
  <div className='flex items-center justify-between gap-2 pr-3'>
    <span>{label}</span>
    {hasExpandableRows ? (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <CompactButton.Root
            type='button'
            variant='stroke'
            size='large'
            className='size-7 shrink-0'
            aria-label={allExpanded ? 'Collapse All' : 'Expand All'}
            onClick={onToggleExpandAll}
          >
            <CompactButton.Icon
              as={RiExpandUpDownFill}
              className={cn('transition-transform duration-200', allExpanded && 'rotate-180')}
            />
          </CompactButton.Root>
        </Tooltip.Trigger>
        <Tooltip.Content variant='dark' size='xsmall'>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </Tooltip.Content>
      </Tooltip.Root>
    ) : null}
  </div>
);

const AddAllocationButton = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='inline-flex w-full items-center justify-center gap-2 p-3 text-label-sm font-medium text-text-soft-400 transition hover:bg-bg-weak-50'
  >
    <span className='flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]'>
      <RiAddLine className='size-[18px]' />
    </span>
    Add allocation
  </button>
);

const MAX_VISIBLE_ALLOCATION_PROJECTS = 3;
// Fixed height for exactly 3 project rows (~28px row + 4px gap)
const ALLOCATION_PROJECT_LIST_SCROLL_HEIGHT = 'h-[92px]';

const ProjectAllocationRow = ({ name, percentage }) => (
  <div className='flex w-full shrink-0 items-center justify-between rounded-md border border-stroke-soft-200 bg-bg-weak-100 py-1 pl-[7px] pr-[3px] shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'>
    <span className='min-w-0 truncate text-label-xs font-medium text-[#162664] opacity-80'>
      {name}
    </span>
    <span
      className={cn(
        'shrink-0 rounded-full px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px]',
        getProjectPercentageBadgeClass(percentage),
      )}
    >
      {percentage}%
    </span>
  </div>
);

const MemberChipRow = ({ name, image, percentage }) => (
  <div className='flex w-full shrink-0 items-center justify-between rounded-md border border-stroke-soft-200 bg-bg-weak-100 py-1 pl-[7px] pr-[3px] shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'>
    <div className='flex min-w-0 items-center gap-1.5'>
      <Avatar.Root size={16}>
        <Avatar.Image src={image || DEFAULT_AVATAR} alt={name} />
      </Avatar.Root>
      <span className='min-w-0 truncate text-label-xs font-medium text-[#162664] opacity-80'>
        {name}
      </span>
    </div>
    <span
      className={cn(
        'shrink-0 rounded-full px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px]',
        getProjectPercentageBadgeClass(percentage),
      )}
    >
      {percentage}%
    </span>
  </div>
);

const ProjectTeamAllocationCell = ({ cell, onAddAllocation, row, column, centers }) => {
  const members = (cell?.members || []).filter(
    (member) => Number(member.allocation_percentage) > 0,
  );

  if (members.length === 0) {
    return (
      <AddAllocationButton onClick={() => onAddAllocation?.({ row, column, cell, centers })} />
    );
  }

  const shouldScroll = members.length > MAX_VISIBLE_ALLOCATION_PROJECTS;

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onAddAllocation?.({ row, column, cell, centers })}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onAddAllocation?.({ row, column, cell, centers });
        }
      }}
      className='flex w-full cursor-pointer flex-col gap-1 px-[7px] py-[7px] text-left transition hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-base'
    >
      <div
        className={cn(
          'flex w-full flex-col gap-1',
          shouldScroll &&
            cn(
              ALLOCATION_PROJECT_LIST_SCROLL_HEIGHT,
              'shrink-0 overflow-y-auto overscroll-contain',
            ),
        )}
      >
        {members.map((member) => (
          <MemberChipRow
            key={`${member.team_type}::${member.member_id}`}
            name={member.name}
            image={member.image}
            percentage={member.allocation_percentage}
          />
        ))}
      </div>
    </div>
  );
};

const AllocationFooter = ({ totalPercentage, projectCount }) => {
  const footer = getAllocationCellFooterConfig(totalPercentage, projectCount);

  return (
    <div
      className={cn('flex w-full items-center justify-between px-3 py-0.5', footer.barClassName)}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.22px]',
          footer.textClassName,
        )}
      >
        {footer.label}
      </span>
      <span className={cn('shrink-0 text-label-xs font-bold', footer.textClassName)}>
        {footer.value}
      </span>
    </div>
  );
};

const AllocationCell = ({ cell, onAddAllocation, member, column, centers }) => {
  if (!cell) {
    return <AddAllocationButton onClick={() => onAddAllocation?.({ member, column, centers })} />;
  }

  const allocations = (cell.allocations || []).filter(
    (allocation) => Number(allocation.allocation_percentage) > 0,
  );
  const totalPercentage = Number(cell.total_percentage) || 0;

  if (allocations.length === 0) {
    return (
      <AddAllocationButton onClick={() => onAddAllocation?.({ member, column, cell, centers })} />
    );
  }

  const shouldScrollProjects = allocations.length > MAX_VISIBLE_ALLOCATION_PROJECTS;

  const handleOpenAllocation = () => {
    onAddAllocation?.({ member, column, cell, centers });
  };

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleOpenAllocation}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenAllocation();
        }
      }}
      className='flex w-full cursor-pointer flex-col gap-2 pt-[7px] text-left transition hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-base'
    >
      <div
        className={cn(
          'flex w-full flex-col gap-1 px-[7px]',
          shouldScrollProjects &&
            cn(
              ALLOCATION_PROJECT_LIST_SCROLL_HEIGHT,
              'shrink-0 overflow-y-auto overscroll-contain',
            ),
        )}
      >
        {allocations.map((allocation) => (
          <ProjectAllocationRow
            key={allocation.client || allocation.id}
            name={allocation.client_name}
            percentage={allocation.allocation_percentage}
          />
        ))}
      </div>
      <AllocationFooter totalPercentage={totalPercentage} projectCount={allocations.length} />
    </div>
  );
};

const MonthCells = ({ member, columns, onAddAllocation, centers }) =>
  columns.map((column) => (
    <Table.Cell
      key={`${member.id}-${column.id}`}
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
      <AllocationCell
        cell={member.cells?.[column.id]}
        member={member}
        column={column}
        centers={centers}
        onAddAllocation={onAddAllocation}
      />
    </Table.Cell>
  ));

const MemberRow = ({ member, columns, indent = 48, onAddAllocation, centers }) => {
  if (!member) return null;

  return (
    <Table.Row className={ROW_CLASS}>
      <Table.Cell
        className={cn(STICKY_RESOURCE_BODY, CELL_HEIGHT)}
        style={{ paddingLeft: `${indent}px` }}
      >
        <div className='flex items-center gap-3 py-1'>
          <Avatar.Root size='32'>
            <Avatar.Image src={member.image || DEFAULT_AVATAR} alt={member.name} />
          </Avatar.Root>
          <div className='min-w-0'>
            <div className='truncate text-label-sm font-medium text-text-strong-950'>
              {member.name}
            </div>
            {member.designation ? (
              <div className='truncate text-paragraph-xs text-text-soft-400'>
                {member.designation}
              </div>
            ) : null}
          </div>
        </div>
      </Table.Cell>
      <MonthCells
        member={member}
        columns={columns}
        onAddAllocation={onAddAllocation}
        centers={centers}
      />
    </Table.Row>
  );
};

const TeamLeadRow = ({ row, columns, expanded, onToggle, onAddAllocation, centers }) => {
  const member = row.member;
  const Icon = expanded ? RiArrowDownSLine : RiArrowRightSLine;

  return (
    <Table.Row className={ROW_CLASS}>
      <Table.Cell className={cn(STICKY_RESOURCE_BODY, CELL_HEIGHT)} style={{ paddingLeft: '24px' }}>
        <div className='flex items-center gap-3 py-1'>
          <button type='button' onClick={onToggle} className='shrink-0'>
            <Icon className='size-6 text-text-sub-600' />
          </button>
          {member ? (
            <Avatar.Root size='32'>
              <Avatar.Image src={member.image || DEFAULT_AVATAR} alt={member.name} />
            </Avatar.Root>
          ) : null}
          <div className='min-w-0'>
            <div className='text-label-sm font-medium text-text-strong-950'>{row.label}</div>
            {row.subtitle ? (
              <div className='flex items-center gap-1 text-paragraph-xs text-text-soft-400'>
                <span>{row.subtitle}</span>
                {row.member_count != null ? (
                  <>
                    <span>•</span>
                    <span>{row.member_count} Members</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Table.Cell>
      {member ? (
        <MonthCells
          member={member}
          columns={columns}
          onAddAllocation={onAddAllocation}
          centers={centers}
        />
      ) : (
        columns.map((column) => (
          <Table.Cell
            key={`${row.id}-${column.id}`}
            className={cn(MONTH_COL_WIDTH, CELL_HEIGHT, MONTH_CELL_BORDER)}
          />
        ))
      )}
    </Table.Row>
  );
};

const DepartmentRow = ({ row, columns, expanded, onToggle }) => {
  const Icon = expanded ? RiArrowDownSLine : RiArrowRightSLine;

  return (
    <Table.Row className={ROW_CLASS}>
      <Table.Cell className={cn(STICKY_RESOURCE_BODY, DEPT_CELL_HEIGHT)}>
        <button
          type='button'
          onClick={onToggle}
          className='flex w-full items-center gap-2 py-2 pl-3 text-left'
        >
          <Icon className='size-6 shrink-0 text-text-sub-600' />
          <span className='truncate text-label-sm font-medium text-text-strong-950'>
            {row.label}
          </span>
        </button>
      </Table.Cell>
      {columns.map((column) => (
        <Table.Cell
          key={`${row.id}-${column.id}`}
          className={cn(
            MONTH_COL_WIDTH,
            DEPT_CELL_HEIGHT,
            MONTH_CELL_BORDER,
            'bg-bg-white-0',
            column.is_current && 'bg-[#F3FBF8]',
          )}
        />
      ))}
    </Table.Row>
  );
};

const ProjectHeaderRow = ({ row, columns, expanded, onToggle }) => {
  const Icon = expanded ? RiArrowDownSLine : RiArrowRightSLine;

  return (
    <Table.Row className={ROW_CLASS}>
      <Table.Cell className={cn(STICKY_RESOURCE_BODY, DEPT_CELL_HEIGHT)}>
        <button
          type='button'
          onClick={onToggle}
          className='flex w-full items-center gap-2 py-2 pl-3 text-left'
        >
          <Icon className='size-6 shrink-0 text-text-sub-600' />
          <span className='truncate text-label-sm font-medium text-text-strong-950'>
            {row.label}
            {row.member_count != null ? (
              <span className='font-normal text-text-soft-400'> ({row.member_count} Members)</span>
            ) : null}
          </span>
          {row.status_badge ? (
            <Badge.Root size='small' variant='light' color='green' className='shrink-0'>
              {row.status_badge}
            </Badge.Root>
          ) : null}
        </button>
      </Table.Cell>
      {columns.map((column) => (
        <Table.Cell
          key={`${row.id}-${column.id}`}
          className={cn(
            MONTH_COL_WIDTH,
            DEPT_CELL_HEIGHT,
            MONTH_CELL_BORDER,
            'bg-bg-white-0',
            column.is_current && 'bg-[#F3FBF8]',
          )}
        />
      ))}
    </Table.Row>
  );
};

const ProjectTeamRow = ({ row, columns, onAddAllocation, centers }) => (
  <Table.Row className={ROW_CLASS}>
    <Table.Cell className={cn(STICKY_RESOURCE_BODY, CELL_HEIGHT)} style={{ paddingLeft: '44px' }}>
      <div className='flex items-center py-2'>
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
        <ProjectTeamAllocationCell
          cell={row.cells?.[column.id]}
          row={row}
          column={column}
          centers={centers}
          onAddAllocation={onAddAllocation}
        />
      </Table.Cell>
    ))}
  </Table.Row>
);

const ExpandableRow = ({
  row,
  columns,
  onAddAllocation,
  centers,
  expandedById,
  onToggleExpand,
}) => {
  const isExpandable = EXPANDABLE_ROW_TYPES.has(row.type) && Boolean(row.children?.length);
  const expanded = isExpandable ? expandedById[row.id] === true : false;
  const handleToggle = () => onToggleExpand(row.id);

  if (row.type === 'member') {
    return (
      <MemberRow
        member={row}
        columns={columns}
        onAddAllocation={onAddAllocation}
        centers={centers}
      />
    );
  }

  if (row.type === 'project') {
    return (
      <>
        <ProjectHeaderRow row={row} columns={columns} expanded={expanded} onToggle={handleToggle} />
        {expanded
          ? (row.children || []).map((child) => (
              <ExpandableRow
                key={child.id}
                row={child}
                columns={columns}
                onAddAllocation={onAddAllocation}
                centers={centers}
                expandedById={expandedById}
                onToggleExpand={onToggleExpand}
              />
            ))
          : null}
      </>
    );
  }

  if (row.type === 'project_team') {
    return (
      <ProjectTeamRow
        row={row}
        columns={columns}
        onAddAllocation={onAddAllocation}
        centers={centers}
      />
    );
  }

  if (row.type === 'role_type') {
    return (
      <>
        <DepartmentRow row={row} columns={columns} expanded={expanded} onToggle={handleToggle} />
        {expanded
          ? (row.children || []).map((child) => (
              <ExpandableRow
                key={child.id}
                row={child}
                columns={columns}
                onAddAllocation={onAddAllocation}
                centers={centers}
                expandedById={expandedById}
                onToggleExpand={onToggleExpand}
              />
            ))
          : null}
      </>
    );
  }

  if (row.type === 'team_lead') {
    return (
      <>
        <TeamLeadRow
          row={row}
          columns={columns}
          expanded={expanded}
          onToggle={handleToggle}
          onAddAllocation={onAddAllocation}
          centers={centers}
        />
        {expanded
          ? (row.children || []).map((child) => (
              <ExpandableRow
                key={child.id}
                row={child}
                columns={columns}
                onAddAllocation={onAddAllocation}
                centers={centers}
                expandedById={expandedById}
                onToggleExpand={onToggleExpand}
              />
            ))
          : null}
      </>
    );
  }

  return (row.children || []).map((child) => (
    <ExpandableRow
      key={child.id}
      row={child}
      columns={columns}
      onAddAllocation={onAddAllocation}
      centers={centers}
      expandedById={expandedById}
      onToggleExpand={onToggleExpand}
    />
  ));
};

const TeamPlanningTable = ({
  columns = [],
  rows = [],
  centers = [],
  isLoading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  onRetry,
  onAddAllocation,
  resourceColumnLabel = 'Resource',
}) => {
  const scrollRef = useRef(null);
  const [expandedById, setExpandedById] = useState({});

  const expandableRowIds = useMemo(() => collectExpandableRowIds(rows), [rows]);

  useEffect(() => {
    setExpandedById((previous) => {
      const next = {};
      expandableRowIds.forEach((id) => {
        next[id] = previous[id] ?? false;
      });
      return next;
    });
  }, [expandableRowIds]);

  const allExpanded =
    expandableRowIds.length > 0 && expandableRowIds.every((id) => expandedById[id] === true);

  const handleToggleExpand = useCallback((rowId) => {
    setExpandedById((previous) => ({
      ...previous,
      [rowId]: !previous[rowId],
    }));
  }, []);

  const handleToggleExpandAll = useCallback(() => {
    const nextExpanded = !allExpanded;
    setExpandedById((previous) => {
      const next = { ...previous };
      expandableRowIds.forEach((id) => {
        next[id] = nextExpanded;
      });
      return next;
    });
  }, [allExpanded, expandableRowIds]);

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
        title='Failed to load team planning'
        message={typeof error === 'string' ? error : 'Something went wrong while loading the grid.'}
        onRetry={onRetry}
      />
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className='flex items-center justify-center rounded-2xl border border-stroke-soft-200 py-16 text-text-soft-400'>
        Loading team planning...
      </div>
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>
          {emptyTitle || 'No team members found'}
        </h3>
        <p className='max-w-md text-sm text-text-sub-600'>
          {emptyDescription || 'Adjust your center selection or search to see planning data.'}
        </p>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-stroke-soft-200 bg-bg-white-0'>
      <div ref={scrollRef} className='relative overflow-x-auto'>
        <table className='min-w-full w-max border-separate border-spacing-0'>
          <Table.Header>
            <Table.Row>
              <Table.Head
                className={cn(
                  STICKY_RESOURCE_HEAD,
                  'pl-4 text-label-sm font-medium text-text-soft-400',
                )}
              >
                <ResourceColumnHeader
                  allExpanded={allExpanded}
                  onToggleExpandAll={handleToggleExpandAll}
                  hasExpandableRows={expandableRowIds.length > 0}
                  label={resourceColumnLabel}
                />
              </Table.Head>
              {columns.map((column) => (
                <Table.Head
                  key={column.id}
                  data-month-column={column.id}
                  data-is-current={column.is_current ? 'true' : undefined}
                  className={cn(
                    MONTH_COL_WIDTH,
                    '!rounded-none border-r border-b border-stroke-soft-200 bg-bg-weak-100 text-center text-label-xs font-medium text-text-soft-400 last:border-r-0',
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
              <ExpandableRow
                key={row.id}
                row={row}
                columns={columns}
                centers={centers}
                onAddAllocation={onAddAllocation}
                expandedById={expandedById}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </Table.Body>
        </table>
      </div>
    </div>
  );
};

export default TeamPlanningTable;
