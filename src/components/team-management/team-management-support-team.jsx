import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { getInitials } from '@/lib/utils';
import { useColumnConfig } from '@/hooks/use-column-config';
import { useDebounce } from '@/hooks/use-debounce';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';
import { prepareColumnsForConfig, applyColumnConfig } from '@/lib/column-utils';
import {
  EMPTY_STATES,
  RANGE_DAYS,
  getDefaultDateRange,
  getSupportTeamRoleBadgeColor,
  PAGE_SIZE,
  SCROLL_LOAD_THRESHOLD,
  SUPPORT_TEAM_GROUP_BY_OPTIONS,
  DEFAULT_TEAM_DROPDOWN_FILTERS,
  mergeStoredTeamDropdownFilters,
  buildTeamListApiFiltersFromApplied,
  mapRolesMessageToFilterOptions,
} from '@/components/team-management/constants';
import { mergeNavbarIntoLocalFilters } from '@/utils/combined-scope-filter';
import { compactFiltersForSessionStorage } from '@/utils/persisted-filters-utils';
import {
  RiErrorWarningLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiIndeterminateCircleLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAlertFill,
  RiArrowDownSLine,
  RiArrowUpSLine,
} from 'react-icons/ri';

import { TeamToolbar } from '@/components/team-management';
import * as ButtonGroup from '@/components/ui/button-group';
import {
  format,
  subDays,
  addDays,
  eachDayOfInterval,
  getDate,
  setDate,
  getDaysInMonth,
} from 'date-fns';

/** URL query key for which attendance day the member detail modal shows (yyyy-MM-dd). */
const TEAM_DETAIL_DATE_PARAM = 'detail_date';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Tooltip from '@/components/ui/tooltip';
import * as DatepickerPrimivites from '@/components/ui/calendar';
import * as Popover from '@/components/ui/popover';
import TeamUserDetailModal from './team-user-detail-modal';
import { useDispatch, useSelector } from 'react-redux';
import {
  setTeamUserDetailModal,
  fetchSupportTeamData,
  fetchTeamMemberDetail,
  fetchRolesWithType,
} from '@/redux/teamManagementSlice';
import { extractErrorMessage, showErrorToast } from '@/utils/error-utils';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const TEAM_SUPPORT_FILTER_STORAGE_KEY = 'team-management-support-team-filter-dropdown';

/** Find the nearest scrollable parent (overflow-y: auto | scroll). PageLayout scrolls a div, not the window. */
function findScrollableParent(el) {
  let p = el?.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    const oy = style.overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return p;
    p = p.parentElement;
  }
  return null;
}

/** Returns true when hygiene_status and ai_hygiene_status both exist but don't match.
 *  hygiene_status may arrive as an array e.g. ["Pass"] or as a plain string. */
