import React, { useEffect, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import * as Select from '@/components/ui/select';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { getAllocatedPercentageBadgeClass } from './constants';

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const BenchMemberRow = ({ member, showJoinBadge = false }) => {
  const allocatedPct = Number(member.allocated_percentage);
  const showAllocatedBadge = Number.isFinite(allocatedPct);
  const joinBadge = showJoinBadge || Boolean(member.joining_day_label && member.date_of_joining);

  return (
    <div className='flex w-full items-center justify-between gap-2 rounded-md border border-stroke-soft-200 bg-bg-weak-100 py-1 pl-[7px] pr-[3px] shadow-[0px_1px_1px_rgba(228,229,231,0.24)]'>
      <div className='flex min-w-0 items-center gap-1.5'>
        <Avatar.Root size={16}>
          <Avatar.Image src={member.image || DEFAULT_AVATAR} alt={member.name} />
        </Avatar.Root>
        <span className='min-w-0 truncate text-label-xs font-medium text-[#162664] opacity-80'>
          {member.name}
        </span>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        {showAllocatedBadge ? (
          <span
            className={cn(
              'rounded-full px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px]',
              getAllocatedPercentageBadgeClass(allocatedPct),
            )}
          >
            {Math.round(allocatedPct)}%
          </span>
        ) : null}
        {joinBadge && member.joining_day_label ? (
          <span className='rounded-full bg-[#E4E5E7] px-[5px] py-0.5 text-[11px] font-medium uppercase tracking-[0.22px] text-text-sub-500'>
            {member.joining_day_label}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const DepartmentSection = ({ department, expanded, onToggle }) => {
  const members = department.members || [];

  return (
    <div className='rounded-md border border-stroke-soft-200 bg-bg-white-0'>
      <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left'
      >
        <span className='min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.6px] text-text-sub-500'>
          {department.label || department.id}
          {department.member_count != null ? ` (${department.member_count})` : ''}
        </span>
        {expanded ? (
          <RiArrowUpSLine className='size-3.5 shrink-0 text-text-soft-400' />
        ) : (
          <RiArrowDownSLine className='size-3.5 shrink-0 text-text-soft-400' />
        )}
      </button>
      {expanded ? (
        <div className='flex flex-col gap-1.5 px-2 pb-2'>
          {members.length === 0 ? (
            <p className='py-1 text-center text-label-xs text-text-soft-400'>No Members</p>
          ) : (
            members.map((member) => (
              <BenchMemberRow key={`${member.team_type}-${member.member_id}`} member={member} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

const MonthSection = ({ month, expanded, onToggle, onAddJoinee }) => {
  const departments = useMemo(() => {
    if (Array.isArray(month.departments) && month.departments.length > 0) {
      return month.departments;
    }
    // Backward-compatible fallback: group flat members by department.
    const byDept = {};
    (month.members || []).forEach((member) => {
      const label = member.department || 'Other';
      if (!byDept[label]) {
        byDept[label] = { id: label, label, members: [] };
      }
      byDept[label].members.push(member);
    });
    return Object.values(byDept)
      .map((dept) => ({ ...dept, member_count: dept.members.length }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [month.departments, month.members]);

  const newJoining = month.new_joining || [];
  const [expandedDepts, setExpandedDepts] = useState({});

  useEffect(() => {
    if (!expanded) return;
    setExpandedDepts((previous) => {
      const next = {};
      departments.forEach((dept, index) => {
        next[dept.id] = previous[dept.id] ?? index === 0;
      });
      return next;
    });
  }, [expanded, departments]);

  const hasContent = departments.length > 0 || newJoining.length > 0;

  return (
    <div className='border-b border-stroke-soft-200 last:border-b-0'>
      <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left'
      >
        <span className='text-label-xs font-medium uppercase tracking-[0.4px] text-text-sub-500'>
          {month.month_name || month.label}
        </span>
        {expanded ? (
          <RiArrowUpSLine className='size-4 shrink-0 text-text-soft-400' />
        ) : (
          <RiArrowDownSLine className='size-4 shrink-0 text-text-soft-400' />
        )}
      </button>

      {expanded ? (
        <div className='flex flex-col gap-2 px-3 pb-3'>
          {!hasContent ? (
            <p className='py-2 text-center text-label-xs text-text-soft-400'>No Members</p>
          ) : null}

          {departments.map((department) => (
            <DepartmentSection
              key={department.id}
              department={department}
              expanded={Boolean(expandedDepts[department.id])}
              onToggle={() =>
                setExpandedDepts((previous) => ({
                  ...previous,
                  [department.id]: !previous[department.id],
                }))
              }
            />
          ))}

          <div className='mt-1 flex items-center justify-between gap-2'>
            <span className='text-[10px] font-medium uppercase tracking-[0.6px] text-text-soft-400'>
              New Joining
            </span>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type='button'
                  onClick={() => onAddJoinee?.({ month })}
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
            <BenchMemberRow
              key={`join-${member.team_type}-${member.member_id}`}
              member={member}
              showJoinBadge
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const AvailableBenchPanel = ({
  months = [],
  departments = [],
  department,
  planningYear,
  onDepartmentChange,
  isLoading = false,
  onAddJoinee,
  collapsed: collapsedProp,
  onCollapsedChange,
}) => {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const setCollapsed = onCollapsedChange || setCollapsedInternal;

  const [expandedMonths, setExpandedMonths] = useState({});

  // Current year: from this month through Dec. Other years (via year filter): full Jan–Dec.
  const visibleMonths = useMemo(() => {
    const now = new Date();
    const selectedYear = Number(planningYear) || now.getFullYear();
    if (selectedYear !== now.getFullYear()) return months;

    const currentMonthIndex = now.getMonth(); // 0-based
    return months.filter((month) => {
      const monthDate = month?.id ? new Date(`${String(month.id).slice(0, 10)}T00:00:00`) : null;
      if (!monthDate || Number.isNaN(monthDate.getTime())) return true;
      return monthDate.getFullYear() === selectedYear && monthDate.getMonth() >= currentMonthIndex;
    });
  }, [months, planningYear]);

  useEffect(() => {
    setExpandedMonths((previous) => {
      const next = {};
      visibleMonths.forEach((month, index) => {
        next[month.id] = previous[month.id] ?? (month.is_current || index === 0);
      });
      return next;
    });
  }, [visibleMonths]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All Departments' },
      ...departments.map((item) => ({ value: item, label: item })),
    ],
    [departments],
  );

  if (collapsed) {
    return (
      <div className='flex h-full w-10 shrink-0 flex-col items-center border-l border-stroke-soft-200 bg-bg-white-0 py-3'>
        <CompactButton.Root
          type='button'
          variant='ghost'
          size='medium'
          className='size-7'
          aria-label='Expand Available Bench'
          onClick={() => setCollapsed(false)}
        >
          <CompactButton.Icon as={RiArrowLeftSLine} />
        </CompactButton.Root>
        <span
          className='mt-4 text-label-xs font-medium uppercase tracking-[1px] text-text-sub-500'
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Available Bench
        </span>
      </div>
    );
  }

  return (
    <aside className='flex h-full w-[240px] shrink-0 flex-col border-l border-stroke-soft-200 bg-bg-white-0'>
      <div className='flex items-center justify-between gap-2 border-b border-stroke-soft-200 px-3 py-3'>
        <div className='flex items-center gap-1.5'>
          <CompactButton.Root
            type='button'
            variant='ghost'
            size='medium'
            className='size-7'
            aria-label='Collapse Available Bench'
            onClick={() => setCollapsed(true)}
          >
            <CompactButton.Icon as={RiArrowRightSLine} />
          </CompactButton.Root>
          <span className='text-label-xs font-medium uppercase tracking-[0.6px] text-text-strong-950'>
            Available Bench
          </span>
        </div>
      </div>

      <div className='border-b border-stroke-soft-200 px-3 py-2'>
        <Select.Root
          value={department || 'all'}
          onValueChange={onDepartmentChange}
          size='small'
          variant='compact'
        >
          <Select.Trigger className='w-full'>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {departmentOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {isLoading && visibleMonths.length === 0 ? (
          <p className='px-3 py-6 text-center text-label-xs text-text-soft-400'>Loading…</p>
        ) : null}
        {!isLoading && visibleMonths.length === 0 ? (
          <p className='px-3 py-6 text-center text-label-xs text-text-soft-400'>No bench data</p>
        ) : null}
        {visibleMonths.length > 0
          ? visibleMonths.map((month) => (
              <MonthSection
                key={month.id}
                month={month}
                expanded={Boolean(expandedMonths[month.id])}
                onToggle={() =>
                  setExpandedMonths((previous) => ({
                    ...previous,
                    [month.id]: !previous[month.id],
                  }))
                }
                onAddJoinee={onAddJoinee}
              />
            ))
          : null}
      </div>
    </aside>
  );
};

export default AvailableBenchPanel;