function hasDayLevelMismatch(dayAttendance) {
  if (!dayAttendance) return false;
  const rawManual = Array.isArray(dayAttendance.hygiene_status)
    ? dayAttendance.hygiene_status[0]
    : dayAttendance.hygiene_status;
  const manual = String(rawManual ?? '')
    .trim()
    .toLowerCase();
  const ai = String(dayAttendance.ai_hygiene_status ?? '')
    .trim()
    .toLowerCase();

  // Only show mismatch when BOTH exist and differ
  return Boolean(manual && ai && manual !== ai);
}
const RemoveMemberModal = ({ isOpen, onOpenChange, member, onConfirm }) => {
  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          variant='center'
          icon={
            <span className='p-2 bg-warning-base/10 rounded-lg'>
              <RiAlertFill size={24} className='text-warning-base' />
            </span>
          }
          title='Remove Member?'
          description={'Are you sure you want to remove this member?'}
        />
        <Modal.Footer>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
            className='w-full'
          >
            Cancel
          </Button.Root>
          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={onConfirm}
            className='w-full'
          >
            Confirm
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

const resolveDateRange = (range) => {
  if (!range || !range.from) {
    return getDefaultDateRange();
  }
  return {
    from: range.from,
    to: range.to ?? range.from,
  };
};

const RangeDatePicker = ({ range, onRangeChange, open, onOpenChange }) => {
  const effectiveRange = range?.from ? range : getDefaultDateRange();
  const [displayMonth, setDisplayMonth] = useState(
    () => effectiveRange?.from ?? getDefaultDateRange().from,
  );

  // When popover opens or range changes, show the month containing the range start
  useEffect(() => {
    if (open && effectiveRange?.from) {
      setDisplayMonth(effectiveRange.from);
    }
  }, [open, effectiveRange?.from]);

  // When user switches month/year in the calendar, move the same day numbers to the new month/year
  const handleMonthChange = (newDisplayMonth) => {
    setDisplayMonth(newDisplayMonth);
    if (effectiveRange?.from) {
      const fromDay = getDate(effectiveRange.from);
      const maxDay = getDaysInMonth(newDisplayMonth);
      const newFrom = setDate(newDisplayMonth, Math.min(fromDay, maxDay));
      if (effectiveRange.to) {
        const toDay = getDate(effectiveRange.to);
        const newTo = setDate(newDisplayMonth, Math.min(toDay, maxDay));
        onRangeChange?.({ from: newFrom, to: newTo > newFrom ? newTo : newFrom });
      } else {
        onRangeChange?.({ from: newFrom, to: undefined });
      }
    }
  };

  const handleChange = (selectedRange) => {
    if (!selectedRange || !selectedRange.from) {
      if (effectiveRange?.from) {
        onRangeChange?.({ from: effectiveRange.from, to: effectiveRange.from });
        onOpenChange?.(false);
      }
      return;
    }
    onRangeChange?.(selectedRange);
    if (selectedRange?.from) setDisplayMonth(selectedRange.from);
    if (selectedRange?.from != null && selectedRange?.to != null) {
      onOpenChange?.(false);
    }
  };

  const handleDayClick = (day, _modifiers, e) => {
    if (e?.detail === 2) {
      onRangeChange?.({ from: day, to: day });
      onOpenChange?.(false);
    }
  };

  const handlePreviousWeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const resolved = resolveDateRange(range);
    const isSingleDay = resolved.from.toDateString() === resolved.to.toDateString();
    if (isSingleDay) {
      const newDay = subDays(resolved.from, 1);
      onRangeChange?.({ from: newDay, to: newDay });
    } else {
      const diffMs = resolved.to.getTime() - resolved.from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const newFrom = subDays(resolved.from, diffDays);
      const newTo = subDays(resolved.to, diffDays);
      onRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  const handleNextWeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const resolved = resolveDateRange(range);
    const isSingleDay = resolved.from.toDateString() === resolved.to.toDateString();
    if (isSingleDay) {
      const newDay = addDays(resolved.from, 1);
      onRangeChange?.({ from: newDay, to: newDay });
    } else {
      const diffMs = resolved.to.getTime() - resolved.from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const newFrom = addDays(resolved.from, diffDays);
      const newTo = addDays(resolved.to, diffDays);
      onRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <ButtonGroup.Root>
          <ButtonGroup.Item>
            {effectiveRange?.from ? (
              <>
                {format(effectiveRange.from, 'LLL dd, y')}
                {effectiveRange.to &&
                  effectiveRange.from.toDateString() !== effectiveRange.to.toDateString() && (
                    <> - {format(effectiveRange.to, 'LLL dd, y')}</>
                  )}
              </>
            ) : (
              <span>Select a range</span>
            )}
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={handlePreviousWeek} aria-label='Previous range'>
            <ButtonGroup.Icon as={RiArrowLeftSLine} />
          </ButtonGroup.Item>
          <ButtonGroup.Item onClick={handleNextWeek} aria-label='Next range'>
            <ButtonGroup.Icon as={RiArrowRightSLine} />
          </ButtonGroup.Item>
        </ButtonGroup.Root>
      </Popover.Trigger>
      <Popover.Content className='p-0' showArrow={false}>
        <DatepickerPrimivites.Calendar
          mode='range'
          selected={effectiveRange}
          onSelect={handleChange}
          month={displayMonth}
          onMonthChange={handleMonthChange}
          onDayClick={handleDayClick}
        />
      </Popover.Content>
    </Popover.Root>
  );
};

const DEFAULT_AVATAR =
  'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';

const AttendanceDateCell = ({ member, dateKey, handleDateCellClick }) => {
  const dayAttendance = member.attendance?.[dateKey];
  const status = dayAttendance?.status ?? null;
  const hygieneStatus = dayAttendance?.hygiene_status ?? null;
  const hygieneData = dayAttendance?.hygiene_data;

  const openModal = (e) => {
    e.stopPropagation();
    handleDateCellClick(member, dateKey);
  };

  const dateLabel = (() => {
    try {
      const d = new Date(dateKey);
      return Number.isNaN(d.getTime()) ? dateKey : format(d, 'do EEE yyyy');
    } catch {
      return dateKey;
    }
  })();

  if (status === null || status === undefined) {
    return (
      <div
        className='flex items-center justify-center cursor-pointer'
        role='button'
        tabIndex={0}
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(e);
          }
        }}
      >
        <RiIndeterminateCircleLine size={20} color='gray' />
      </div>
    );
  }

  if (status === 'Absent' || status === 'absent') {
    return (
      <div
        className='flex items-center justify-center cursor-pointer'
        role='button'
        tabIndex={0}
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(e);
          }
        }}
      >
        <RiCloseCircleFill color='red' size={20} />
      </div>
    );
  }
  const mismatch = hasDayLevelMismatch(dayAttendance);
  const icon = (
    <span className='relative inline-flex items-center justify-center w-[20px]'>
      <RiCheckboxCircleFill size={20} color={hygieneStatus === 'Fail' ? 'orange' : 'green'} />
      {mismatch && (
        <span
          className='absolute -right-[12px] top-1/2 -translate-y-1/2 font-bold text-[18px] leading-none text-orange-500'
          title='AI hygiene status mismatch'
        >
          !
        </span>
      )}
    </span>
  );
  const hasHygieneData = Array.isArray(hygieneData) && hygieneData.length > 0;
  const cardContent = hasHygieneData ? (
    <div className='rounded-lg bg-white shadow-[0px_4px_12px_rgba(27,28,29,0.12)] min-w-[260px] border border-stroke-soft-200'>
      <div className='px-3 py-2 rounded-t-lg bg-bg-weak-100 text-paragraph-sm border-b border-stroke-soft-200 font-medium text-text-strong-950 mb-3'>
        {dateLabel}
      </div>
      <ul className='flex flex-col gap-[6px] px-3 pb-2'>
        {hygieneData.map((item, index) => (
          <li
            key={index}
            className='flex items-center gap-2 paragraph-small text-[var(--color-text-sub-500)]'
          >
            {item?.status === 'Fail' ? (
              <RiErrorWarningLine size={16} color='orange' className='shrink-0' />
            ) : (
              <RiCheckboxCircleFill size={16} color='green' className='shrink-0' />
            )}
            <span>{item?.check_item}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className='rounded-2xl bg-white px-4 py-3 shadow-[0px_4px_12px_rgba(27,28,29,0.12)] border border-stroke-soft-200'>
      <div className='text-paragraph-sm font-medium text-text-strong-950 mb-2'>{dateLabel}</div>
      <span className='text-paragraph-xsmall text-text-sub-600'>
        {hygieneStatus === 'Fail' ? 'Hygiene: Fail' : 'Hygiene: Pass'}
        {!hasHygieneData && ' (no details)'}
      </span>
    </div>
  );

  return (
    <div
      className='flex items-center justify-center cursor-pointer'
      role='button'
      tabIndex={0}
      onClick={openModal}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(e);
        }
      }}
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className='inline-flex'>{icon}</span>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8} className='p-0 border-0 bg-transparent shadow-none'>
          {hasHygieneData ? cardContent : <span>Present</span>}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
};

const GroupedSupportView = ({
  groupedData,
  isLoading,
  tableVariant,
  weekDates,
  searchValue,
  onEdit,
  onDeleteMember,
  handleDateCellClick,
  onSelectMember,
}) => {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    Object.fromEntries(Object.keys(groupedData || {}).map((k) => [k, true])),
  );

  useEffect(() => {
    setExpandedKeys((previous) => {
      const next = { ...previous };
      Object.keys(groupedData || {}).forEach((k) => {
        if (next[k] === undefined) next[k] = true;
      });
      return next;
    });
  }, [groupedData]);

  const filteredData = useMemo(() => {
    if (!searchValue) return groupedData || {};
    const lower = searchValue.toLowerCase();
    const result = {};
    Object.entries(groupedData || {}).forEach(([key, members]) => {
      const filtered = (members || []).filter(
        (m) =>
          m.name?.toLowerCase().includes(lower) ||
          m.email?.toLowerCase().includes(lower) ||
          m.center_name?.toLowerCase().includes(lower) ||
          m.role?.toLowerCase().includes(lower) ||
          m.cell_number?.toLowerCase().includes(lower),
      );
      if (filtered.length > 0) result[key] = filtered;
    });
    return result;
  }, [groupedData, searchValue]);

  const toggle = (key) => setExpandedKeys((previous) => ({ ...previous, [key]: !previous[key] }));

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>Loading...</div>
    );
  }

  const entries = Object.entries(filteredData);
  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center py-16 text-text-soft-400'>
        No results found.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      {entries.map(([key, members]) => {
        const isExpanded = expandedKeys[key] !== false;
        return (
          <div key={key} className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => toggle(key)}
              className='label-small flex items-center gap-1 font-medium text-[var(--color-text-sub-500)] cursor-pointer hover:opacity-80 transition-opacity w-full text-left'
            >
              {key}
              <span className='text-text-soft-400 font-normal'>({members.length})</span>
              {isExpanded ? (
                <RiArrowUpSLine size={16} className='shrink-0' />
              ) : (
                <RiArrowDownSLine size={16} className='shrink-0' />
              )}
            </button>

            {isExpanded && (
              <div className='w-full overflow-x-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 pt-2'>
                <Table.Root variant={tableVariant} className='w-full'>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className='whitespace-nowrap'>Name</Table.Head>
                      <Table.Head className='whitespace-nowrap'>Center</Table.Head>
                      <Table.Head className='whitespace-nowrap'>Role</Table.Head>
                      <Table.Head className='whitespace-nowrap'>Mobile number</Table.Head>
                      <Table.Head className='whitespace-nowrap'>Status</Table.Head>
                      {weekDates.map((d) => (
                        <Table.Head key={d.date} className='text-center whitespace-nowrap'>
                          <span className='label-small text-text-soft-400'>{d.dateFormatted}</span>
                        </Table.Head>
                      ))}
                      <Table.Head />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body spacing={8}>
                    {members.map((member, index) => (
                      <React.Fragment key={member.team_member_id || member.email || index}>
                        <Table.Row
                          className='cursor-pointer'
                          onClick={() => onSelectMember?.(member)}
                        >
                          <Table.Cell className='min-w-0'>
                            <div className='flex items-center gap-3 min-w-0'>
                              <Avatar.Root size={32} color='gray' className='shrink-0'>
                                <Avatar.Image
                                  src={member.image || DEFAULT_AVATAR}
                                  alt={member.name || '--'}
                                />
                              </Avatar.Root>
                              <Tooltip.Root size='xsmall'>
                                <Tooltip.Trigger asChild>
                                  <span className='text-paragraph-sm text-text-strong-950 truncate min-w-[220px] max-w-[220px]'>
                                    {member.name || '--'}
                                  </span>
                                </Tooltip.Trigger>
                                {member.name && (
                                  <Tooltip.Content size='xsmall'>{member.name}</Tooltip.Content>
                                )}
                              </Tooltip.Root>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className='text-paragraph-sm whitespace-nowrap text-text-strong-950'>
                              {member.center_name || '--'}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge.Root
                              size='small'
                              variant='light'
                              color={getSupportTeamRoleBadgeColor(member.role)}
                              className='whitespace-nowrap pt-[4px] pb-[2px] px-[6px]'
                            >
                              {member.role || '--'}
                            </Badge.Root>
                          </Table.Cell>
                          <Table.Cell>
                            <span
                              className='text-paragraph-sm whitespace-nowrap text-text-strong-950'
                              title={member.cell_number || undefined}
                            >
                              {member.cell_number || '--'}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge.Root
                              size='small'
                              variant='light'
                              color={member.status?.toLowerCase() === 'active' ? 'green' : 'gray'}
                              className='whitespace-nowrap pt-[4px] pb-[2px] px-[6px]'
                            >
                              {member.status || '--'}
                            </Badge.Root>
                          </Table.Cell>
                          {weekDates.map((d) => (
                            <Table.Cell key={d.date} className='text-center'>
                              <AttendanceDateCell
                                member={member}
                                dateKey={d.date}
                                handleDateCellClick={handleDateCellClick}
                              />
                            </Table.Cell>
                          ))}
                          <Table.Cell>
                            <div className='flex items-center gap-1 justify-end'>
                              <CompactButton.Root
                                variant='ghost'
                                size='medium'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit?.(member);
                                }}
                                aria-label='Edit member'
                              >
                                <CompactButton.Icon as={RiPencilLine} />
                              </CompactButton.Root>
                              <CompactButton.Root
                                variant='ghost'
                                size='medium'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteMember(member);
                                }}
                                aria-label='Delete member'
                              >
                                <CompactButton.Icon as={RiDeleteBinLine} />
                              </CompactButton.Root>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                        {index < members.length - 1 && <Table.RowDivider />}
                      </React.Fragment>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TeamManagementSupportTeam = ({
  onRowSelect,
  onEdit,
  onDelete,
  onAddMember,
  onExport,
  tableVariant,
  onTableVariantToggle,
  widgetVisibility: _widgetVisibility,
  WIDGET_KEYS: _WIDGET_KEYS,
  teamTabValue,
  noCenters = false,
  headerScope,
  centerAccessLoading = false,
}) => {
  const dispatch = useDispatch();
  const { employee_id: employeeIdFromParams } = useParams();
  const supportScopeData = useSelector((state) => state.teamManagement.supportTeamData);
  const isActiveTab = teamTabValue === 'support';
  const location = useLocation();

  const teamUserDetailModal = useSelector((state) => state.teamManagement.teamUserDetailModal);

  const isLoading = supportScopeData?.isLoading ?? false;
  const error = supportScopeData?.error ?? null;

  const [filters, setFilters] = useState({ search: '' });
  const debouncedSearchKeyword = useDebounce(filters.search, 400);
  const [sorting, setSorting] = useState([]);
  const [groupBy, setGroupBy] = useState('');
  const [groupOrder, setGroupOrder] = useState('asc');
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...DEFAULT_TEAM_DROPDOWN_FILTERS,
  }));
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [persistedFilters, setPersistedFilters] = usePersistedFilters({
    storageKey: TEAM_SUPPORT_FILTER_STORAGE_KEY,
    defaultFilters: DEFAULT_TEAM_DROPDOWN_FILTERS,
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchRolesWithType({ group: 'support' }))
      .unwrap()
      .then((res) => {
        setRoleOptions(mapRolesMessageToFilterOptions(res?.message ?? {}));
      })
      .catch(() => setRoleOptions([]));
  }, [dispatch]);

  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const [selectedMember, setSelectedMember] = useState();

  const [activeTab, setActiveTab] = useState('active');
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const teamTableRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (filtersInitialized) return;
    setAppliedFilters(mergeStoredTeamDropdownFilters(persistedFilters));
    setFiltersInitialized(true);
  }, [persistedFilters, filtersInitialized]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const compact = compactFiltersForSessionStorage(
      appliedFilters,
      DEFAULT_TEAM_DROPDOWN_FILTERS,
      {},
    );
    if (JSON.stringify(compact) !== JSON.stringify(persistedFilters)) {
      setPersistedFilters(compact);
    }
  }, [appliedFilters, filtersInitialized, persistedFilters, setPersistedFilters]);

  useEffect(() => {
    if (!filtersInitialized) return;
    const searchParams = new URLSearchParams(location.search);
    const roleFromQuery = searchParams.get('role');
    if (!roleFromQuery) return;

    setAppliedFilters((previous) => {
      if (
        Array.isArray(previous.role) &&
        previous.role.length === 1 &&
        previous.role[0] === roleFromQuery
      ) {
        return previous;
      }
      return {
        ...previous,
        role: [roleFromQuery],
      };
    });
  }, [location.search, filtersInitialized]);

  const effectiveFilters = useMemo(
    () =>
      mergeNavbarIntoLocalFilters({
        localFilters: appliedFilters,
        navbarFilter: headerScope,
        unionFields: ['center'],
      }),
    [appliedFilters, headerScope],
  );

  // Build API filters for listing: status, from_date, to_date always included (required on mount/refresh)
  const apiFilters = useMemo(() => {
    const range = resolveDateRange(dateRange);
    const fromString = format(range.from, 'yyyy-MM-dd');
    const toString_ = format(range.to, 'yyyy-MM-dd');
    const statusValue = activeTab === 'active' ? 'Active' : 'Inactive';
    const filters = [
      ['status', '=', statusValue],
      ['from_date', '=', fromString],
      ['to_date', '=', toString_],
    ];
    const toolbarFilters = buildTeamListApiFiltersFromApplied(effectiveFilters);
    toolbarFilters.forEach((clause) => {
      if (clause[0] !== 'status') filters.push(clause);
    });
    return filters;
  }, [dateRange, activeTab, effectiveFilters]);

  const apiMonthYear = useMemo(() => {
    const range = resolveDateRange(dateRange);
    return {
      month: range.from.getMonth() + 1,
      year: range.from.getFullYear(),
    };
  }, [dateRange]);

  const apiFromToDates = useMemo(() => {
    const range = resolveDateRange(dateRange);
    return {
      from_date: format(range.from, 'yyyy-MM-dd'),
      to_date: format(range.to, 'yyyy-MM-dd'),
    };
  }, [dateRange]);

  const handleFetchData = useCallback(
    async (opts = {}) => {
      if (!isActiveTab || !filtersInitialized) return;
      if (centerAccessLoading || headerScope === undefined) return;
      const range = resolveDateRange(dateRange);
      const from_date = apiFromToDates.from_date ?? format(range.from, 'yyyy-MM-dd');
      const to_date = apiFromToDates.to_date ?? format(range.to, 'yyyy-MM-dd');
      const status = activeTab === 'active' ? 'Active' : 'Inactive';
      const keyword = opts.keyword !== undefined ? opts.keyword : debouncedSearchKeyword;
      try {
        await dispatch(
          fetchSupportTeamData({
            filters: apiFilters,
            status,
            month: apiMonthYear.month,
            year: apiMonthYear.year,
            from_date,
            to_date,
            page: opts.page ?? 1,
            page_size: opts.page_size ?? PAGE_SIZE,
            append: opts.append ?? false,
            group_by: opts.group_by ?? '',
            group_order: opts.group_order ?? 'asc',
            keyword: keyword ?? '',
            // ...(navbarFilter != null ? { navbar_filter: navbarFilter } : {}),
          }),
        ).unwrap();
      } catch (error_) {
        showErrorToast(error_);
      }
    },
    [
      dispatch,
      isActiveTab,
      apiFilters,
      apiMonthYear.month,
      apiMonthYear.year,
      apiFromToDates.from_date,
      apiFromToDates.to_date,
      dateRange,
      activeTab,
      debouncedSearchKeyword,
      filtersInitialized,
      headerScope,
      centerAccessLoading,
    ],
  );

  // Fetch when Support tab is active and when filters, date range, group-by, or search keyword change
  useEffect(() => {
    if (!isActiveTab || !filtersInitialized) return;
    if (centerAccessLoading || headerScope === undefined) return;
    handleFetchData({
      page: 1,
      append: false,
      group_by: groupBy,
      group_order: groupOrder,
      keyword: debouncedSearchKeyword ?? '',
    });
  }, [
    apiFilters,
    handleFetchData,
    isActiveTab,
    groupBy,
    groupOrder,
    debouncedSearchKeyword,
    filtersInitialized,
    headerScope,
    centerAccessLoading,
  ]);

  // Scroll pagination: load more when user scrolls near bottom (disabled in grouped view).
  // Use the actual scroll container (PageLayout's overflow-y div), not window — window doesn't scroll here.
  const handleScroll = useCallback(
    (scrollElement) => {
      if (
        !filtersInitialized ||
        !isActiveTab ||
        centerAccessLoading ||
        headerScope === undefined ||
        supportScopeData.isLoadingMore ||
        !supportScopeData.hasMore
      )
        return;
      if (!scrollElement) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD) {
        handleFetchData({
          page: (supportScopeData.page ?? 1) + 1,
          page_size: supportScopeData.pageSize ?? PAGE_SIZE,
          append: true,
          group_by: groupBy,
          group_order: groupOrder,
          keyword: debouncedSearchKeyword ?? '',
        });
      }
    },
    [
      isActiveTab,
      groupBy,
      groupOrder,
      supportScopeData.hasMore,
      supportScopeData.isLoadingMore,
      supportScopeData.page,
      supportScopeData.pageSize,
      handleFetchData,
      debouncedSearchKeyword,
      filtersInitialized,
      headerScope,
      centerAccessLoading,
    ],
  );

  useEffect(() => {
    if (!isActiveTab) return;
    const scrollEl = scrollContainerRef.current
      ? scrollContainerRef.current.querySelector('.overflow-auto')
      : null;
    if (!scrollEl) return;
    const onScroll = () => handleScroll(scrollEl);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [handleScroll, isActiveTab, supportScopeData.data, isLoading]);

  // Get dates for the selected range (from date to to date)
  const weekDates = useMemo(() => {
    const range = resolveDateRange(dateRange);
    const start = range.from < range.to ? range.from : range.to;
    const end = range.from < range.to ? range.to : range.from;
    try {
      const days = eachDayOfInterval({ start, end });
      return days.map((date) => ({
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
        dayNumber: date.getDate(),
        dateFormatted: format(date, 'dd, EEE'),
      }));
    } catch (error_) {
      console.error('Error generating week dates:', error_);
      return [];
    }
  }, [dateRange]);

  const isGroupedView = Boolean(groupBy);

  // Flat array for the normal table view
  const tableData = useMemo(() => {
    if (isGroupedView) return [];
    const rawData = supportScopeData?.data;
    return Array.isArray(rawData) ? rawData : (rawData?.results ?? []);
  }, [supportScopeData?.data, isGroupedView]);

  // Grouped object for the grouped view (populated after API responds with grouped data)
  const groupedData = useMemo(() => {
    if (!isGroupedView) return {};
    const rawData = supportScopeData?.data;
    if (rawData && !Array.isArray(rawData) && typeof rawData === 'object') return rawData;
    return {};
  }, [supportScopeData?.data, isGroupedView]);

  // Table data for flat view: API returns filtered results when keyword is passed, so use tableData as-is
  const filteredTeamMembers = useMemo(() => {
    if (isGroupedView) return [];
    return tableData;
  }, [tableData, isGroupedView]);

  const handleSearchChange = useCallback((value) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const handleSortingChange = useCallback((updaterOrValue) => {
    setSorting((previous) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(previous) : updaterOrValue;
      return next;
    });
  }, []);

  const handleGroupByChange = useCallback((value) => {
    setGroupBy(value);
    if (!value) setGroupOrder('asc');
  }, []);

  const handleGroupOrderChange = useCallback((value) => {
    setGroupOrder(value);
  }, []);

  const handleFiltersChange = useCallback((filtersArray, filterValues) => {
    const nextAppliedFilters = filterValues || {};
    setAppliedFilters(nextAppliedFilters);
  }, []);

  const handleSelectMember = (data) => {
    if (data?.status?.toLowerCase() === 'inactive') return;
    if (!data?.employee_id) return;
    setSelectedMember(data);
    if (employeeIdFromParams === data.employee_id) {
      const params = new URLSearchParams(location.search);
      if (params.has(TEAM_DETAIL_DATE_PARAM)) {
        params.delete(TEAM_DETAIL_DATE_PARAM);
        const q = params.toString();
        navigate(`/team-management/support_team/${data.employee_id}${q ? `?${q}` : ''}`, {
          replace: true,
        });
      }
      dispatch(setTeamUserDetailModal(true));
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete(TEAM_DETAIL_DATE_PARAM);
    const q = params.toString();
    navigate(`/team-management/support_team/${data.employee_id}${q ? `?${q}` : ''}`);
  };

  const handleDateCellClick = useCallback(
    (member, dateKey) => {
      if (!member?.employee_id) return;
      if (member?.status?.toLowerCase() === 'inactive') return;
      const d = new Date(dateKey);
      if (Number.isNaN(d.getTime())) return;
      setSelectedMember(member);
      dispatch(setTeamUserDetailModal(true));
      const params = new URLSearchParams(location.search);
      params.set(TEAM_DETAIL_DATE_PARAM, dateKey);
      navigate(`/team-management/support_team/${member.employee_id}?${params.toString()}`);
    },
    [dispatch, navigate, location.search],
  );

  useEffect(() => {
    if (!employeeIdFromParams) {
      dispatch(setTeamUserDetailModal(false));
      return;
    }

    dispatch(setTeamUserDetailModal(true));

    const params = new URLSearchParams(location.search);
    const dateFromQuery = params.get(TEAM_DETAIL_DATE_PARAM);
    let selectedDate;
    let month;
    let year;

    if (dateFromQuery) {
      const parsed = new Date(dateFromQuery);
      if (!Number.isNaN(parsed.getTime())) {
        selectedDate = dateFromQuery;
        month = parsed.getMonth() + 1;
        year = parsed.getFullYear();
      }
    }

    if (selectedDate == null) {
      const today = new Date();
      selectedDate = format(today, 'yyyy-MM-dd');
      month = today.getMonth() + 1;
      year = today.getFullYear();
    }

    dispatch(
      fetchTeamMemberDetail({
        employee_id: employeeIdFromParams,
        month,
        year,
        selected_date: selectedDate,
      }),
    );
  }, [dispatch, employeeIdFromParams, location.search]);

  useEffect(() => {
    if (!employeeIdFromParams) return;
    const allMembers = Array.isArray(supportScopeData?.data)
      ? supportScopeData.data
      : (supportScopeData?.data?.results ?? []);
    const matchedMember = allMembers.find((member) => member?.employee_id === employeeIdFromParams);
    if (!matchedMember) return;
    if (matchedMember?.status?.toLowerCase() === 'inactive') {
      dispatch(setTeamUserDetailModal(false));
      return;
    }
    setSelectedMember((previous) =>
      previous?.employee_id === matchedMember.employee_id ? previous : matchedMember,
    );
  }, [dispatch, employeeIdFromParams, supportScopeData?.data]);

  const handleDetailModalOpenChange = useCallback(
    (open) => {
      if (open) return;
      dispatch(setTeamUserDetailModal(false));
      const params = new URLSearchParams(location.search);
      params.delete(TEAM_DETAIL_DATE_PARAM);
      const q = params.toString();
      navigate(`/team-management/support_team${q ? `?${q}` : ''}`);
    },
    [dispatch, navigate, location.search],
  );

  // Determine context for empty states
  const context = useMemo(() => {
    // if (noCenters) return 'no_centers';
    const hasSearch = Boolean(filters.search);
    const hasFilters =
      appliedFilters.center?.length > 0 ||
      appliedFilters.status?.length > 0 ||
      appliedFilters.role?.length > 0;

    if (hasSearch || hasFilters) {
      return 'search';
    }

    return 'default';
  }, [filters, appliedFilters, noCenters]);

  // Column definitions for support team table
  const allColumnDefs = useMemo(() => {
    const columns = [
      {
        id: 'name',
        accessorKey: 'name',
        columnLabel: 'Name',
        enableHiding: false,
        header: ({ column }) => <Table.SortableHeader column={column} label='Name' sortable />,
        cell: ({ row }) => {
          const displayName = row.original.name || '--';
          const userImage =
            row.original?.image ??
            'https://www.clipartmax.com/png/middle/258-2582267_circled-user-male-skin-type-1-2-icon-male-user-icon.png';
          const initials = getInitials(displayName) || '--';

          return (
            <div className='flex items-center gap-3 min-w-0'>
              <Avatar.Root size={32} color='gray' className='shrink-0'>
                {userImage ? (
                  <Avatar.Image src={userImage} alt={displayName} />
                ) : (
                  <span className='text-text-sub-500'>{initials}</span>
                )}
              </Avatar.Root>
              <Tooltip.Root size='xsmall'>
                <Tooltip.Trigger asChild>
                  <span className='text-paragraph-sm text-text-strong-950 truncate min-w-[220px] max-w-[220px]'>
                    {displayName}
                  </span>
                </Tooltip.Trigger>
                {displayName !== '--' && (
                  <Tooltip.Content size='xsmall'>{displayName}</Tooltip.Content>
                )}
              </Tooltip.Root>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'center',
        accessorKey: 'center_name',
        columnLabel: 'Center',
        header: ({ column }) => <Table.SortableHeader column={column} label='Center' sortable />,
        cell: ({ row }) => (
          <span className='text-paragraph-sm whitespace-nowrap text-text-strong-950'>
            {row.original.center_name || '--'}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'role',
        accessorKey: 'role',
        columnLabel: 'Role',
        header: ({ column }) => <Table.SortableHeader column={column} label='Role' sortable />,
        cell: ({ row }) => (
          <Badge.Root
            size='small'
            variant='light'
            color={getSupportTeamRoleBadgeColor(row.original.role)}
            className='whitespace-nowrap pt-[4px] pb-[2px] px-[6px]'
          >
            {row.original.role || '--'}
          </Badge.Root>
        ),
        enableSorting: true,
      },
      {
        id: 'cell_number',
        accessorKey: 'cell_number',
        columnLabel: 'Mobile number',
        header: ({ column }) => (
          <Table.SortableHeader column={column} label='Mobile number' sortable />
        ),
        cell: ({ row }) => {
          const value = row.original.cell_number;
          return (
            <span
              className='text-paragraph-sm whitespace-nowrap text-text-strong-950'
              title={value || undefined}
            >
              {value || '--'}
            </span>
          );
        },
        enableSorting: true,
      },
    ];

    // Add date columns for the week – API uses attendance[date].status
    weekDates.forEach((dateInfo) => {
      const dateKey = dateInfo.date;
      columns.push({
        id: `date-${dateKey}`,
        accessorKey: `attendance.${dateKey}`,
        columnLabel: dateInfo.dateFormatted,
        header: () => (
          <div className='flex justify-center items-center gap-0.5'>
            <span
              className='label-small whitespace-nowrap text-text-soft-400'
              title={dateInfo.dateFormatted}
            >
              {dateInfo.dateFormatted}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const dayAttendance = row.original.attendance?.[dateKey];
          const status = dayAttendance?.status ?? null;
          const hygieneStatus = dayAttendance?.hygiene_status ?? null;
          const hygieneData = dayAttendance?.hygiene_data;

          const openModalForDate = (e) => {
            e.stopPropagation();
            handleDateCellClick(row.original, dateKey);
          };
          if (status === null || status === undefined) {
            return (
              <div
                className='flex items-center justify-center cursor-pointer'
                title='No data'
                role='button'
                tabIndex={0}
                onClick={openModalForDate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModalForDate(e);
                  }
                }}
              >
                <RiIndeterminateCircleLine size={20} color='gray' />
              </div>
            );
          }
          if (status === 'Absent' || status === 'absent') {
            return (
              <div
                className='flex items-center justify-center cursor-pointer'
                role='button'
                tabIndex={0}
                onClick={openModalForDate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModalForDate(e);
                  }
                }}
              >
                <RiCloseCircleFill color='red' size={20} />
              </div>
            );
          }
          const mismatch = hasDayLevelMismatch(dayAttendance);
          const icon = (
            <span className='relative inline-flex items-center justify-center w-[20px]'>
              <RiCheckboxCircleFill
                size={20}
                color={hygieneStatus === 'Fail' ? 'orange' : 'green'}
              />
              {mismatch && (
                <span
                  className='absolute -right-[12px] top-1/2 -translate-y-1/2 font-bold text-[18px] leading-none text-orange-500'
                  title='AI hygiene status mismatch'
                >
                  !
                </span>
              )}
            </span>
          );
          const hasHygieneData = Array.isArray(hygieneData) && hygieneData.length > 0;
          const dateLabel = (() => {
            try {
              const d = new Date(dateKey);
              return Number.isNaN(d.getTime()) ? dateKey : format(d, 'do EEE yyyy');
            } catch {
              return dateKey;
            }
          })();
          const cardContent = hasHygieneData ? (
            <div className='rounded-lg bg-white shadow-[0px_4px_12px_rgba(27,28,29,0.12)] min-w-[260px] border border-stroke-soft-200'>
              <div className='px-3 py-2 rounded-t-lg bg-bg-weak-100 text-paragraph-sm border-b border-stroke-soft-200 font-medium text-text-strong-950 mb-3'>
                {dateLabel}
              </div>
              <ul className='flex flex-col gap-[6px] px-3 pb-2'>
                {hygieneData.map((item, index) => {
                  return (
                    <li
                      key={index}
                      className='flex items-center gap-2 paragraph-small text-[var(--color-text-sub-500)]'
                    >
                      {item?.status == 'Fail' ? (
                        <RiErrorWarningLine size={16} color='orange' className='shrink-0' />
                      ) : (
                        <RiCheckboxCircleFill size={16} color='green' className='shrink-0' />
                      )}
                      <span>{item?.check_item}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className='rounded-2xl bg-white px-4 py-3 shadow-[0px_4px_12px_rgba(27,28,29,0.12)] border border-stroke-soft-200'>
              <div className='text-paragraph-sm font-medium text-text-strong-950 mb-2'>
                {dateLabel}
              </div>
              <span className='text-paragraph-xsmall text-text-sub-600'>
                {hygieneStatus === 'Fail' ? 'Hygiene: Fail' : 'Hygiene: Pass'}
                {!hasHygieneData && ' (no details)'}
              </span>
            </div>
          );
          return (
            <div
              className='flex items-center justify-center cursor-pointer'
              role='button'
              tabIndex={0}
              onClick={openModalForDate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openModalForDate(e);
                }
              }}
            >
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className='inline-flex'>{icon}</span>
                </Tooltip.Trigger>
                <Tooltip.Content sideOffset={8} className='p-0 border-0 bg-transparent shadow-none'>
                  {hasHygieneData ? cardContent : <span>Absent</span>}
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          );
        },
        enableSorting: false,
      });
    });

    // Add actions column (no header)
    columns.push({
      id: 'actions',
      accessorKey: 'actions',
      columnLabel: '',
      enableHiding: false,
      header: () => {
        return <div className='flex items-center gap-0.5' />;
      },
      cell: ({ row }) => (
        <div className='flex items-end- justify-end gap-1'>
          <CompactButton.Root
            variant='ghost'
            size='medium'
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(row.original);
            }}
            aria-label='Edit member'
          >
            <CompactButton.Icon as={RiPencilLine} />
          </CompactButton.Root>
          <CompactButton.Root
            variant='ghost'
            size='medium'
            onClick={(e) => {
              e.stopPropagation();
              setMemberToRemove(row.original);
              setIsRemoveMemberModalOpen(true);
            }}
            aria-label='Delete member'
          >
            <CompactButton.Icon as={RiDeleteBinLine} />
          </CompactButton.Root>
        </div>
      ),
      enableSorting: false,
    });

    return columns;
  }, [weekDates, onEdit, handleDateCellClick]);

  const defaultColumnConfig = useMemo(
    () => prepareColumnsForConfig(allColumnDefs),
    [allColumnDefs],
  );

  const columnConfigHook = useColumnConfig(
    'team-management-support-team-table',
    defaultColumnConfig,
    (cols) => Promise.resolve(cols),
    () => Promise.resolve(defaultColumnConfig),
    { autoSave: true, debounce: 300 },
  );

  React.useImperativeHandle(teamTableRef, () => ({
    columnConfigHook,
  }));

  const visibleDefs = useMemo(
    () => applyColumnConfig(allColumnDefs, columnConfigHook.columns),
    [allColumnDefs, columnConfigHook.columns],
  );

  const table = useReactTable({
    data: filteredTeamMembers,
    columns: visibleDefs,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  // Error state
  const renderError = () => {
    if (!error) return null;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/20 bg-error-lighter/30 p-12 text-center'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-error-base/10'>
          <RiErrorWarningLine className='size-6 text-error-base' />
        </div>
        <h3 className='mb-2 text-lg font-semibold text-error-darker'>
          Unable to Load Team Members
        </h3>
        <p className='mb-4 text-sm text-error-darker/80'>{extractErrorMessage(error)}</p>
        {handleFetchData && (
          <button
            onClick={handleFetchData}
            className='rounded-lg bg-error-base px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-darker'
          >
            Try Again
          </button>
        )}
      </div>
    );
  };

  // Empty state
  const renderEmpty = () => {
    if (isLoading || error) return null;
    if (filteredTeamMembers.length > 0) return null;

    const state = EMPTY_STATES[context] || EMPTY_STATES.default;
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-white-0 p-16 text-center'>
        <h3 className='mb-2 text-lg font-semibold text-text-strong-950'>{state.title}</h3>
        <p className='max-w-md text-sm text-text-sub-600'>{state.description}</p>
      </div>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => {
    if (!isLoading || filteredTeamMembers.length > 0) return null;
    const skeletonRows = Array.from({ length: 6 }, (_, index) => index);
    return (
      <Table.Body spacing={8}>
        {skeletonRows.map((rowIndex, _, array) => (
          <React.Fragment key={`skeleton-row-${rowIndex}`}>
            <Table.Row>
              {visibleDefs.map((column) => (
                <Table.Cell key={column.id || column.accessorKey}>
                  <div className='h-4 w-3/4 animate-pulse rounded-md bg-bg-weak-50' />
                </Table.Cell>
              ))}
            </Table.Row>
            {rowIndex < array.length - 1 && <Table.RowDivider />}
          </React.Fragment>
        ))}
      </Table.Body>
    );
  };

  const hasRows = isGroupedView
    ? Object.keys(groupedData).length > 0
    : table.getRowModel().rows.length > 0;

  return (
    <div ref={scrollContainerRef} className='flex py-5 flex-col gap-6 flex-1 min-h-0'>
      <RemoveMemberModal
        isOpen={isRemoveMemberModalOpen}
        onOpenChange={setIsRemoveMemberModalOpen}
        member={memberToRemove}
        onConfirm={async () => {
          if (memberToRemove && onDelete) {
            const refetchWithFilters = () =>
              dispatch(
                fetchSupportTeamData({
                  filters: apiFilters,
                  status: activeTab === 'active' ? 'Active' : 'Inactive',
                  from_date: apiFromToDates.from_date,
                  to_date: apiFromToDates.to_date,
                  month: apiMonthYear.month,
                  year: apiMonthYear.year,
                  group_by: groupBy,
                  group_order: groupOrder,
                  keyword: debouncedSearchKeyword ?? '',
                  // ...(navbarFilter != null ? { navbar_filter: navbarFilter } : {}),
                }),
              ).unwrap();
            await onDelete(memberToRemove, refetchWithFilters);
          }
          setIsRemoveMemberModalOpen(false);
        }}
      />

      <div className='w-full border-1 rounded-xl border-stroke-soft-200 p-[6px] flex item-center justify-between bg-gray-50'>
        <div>
          <ButtonGroup.Root size='small'>
            <ButtonGroup.Item
              onClick={() => setActiveTab('active')}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:border-primary-base data-[state=on]:z-1  data-[state=on]:border-1'
              data-state={activeTab === 'active' ? 'on' : 'off'}
            >
              Active
            </ButtonGroup.Item>
            <ButtonGroup.Item
              onClick={() => setActiveTab('inactive')}
              data-state={activeTab === 'inactive' ? 'on' : 'off'}
              className='data-[state=on]:bg-primary-lighter data-[state=on]:ring-1 data-[state=on]:z-1 data-[state=on]:ring-primary-base'
            >
              Inactive
            </ButtonGroup.Item>
          </ButtonGroup.Root>
        </div>

        <div className='flex items-center gap-3'>
          <RangeDatePicker
            range={dateRange}
            onRangeChange={setDateRange}
            open={isDatePickerOpen}
            onOpenChange={setIsDatePickerOpen}
          />
        </div>
      </div>

      <TeamToolbar
        filters={filters}
        onSearchChange={handleSearchChange}
        onAddMember={onAddMember}
        onExport={onExport}
        tableRef={teamTableRef}
        tableVariant={tableVariant}
        onTableVariantToggle={onTableVariantToggle}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        groupOrder={groupOrder}
        onGroupOrderChange={handleGroupOrderChange}
        onFiltersChange={handleFiltersChange}
        appliedFilters={appliedFilters}
        showStatusFilter={false}
        showColumnManager={false}
        roleOptions={roleOptions}
        groupByOptions={SUPPORT_TEAM_GROUP_BY_OPTIONS}
      />

      <TeamUserDetailModal
        member={selectedMember}
        isOpen={teamUserDetailModal.isOpen && selectedMember?.status?.toLowerCase() !== 'inactive'}
        onOpenChange={handleDetailModalOpenChange}
      />

      {error ? (
        renderError()
      ) : isGroupedView ? (
        <div className='flex-1 min-h-0 overflow-auto pr-2'>
          <GroupedSupportView
            groupedData={groupedData}
            isLoading={isLoading}
            tableVariant={tableVariant}
            weekDates={weekDates}
            searchValue={filters.search}
            onEdit={onEdit}
            onDeleteMember={(member) => {
              setMemberToRemove(member);
              setIsRemoveMemberModalOpen(true);
            }}
            handleDateCellClick={handleDateCellClick}
            onSelectMember={handleSelectMember}
          />
          {supportScopeData.isLoadingMore && (
            <div className='text-center py-4'>
              <span className='text-paragraph-sm text-text-sub-600'>Loading more members...</span>
            </div>
          )}
        </div>
      ) : !isLoading && !hasRows ? (
        renderEmpty()
      ) : (
        <div className='flex-1 min-h-0 flex flex-col w-full'>
          <Table.Root
            variant={tableVariant}
            className='min-h-0 flex-1 overflow-auto'
            tableInstance={table}
            style={{ minWidth: 1200 }}
          >
            <Table.Header className='sticky top-0 z-30 bg-bg-weak-50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Head key={header.id} column={header.column}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Head>
                  ))}
                </Table.Row>
              ))}
            </Table.Header>
            {isLoading && !hasRows ? (
              renderSkeleton()
            ) : (
              <Table.Body spacing={8}>
                {table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <Table.Row
                      className={cn('cursor-pointer')}
                      onClick={() => {
                        handleSelectMember(row.original);
                        onRowSelect?.(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                    <Table.RowDivider />
                  </React.Fragment>
                ))}
                {supportScopeData.isLoadingMore && (
                  <>
                    <Table.Row>
                      <Table.Cell
                        colSpan={visibleDefs.length}
                        className='text-paragraph-sm text-center text-text-sub-600 py-4'
                      >
                        Loading more…
                      </Table.Cell>
                    </Table.Row>
                    <Table.RowDivider />
                  </>
                )}
              </Table.Body>
            )}
          </Table.Root>
        </div>
      )}
    </div>
  );
};

export default TeamManagementSupportTeam;
