import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCalendarLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
  RiCloseLine,
  RiDraggable,
  RiFlagLine,
  RiMoreFill,
  RiPriceTag3Line,
  RiUserAddLine,
} from 'react-icons/ri';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import * as Tag from '@/components/ui/tag';
import { getSortingIcon } from '@/components/ui/table';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import DeleteConfirmModal from '@/components/ui/delete-confirm-modal';
import { Calendar } from '@/components/ui/calendar';
import * as Checkbox from '@/components/ui/checkbox';
import DatePickerTimeRow, {
  from12Hour,
  to12Hour,
} from '@/pages/boards/components/date-picker-time-row';
import { getPriorityColor, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { useScrollPagination } from '@/hooks/use-scroll-pagination';
import { parseToDate } from '@/utils/date-utils';
import {
  archiveBoardTask,
  createBoardTask,
  deleteBoardTask,
  duplicateBoardTask,
  getListGroups,
  getListTasks,
  moveBoardTask,
  reorderTasks,
  updateBoardTask,
  updateTaskFavorite,
  buildAssigneeUpdatePayload,
  buildCustomFieldsUpdatePayload,
  buildDueDateUpdatePayload,
  buildStatusUpdatePayload,
  buildTagsUpdatePayload,
  buildTaskFieldUpdatePayload,
  normalizeListTask,
} from '@/services/tasks-service';
import { createInboxReminder, unfollowBoardTask } from '@/services/inbox-service';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial, appendUniqueTags, parseCommaSeparatedTags } from '@/utils/task-utils';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { selectUserSearch } from '@/redux/userSlice';
import { useAuth } from '@/contexts/auth-context';
import BoardTaskCreateDrawer from '../list/BoardTaskCreateDrawer';
import SystemListModal from '../../modals/SystemListModal';
import {
  boardTaskDateIncludesTime,
  formatBoardTaskDateLabel,
  serializeBoardTaskDate,
} from '../../utils/board-task-date-utils';
import { canPerformBoardAction } from '../../constants/board-share-constants';
import { findNodeById, getListColumnSettings } from '@/services/boards-service';
import { resetTaskViewToDefault } from '@/services/task-view-service';
import BulkActionsBar from '../list/components/BulkActionsBar';
import BoardTaskViewDrawer from '../list/components/BoardTaskViewDrawer';
import BoardTaskStatusDropdown from '../list/components/BoardTaskStatusDropdown';
import { getTaskClipboard, setTaskClipboard } from '../list/utils/task-clipboard';
import ListCustomFieldsDrawer from '../list/ListCustomFieldsDrawer';
import ListTaskGroupSection from '../list/components/ListTaskGroupSection';
import TableTaskGroupSection from '../table/TableTaskGroupSection';
import ListTableCalculateRow from '../list/components/ListTableCalculateRow';
import ListToolbar from '../list/ListToolbar';
import SaveViewMenu from '../list/components/SaveViewMenu';
import CustomFieldInfoHint from '../list/components/CustomFieldInfoHint';
import TaskFieldCell from '../list/cells/TaskFieldCell';
import TaskOptionsMenu from '../list/menus/TaskOptionsMenu';
import ColumnHeaderMenu from '../list/menus/ColumnHeaderMenu';
import ListColumnCalculateMenu from '../list/menus/ListColumnCalculateMenu';
import {
  buildListColumns,
  createCustomColumnFromField,
  getGridTemplateColumns,
  getTableGridTemplateColumns,
  getTableCellBorderClass,
  getTableListGridStyle,
  getTableActionsCellClass,
  getTableHeaderCellClass,
  getTableDataCellClass,
  getTableColumnWidthPx,
  TABLE_COLUMN_MIN_WIDTH,
  TABLE_COLUMN_MAX_WIDTH,
  TABLE_INDEX_HEADER_CLASS,
  TABLE_INDEX_CELL_CLASS,
  TABLE_FILLER_HEADER_CLASS,
  TABLE_FILLER_CELL_CLASS,
  getListTableGridStyle,
  getListTableRowStyle,
  LIST_TABLE_ACTIONS_CELL_CLASS,
  LIST_TABLE_ACTIONS_HEADER_CLASS,
  LIST_TABLE_TITLE_CELL_CLASS,
  LIST_TABLE_TITLE_HEADER_CLASS,
  SELECTED_TASK_ROW_BG_CLASS,
  normalizeCustomColumns,
  applyColumnOrder,
  reconcileColumnOrder,
  ensurePinnedFirstColumnOrder,
  PINNED_FIRST_COLUMN_KEY,
  getTableStickyColumnClass,
} from '../list/utils/list-columns';
import {
  collectErpLinksFromTasks,
  collectVisibleErpColumns,
  createErpColumn,
  enrichTasksWithErpValues,
  getErpColumnKey,
  isErpColumn,
} from '../list/utils/erp-column-utils';
import {
  getErpModuleLabel,
  createStandardFieldsState,
} from '../list/constants/list-custom-fields-constants';
import {
  getSystemListPrimaryColumns,
  linkTaskToModule,
  resolveErpColumnValues,
  unlinkTaskModule,
} from '@/services/system-list-service';
import { getSystemListPrimaryColumns as getSystemListFallbackColumns } from '../list/constants/system-list-constants';
import {
  buildGroupByOptions,
  buildGroupedSections,
  collectOrderedGroupKeys,
  getGroupCreateDefaults,
  getInitialRevealedGroupKey,
  getNextGroupKeyToReveal,
  getNextGroupToLoad,
  getTaskGroupKey,
  hasMoreGroupsToReveal,
  isColumnGroupable,
} from '../list/utils/task-list-group-utils';
import {
  buildColumnCalculationResults,
  isColumnCalculable,
} from '../list/utils/task-list-calculate-utils';
import {
  getColumnSortState,
  isColumnSortable,
  normalizeColumnSort,
  sortTasksByColumns,
  toggleColumnSort,
} from '../list/utils/task-list-sort-utils';
import {
  buildCustomFieldDefinition,
  getCustomFieldDescription,
  getDefaultValueForFieldType,
  normalizeCustomFieldValue,
  validateCustomFieldValue,
} from '../list/utils/custom-field-utils';
import { taskMatchesFieldFilters } from '../list/utils/task-list-filter-utils';
import { useBoardListStatusOptions } from '../../hooks/useBoardListStatusOptions';
import {
  findBoardStatusOption,
  isTaskInClosedFilter,
  resolveIsClosedFromStatusOption,
  resolveTaskIsClosedFromStatus,
} from '../../utils/task-statuses-utils';
import {
  areViewSettingsEqual,
  clearViewSettingsCache,
  collectViewSettingsSnapshot,
  getTaskViewSettingsKey,
  getViewSettingsKeyForScope,
  hasStoredViewColumnSettings,
  loadViewColumnSettingsFromList,
  parseTaskViewSettings,
  persistTaskViewSettings,
  readViewAutosaveEnabled,
  saveViewSettingsToCache,
  VIEW_SAVE_SCOPES,
  writeViewAutosaveEnabled,
} from './view-settings';
import VirtualizedTableBody from '../table/VirtualizedTableBody';
import BoardCalendarGrid from '../calendar/BoardCalendarGrid';
import BoardCalendarToolbar from '../calendar/BoardCalendarToolbar';
import {
  DEFAULT_BOARD_CALENDAR_DATE_FIELD,
  DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
  BOARD_CALENDAR_DATE_FIELDS,
  BOARD_CALENDAR_LAYOUT_MODES,
  normalizeBoardCalendarDateField,
  normalizeBoardCalendarLayoutMode,
} from '../calendar/board-calendar-utils';
import { cn } from '@/lib/utils';

function columnKeysEqual(left = [], right = []) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function columnSortEqual(left = [], right = []) {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry?.key === right[index]?.key && entry?.direction === right[index]?.direction,
    )
  );
}

function getUserAssigneeMatchers(user) {
  const matchers = new Set();

  [user?.email, user?.full_name, user?.name].forEach((value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (normalized) {
      matchers.add(normalized);
    }
  });

  return matchers;
}

function isTaskAssignedToUser(task, user) {
  const matchers = getUserAssigneeMatchers(user);

  if (matchers.size === 0) {
    return false;
  }

  const matchesValue = (value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    return normalized ? matchers.has(normalized) : false;
  };

  if ((task.assignees ?? []).some(matchesValue)) {
    return true;
  }

  if (
    (task.assigneeDetails ?? []).some((entry) => {
      if (typeof entry === 'string') {
        return matchesValue(entry);
      }

      return [entry?.user, entry?.email, entry?.value, entry?.assignee, entry?.name].some(
        matchesValue,
      );
    })
  ) {
    return true;
  }

  return matchesValue(task.assignee);
}

const inlineFieldTriggerClassName =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition hover:bg-bg-weak-50 disabled:opacity-60';

function InlineFieldTrigger({ icon: Icon, label, selectedContent = null, className, ...props }) {
  const hasSelection = Boolean(selectedContent);

  return (
    <button
      type='button'
      aria-label={label}
      className={cn(
        inlineFieldTriggerClassName,
        'h-8',
        hasSelection ? 'min-w-8 w-auto px-1.5' : 'w-8 justify-center p-0',
        hasSelection && 'border-primary-base bg-primary-lighter',
        className,
      )}
      {...props}
    >
      {hasSelection ? selectedContent : <Icon size={16} className='shrink-0 text-icon-sub-500' />}
    </button>
  );
}

function TableIndexHeader({
  allVisibleSelected = false,
  someVisibleSelected = false,
  visibleTasksCount = 0,
  onToggleSelectAll,
}) {
  return (
    <div className={TABLE_INDEX_HEADER_CLASS}>
      <button
        type='button'
        aria-label={allVisibleSelected ? 'Deselect all tasks' : 'Select all tasks'}
        aria-pressed={allVisibleSelected}
        disabled={visibleTasksCount === 0}
        onClick={onToggleSelectAll}
        className={cn(
          'flex h-5 w-5 items-center justify-center transition-opacity disabled:opacity-40',
          someVisibleSelected || allVisibleSelected
            ? 'text-primary-base opacity-100'
            : 'text-icon-soft-400 opacity-60 hover:opacity-100',
        )}
      >
        {allVisibleSelected ? (
          <RiCheckboxFill size={14} className='shrink-0' />
        ) : someVisibleSelected ? (
          <RiCheckboxIndeterminateFill size={14} className='shrink-0' />
        ) : (
          <RiCheckboxBlankLine size={14} className='shrink-0' />
        )}
      </button>
    </div>
  );
}

function TableIndexCell({ rowIndex, isSelected = false, onToggleSelect }) {
  return (
    <div
      className={cn(TABLE_INDEX_CELL_CLASS, 'relative', isSelected && SELECTED_TASK_ROW_BG_CLASS)}
    >
      <span className='text-[11px] tabular-nums group-hover/row:opacity-0'>{rowIndex}</span>
      <button
        type='button'
        aria-label={isSelected ? 'Deselect task' : 'Select task'}
        aria-pressed={isSelected}
        data-prevent-row-click
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelect?.();
        }}
        className={cn(
          'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/row:opacity-100',
          isSelected && 'opacity-100',
        )}
      >
        {isSelected ? (
          <RiCheckboxFill size={14} className='shrink-0 text-primary-base' />
        ) : (
          <RiCheckboxBlankLine size={14} className='shrink-0 text-icon-soft-400' />
        )}
      </button>
    </div>
  );
}

function TableAddTaskTriggerRow({ columns, onActivate }) {
  return (
    <div
      className='group/row grid shrink-0 border-b border-stroke-soft-200 hover:bg-bg-weak-50'
      style={getListTableRowStyle()}
    >
      <div className={TABLE_INDEX_CELL_CLASS}>
        <button
          type='button'
          aria-label='Add task'
          data-prevent-row-click
          onClick={onActivate}
          className='flex h-5 w-5 items-center justify-center rounded text-icon-soft-400 transition hover:bg-bg-weak-100 hover:text-text-sub-600'
        >
          <RiAddLine size={14} />
        </button>
      </div>

      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            getTableDataCellClass(column),
            column.key === 'title' && getTableStickyColumnClass(column, { isTableLayout: true }),
          )}
        />
      ))}

      <div className={TABLE_FILLER_CELL_CLASS} />
      <div className={getTableActionsCellClass(false)} />
    </div>
  );
}

function InlineTaskCreateRow({
  listId,
  onCreated,
  statusGroups = [],
  defaultStatusId = '',
  defaultAssignees = [],
  defaultStartDate = '',
  defaultDueDate = '',
  defaultPriority = 'Low',
  defaultTags = [],
  defaultCustomFields = {},
  isStatusLoading = false,
  variant = 'footer',
  columns = [],
  isTableLayout = false,
  stickToScrollport = false,
  onClose,
  closeOnOutsideClickWhenEmpty = false,
  autoFocus = false,
  onNavigateDay,
  /** Calendar create only: applied on save when the user has not picked dates in the picker. */
  calendarAnchorDate = '',
  calendarDateField = DEFAULT_BOARD_CALENDAR_DATE_FIELD,
}) {
  const rowRef = useRef(null);
  const titleInputRef = useRef(null);
  const isCreatingRef = useRef(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [assignees, setAssignees] = useState(defaultAssignees);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [priority, setPriority] = useState(defaultPriority || 'Low');
  const [status, setStatus] = useState(defaultStatusId || '');
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [startIncludeTime, setStartIncludeTime] = useState(() =>
    boardTaskDateIncludesTime(defaultStartDate),
  );
  const [dueIncludeTime, setDueIncludeTime] = useState(() =>
    boardTaskDateIncludesTime(defaultDueDate),
  );
  const [tags, setTags] = useState(defaultTags);
  const [tagInput, setTagInput] = useState('');
  const [customFields, setCustomFields] = useState(defaultCustomFields);
  const userSearch = useSelector(selectUserSearch);
  const isNestedPopover = variant === 'calendar-popover';
  const nestedPopoverRootProps = isNestedPopover ? { modal: false } : {};
  const nestedPopoverContentProps = isNestedPopover
    ? { portalled: false, disableAnimation: true }
    : {};
  const nestedPopoverContentClassName = (className) => cn(className, isNestedPopover && 'z-[70]');

  useEffect(() => {
    if (defaultStatusId) {
      setStatus(defaultStatusId);
    }
  }, [defaultStatusId]);

  const assigneeLabel = useMemo(() => {
    if (assignees.length === 0) {
      return 'Select assignee';
    }

    const id = assignees[0];
    const match = userSearch.data?.find(
      (user) =>
        String(user.value) === String(id) ||
        String(user.email) === String(id) ||
        String(user.user) === String(id),
    );

    return match ? getAssigneeDisplayName(match) : String(id);
  }, [assignees, userSearch.data]);

  const assigneePreview = useMemo(() => {
    if (assignees.length === 0) {
      return null;
    }

    const resolved = assignees.slice(0, 3).map((id, index) => {
      const match = userSearch.data?.find(
        (user) =>
          String(user.value) === String(id) ||
          String(user.email) === String(id) ||
          String(user.user) === String(id),
      );
      const meta = match || { value: id, email: id };

      return { id, meta, index };
    });

    return (
      <div className='flex items-center'>
        {resolved.map(({ id, meta, index }) => (
          <span
            key={id}
            className='relative inline-block rounded-full ring-1 ring-white'
            style={{ marginLeft: index === 0 ? 0 : -6, zIndex: index }}
          >
            <CrmAccountAvatar
              name={getAssigneeDisplayName(meta)}
              initials={getAssigneeFirstNameInitial(meta)}
              image={meta.image || meta.user_image}
              index={index}
              size={20}
              showNativeTitle={false}
            />
          </span>
        ))}
        {assignees.length > 3 ? (
          <span className='ml-0.5 text-[10px] font-medium text-text-sub-500'>
            +{assignees.length - 3}
          </span>
        ) : null}
      </div>
    );
  }, [assignees, userSearch.data]);

  const resetFields = useCallback(() => {
    setTitle('');
    setAssignees(defaultAssignees);
    setStartDate(defaultStartDate);
    setDueDate(defaultDueDate);
    setPriority(defaultPriority || 'Low');
    setStatus(defaultStatusId || '');
    setTags(defaultTags);
    setTagInput('');
    setCustomFields(defaultCustomFields);
    setIsAssigneeOpen(false);
    setIsDateRangeOpen(false);
    setIsPriorityOpen(false);
    setIsStatusOpen(false);
    setIsTagsOpen(false);
    setStartIncludeTime(boardTaskDateIncludesTime(defaultStartDate));
    setDueIncludeTime(boardTaskDateIncludesTime(defaultDueDate));
  }, [
    defaultAssignees,
    defaultCustomFields,
    defaultDueDate,
    defaultPriority,
    defaultStartDate,
    defaultStatusId,
    defaultTags,
  ]);

  useEffect(() => {
    if (!isDateRangeOpen) {
      return;
    }

    setStartIncludeTime(boardTaskDateIncludesTime(startDate));
    setDueIncludeTime(boardTaskDateIncludesTime(dueDate));
  }, [dueDate, isDateRangeOpen, startDate]);

  const hasDraftContent = useCallback(() => {
    return (
      title.trim().length > 0 ||
      assignees.length > 0 ||
      (Boolean(startDate) && startDate !== defaultStartDate) ||
      (Boolean(dueDate) && dueDate !== defaultDueDate) ||
      priority !== (defaultPriority || 'Low') ||
      (status && defaultStatusId && status !== defaultStatusId) ||
      (status && !defaultStatusId) ||
      tags.length > 0 ||
      isAssigneeOpen ||
      isDateRangeOpen ||
      isPriorityOpen ||
      isStatusOpen ||
      isTagsOpen
    );
  }, [
    assignees.length,
    defaultAssignees,
    defaultDueDate,
    defaultPriority,
    defaultStartDate,
    defaultStatusId,
    defaultTags,
    dueDate,
    isAssigneeOpen,
    isDateRangeOpen,
    isPriorityOpen,
    isStatusOpen,
    isTagsOpen,
    priority,
    startDate,
    status,
    tags.length,
    title,
  ]);

  const createTask = useCallback(async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle || !listId || isCreatingRef.current) {
      return;
    }

    isCreatingRef.current = true;
    setIsCreating(true);

    try {
      const resolvedCalendarField = normalizeBoardCalendarDateField(calendarDateField);
      const fallbackStartDate =
        isNestedPopover && resolvedCalendarField !== BOARD_CALENDAR_DATE_FIELDS.DUE_DATE
          ? calendarAnchorDate
          : '';
      const fallbackDueDate =
        isNestedPopover && resolvedCalendarField !== BOARD_CALENDAR_DATE_FIELDS.START_DATE
          ? calendarAnchorDate
          : '';

      const result = await createBoardTask({
        listId,
        title: trimmedTitle,
        status,
        priority,
        startDate: startDate || fallbackStartDate,
        dueDate: dueDate || fallbackDueDate,
        assignees,
        tags,
        customFields,
      });

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      resetFields();
      onCreated?.(result.data);
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    } finally {
       
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  }, [
    assignees,
    calendarAnchorDate,
    calendarDateField,
    customFields,
    dueDate,
    listId,
    onCreated,
    priority,
    resetFields,
    startDate,
    status,
    tags,
    title,
  ]);

  const commitDraft = useCallback(() => {
    if (isCreatingRef.current) {
      return;
    }

    if (title.trim()) {
      createTask();
      return;
    }

    if (hasDraftContent()) {
      resetFields();
    }
  }, [createTask, hasDraftContent, resetFields, title]);

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
  }, [autoFocus]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (isCreatingRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (rowRef.current?.contains(target)) {
        return;
      }

      if (target.closest?.('[data-inline-task-create-popover], [data-radix-select-content]')) {
        return;
      }

      if (!hasDraftContent()) {
        if (closeOnOutsideClickWhenEmpty) {
          onClose?.();
        }
        return;
      }

      commitDraft();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeOnOutsideClickWhenEmpty, commitDraft, hasDraftContent, onClose]);

  const handleTitleBlur = (event) => {
    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof Node) {
      if (rowRef.current?.contains(relatedTarget)) {
        return;
      }

      if (
        relatedTarget.closest?.('[data-inline-task-create-popover], [data-radix-select-content]')
      ) {
        return;
      }
    }

    if (!hasDraftContent()) {
      return;
    }

    commitDraft();
  };

  const handleTitleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createTask();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      resetFields();
      if (closeOnOutsideClickWhenEmpty) {
        onClose?.();
      }
      titleInputRef.current?.blur();
    }
  };

  const selectedDateRange = useMemo(() => {
    const from = startDate ? parseToDate(startDate) : undefined;
    const to = dueDate ? parseToDate(dueDate) : undefined;

    if (!from && !to) {
      return undefined;
    }

    return { from, to };
  }, [dueDate, startDate]);

  const dateRangePreview = useMemo(() => {
    const fromLabel = formatBoardTaskDateLabel(startDate);
    const toLabel = formatBoardTaskDateLabel(dueDate);

    if (!fromLabel && !toLabel) {
      return null;
    }

    if (fromLabel && toLabel) {
      const sameDay = String(startDate).slice(0, 10) === String(dueDate).slice(0, 10);

      return (
        <span className='whitespace-nowrap text-xs font-medium text-text-main-900'>
          {sameDay ? fromLabel : `${fromLabel} - ${toLabel}`}
        </span>
      );
    }

    if (fromLabel) {
      return (
        <span className='whitespace-nowrap text-xs font-medium text-text-main-900'>
          {fromLabel}
        </span>
      );
    }

    return null;
  }, [dueDate, startDate]);

  const applyBoardTaskDateSelection = useCallback((existingValue, nextDate, includeTime) => {
    if (!nextDate) {
      return '';
    }

    const parsed = new Date(nextDate);

    if (includeTime) {
      const existing = parseToDate(existingValue);

      if (existing) {
        parsed.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      }
    }

    return serializeBoardTaskDate(parsed, includeTime);
  }, []);

  const handleDateRangeSelect = useCallback(
    (range) => {
      if (!range?.from) {
        setStartDate('');
        setDueDate('');
        return;
      }

      const nextStart = applyBoardTaskDateSelection(startDate, range.from, startIncludeTime);
      const nextDue = range.to
        ? applyBoardTaskDateSelection(dueDate, range.to, dueIncludeTime)
        : applyBoardTaskDateSelection(dueDate, range.from, dueIncludeTime);

      setStartDate(nextStart);
      setDueDate(nextDue);

      if (range.from && range.to) {
        setIsDateRangeOpen(false);
      }
    },
    [applyBoardTaskDateSelection, dueDate, dueIncludeTime, startDate, startIncludeTime],
  );

  const handleStartIncludeTimeChange = useCallback(
    (checked) => {
      const include = Boolean(checked);
      setStartIncludeTime(include);

      if (!startDate) {
        return;
      }

      const base = parseToDate(startDate);

      if (!base) {
        return;
      }

      setStartDate(serializeBoardTaskDate(base, include));
    },
    [startDate],
  );

  const handleDueIncludeTimeChange = useCallback(
    (checked) => {
      const include = Boolean(checked);
      setDueIncludeTime(include);

      if (!dueDate) {
        return;
      }

      const base = parseToDate(dueDate);

      if (!base) {
        return;
      }

      setDueDate(serializeBoardTaskDate(base, include));
    },
    [dueDate],
  );

  const handleStartTimeChange = useCallback(
    ({ hour, minute, period }) => {
      const base = parseToDate(startDate);

      if (!base) {
        return;
      }

      const next = from12Hour(base, hour, minute, period);
      setStartIncludeTime(true);
      setStartDate(serializeBoardTaskDate(next, true));
    },
    [startDate],
  );

  const handleDueTimeChange = useCallback(
    ({ hour, minute, period }) => {
      const base = parseToDate(dueDate);

      if (!base) {
        return;
      }

      const next = from12Hour(base, hour, minute, period);
      setDueIncludeTime(true);
      setDueDate(serializeBoardTaskDate(next, true));
    },
    [dueDate],
  );

  const startTimeParts = useMemo(() => to12Hour(parseToDate(startDate)), [startDate]);
  const dueTimeParts = useMemo(() => to12Hour(parseToDate(dueDate)), [dueDate]);

  const renderDateRangeField = (align = 'end') => (
    <Popover.Root
      open={isDateRangeOpen}
      onOpenChange={setIsDateRangeOpen}
      {...nestedPopoverRootProps}
    >
      <Popover.Trigger asChild>
        <InlineFieldTrigger
          icon={RiCalendarLine}
          label={
            startDate || dueDate
              ? `Dates: ${startDate ? formatBoardTaskDateLabel(startDate) : '—'} to ${dueDate ? formatBoardTaskDateLabel(dueDate) : '—'}`
              : 'Start and due date'
          }
          selectedContent={dateRangePreview}
          disabled={isCreating}
        />
      </Popover.Trigger>
      <Popover.Content
        align={align}
        showArrow={false}
        className={nestedPopoverContentClassName('w-auto p-2')}
        data-inline-task-create-popover
        {...nestedPopoverContentProps}
      >
        <Calendar
          mode='range'
          selected={selectedDateRange}
          defaultMonth={
            selectedDateRange?.from ??
            selectedDateRange?.to ??
            (calendarAnchorDate ? parseToDate(calendarAnchorDate) : undefined)
          }
          onSelect={handleDateRangeSelect}
          initialFocus
          numberOfMonths={1}
        />
        {startDate || dueDate ? (
          <div className='flex flex-col gap-3 border-t border-stroke-soft-200 p-3'>
            {startDate ? (
              <div className='flex flex-col gap-2'>
                <label className='flex items-center gap-2'>
                  <Checkbox.Root
                    checked={startIncludeTime}
                    onCheckedChange={handleStartIncludeTimeChange}
                    disabled={isCreating}
                  />
                  <span className='text-label-sm text-text-sub-600'>Add start time</span>
                </label>
                {startIncludeTime ? (
                  <DatePickerTimeRow
                    hour={startTimeParts.hour}
                    minute={startTimeParts.minute}
                    period={startTimeParts.period}
                    onChange={handleStartTimeChange}
                    disabled={isCreating}
                  />
                ) : null}
              </div>
            ) : null}
            {dueDate ? (
              <div className='flex flex-col gap-2'>
                <label className='flex items-center gap-2'>
                  <Checkbox.Root
                    checked={dueIncludeTime}
                    onCheckedChange={handleDueIncludeTimeChange}
                    disabled={isCreating}
                  />
                  <span className='text-label-sm text-text-sub-600'>Add due time</span>
                </label>
                {dueIncludeTime ? (
                  <DatePickerTimeRow
                    hour={dueTimeParts.hour}
                    minute={dueTimeParts.minute}
                    period={dueTimeParts.period}
                    onChange={handleDueTimeChange}
                    disabled={isCreating}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );

  const priorityPreview = useMemo(() => {
    if (!priority || priority === 'Low') {
      return null;
    }

    const option = TASK_PRIORITY_OPTIONS.find((entry) => entry.value === priority);

    return (
      <Badge.Root
        variant='light'
        color={getPriorityColor(priority)}
        className='h-5 px-1.5 text-[10px] uppercase leading-none'
      >
        {option?.label ?? priority}
      </Badge.Root>
    );
  }, [priority]);

  const tagsPreview = useMemo(() => {
    if (tags.length === 0) {
      return null;
    }

    return (
      <Badge.Root
        variant='stroke'
        color='gray'
        size='small'
        className='max-w-20 truncate bg-bg-white-0 normal-case text-text-sub-500 ring-stroke-soft-200'
      >
        {tags.length === 1 ? tags[0] : `${tags[0]} +${tags.length - 1}`}
      </Badge.Root>
    );
  }, [tags]);

  const handleAddTag = useCallback(() => {
    const parsed = parseCommaSeparatedTags(tagInput);
    if (parsed.length === 0) {
      return;
    }

    setTags((previous) => appendUniqueTags(previous, parsed));
    setTagInput('');
  }, [tagInput]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setTags((previous) => previous.filter((tag) => tag !== tagToRemove));
  }, []);

  const quickActionButtons = (
    <>
      <BoardTaskStatusDropdown
        value={status}
        onValueChange={setStatus}
        groups={statusGroups}
        isLoading={isStatusLoading}
        disabled={isCreating}
        showLabel={false}
        iconOnly
        inlinePopover
        onOpenChange={setIsStatusOpen}
        placeholder='Status'
      />

      <Popover.Root open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
        <Popover.Trigger asChild>
          <InlineFieldTrigger
            icon={RiUserAddLine}
            label={assignees.length > 0 ? `Assignee: ${assigneeLabel}` : 'Assignee'}
            selectedContent={assigneePreview}
            disabled={isCreating}
          />
        </Popover.Trigger>
        <Popover.Content
          align='end'
          showArrow={false}
          className='w-auto p-0'
          data-inline-task-create-popover
        >
          {isAssigneeOpen ? (
            <AssigneeMultiSelect
              listOnly
              value={assignees}
              onChange={setAssignees}
              disabled={isCreating}
            />
          ) : null}
        </Popover.Content>
      </Popover.Root>

      {renderDateRangeField('end')}

      <Popover.Root open={isPriorityOpen} onOpenChange={setIsPriorityOpen}>
        <Popover.Trigger asChild>
          <InlineFieldTrigger
            icon={RiFlagLine}
            label={priority ? `Priority: ${priority}` : 'Priority'}
            selectedContent={priorityPreview}
            disabled={isCreating}
          />
        </Popover.Trigger>
        <Popover.Content
          align='end'
          showArrow={false}
          className='w-44 p-1'
          data-inline-task-create-popover
        >
          <div className='flex flex-col gap-0.5'>
            {TASK_PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type='button'
                disabled={isCreating}
                onClick={() => {
                  setPriority(option.value);
                  setIsPriorityOpen(false);
                }}
                className={cn(
                  'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50 disabled:opacity-60',
                  priority === option.value && 'bg-bg-weak-50',
                )}
              >
                <Badge.Root
                  variant='light'
                  color={getPriorityColor(option.value)}
                  className='text-nowrap uppercase'
                >
                  {option.label}
                </Badge.Root>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Root>

      <Popover.Root open={isTagsOpen} onOpenChange={setIsTagsOpen}>
        <Popover.Trigger asChild>
          <InlineFieldTrigger
            icon={RiPriceTag3Line}
            label={tags.length > 0 ? `Tags: ${tags.join(', ')}` : 'Tags'}
            selectedContent={tagsPreview}
            disabled={isCreating}
          />
        </Popover.Trigger>
        <Popover.Content
          align='end'
          showArrow={false}
          className='w-56 p-2'
          data-inline-task-create-popover
        >
          <input
            type='text'
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTag();
              }
            }}
            disabled={isCreating}
            placeholder='Type tag and press Enter'
            className='mb-2 h-8 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 focus:border-primary-base focus:ring-1 focus:ring-primary-base disabled:opacity-60'
          />
          {tags.length > 0 ? (
            <div className='flex flex-wrap gap-1.5'>
              {tags.map((tag) => (
                <Tag.Root key={tag} variant='stroke'>
                  <span className='text-label-xs text-text-sub-600'>{tag}</span>
                  <Tag.DismissButton
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove ${tag}`}
                  />
                </Tag.Root>
              ))}
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Root>
    </>
  );

  const titleInput = (
    <input
      ref={titleInputRef}
      type='text'
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={handleTitleBlur}
      onKeyDown={handleTitleKeyDown}
      disabled={isCreating}
      placeholder='Enter task title'
      className='min-w-0 flex-1 bg-transparent text-xs text-text-main-900 outline-none placeholder:text-text-soft-400 disabled:opacity-60'
    />
  );

  if (variant === 'table-row') {
    const showDateRangeInFiller = !columns.some((column) => column.key === 'dueDate');

    const renderTableCreateCell = (column) => {
      switch (column.key) {
        case 'title':
          return titleInput;
        case 'status':
          return (
            <BoardTaskStatusDropdown
              value={status}
              onValueChange={setStatus}
              groups={statusGroups}
              isLoading={isStatusLoading}
              disabled={isCreating}
              showLabel={false}
              inlinePopover
              onOpenChange={setIsStatusOpen}
              placeholder='Status'
            />
          );
        case 'assignee':
          return (
            <Popover.Root open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
              <Popover.Trigger asChild>
                <InlineFieldTrigger
                  icon={RiUserAddLine}
                  label={assignees.length > 0 ? `Assignee: ${assigneeLabel}` : 'Assignee'}
                  selectedContent={assigneePreview}
                  disabled={isCreating}
                />
              </Popover.Trigger>
              <Popover.Content
                align='start'
                showArrow={false}
                className='w-auto p-0'
                data-inline-task-create-popover
              >
                {isAssigneeOpen ? (
                  <AssigneeMultiSelect
                    listOnly
                    value={assignees}
                    onChange={setAssignees}
                    disabled={isCreating}
                  />
                ) : null}
              </Popover.Content>
            </Popover.Root>
          );
        case 'dueDate':
          return renderDateRangeField('start');
        case 'priority':
          return (
            <Popover.Root open={isPriorityOpen} onOpenChange={setIsPriorityOpen}>
              <Popover.Trigger asChild>
                <InlineFieldTrigger
                  icon={RiFlagLine}
                  label={priority ? `Priority: ${priority}` : 'Priority'}
                  selectedContent={priorityPreview}
                  disabled={isCreating}
                />
              </Popover.Trigger>
              <Popover.Content
                align='start'
                showArrow={false}
                className='w-44 p-1'
                data-inline-task-create-popover
              >
                <div className='flex flex-col gap-0.5'>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      disabled={isCreating}
                      onClick={() => {
                        setPriority(option.value);
                        setIsPriorityOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50 disabled:opacity-60',
                        priority === option.value && 'bg-bg-weak-50',
                      )}
                    >
                      <Badge.Root
                        variant='light'
                        color={getPriorityColor(option.value)}
                        className='text-nowrap uppercase'
                      >
                        {option.label}
                      </Badge.Root>
                    </button>
                  ))}
                </div>
              </Popover.Content>
            </Popover.Root>
          );
        case 'tags':
          return (
            <Popover.Root open={isTagsOpen} onOpenChange={setIsTagsOpen}>
              <Popover.Trigger asChild>
                <InlineFieldTrigger
                  icon={RiPriceTag3Line}
                  label={tags.length > 0 ? `Tags: ${tags.join(', ')}` : 'Tags'}
                  selectedContent={tagsPreview}
                  disabled={isCreating}
                />
              </Popover.Trigger>
              <Popover.Content
                align='start'
                showArrow={false}
                className='w-56 p-2'
                data-inline-task-create-popover
              >
                <input
                  type='text'
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={isCreating}
                  placeholder='Type tag and press Enter'
                  className='mb-2 h-8 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 focus:border-primary-base focus:ring-1 focus:ring-primary-base disabled:opacity-60'
                />
                {tags.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {tags.map((tag) => (
                      <Tag.Root key={tag} variant='stroke'>
                        <span className='text-label-xs text-text-sub-600'>{tag}</span>
                        <Tag.DismissButton
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove ${tag}`}
                        />
                      </Tag.Root>
                    ))}
                  </div>
                ) : null}
              </Popover.Content>
            </Popover.Root>
          );
        default:
          return null;
      }
    };

    return (
      <div
        ref={rowRef}
        className='grid border-b border-stroke-soft-200 bg-bg-weak-50'
        style={getListTableRowStyle()}
      >
        <div className={TABLE_INDEX_CELL_CLASS} />

        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              getTableDataCellClass(column),
              column.key === 'title' &&
                cn('px-2', getTableStickyColumnClass(column, { isTableLayout })),
            )}
          >
            {renderTableCreateCell(column)}
          </div>
        ))}

        <div
          className={cn(
            TABLE_FILLER_CELL_CLASS,
            showDateRangeInFiller && 'flex items-center gap-1 px-2',
          )}
        >
          {showDateRangeInFiller ? renderDateRangeField('start') : null}
        </div>
        <div className={cn(getTableActionsCellClass(false), 'bg-bg-weak-50')} />
      </div>
    );
  }

  if (variant === 'calendar-popover') {
    return (
      <div
        ref={rowRef}
        data-inline-task-create-popover
        className='relative w-[min(520px,calc(100vw-32px))] overflow-visible rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_16px_40px_-20px_rgba(15,23,42,0.35)]'
      >
        {onNavigateDay ? (
          <div className='absolute -right-7 top-1/2 z-10 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-sm'>
            <button
              type='button'
              aria-label='Previous day'
              disabled={isCreating}
              onClick={() => onNavigateDay(-1)}
              className='flex size-7 items-center justify-center text-icon-soft-400 transition hover:bg-bg-weak-50 hover:text-text-sub-600 disabled:opacity-50'
            >
              <RiArrowUpSLine size={16} />
            </button>
            <button
              type='button'
              aria-label='Next day'
              disabled={isCreating}
              onClick={() => onNavigateDay(1)}
              className='flex size-7 items-center justify-center text-primary-base transition hover:bg-bg-weak-50 disabled:opacity-50'
            >
              <RiArrowDownSLine size={16} />
            </button>
          </div>
        ) : null}

        <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2.5'>
          <button
            type='button'
            aria-label='Close'
            disabled={isCreating}
            onClick={() => onClose?.()}
            className='flex size-7 shrink-0 items-center justify-center rounded-lg text-icon-soft-400 transition hover:bg-bg-weak-50 hover:text-text-sub-600 disabled:opacity-50'
          >
            <RiCloseLine size={18} />
          </button>

          <input
            ref={titleInputRef}
            type='text'
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            disabled={isCreating}
            placeholder="Task Name or type '/' for commands"
            className='min-w-0 flex-1 bg-transparent text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 disabled:opacity-60'
          />

          <Popover.Root
            open={isAssigneeOpen}
            onOpenChange={setIsAssigneeOpen}
            {...nestedPopoverRootProps}
          >
            <Popover.Trigger asChild>
              <button
                type='button'
                aria-label='Assignee'
                disabled={isCreating}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 bg-bg-white-0 transition hover:bg-bg-weak-50 disabled:opacity-60',
                  assignees.length > 0 && 'border-solid border-primary-base bg-primary-lighter',
                )}
              >
                {assignees.length > 0 ? (
                  assigneePreview
                ) : (
                  <RiUserAddLine size={16} className='text-icon-sub-500' />
                )}
              </button>
            </Popover.Trigger>
            <Popover.Content
              align='end'
              showArrow={false}
              className={nestedPopoverContentClassName('w-auto p-0')}
              data-inline-task-create-popover
              {...nestedPopoverContentProps}
            >
              {isAssigneeOpen ? (
                <AssigneeMultiSelect
                  listOnly
                  value={assignees}
                  onChange={setAssignees}
                  disabled={isCreating}
                />
              ) : null}
            </Popover.Content>
          </Popover.Root>
        </div>

        <div className='flex items-center justify-between gap-3 px-3 py-2.5'>
          <div className='flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto'>
            <BoardTaskStatusDropdown
              value={status}
              onValueChange={setStatus}
              groups={statusGroups}
              isLoading={isStatusLoading}
              disabled={isCreating}
              showLabel={false}
              iconOnly
              inlinePopover
              portalled={false}
              onOpenChange={setIsStatusOpen}
              placeholder='Status'
            />

            {renderDateRangeField('end')}

            <Popover.Root
              open={isPriorityOpen}
              onOpenChange={setIsPriorityOpen}
              {...nestedPopoverRootProps}
            >
              <Popover.Trigger asChild>
                <InlineFieldTrigger
                  icon={RiFlagLine}
                  label={priority ? `Priority: ${priority}` : 'Priority'}
                  selectedContent={priorityPreview}
                  disabled={isCreating}
                />
              </Popover.Trigger>
              <Popover.Content
                align='end'
                showArrow={false}
                className={nestedPopoverContentClassName('w-44 p-1')}
                data-inline-task-create-popover
                {...nestedPopoverContentProps}
              >
                <div className='flex flex-col gap-0.5'>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      disabled={isCreating}
                      onClick={() => {
                        setPriority(option.value);
                        setIsPriorityOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50 disabled:opacity-60',
                        priority === option.value && 'bg-bg-weak-50',
                      )}
                    >
                      <Badge.Root
                        variant='light'
                        color={getPriorityColor(option.value)}
                        className='text-nowrap uppercase'
                      >
                        {option.label}
                      </Badge.Root>
                    </button>
                  ))}
                </div>
              </Popover.Content>
            </Popover.Root>

            <Popover.Root
              open={isTagsOpen}
              onOpenChange={setIsTagsOpen}
              {...nestedPopoverRootProps}
            >
              <Popover.Trigger asChild>
                <InlineFieldTrigger
                  icon={RiPriceTag3Line}
                  label={tags.length > 0 ? `Tags: ${tags.join(', ')}` : 'Tags'}
                  selectedContent={tagsPreview}
                  disabled={isCreating}
                />
              </Popover.Trigger>
              <Popover.Content
                align='end'
                showArrow={false}
                className={nestedPopoverContentClassName('w-56 p-2')}
                data-inline-task-create-popover
                {...nestedPopoverContentProps}
              >
                <input
                  type='text'
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={isCreating}
                  placeholder='Type tag and press Enter'
                  className='mb-2 h-8 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 focus:border-primary-base focus:ring-1 focus:ring-primary-base disabled:opacity-60'
                />
                {tags.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {tags.map((tag) => (
                      <Tag.Root key={tag} variant='stroke'>
                        <span className='text-label-xs text-text-sub-600'>{tag}</span>
                        <Tag.DismissButton
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove ${tag}`}
                        />
                      </Tag.Root>
                    ))}
                  </div>
                ) : null}
              </Popover.Content>
            </Popover.Root>
          </div>

          <button
            type='button'
            disabled={isCreating || !title.trim()}
            onClick={createTask}
            className='shrink-0 rounded-full bg-primary-base px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isCreating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex h-11 items-center gap-3 bg-bg-weak-50 px-3',
        isTableLayout ? 'border-b border-stroke-soft-200' : 'border-t border-stroke-soft-200',
        // Pin the row to the scrollport (100cqw = container width) so it does
        // not move with horizontal scroll. Requires a container-type ancestor.
        stickToScrollport ? 'sticky left-0 w-[100cqw]' : 'w-full',
      )}
      style={isTableLayout ? { gridColumn: '1 / -1' } : undefined}
    >
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        <span className='flex shrink-0 items-center' aria-hidden>
          <span className='-ml-1 w-4 shrink-0' />
          <span className='w-[18px] shrink-0' />
        </span>
        {titleInput}
      </div>

      <div className='flex shrink-0 items-center gap-1.5 border-l border-stroke-soft-200 pl-3'>
        {quickActionButtons}
      </div>
    </div>
  );
}

function TaskRowActions({
  task,
  currentListId,
  sidebarTree,
  statusGroups = [],
  isMenuOpen,
  onMenuOpen,
  onMenuClose,
  onAddColumn,
  onTaskMoved,
  onTaskAdded,
  onStartRename,
  onArchive,
  onFavorite,
  onUnfollow,
  onRemindInbox,
  onDuplicate,
  onDelete,
  isTableLayout = false,
}) {
  const menuAnchorRef = useRef(null);

  return (
    <div
      className={cn(
        isTableLayout ? getTableActionsCellClass(false) : LIST_TABLE_ACTIONS_CELL_CLASS,
        !isTableLayout && 'min-h-11 self-stretch',
      )}
    >
      <button
        ref={menuAnchorRef}
        type='button'
        aria-label='Task options'
        aria-expanded={isMenuOpen}
        data-prevent-row-click
        onClick={(event) => {
          event.stopPropagation();
          if (isMenuOpen) {
            onMenuClose?.();
          } else {
            onMenuOpen?.();
          }
        }}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded text-icon-sub-500 transition-all',
          'hover:bg-bg-weak-100 hover:text-text-main-900',
          isMenuOpen
            ? 'bg-bg-weak-100 text-text-main-900 opacity-100'
            : isTableLayout
              ? 'opacity-0 group-hover/row:opacity-100'
              : 'opacity-40 hover:opacity-100',
        )}
      >
        <RiMoreFill size={isTableLayout ? 14 : 16} />
      </button>

      {isMenuOpen ? (
        <TaskOptionsMenu
          anchorRef={menuAnchorRef}
          onClose={onMenuClose}
          task={task}
          currentListId={currentListId}
          sidebarTree={sidebarTree}
          statusGroups={statusGroups}
          onTaskMoved={onTaskMoved}
          onTaskAdded={onTaskAdded}
          onAddColumn={onAddColumn}
          onRename={() => onStartRename?.(task.id)}
          onArchive={() => onArchive?.(task.id)}
          onFavorite={() => onFavorite?.(task.id)}
          onUnfollow={() => onUnfollow?.(task.id)}
          onRemindInbox={(remindAt) => onRemindInbox?.(task.id, remindAt)}
          onDuplicate={() => onDuplicate?.(task.id)}
          onDelete={() => onDelete?.(task.id)}
        />
      ) : null}
    </div>
  );
}

// Reorders the full task list so that the relative order of the *visible* tasks
// matches `visibleOrderIds`, while filtered-out tasks keep their relative spots.
function reorderFullTasks(fullTasks, visibleOrderIds, activeId) {
  const activeTask = fullTasks.find((item) => item.id === activeId);

  if (!activeTask) {
    return fullTasks;
  }

  const without = fullTasks.filter((item) => item.id !== activeId);
  const activeVisibleIndex = visibleOrderIds.indexOf(activeId);
  const nextVisibleId = visibleOrderIds[activeVisibleIndex + 1];

  if (nextVisibleId) {
    const insertAt = without.findIndex((item) => item.id === nextVisibleId);

    if (insertAt !== -1) {
      without.splice(insertAt, 0, activeTask);
      return without;
    }
  }

  const prevVisibleId = visibleOrderIds[activeVisibleIndex - 1];

  if (prevVisibleId) {
    const insertAt = without.findIndex((item) => item.id === prevVisibleId);

    if (insertAt !== -1) {
      without.splice(insertAt + 1, 0, activeTask);
      return without;
    }
  }

  without.push(activeTask);
  return without;
}

function ColumnHeaderCellContent({
  column,
  showSelectAll = false,
  allVisibleSelected = false,
  someVisibleSelected = false,
  visibleTasksCount = 0,
  onToggleSelectAll,
  showDragHandle = false,
  dragHandleRef = null,
  dragHandleAttributes = null,
  dragHandleListeners = null,
  sortDirection = undefined,
  sortPriority = null,
  onSortClick = null,
  isTableLayout = false,
  forceShowActions = false,
}) {
  const dragHandle = showDragHandle ? (
    <button
      type='button'
      ref={dragHandleRef}
      aria-label='Drag to reorder column'
      className={cn(
        '-ml-1 flex w-4 shrink-0 cursor-grab items-center justify-center text-icon-soft-400 transition-opacity hover:text-icon-sub-500 active:cursor-grabbing',
        forceShowActions
          ? 'opacity-100'
          : 'opacity-0 group-hover/col-header:opacity-100 focus-visible:opacity-100',
      )}
      onClick={(event) => event.stopPropagation()}
      {...dragHandleAttributes}
      {...dragHandleListeners}
    >
      <RiDraggable size={16} />
    </button>
  ) : null;

  return (
    <>
      {showSelectAll ? (
        <span className='flex shrink-0 items-center'>
          {dragHandle ?? <span className='-ml-1 w-4 shrink-0' aria-hidden />}
          <button
            type='button'
            aria-label={allVisibleSelected ? 'Deselect all tasks' : 'Select all tasks'}
            aria-pressed={allVisibleSelected}
            disabled={visibleTasksCount === 0}
            onClick={onToggleSelectAll}
            className={cn(
              'flex shrink-0 items-center justify-center transition-opacity disabled:opacity-40',
              someVisibleSelected
                ? 'text-primary-base opacity-100'
                : cn(
                    'text-icon-soft-400 hover:text-icon-sub-500',
                    forceShowActions
                      ? 'opacity-100'
                      : 'opacity-0 group-hover/col-header:opacity-100 focus-visible:opacity-100',
                  ),
            )}
          >
            {allVisibleSelected ? (
              <RiCheckboxFill size={18} className='shrink-0' />
            ) : someVisibleSelected ? (
              <RiCheckboxIndeterminateFill size={18} className='shrink-0' />
            ) : (
              <RiCheckboxBlankLine size={18} className='shrink-0' />
            )}
          </button>
        </span>
      ) : (
        dragHandle
      )}

      <span className='inline-flex min-w-0 flex-1 items-center gap-0.5'>
        <span
          className={cn(
            'truncate font-medium text-text-soft-400',
            isTableLayout ? 'text-xs' : 'text-sm',
          )}
        >
          {column.label}
        </span>
        {column.custom ? (
          <CustomFieldInfoHint
            description={getCustomFieldDescription(column)}
            className={cn(
              'shrink-0 transition-opacity',
              forceShowActions
                ? 'opacity-100'
                : 'opacity-0 group-hover/col-header:opacity-100 focus-within:opacity-100',
            )}
          />
        ) : null}
        {isColumnSortable(column) && onSortClick ? (
          <button
            type='button'
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded transition-all hover:text-text-strong-950',
              sortDirection || forceShowActions
                ? 'text-text-sub-600 opacity-100'
                : 'text-icon-soft-400 opacity-0 group-hover/col-header:opacity-100 focus-visible:opacity-100',
            )}
            aria-label={`Sort by ${column.label} ${sortDirection === 'asc' ? 'descending' : 'ascending'}${sortPriority ? ` (${sortPriority})` : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onSortClick(event);
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
    </>
  );
}

function TableColumnResizeHandle({ columnKey, onResizeStart, isResizing = false }) {
  return (
    <div
      role='separator'
      aria-orientation='vertical'
      aria-label='Resize column'
      data-prevent-row-click
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizeStart?.(columnKey, event);
      }}
      className={cn(
        'absolute right-0 top-0 z-20 h-full w-2 translate-x-1/2 cursor-col-resize touch-none',
        'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent',
        'hover:before:bg-primary-base',
        isResizing && 'before:bg-primary-base',
      )}
    />
  );
}

function PinnedColumnHeader({
  column,
  showSelectAll = false,
  allVisibleSelected = false,
  someVisibleSelected = false,
  visibleTasksCount = 0,
  onToggleSelectAll,
  sortDirection = undefined,
  sortPriority = null,
  onSortClick = null,
  isTableLayout = false,
  onResizeStart = null,
  isResizing = false,
}) {
  return (
    <div
      className={cn(
        'group/col-header',
        isTableLayout
          ? getTableHeaderCellClass(column)
          : 'flex h-10 min-w-0 select-none items-center gap-2 overflow-hidden px-3',
        !isTableLayout && getTableCellBorderClass(isTableLayout),
        isTableLayout
          ? getTableStickyColumnClass(column, { isTableLayout, isHeader: true })
          : column.key === 'title' && LIST_TABLE_TITLE_HEADER_CLASS,
        isTableLayout && column.key === 'title' && 'z-[21]',
      )}
    >
      <ColumnHeaderCellContent
        column={column}
        showSelectAll={showSelectAll && !isTableLayout}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        visibleTasksCount={visibleTasksCount}
        onToggleSelectAll={onToggleSelectAll}
        showDragHandle={false}
        sortDirection={sortDirection}
        sortPriority={sortPriority}
        onSortClick={onSortClick}
        isTableLayout={isTableLayout}
      />

      {isTableLayout && onResizeStart ? (
        <TableColumnResizeHandle
          columnKey={column.key}
          onResizeStart={onResizeStart}
          isResizing={isResizing}
        />
      ) : null}
    </div>
  );
}

function SortableColumnHeader({
  column,
  showSelectAll = false,
  allVisibleSelected = false,
  someVisibleSelected = false,
  visibleTasksCount = 0,
  onToggleSelectAll,
  sortDirection = undefined,
  sortPriority = null,
  onSortClick = null,
  onOpenMenu = null,
  isTableLayout = false,
  onResizeStart = null,
  isResizing = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleOpenMenu = (event) => {
    if (!onOpenMenu || event.target.closest('button')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onOpenMenu(event);
  };

  const canOpenMenu = Boolean(onOpenMenu);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
      }}
      style={style}
      className={cn(
        'group/col-header',
        isTableLayout
          ? getTableHeaderCellClass(column)
          : 'flex h-10 min-w-0 select-none items-center gap-2 overflow-hidden px-3',
        !isTableLayout && getTableCellBorderClass(isTableLayout),
        canOpenMenu && 'cursor-pointer',
        isTableLayout
          ? getTableStickyColumnClass(column, { isTableLayout, isHeader: true })
          : column.key === 'title' && LIST_TABLE_TITLE_HEADER_CLASS,
        isTableLayout && column.key === 'title' && 'z-[21]',
        isDragging && 'opacity-40',
      )}
      onClick={canOpenMenu ? handleOpenMenu : undefined}
      onContextMenu={canOpenMenu ? handleOpenMenu : undefined}
    >
      <ColumnHeaderCellContent
        column={column}
        showSelectAll={showSelectAll && !isTableLayout}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        visibleTasksCount={visibleTasksCount}
        onToggleSelectAll={onToggleSelectAll}
        showDragHandle
        dragHandleRef={setActivatorNodeRef}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        sortDirection={sortDirection}
        sortPriority={sortPriority}
        onSortClick={onSortClick}
        isTableLayout={isTableLayout}
      />

      {isTableLayout && onResizeStart ? (
        <TableColumnResizeHandle
          columnKey={column.key}
          onResizeStart={onResizeStart}
          isResizing={isResizing}
        />
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  columns,
  rowIndex,
  isEditingTitle,
  savingCell,
  isSelected = false,
  onToggleSelect,
  onRowClick,
  onCancelRename,
  onTitleUpdate,
  onAssigneeUpdate,
  onDueDateUpdate,
  onStatusUpdate,
  onPriorityUpdate,
  onCustomFieldUpdate,
  statusGroups = [],
  allStatusGroups = [],
  isStatusLoading = false,
  actionsSlot = null,
  isTableLayout = false,
  canEditTasks = true,
  erpValuesByLink = {},
  onErpLinkUpdate,
}) {
  const isCellSaving = (fieldKey) =>
    savingCell?.taskId === task.id && savingCell?.fieldKey === fieldKey;

  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canEditTasks });

  const rowStyle = {
    ...getListTableRowStyle(),
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 5, position: 'relative' } : null),
  };

  const handleRowClick = (event) => {
    if (
      event.target.closest(
        'button, input, textarea, select, a, [role="combobox"], [role="button"], [role="dialog"], [role="menu"], [role="listbox"], [role="option"], [data-prevent-row-click], [data-radix-popper-content-wrapper]',
      )
    ) {
      return;
    }

    onRowClick?.(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group/row grid border-b border-stroke-soft-200 hover:bg-bg-weak-50',
        isTableLayout && 'shrink-0',
        !isTableLayout && 'cursor-pointer',
        isSelected && SELECTED_TASK_ROW_BG_CLASS,
        isDragging && 'bg-bg-weak-50 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]',
      )}
      style={rowStyle}
      onClick={isTableLayout ? undefined : handleRowClick}
    >
      {isTableLayout ? (
        <TableIndexCell
          rowIndex={rowIndex}
          isSelected={isSelected}
          onToggleSelect={() => onToggleSelect?.(task.id)}
        />
      ) : null}

      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            isTableLayout
              ? cn(
                  getTableDataCellClass(column),
                  column.key === 'title' &&
                    getTableStickyColumnClass(column, { isTableLayout, isSelected }),
                )
              : cn(
                  'flex min-h-11 min-w-0 items-center',
                  column.key === 'status' || column.fieldType === 'status'
                    ? 'overflow-visible'
                    : 'overflow-hidden',
                  getTableCellBorderClass(isTableLayout),
                  column.key === 'title'
                    ? cn(
                        'gap-2 px-3',
                        LIST_TABLE_TITLE_CELL_CLASS,
                        isSelected && SELECTED_TASK_ROW_BG_CLASS,
                      )
                    : 'px-2',
                ),
          )}
        >
          {!isTableLayout && column.key === 'title' ? (
            <span className='flex shrink-0 items-center'>
              <button
                type='button'
                ref={setActivatorNodeRef}
                aria-label='Drag to reorder task'
                data-prevent-row-click
                className='-ml-1 flex w-4 shrink-0 cursor-grab items-center justify-center text-icon-soft-400 opacity-0 transition-opacity hover:text-icon-sub-500 group-hover/row:opacity-100 active:cursor-grabbing'
                onClick={(event) => event.stopPropagation()}
                {...attributes}
                {...listeners}
              >
                <RiDraggable size={16} />
              </button>

              <button
                type='button'
                aria-label={isSelected ? 'Deselect task' : 'Select task'}
                aria-pressed={isSelected}
                data-prevent-row-click
                className={cn(
                  'flex shrink-0 items-center justify-center transition-opacity',
                  isSelected
                    ? 'text-primary-base opacity-100'
                    : 'text-icon-soft-400 opacity-0 hover:text-icon-sub-500 group-hover/row:opacity-100',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelect?.(task.id);
                }}
              >
                {isSelected ? (
                  <RiCheckboxFill size={18} className='shrink-0' />
                ) : (
                  <RiCheckboxBlankLine size={18} className='shrink-0' />
                )}
              </button>
            </span>
          ) : null}

          {isTableLayout && column.key === 'title' ? (
            <button
              type='button'
              ref={setActivatorNodeRef}
              aria-label='Drag to reorder task'
              data-prevent-row-click
              className='ml-1 flex w-3 shrink-0 cursor-grab items-center justify-center text-icon-soft-400 opacity-0 transition-opacity hover:text-icon-sub-500 group-hover/row:opacity-100 active:cursor-grabbing'
              onClick={(event) => event.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <RiDraggable size={12} />
            </button>
          ) : null}

          <div className={cn('min-w-0 flex-1 self-stretch', isTableLayout ? 'h-8' : 'min-h-11')}>
            <TaskFieldCell
              column={column}
              task={task}
              disabled={isCellSaving(column.key)}
              forceTitleEditing={isEditingTitle && column.key === 'title'}
              onCancelTitleEditing={onCancelRename}
              onTitleUpdate={onTitleUpdate}
              onAssigneeUpdate={onAssigneeUpdate}
              onDueDateUpdate={onDueDateUpdate}
              onStatusUpdate={onStatusUpdate}
              onPriorityUpdate={onPriorityUpdate}
              onCustomFieldUpdate={onCustomFieldUpdate}
              statusGroups={statusGroups}
              allStatusGroups={allStatusGroups}
              isStatusLoading={isStatusLoading}
              isTableLayout={isTableLayout}
              onTitleExpand={onRowClick}
              erpValuesByLink={erpValuesByLink}
              onErpLinkUpdate={onErpLinkUpdate}
            />
          </div>
        </div>
      ))}

      {isTableLayout ? <div className={TABLE_FILLER_CELL_CLASS} /> : null}

      {actionsSlot}
    </div>
  );
}

const TASK_QUERY_PARAM = 'task';
const TASK_LIST_PAGE_SIZE = 50;
const EMPTY_TASK_PAGINATION = { page: 0, totalCount: 0, hasMore: false };

function mergeTasksById(existing = [], incoming = []) {
  const byId = new Map(existing.map((task) => [task.id, task]));
  incoming.forEach((task) => {
    byId.set(task.id, task);
  });
  return [...byId.values()];
}

function ListTasksPaginationFooter({
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  sentinelRef,
  className,
}) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className={cn('border-t border-stroke-soft-200 bg-bg-white-0', className)}>
      <div ref={sentinelRef} data-scroll-sentinel className='h-1 w-full' />
      <div className='flex items-center justify-center px-4 py-4'>
        {isLoadingMore ? (
          <div className='flex items-center justify-center gap-2 text-sm text-text-sub-600'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
            Loading more tasks...
          </div>
        ) : (
          <button
            type='button'
            onClick={onLoadMore}
            className='text-sm font-medium text-primary-base hover:underline'
          >
            Load more tasks
          </button>
        )}
      </div>
    </div>
  );
}

export default function BoardTaskView({
  list,
  taskView = null,
  layoutMode = 'list',
  sidebarTree = [],
  onFavoriteTasksChange,
  onViewSettingsPersisted,
  onSaveViewAsNew,
  statusTemplateVersion = 0,
}) {
  const isTableLayout = layoutMode === 'table';
  const isCalendarLayout = layoutMode === 'calendar';
  const listPermissions = list?.permissions;
  const canCreateTasks = canPerformBoardAction(listPermissions, 'create');
  const canEditTasks = canPerformBoardAction(listPermissions, 'edit');
  const canDeleteTasks = canPerformBoardAction(listPermissions, 'delete');
  const canSaveViewForAll = useMemo(() => {
    const spaceId = list?.spaceId;
    if (!spaceId) {
      return Boolean(list?.isOwner);
    }

    const space = findNodeById(sidebarTree, spaceId);
    return Boolean(space?.isOwner);
  }, [list?.isOwner, list?.spaceId, sidebarTree]);
  const hasPersonalView = Boolean(taskView?.isPersonal);
  const settingsScopeId = taskView?.id ?? null;
  const useViewSettings = Boolean(settingsScopeId);
  const taskViewSettingsKey = useMemo(() => getTaskViewSettingsKey(taskView), [taskView]);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [erpValuesByLink, setErpValuesByLink] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [taskPagination, setTaskPagination] = useState(EMPTY_TASK_PAGINATION);
  const [error, setError] = useState(null);
  const [isCreateTaskDrawerOpen, setIsCreateTaskDrawerOpen] = useState(false);
  const [isSystemListModalOpen, setIsSystemListModalOpen] = useState(false);
  const [isTaskViewDrawerOpen, setIsTaskViewDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isCustomFieldsDrawerOpen, setIsCustomFieldsDrawerOpen] = useState(false);
  const [openTaskMenuId, setOpenTaskMenuId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [savingCell, setSavingCell] = useState(null);
  const [customColumns, setCustomColumns] = useState([]);
  const [standardColumnVisibility, setStandardColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnSort, setColumnSort] = useState([]);
  const [groupBy, setGroupBy] = useState(null);
  const [groupSummaries, setGroupSummaries] = useState([]);
  const [groupPages, setGroupPages] = useState({});
  const [revealedGroupKeys, setRevealedGroupKeys] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [activeColumnKey, setActiveColumnKey] = useState(null);
  const [openColumnMenuKey, setOpenColumnMenuKey] = useState(null);
  const [openCalculateColumnKey, setOpenCalculateColumnKey] = useState(null);
  const [columnCalculations, setColumnCalculations] = useState({});
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumnKey, setResizingColumnKey] = useState(null);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const customColumnsRef = useRef([]);
  const standardVisibilityRef = useRef({});
  const columnOrderRef = useRef([]);
  const columnSortRef = useRef([]);
  const columnWidthsRef = useRef({});
  const columnMenuAnchorRef = useRef(null);
  const calculateMenuAnchorRef = useRef(null);
  const tableScrollRef = useRef(null);
  const groupedScrollRef = useRef(null);
  const listScrollRef = useRef(null);
  const calendarScrollRef = useRef(null);
  const taskPageRef = useRef(1);
  const activeListIdRef = useRef(list?.id ?? null);
  const tasksLoadRequestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const groupSummariesRef = useRef([]);
  const groupPagesRef = useRef({});
  const revealedGroupKeysRef = useRef([]);
  const collapsedGroupsRef = useRef({});
  const tasksRef = useRef([]);
  const listColumnsRef = useRef([]);
  const groupByRef = useRef(null);
  const statusGroupsRef = useRef([]);
  const allStatusGroupsRef = useRef([]);
  const hydratedViewIdRef = useRef(null);
  const skipViewPersistRef = useRef(false);
  const justHydratedRef = useRef(false);
  const pendingViewBaselineSyncRef = useRef(false);
  const lastHydratedSettingsKeyRef = useRef('');
  const buildCurrentViewSettingsRef = useRef(() => ({}));
  customColumnsRef.current = customColumns;
  standardVisibilityRef.current = standardColumnVisibility;
  columnOrderRef.current = columnOrder;
  columnSortRef.current = columnSort;
  columnWidthsRef.current = columnWidths;
  activeListIdRef.current = list?.id ?? null;
  collapsedGroupsRef.current = collapsedGroups;
  groupSummariesRef.current = groupSummaries;
  groupPagesRef.current = groupPages;
  revealedGroupKeysRef.current = revealedGroupKeys;
  tasksRef.current = tasks;
  groupByRef.current = groupBy;
  const [showClosedOnly, setShowClosedOnly] = useState(false);
  const [showAssignedToMeOnly, setShowAssignedToMeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [fieldFilters, setFieldFilters] = useState([]);
  const [taskPendingDelete, setTaskPendingDelete] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isTableInlineCreateOpen, setIsTableInlineCreateOpen] = useState(false);
  const [openTableCreateGroupKey, setOpenTableCreateGroupKey] = useState(null);
  const [savedBaseline, setSavedBaseline] = useState(null);
  const [isViewSettingsReady, setIsViewSettingsReady] = useState(false);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(() => readViewAutosaveEnabled());
  const [isSavingView, setIsSavingView] = useState(false);
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => startOfDay(new Date()));
  const [calendarDateField, setCalendarDateField] = useState(DEFAULT_BOARD_CALENDAR_DATE_FIELD);
  const [calendarLayoutMode, setCalendarLayoutMode] = useState(DEFAULT_BOARD_CALENDAR_LAYOUT_MODE);
  const {
    groups: statusGroups,
    allGroups: allStatusGroups,
    defaultStatusId,
    isLoading: isStatusLoading,
    options: statusOptions,
  } = useBoardListStatusOptions(list?.id, statusTemplateVersion);

  const baseListColumns = useMemo(
    () => buildListColumns(customColumns, standardColumnVisibility),
    [customColumns, standardColumnVisibility],
  );

  const listColumns = useMemo(
    () => applyColumnOrder(baseListColumns, columnOrder),
    [baseListColumns, columnOrder],
  );
  listColumnsRef.current = listColumns;
  statusGroupsRef.current = statusGroups;
  allStatusGroupsRef.current = allStatusGroups;

  const standardFields = useMemo(
    () => createStandardFieldsState(standardColumnVisibility),
    [standardColumnVisibility],
  );

  const gridTemplateColumns = useMemo(
    () =>
      isTableLayout
        ? getTableGridTemplateColumns(listColumns, columnWidths)
        : getGridTemplateColumns(listColumns),
    [columnWidths, isTableLayout, listColumns],
  );

  const tableGridStyle = useMemo(
    () =>
      isTableLayout
        ? getTableListGridStyle(gridTemplateColumns)
        : getListTableGridStyle(gridTemplateColumns),
    [gridTemplateColumns, isTableLayout],
  );

  const cacheColumnSettings = useCallback(
    (partial = {}) => {
      if (!settingsScopeId) {
        return;
      }

      saveViewSettingsToCache(settingsScopeId, partial);
    },
    [settingsScopeId],
  );

  const applyViewSettings = useCallback(
    (settings = {}, { writeCache } = {}) => {
      const normalizedColumnOrder = ensurePinnedFirstColumnOrder(settings.columnOrder ?? []);

      customColumnsRef.current = settings.customColumns ?? [];
      standardVisibilityRef.current = settings.standardVisibility ?? {};
      columnOrderRef.current = normalizedColumnOrder;
      columnSortRef.current = settings.columnSort ?? [];
      columnWidthsRef.current = settings.columnWidths ?? {};

      setCustomColumns(settings.customColumns ?? []);
      setStandardColumnVisibility(settings.standardVisibility ?? {});
      setColumnOrder(normalizedColumnOrder);
      setColumnSort(settings.columnSort ?? []);
      setFieldFilters(settings.fieldFilters ?? []);
      setGroupBy(settings.groupBy ?? null);
      setColumnCalculations(settings.columnCalculations ?? {});
      setColumnWidths(settings.columnWidths ?? {});
      setFrozenColumns(settings.frozenColumns ?? []);
      setShowClosedOnly(Boolean(settings.showClosedOnly));
      setShowAssignedToMeOnly(Boolean(settings.showAssignedToMeOnly));
      setCalendarDateField(
        normalizeBoardCalendarDateField(
          settings.calendarDateField ?? DEFAULT_BOARD_CALENDAR_DATE_FIELD,
        ),
      );
      setCalendarLayoutMode(
        normalizeBoardCalendarLayoutMode(
          settings.calendarLayoutMode ?? DEFAULT_BOARD_CALENDAR_LAYOUT_MODE,
        ),
      );

      const shouldWriteCache = writeCache ?? true;
      if (settingsScopeId && shouldWriteCache) {
        saveViewSettingsToCache(settingsScopeId, {
          customColumns: settings.customColumns ?? [],
          standardVisibility: settings.standardVisibility ?? {},
          columnOrder: normalizedColumnOrder,
          columnSort: settings.columnSort ?? [],
          columnWidths: settings.columnWidths ?? {},
        });
      }
    },
    [settingsScopeId],
  );

  const buildCurrentViewSettings = useCallback(
    () => ({
      customColumns: customColumnsRef.current,
      standardVisibility: standardVisibilityRef.current,
      columnOrder: columnOrderRef.current,
      columnSort: columnSortRef.current,
      fieldFilters,
      groupBy,
      columnCalculations,
      columnWidths: columnWidthsRef.current,
      frozenColumns: isTableLayout
        ? frozenColumns.length > 0
          ? frozenColumns
          : ['title']
        : frozenColumns,
      showClosedOnly,
      showAssignedToMeOnly,
      calendarDateField,
      calendarLayoutMode,
    }),
    [
      calendarDateField,
      calendarLayoutMode,
      columnCalculations,
      fieldFilters,
      frozenColumns,
      groupBy,
      isTableLayout,
      showAssignedToMeOnly,
      showClosedOnly,
    ],
  );

  buildCurrentViewSettingsRef.current = buildCurrentViewSettings;

  const currentViewSettings = useMemo(
    () => collectViewSettingsSnapshot(buildCurrentViewSettings()),
    [
      buildCurrentViewSettings,
      customColumns,
      standardColumnVisibility,
      columnOrder,
      columnSort,
      fieldFilters,
      groupBy,
      columnCalculations,
      columnWidths,
      frozenColumns,
      showClosedOnly,
      showAssignedToMeOnly,
      calendarDateField,
      calendarLayoutMode,
    ],
  );

  const isViewDirty = useMemo(() => {
    if (!settingsScopeId || !savedBaseline || !isViewSettingsReady) {
      return false;
    }

    return !areViewSettingsEqual(savedBaseline, currentViewSettings);
  }, [currentViewSettings, isViewSettingsReady, savedBaseline, settingsScopeId]);

  const commitSavedBaseline = useCallback((settings) => {
    setSavedBaseline(collectViewSettingsSnapshot(settings));
  }, []);

  const beginViewBaselineSync = useCallback(() => {
    pendingViewBaselineSyncRef.current = true;
    setIsViewSettingsReady(false);
  }, []);

  const commitHydrationBaseline = useCallback(() => {
    beginViewBaselineSync();
  }, [beginViewBaselineSync]);

  useEffect(() => {
    setSavedBaseline(null);
    setIsViewSettingsReady(false);
    pendingViewBaselineSyncRef.current = false;
  }, [settingsScopeId]);

  // Absorb automatic post-load view churn (column reconcile, legacy migrate, etc.)
  // into the baseline so a brand-new list does not look "dirty".
  useEffect(() => {
    if (!settingsScopeId || !pendingViewBaselineSyncRef.current) {
      return undefined;
    }

    if (hydratedViewIdRef.current !== settingsScopeId) {
      return undefined;
    }

    commitSavedBaseline(currentViewSettings);

    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        if (cancelled || hydratedViewIdRef.current !== settingsScopeId) {
          return;
        }

        commitSavedBaseline(buildCurrentViewSettingsRef.current());
        pendingViewBaselineSyncRef.current = false;
        skipViewPersistRef.current = false;
        setIsViewSettingsReady(true);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
    };
  }, [commitSavedBaseline, currentViewSettings, settingsScopeId]);

  const handleSaveView = useCallback(
    async ({ silent = false, scope = VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!settingsScopeId || isSavingView) {
        return;
      }

      const normalizedScope =
        scope === VIEW_SAVE_SCOPES.ALL ? VIEW_SAVE_SCOPES.ALL : VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast('Only the board owner can save a view for everyone.');
        return;
      }

      const payload = buildCurrentViewSettings();
      setIsSavingView(true);
      const result = await persistTaskViewSettings(settingsScopeId, payload, {
        scope: normalizedScope,
      });
      setIsSavingView(false);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      commitSavedBaseline(payload);
      saveViewSettingsToCache(settingsScopeId, payload);
      lastHydratedSettingsKeyRef.current = getViewSettingsKeyForScope(settingsScopeId, payload);
      onViewSettingsPersisted?.(settingsScopeId, payload, {
        scope: normalizedScope,
        isPersonal: normalizedScope === VIEW_SAVE_SCOPES.ME,
      });
      if (!silent) {
        showSuccessToast(
          normalizedScope === VIEW_SAVE_SCOPES.ALL
            ? 'View saved for everyone.'
            : 'View saved for you.',
        );
      }
    },
    [
      buildCurrentViewSettings,
      canSaveViewForAll,
      commitSavedBaseline,
      isSavingView,
      onViewSettingsPersisted,
      settingsScopeId,
    ],
  );

  const handleRevertView = useCallback(() => {
    if (!savedBaseline) {
      return;
    }

    skipViewPersistRef.current = true;
    applyViewSettings(savedBaseline);
    hydratedViewIdRef.current = settingsScopeId;
    skipViewPersistRef.current = false;
  }, [applyViewSettings, savedBaseline, settingsScopeId]);

  const handleResetToDefault = useCallback(
    async ({ scope = VIEW_SAVE_SCOPES.ME } = {}) => {
      if (!settingsScopeId || isSavingView) {
        return;
      }

      const normalizedScope =
        scope === VIEW_SAVE_SCOPES.ALL ? VIEW_SAVE_SCOPES.ALL : VIEW_SAVE_SCOPES.ME;

      if (normalizedScope === VIEW_SAVE_SCOPES.ALL && !canSaveViewForAll) {
        showErrorToast('Only the board owner can reset the default view for everyone.');
        return;
      }

      setIsSavingView(true);
      const result = await resetTaskViewToDefault(settingsScopeId, {
        scope: normalizedScope,
      });
      setIsSavingView(false);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      const parsed = parseTaskViewSettings(result.data ?? {}, {
        viewType: taskView?.viewType ?? result.data?.viewType,
      });

      skipViewPersistRef.current = true;
      beginViewBaselineSync();
      clearViewSettingsCache(settingsScopeId);
      applyViewSettings(parsed, { writeCache: false });
      justHydratedRef.current = true;
      hydratedViewIdRef.current = settingsScopeId;
      lastHydratedSettingsKeyRef.current = getViewSettingsKeyForScope(settingsScopeId, parsed);
      onViewSettingsPersisted?.(settingsScopeId, parsed, {
        scope: normalizedScope,
        isPersonal: false,
      });
      commitHydrationBaseline();

      showSuccessToast(
        normalizedScope === VIEW_SAVE_SCOPES.ALL
          ? 'Default view applied for everyone.'
          : 'Default view applied.',
      );
    },
    [
      applyViewSettings,
      beginViewBaselineSync,
      canSaveViewForAll,
      commitHydrationBaseline,
      isSavingView,
      onViewSettingsPersisted,
      settingsScopeId,
      taskView?.viewType,
    ],
  );

  const handleToggleAutosave = useCallback(() => {
    const next = !isAutosaveEnabled;
    setIsAutosaveEnabled(next);
    writeViewAutosaveEnabled(next);

    if (next && isViewDirty) {
      handleSaveView({ silent: true, scope: VIEW_SAVE_SCOPES.ME });
    }
  }, [handleSaveView, isAutosaveEnabled, isViewDirty]);

  const handleSaveAsNewView = useCallback(async () => {
    if (!settingsScopeId || isSavingView) {
      return;
    }

    setIsSavingView(true);
    const payload = buildCurrentViewSettings();
    await onSaveViewAsNew?.(settingsScopeId, payload);
    setIsSavingView(false);
  }, [buildCurrentViewSettings, isSavingView, onSaveViewAsNew, settingsScopeId]);

  const persistColumnSettings = useCallback(
    (
      scopeId,
      {
        customColumns: nextCustom,
        standardVisibility: nextStandard,
        columnOrder: nextOrder,
        columnSort: nextSort,
        fieldFilters: nextFilters,
        groupBy: nextGroupBy,
        columnCalculations: nextCalculations,
        columnWidths: nextColumnWidths,
        frozenColumns: nextFrozenColumns,
        showClosedOnly: nextShowClosedOnly,
        showAssignedToMeOnly: nextShowAssignedToMeOnly,
        calendarDateField: nextCalendarDateField,
        calendarLayoutMode: nextCalendarLayoutMode,
      } = {},
    ) => {
      if (!scopeId) {
        return;
      }

      // Column auto-persist is always personal. Shared defaults are owner-only via Save for all.
      const normalizedScope = VIEW_SAVE_SCOPES.ME;

      const payload = {
        customColumns: nextCustom ?? customColumnsRef.current,
        standardVisibility: nextStandard ?? standardVisibilityRef.current,
        columnOrder: nextOrder ?? columnOrderRef.current,
        columnSort: nextSort ?? columnSortRef.current,
        fieldFilters: nextFilters ?? fieldFilters,
        groupBy: nextGroupBy ?? groupBy,
        columnCalculations: nextCalculations ?? columnCalculations,
        columnWidths: nextColumnWidths ?? columnWidthsRef.current,
        frozenColumns:
          nextFrozenColumns ??
          (isTableLayout ? (frozenColumns.length > 0 ? frozenColumns : ['title']) : frozenColumns),
        showClosedOnly: nextShowClosedOnly ?? showClosedOnly,
        showAssignedToMeOnly: nextShowAssignedToMeOnly ?? showAssignedToMeOnly,
        calendarDateField: normalizeBoardCalendarDateField(
          nextCalendarDateField ?? calendarDateField,
        ),
        calendarLayoutMode: normalizeBoardCalendarLayoutMode(
          nextCalendarLayoutMode ?? calendarLayoutMode,
        ),
      };

      // Column layout changes (reorder / add / hide / widths / sort) always
      // persist immediately so the view does not prompt for a manual Save.
      saveViewSettingsToCache(scopeId, payload);
      commitSavedBaseline(payload);
      lastHydratedSettingsKeyRef.current = getViewSettingsKeyForScope(scopeId, payload);
      onViewSettingsPersisted?.(scopeId, payload, {
        scope: normalizedScope,
        isPersonal: true,
      });
      persistTaskViewSettings(scopeId, payload, { scope: normalizedScope }).then((result) => {
        if (result?.error) {
          showErrorToast(result.error);
        }
      });
    },
    [
      columnCalculations,
      commitSavedBaseline,
      fieldFilters,
      frozenColumns,
      groupBy,
      isTableLayout,
      onViewSettingsPersisted,
      showAssignedToMeOnly,
      showClosedOnly,
      calendarDateField,
      calendarLayoutMode,
    ],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const tasksWithErpValues = useMemo(
    () => enrichTasksWithErpValues(tasks, erpValuesByLink),
    [erpValuesByLink, tasks],
  );

  const filteredTasks = useMemo(
    () =>
      tasksWithErpValues.filter((task) => {
        if (task.isArchived) {
          return false;
        }

        if (showAssignedToMeOnly && !isTaskAssignedToUser(task, user)) {
          return false;
        }

        if (
          normalizedSearchQuery &&
          !String(task.title ?? '')
            .toLowerCase()
            .includes(normalizedSearchQuery)
        ) {
          return false;
        }

        if (!taskMatchesFieldFilters(task, fieldFilters, listColumns)) {
          return false;
        }

        const isClosed = isTaskInClosedFilter(
          task.status,
          statusGroups,
          allStatusGroups,
          task.statusCategory,
        );

        return showClosedOnly ? isClosed : !isClosed;
      }),
    [
      allStatusGroups,
      fieldFilters,
      listColumns,
      normalizedSearchQuery,
      showAssignedToMeOnly,
      showClosedOnly,
      statusGroups,
      tasksWithErpValues,
      user,
    ],
  );

  const visibleTasks = useMemo(
    () => sortTasksByColumns(filteredTasks, columnSort, listColumns),
    [columnSort, filteredTasks, listColumns],
  );

  const showTaskLoadingState = isLoading && tasks.length === 0;

  const groupByOptions = useMemo(() => buildGroupByOptions(listColumns), [listColumns]);

  const groupColumn = useMemo(
    () => listColumns.find((column) => column.key === groupBy?.columnKey) ?? null,
    [groupBy?.columnKey, listColumns],
  );

  const taskGroups = useMemo(() => {
    if (!groupBy?.columnKey || !groupColumn) {
      return null;
    }

    return buildGroupedSections({
      column: groupColumn,
      groupBy,
      summaries: groupSummaries,
      tasks: visibleTasks,
      collapsedGroups,
      groupPages,
      revealedGroupKeys,
      context: {
        statusGroups,
        allStatusGroups,
      },
    });
  }, [
    allStatusGroups,
    collapsedGroups,
    groupBy,
    groupColumn,
    groupPages,
    groupSummaries,
    revealedGroupKeys,
    statusGroups,
    visibleTasks,
  ]);

  const orderedGroupKeys = useMemo(() => {
    if (!groupBy?.columnKey || !groupColumn) {
      return [];
    }

    return collectOrderedGroupKeys({
      column: groupColumn,
      direction: groupBy?.direction ?? 'asc',
      summaries: groupSummaries,
      tasks: visibleTasks,
      context: {
        statusGroups,
        allStatusGroups,
      },
    });
  }, [
    allStatusGroups,
    groupBy?.columnKey,
    groupBy?.direction,
    groupColumn,
    groupSummaries,
    statusGroups,
    visibleTasks,
  ]);

  const allGroupsRevealed =
    orderedGroupKeys.length > 0 && !hasMoreGroupsToReveal(orderedGroupKeys, revealedGroupKeys);

  const isGrouped = Boolean(groupBy?.columnKey);
  const useFlatTableBody = isTableLayout && !isGrouped;

  const columnCalculationResults = useMemo(
    () => buildColumnCalculationResults(visibleTasks, listColumns, columnCalculations),
    [columnCalculations, listColumns, visibleTasks],
  );

  const hasColumnCalculations = useMemo(
    () => Object.values(columnCalculationResults).some((entry) => entry?.result != null),
    [columnCalculationResults],
  );

  const visibleTaskIds = useMemo(() => visibleTasks.map((task) => task.id), [visibleTasks]);

  const columnKeys = useMemo(() => listColumns.map((column) => column.key), [listColumns]);

  const sortableColumnKeys = useMemo(
    () => columnKeys.filter((key) => key !== PINNED_FIRST_COLUMN_KEY),
    [columnKeys],
  );

  const columnDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const taskDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeColumn = useMemo(
    () => listColumns.find((column) => column.key === activeColumnKey) ?? null,
    [activeColumnKey, listColumns],
  );

  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);

  const allVisibleSelected =
    visibleTasks.length > 0 && visibleTasks.every((task) => selectedTaskIdSet.has(task.id));
  const someVisibleSelected = visibleTasks.some((task) => selectedTaskIdSet.has(task.id));

  const handleToggleTaskSelection = useCallback((taskId) => {
    setSelectedTaskIds((previous) =>
      previous.includes(taskId) ? previous.filter((id) => id !== taskId) : [...previous, taskId],
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedTaskIds((previous) => {
      const visibleIds = visibleTasks.map((task) => task.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => previous.includes(id));

      if (allSelected) {
        const visibleSet = new Set(visibleIds);
        return previous.filter((id) => !visibleSet.has(id));
      }

      const merged = new Set(previous);
      visibleIds.forEach((id) => merged.add(id));
      return [...merged];
    });
  }, [visibleTasks]);

  const handleToggleGroupSelectAll = useCallback((groupTasks = []) => {
    setSelectedTaskIds((previous) => {
      const scopeIds = groupTasks.map((task) => task.id);
      const allSelected = scopeIds.length > 0 && scopeIds.every((id) => previous.includes(id));

      if (allSelected) {
        const scopeSet = new Set(scopeIds);
        return previous.filter((id) => !scopeSet.has(id));
      }

      const merged = new Set(previous);
      scopeIds.forEach((id) => merged.add(id));
      return [...merged];
    });
  }, []);

  const emptyTasksMessage = useMemo(() => {
    if (normalizedSearchQuery) {
      return 'No tasks match your search';
    }

    if (fieldFilters.length > 0) {
      return 'No tasks match your filters';
    }

    if (showAssignedToMeOnly && showClosedOnly) {
      return 'No closed tasks assigned to you';
    }

    if (showAssignedToMeOnly) {
      return 'No tasks assigned to you';
    }

    if (showClosedOnly) {
      return 'No closed tasks';
    }

    return 'No open tasks';
  }, [fieldFilters.length, normalizedSearchQuery, showAssignedToMeOnly, showClosedOnly]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadTasks = useCallback(async (listId, { append = false, groupKey = null } = {}) => {
    if (!listId) {
      setTasks([]);
      setTaskPagination(EMPTY_TASK_PAGINATION);
      setGroupSummaries([]);
      setGroupPages({});
      setRevealedGroupKeys([]);
      taskPageRef.current = 1;
      setError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
      return;
    }

    if (append) {
      if (isLoadingMoreRef.current) {
        return;
      }
    } else {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }

    const requestId = ++tasksLoadRequestIdRef.current;
    const isCurrentRequest = () =>
      tasksLoadRequestIdRef.current === requestId && activeListIdRef.current === listId;

    if (!isCurrentRequest()) {
      return;
    }

    const groupedColumnKey = groupByRef.current?.columnKey;
    const currentGroupBy = groupByRef.current;
    const currentListColumns = listColumnsRef.current;
    const currentStatusGroups = statusGroupsRef.current;
    const currentAllStatusGroups = allStatusGroupsRef.current;
    const listQuery = {
      search: debouncedSearchQuery,
      assignedTo: showAssignedToMeOnly ? (user?.name ?? user?.email ?? '') : '',
      closedOnly: groupedColumnKey || showClosedOnly ? showClosedOnly : null,
    };

    if (append) {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
      taskPageRef.current = 1;
    }

    const finishLoading = () => {
      if (append) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    };

    if (!groupedColumnKey || isCalendarLayout) {
      const page = append ? taskPageRef.current + 1 : 1;
      const result = await getListTasks(listId, { page, pageSize: TASK_LIST_PAGE_SIZE });

      if (!isCurrentRequest()) {
        finishLoading();
        return;
      }

      finishLoading();

      if (result.error) {
        if (!append) {
          setTasks([]);
          setTaskPagination(EMPTY_TASK_PAGINATION);
          taskPageRef.current = 1;
          setError(result.error);
          showErrorToast(result.error);
        } else {
          showErrorToast(result.error);
        }
        return;
      }

      const nextTasks = result.data ?? [];
      setTasks((previous) => (append ? mergeTasksById(previous, nextTasks) : nextTasks));

      if (!append) {
        setGroupSummaries([]);
        setGroupPages({});
        setRevealedGroupKeys([]);
      }

      const pagination = result.pagination ?? EMPTY_TASK_PAGINATION;
      taskPageRef.current = pagination.page ?? page;
      setTaskPagination({
        page: pagination.page ?? page,
        totalCount: pagination.totalCount ?? nextTasks.length,
        hasMore: Boolean(pagination.hasMore),
      });
      return;
    }

    const groupColumn =
      currentListColumns.find((column) => column.key === groupedColumnKey) ?? null;

    let summaries = groupSummariesRef.current;
    if (!append) {
      const groupsResult = await getListGroups(listId, {
        groupBy: groupedColumnKey,
        ...listQuery,
      });

      if (!isCurrentRequest()) {
        finishLoading();
        return;
      }

      if (groupsResult.error) {
        finishLoading();
        setTasks([]);
        setGroupSummaries([]);
        setGroupPages({});
        setRevealedGroupKeys([]);
        setTaskPagination(EMPTY_TASK_PAGINATION);
        setError(groupsResult.error);
        showErrorToast(groupsResult.error);
        return;
      }

      summaries = groupsResult.data ?? [];
      setGroupSummaries(summaries);
      groupSummariesRef.current = summaries;
      setGroupPages({});
      groupPagesRef.current = {};
      setTasks([]);
      tasksRef.current = [];

      const groupContext = {
        statusGroups: currentStatusGroups,
        allStatusGroups: currentAllStatusGroups,
      };
      const orderedKeys = collectOrderedGroupKeys({
        column: groupColumn,
        direction: currentGroupBy?.direction ?? 'asc',
        summaries,
        tasks: [],
        context: groupContext,
      });
      const initialRevealedKey = getInitialRevealedGroupKey(orderedKeys, summaries);
      const nextRevealedKeys = initialRevealedKey ? [initialRevealedKey] : [];
      setRevealedGroupKeys(nextRevealedKeys);
      revealedGroupKeysRef.current = nextRevealedKeys;
    }

    const groupContext = {
      statusGroups: currentStatusGroups,
      allStatusGroups: currentAllStatusGroups,
    };

    if (
      groupKey &&
      revealedGroupKeysRef.current.length > 0 &&
      !revealedGroupKeysRef.current.includes(groupKey)
    ) {
      const nextRevealedKeys = [...revealedGroupKeysRef.current, groupKey];
      revealedGroupKeysRef.current = nextRevealedKeys;
      setRevealedGroupKeys(nextRevealedKeys);
    }

    const sections = buildGroupedSections({
      column: groupColumn,
      groupBy: currentGroupBy,
      summaries,
      tasks: append ? tasksRef.current : [],
      collapsedGroups: collapsedGroupsRef.current,
      groupPages: groupPagesRef.current,
      revealedGroupKeys: revealedGroupKeysRef.current,
      context: groupContext,
    });

    const targetGroupKey = groupKey ?? getNextGroupToLoad(sections, collapsedGroupsRef.current);
    if (!targetGroupKey) {
      finishLoading();
      const orderedKeys = collectOrderedGroupKeys({
        column: groupColumn,
        direction: currentGroupBy?.direction ?? 'asc',
        summaries,
        tasks: tasksRef.current,
        context: groupContext,
      });
      const hasUnrevealedGroups = hasMoreGroupsToReveal(
        orderedKeys,
        revealedGroupKeysRef.current,
      );
      const totalCount = summaries.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);

      if (!append) {
        setTaskPagination({
          page: 1,
          totalCount,
          hasMore: hasUnrevealedGroups,
        });
      } else {
        setTaskPagination((previous) => ({
          ...previous,
          hasMore: hasUnrevealedGroups,
        }));
      }
      return;
    }

    const currentPage = groupPagesRef.current[targetGroupKey]?.page ?? 0;
    const page = currentPage + 1;
    const result = await getListTasks(listId, {
      page,
      pageSize: TASK_LIST_PAGE_SIZE,
      groupBy: groupedColumnKey,
      groupValue: targetGroupKey,
      ...listQuery,
    });

    if (!isCurrentRequest()) {
      finishLoading();
      return;
    }

    finishLoading();

    if (result.error) {
      if (!append) {
        setTasks([]);
        setTaskPagination(EMPTY_TASK_PAGINATION);
        setError(result.error);
      }
      showErrorToast(result.error);
      return;
    }

    const nextTasks = result.data ?? [];
    setTasks((previous) => {
      const merged = append || previous.length > 0 ? mergeTasksById(previous, nextTasks) : nextTasks;
      tasksRef.current = merged;
      return merged;
    });

    const pagination = result.pagination ?? EMPTY_TASK_PAGINATION;
    const nextGroupPages = {
      ...groupPagesRef.current,
      [targetGroupKey]: {
        page: pagination.page ?? page,
        hasMore: Boolean(pagination.hasMore),
      },
    };
    groupPagesRef.current = nextGroupPages;
    setGroupPages(nextGroupPages);

    const nextSections = buildGroupedSections({
      column: groupColumn,
      groupBy: currentGroupBy,
      summaries,
      tasks: tasksRef.current,
      collapsedGroups: collapsedGroupsRef.current,
      groupPages: nextGroupPages,
      revealedGroupKeys: revealedGroupKeysRef.current,
      context: groupContext,
    });
    const stillLoadingRevealed = getNextGroupToLoad(nextSections, collapsedGroupsRef.current);
    const orderedKeys = collectOrderedGroupKeys({
      column: groupColumn,
      direction: currentGroupBy?.direction ?? 'asc',
      summaries,
      tasks: tasksRef.current,
      context: groupContext,
    });
    const hasUnrevealedGroups = hasMoreGroupsToReveal(orderedKeys, revealedGroupKeysRef.current);
    const hasMore = Boolean(stillLoadingRevealed) || hasUnrevealedGroups;
    const totalCount = summaries.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);

    setTaskPagination({
      page: pagination.page ?? page,
      totalCount,
      hasMore,
    });
  }, [
    debouncedSearchQuery,
    groupBy?.columnKey,
    groupBy?.direction,
    isCalendarLayout,
    showAssignedToMeOnly,
    showClosedOnly,
    user,
  ]);

  const handleLoadMoreTasks = useCallback(() => {
    if (!list?.id || isLoading || isLoadingMore || !taskPagination.hasMore) {
      return;
    }

    const groupedColumnKey = groupByRef.current?.columnKey;
    if (groupedColumnKey) {
      const currentListColumns = listColumnsRef.current;
      const currentGroupColumn =
        currentListColumns.find((column) => column.key === groupedColumnKey) ?? null;

      if (currentGroupColumn) {
        const groupContext = {
          statusGroups: statusGroupsRef.current,
          allStatusGroups: allStatusGroupsRef.current,
        };
        const summaries = groupSummariesRef.current;
        const revealed = revealedGroupKeysRef.current;
        const sections = buildGroupedSections({
          column: currentGroupColumn,
          groupBy: groupByRef.current,
          summaries,
          tasks: tasksRef.current,
          collapsedGroups: collapsedGroupsRef.current,
          groupPages: groupPagesRef.current,
          revealedGroupKeys: revealed,
          context: groupContext,
        });
        const nextLoadKey = getNextGroupToLoad(sections, collapsedGroupsRef.current);

        if (nextLoadKey) {
          loadTasks(list.id, { append: true, groupKey: nextLoadKey });
          return;
        }

        const orderedKeys = collectOrderedGroupKeys({
          column: currentGroupColumn,
          direction: groupByRef.current?.direction ?? 'asc',
          summaries,
          tasks: tasksRef.current,
          context: groupContext,
        });
        const nextRevealKey = getNextGroupKeyToReveal(orderedKeys, revealed);

        if (nextRevealKey) {
          const nextRevealed = [...revealed, nextRevealKey];
          revealedGroupKeysRef.current = nextRevealed;
          setRevealedGroupKeys(nextRevealed);
          loadTasks(list.id, { append: true, groupKey: nextRevealKey });
          return;
        }
      }
    }

    loadTasks(list.id, { append: true });
  }, [isLoading, isLoadingMore, list?.id, loadTasks, taskPagination.hasMore]);

  const [tasksScrollContainer, setTasksScrollContainer] = useState(null);

  useEffect(() => {
    const container = isCalendarLayout
      ? calendarScrollRef.current
      : isGrouped
        ? groupedScrollRef.current
        : useFlatTableBody
          ? tableScrollRef.current
          : !isTableLayout && !isCalendarLayout
            ? listScrollRef.current
            : groupedScrollRef.current;

    setTasksScrollContainer(container);
  }, [
    isCalendarLayout,
    isGrouped,
    isTableLayout,
    isLoading,
    isLoadingMore,
    taskPagination.hasMore,
    tasks.length,
    useFlatTableBody,
  ]);

  const { sentinelRef: taskPaginationSentinelRef } = useScrollPagination({
    onLoadMore: handleLoadMoreTasks,
    hasMore: taskPagination.hasMore,
    isLoading: isLoadingMore,
    scrollContainer: tasksScrollContainer,
    enabled: Boolean(list?.id) && taskPagination.hasMore,
  });

  const renderTaskPaginationFooter = useCallback(
    (className) => (
      <ListTasksPaginationFooter
        hasMore={taskPagination.hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMoreTasks}
        sentinelRef={taskPaginationSentinelRef}
        className={className}
      />
    ),
    [handleLoadMoreTasks, isLoadingMore, taskPagination.hasMore, taskPaginationSentinelRef],
  );

  const handleTaskDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      if (columnSortRef.current.length > 0) {
        setColumnSort([]);
        columnSortRef.current = [];
        if (list?.id) {
          cacheColumnSettings({ columnSort: [] });
          persistColumnSettings(settingsScopeId, { columnSort: [] });
        }
      }

      const currentVisibleIds = visibleTasks.map((task) => task.id);
      const oldIndex = currentVisibleIds.indexOf(active.id);
      const newIndex = currentVisibleIds.indexOf(over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const newVisibleIds = arrayMove(currentVisibleIds, oldIndex, newIndex);
      const nextTasks = reorderFullTasks(tasks, newVisibleIds, active.id);

      setTasks(nextTasks);

      const result = await reorderTasks(nextTasks.map((task) => task.id));

      if (result?.error) {
        showErrorToast(result.error);
        loadTasks(list?.id);
      }
    },
    [list?.id, loadTasks, persistColumnSettings, tasks, visibleTasks],
  );

  const handleColumnSortClick = useCallback(
    (columnKey) => (event) => {
      setColumnSort((previous) => {
        const next = toggleColumnSort(previous, columnKey, { multi: event.shiftKey });
        const normalized = normalizeColumnSort(next, listColumns);
        columnSortRef.current = normalized;

        if (list?.id) {
          cacheColumnSettings({ columnSort: normalized });
          persistColumnSettings(settingsScopeId, { columnSort: normalized });
        }

        return normalized;
      });
    },
    [list?.id, listColumns, persistColumnSettings],
  );

  const handleOpenColumnMenu = useCallback((columnKey, event) => {
    if (columnKey === 'title') {
      return;
    }

    columnMenuAnchorRef.current = event.currentTarget;
    setOpenColumnMenuKey(columnKey);
  }, []);

  const handleCloseColumnMenu = useCallback(() => {
    setOpenColumnMenuKey(null);
    columnMenuAnchorRef.current = null;
  }, []);

  const openColumnMenuColumn = useMemo(
    () => listColumns.find((column) => column.key === openColumnMenuKey) ?? null,
    [listColumns, openColumnMenuKey],
  );

  const openCalculateColumn = useMemo(
    () => listColumns.find((column) => column.key === openCalculateColumnKey) ?? null,
    [listColumns, openCalculateColumnKey],
  );

  const columnMenuMoveState = useMemo(() => {
    if (!openColumnMenuKey) {
      return { canMoveLeft: false, canMoveRight: false };
    }

    const order = columnOrder.length > 0 ? columnOrder : listColumns.map((column) => column.key);
    const index = order.indexOf(openColumnMenuKey);

    if (index === -1) {
      return { canMoveLeft: false, canMoveRight: false };
    }

    return {
      canMoveLeft: index > 1,
      canMoveRight: index >= 1 && index < order.length - 1,
    };
  }, [columnOrder, listColumns, openColumnMenuKey]);

  const persistColumnOrder = useCallback(
    (nextOrder) => {
      const normalizedOrder = ensurePinnedFirstColumnOrder(nextOrder);
      columnOrderRef.current = normalizedOrder;

      if (list?.id) {
        cacheColumnSettings({ columnOrder: normalizedOrder });
        persistColumnSettings(settingsScopeId, { columnOrder: normalizedOrder });
      }
    },
    [cacheColumnSettings, list?.id, persistColumnSettings, settingsScopeId],
  );

  const handleColumnMenuSort = useCallback(() => {
    if (!openColumnMenuKey) {
      return;
    }

    setColumnSort((previous) => {
      const next = toggleColumnSort(previous, openColumnMenuKey, { multi: false });
      const normalized = normalizeColumnSort(next, listColumns);
      columnSortRef.current = normalized;

      if (list?.id) {
        cacheColumnSettings({ columnSort: normalized });
        persistColumnSettings(settingsScopeId, { columnSort: normalized });
      }

      return normalized;
    });
  }, [list?.id, listColumns, openColumnMenuKey, persistColumnSettings]);

  const handleColumnMenuGroup = useCallback(() => {
    if (!openColumnMenuKey) {
      return;
    }

    setGroupBy((previous) => {
      const next =
        previous?.columnKey === openColumnMenuKey
          ? null
          : { columnKey: openColumnMenuKey, direction: 'asc' };

      persistColumnSettings(settingsScopeId, { groupBy: next });
      return next;
    });
  }, [openColumnMenuKey, persistColumnSettings, settingsScopeId]);

  const handleCloseCalculateMenu = useCallback(() => {
    setOpenCalculateColumnKey(null);
    calculateMenuAnchorRef.current = null;
  }, []);

  const handleColumnMenuCalculate = useCallback(() => {
    if (!openColumnMenuKey) {
      return;
    }

    calculateMenuAnchorRef.current = columnMenuAnchorRef.current;
    setOpenCalculateColumnKey(openColumnMenuKey);
  }, [openColumnMenuKey]);

  const handleApplyColumnCalculation = useCallback(
    (selection) => {
      if (!openCalculateColumnKey || !selection?.type) {
        return;
      }

      setColumnCalculations((previous) => ({
        ...previous,
        [openCalculateColumnKey]: {
          type: selection.type,
          label: selection.label,
        },
      }));
    },
    [openCalculateColumnKey],
  );

  const handleColumnMenuMove = useCallback(
    (direction) => {
      if (!openColumnMenuKey) {
        return;
      }

      setColumnOrder((previous) => {
        const order = previous.length > 0 ? previous : listColumns.map((column) => column.key);
        const index = order.indexOf(openColumnMenuKey);

        if (index === -1) {
          return previous;
        }

        const newIndex = direction === 'left' ? index - 1 : index + 1;

        if (newIndex < 1 || newIndex >= order.length) {
          return previous;
        }

        const next = arrayMove(order, index, newIndex);
        persistColumnOrder(next);
        return next;
      });
    },
    [listColumns, openColumnMenuKey, persistColumnOrder],
  );

  const handleColumnDragStart = useCallback((event) => {
    setActiveColumnKey(event.active.id);
  }, []);

  const handleColumnDragOver = useCallback((event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    if (active.id === PINNED_FIRST_COLUMN_KEY || over.id === PINNED_FIRST_COLUMN_KEY) {
      return;
    }

    setColumnOrder((previous) => {
      const oldIndex = previous.indexOf(active.id);
      const newIndex = previous.indexOf(over.id);

      if (oldIndex <= 0 || newIndex <= 0 || oldIndex === -1 || newIndex === -1) {
        return previous;
      }

      const next = ensurePinnedFirstColumnOrder(arrayMove(previous, oldIndex, newIndex));
      columnOrderRef.current = next;
      return next;
    });
  }, []);

  const handleColumnDragEnd = useCallback(() => {
    setActiveColumnKey(null);

    if (list?.id && columnOrderRef.current.length > 0) {
      const normalizedOrder = ensurePinnedFirstColumnOrder(columnOrderRef.current);
      columnOrderRef.current = normalizedOrder;
      cacheColumnSettings({ columnOrder: normalizedOrder });
      persistColumnSettings(settingsScopeId, { columnOrder: normalizedOrder });
    }
  }, [list?.id, persistColumnSettings]);

  const handleColumnDragCancel = useCallback(() => {
    setActiveColumnKey(null);
  }, []);

  const handleColumnResizeStart = useCallback(
    (columnKey, event) => {
      if (!isTableLayout) {
        return;
      }

      const column = listColumns.find((entry) => entry.key === columnKey);

      if (!column) {
        return;
      }

      const startX = event.clientX;
      const startWidth = getTableColumnWidthPx(column, columnWidthsRef.current);
      let latestWidths = null;

      setResizingColumnKey(columnKey);

      const previousUserSelect = document.body.style.userSelect;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handlePointerMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(
          TABLE_COLUMN_MIN_WIDTH,
          Math.min(TABLE_COLUMN_MAX_WIDTH, startWidth + delta),
        );

        setColumnWidths((previous) => {
          latestWidths = {
            ...previous,
            [columnKey]: nextWidth,
          };
          return latestWidths;
        });
      };

      const handlePointerUp = () => {
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = previousCursor;
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        setResizingColumnKey(null);

        if (latestWidths) {
          cacheColumnSettings({ columnWidths: latestWidths });
          persistColumnSettings(settingsScopeId, { columnWidths: latestWidths });
        }
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [cacheColumnSettings, isTableLayout, listColumns, persistColumnSettings, settingsScopeId],
  );

  const renderTableSheetHeader = useCallback(
    ({
      sticky = false,
      scopeTasks = visibleTasks,
      onToggleSelectAll = handleToggleSelectAll,
    } = {}) => {
      const scopeIds = scopeTasks.map((task) => task.id);
      const allScopeSelected =
        scopeIds.length > 0 && scopeIds.every((id) => selectedTaskIdSet.has(id));
      const someScopeSelected =
        scopeIds.some((id) => selectedTaskIdSet.has(id)) && !allScopeSelected;

      return (
        <div
          className={cn(
            'grid shrink-0 border-b border-stroke-soft-200 bg-bg-weak-100',
            sticky && 'sticky top-0 z-20',
          )}
          style={getListTableRowStyle()}
        >
          <TableIndexHeader
            allVisibleSelected={allScopeSelected}
            someVisibleSelected={someScopeSelected}
            visibleTasksCount={scopeIds.length}
            onToggleSelectAll={onToggleSelectAll}
          />

          <SortableContext items={sortableColumnKeys} strategy={horizontalListSortingStrategy}>
            {listColumns.map((column) => {
              const { direction: sortDirection, priority: sortPriority } = getColumnSortState(
                columnSort,
                column.key,
              );

              const headerProps = {
                column,
                isTableLayout: true,
                showSelectAll: false,
                allVisibleSelected: allScopeSelected,
                someVisibleSelected: someScopeSelected,
                visibleTasksCount: scopeIds.length,
                onToggleSelectAll,
                sortDirection,
                sortPriority,
                onSortClick: handleColumnSortClick(column.key),
                onOpenMenu:
                  column.key === PINNED_FIRST_COLUMN_KEY
                    ? null
                    : (event) => handleOpenColumnMenu(column.key, event),
                onResizeStart: handleColumnResizeStart,
                isResizing: resizingColumnKey === column.key,
              };

              if (column.key === PINNED_FIRST_COLUMN_KEY) {
                return <PinnedColumnHeader key={column.key} {...headerProps} />;
              }

              return <SortableColumnHeader key={column.key} {...headerProps} />;
            })}
          </SortableContext>

          <div className={TABLE_FILLER_HEADER_CLASS} />

          <div className={getTableActionsCellClass(true)}>
            <button
              type='button'
              aria-label='Add custom field'
              onClick={() => setIsCustomFieldsDrawerOpen(true)}
              className='flex h-5 w-5 items-center justify-center rounded-full border border-stroke-soft-200 bg-white transition hover:bg-bg-weak-50'
            >
              <RiAddLine size={12} />
            </button>
          </div>
        </div>
      );
    },
    [
      sortableColumnKeys,
      columnSort,
      handleColumnResizeStart,
      handleColumnSortClick,
      handleOpenColumnMenu,
      handleToggleSelectAll,
      listColumns,
      resizingColumnKey,
      selectedTaskIdSet,
      visibleTasks,
    ],
  );

  useEffect(() => {
    loadTasks(list?.id);
    setSelectedTaskIds([]);
    setIsTableInlineCreateOpen(false);
    setOpenTableCreateGroupKey(null);
    setErpValuesByLink({});
  }, [list?.id, loadTasks]);

  useEffect(() => {
    const erpColumns = collectVisibleErpColumns(customColumns);
    const links = collectErpLinksFromTasks(tasks);

    if (erpColumns.length === 0 || links.length === 0) {
      setErpValuesByLink({});
      return;
    }

    let isCancelled = false;

    resolveErpColumnValues({ links, columns: erpColumns }).then((result) => {
      if (isCancelled) {
        return;
      }

      if (result.error) {
        return;
      }

      setErpValuesByLink(result.data ?? {});
    });

    return () => {
      isCancelled = true;
    };
  }, [customColumns, tasks]);

  useEffect(() => {
    setIsTableInlineCreateOpen(false);
    setOpenTableCreateGroupKey(null);
  }, [taskView?.id]);

  useEffect(() => {
    if (!settingsScopeId || !taskView?.id) {
      return undefined;
    }

    if (lastHydratedSettingsKeyRef.current === taskViewSettingsKey) {
      return undefined;
    }

    lastHydratedSettingsKeyRef.current = taskViewSettingsKey;
    skipViewPersistRef.current = true;
    beginViewBaselineSync();

    const parsed = parseTaskViewSettings(taskView, { viewType: taskView?.viewType });
    clearViewSettingsCache(settingsScopeId);

    applyViewSettings(parsed, { writeCache: false });
    justHydratedRef.current = true;
    hydratedViewIdRef.current = settingsScopeId;

    if (hasStoredViewColumnSettings(taskView) || !list?.id || !taskView?.isDefault) {
      commitHydrationBaseline();
      return undefined;
    }

    let cancelled = false;

    const hydrateLegacyListSettings = async () => {
      const legacyLocal = loadViewColumnSettingsFromList(list.id);
      const result = await getListColumnSettings(list.id);

      if (cancelled) {
        return;
      }

      const remote = result.error || !result.data ? {} : result.data;
      const migrated = {
        ...parsed,
        customColumns: remote.customColumns?.length
          ? normalizeCustomColumns(remote.customColumns)
          : legacyLocal.customColumns,
        standardVisibility: {
          ...parsed.standardVisibility,
          ...(remote.standardVisibility ?? legacyLocal.standardVisibility),
        },
        columnOrder: remote.columnOrder?.length
          ? remote.columnOrder
          : legacyLocal.columnOrder?.length
            ? legacyLocal.columnOrder
            : parsed.columnOrder,
        columnSort: remote.columnSort?.length
          ? remote.columnSort
          : legacyLocal.columnSort?.length
            ? legacyLocal.columnSort
            : parsed.columnSort,
      };

      const hasLegacyData =
        migrated.customColumns.length > 0 ||
        migrated.columnOrder.length > 0 ||
        Object.keys(migrated.standardVisibility).length > 0 ||
        migrated.columnSort.length > 0;

      if (hasLegacyData) {
        applyViewSettings(migrated);
        if (isAutosaveEnabled) {
          // Legacy list column settings were previously shared; keep that migration path for all.
          await persistTaskViewSettings(settingsScopeId, migrated, {
            scope: VIEW_SAVE_SCOPES.ALL,
          });
        }
      }

      if (!cancelled) {
        commitHydrationBaseline();
      }
    };

    hydrateLegacyListSettings();

    return () => {
      cancelled = true;
    };
  }, [
    applyViewSettings,
    beginViewBaselineSync,
    commitHydrationBaseline,
    isAutosaveEnabled,
    list?.id,
    settingsScopeId,
    taskView?.id,
    taskView?.isDefault,
    taskViewSettingsKey,
  ]);

  useEffect(() => {
    setColumnOrder((previous) => {
      const next = reconcileColumnOrder(previous, baseListColumns);
      if (columnKeysEqual(previous, next)) {
        return previous;
      }

      columnOrderRef.current = next;
      return next;
    });

    setColumnSort((previous) => {
      const next = normalizeColumnSort(previous, baseListColumns);
      if (columnSortEqual(previous, next)) {
        return previous;
      }

      columnSortRef.current = next;
      return next;
    });

    if (!justHydratedRef.current) {
      return;
    }

    justHydratedRef.current = false;
    commitHydrationBaseline();
  }, [baseListColumns, commitHydrationBaseline]);

  useEffect(() => {
    setSearchQuery('');
    setCollapsedGroups({});
    setOpenCalculateColumnKey(null);
  }, [list?.id]);

  useEffect(() => {
    if (!useViewSettings || !settingsScopeId || !isAutosaveEnabled) {
      return undefined;
    }

    if (skipViewPersistRef.current || hydratedViewIdRef.current !== settingsScopeId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (skipViewPersistRef.current || hydratedViewIdRef.current !== settingsScopeId) {
        return;
      }

      const payload = buildCurrentViewSettings();

      persistTaskViewSettings(settingsScopeId, payload, {
        scope: VIEW_SAVE_SCOPES.ME,
      }).then((result) => {
        if (!result?.error) {
          commitSavedBaseline(payload);
          saveViewSettingsToCache(settingsScopeId, payload);
          lastHydratedSettingsKeyRef.current = getViewSettingsKeyForScope(settingsScopeId, payload);
          onViewSettingsPersisted?.(settingsScopeId, payload, {
            scope: VIEW_SAVE_SCOPES.ME,
            isPersonal: true,
          });
        }
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    buildCurrentViewSettings,
    commitSavedBaseline,
    columnCalculations,
    columnOrder,
    columnSort,
    columnWidths,
    customColumns,
    fieldFilters,
    frozenColumns,
    groupBy,
    isAutosaveEnabled,
    isTableLayout,
    settingsScopeId,
    showAssignedToMeOnly,
    showClosedOnly,
    standardColumnVisibility,
    calendarDateField,
    calendarLayoutMode,
    useViewSettings,
    onViewSettingsPersisted,
  ]);

  const handleCalendarDateFieldChange = useCallback((value) => {
    setCalendarDateField(normalizeBoardCalendarDateField(value));
  }, []);

  const handleCalendarLayoutModeChange = useCallback((value) => {
    setCalendarLayoutMode(normalizeBoardCalendarLayoutMode(value));
  }, []);

  useEffect(() => {
    setCollapsedGroups({});
    setRevealedGroupKeys([]);
    revealedGroupKeysRef.current = [];
  }, [groupBy?.columnKey, groupBy?.direction]);

  const handleOpenCreateTask = () => {
    setIsCreateTaskDrawerOpen(true);
  };

  const handleOpenSystemListModal = () => {
    setIsSystemListModalOpen(true);
  };

  const setTaskParam = useCallback(
    (taskId) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          if (taskId) {
            next.set(TASK_QUERY_PARAM, taskId);
          } else {
            next.delete(TASK_QUERY_PARAM);
          }

          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  // The opened task lives in the URL (`?task=<id>`) so it can be shared and
  // restored on reload / back-forward navigation. The drawer state below mirrors
  // this query param.
  const taskParam = searchParams.get(TASK_QUERY_PARAM);

  useEffect(() => {
    if (taskParam) {
      setSelectedTaskId(taskParam);
      setIsTaskViewDrawerOpen(true);
      setOpenTaskMenuId(null);
      setEditingTaskId(null);
    } else {
      setIsTaskViewDrawerOpen(false);
      setSelectedTaskId(null);
    }
  }, [taskParam]);

  const handleOpenTaskView = useCallback(
    (taskId) => {
      setOpenTaskMenuId(null);
      setEditingTaskId(null);
      setTaskParam(taskId);
    },
    [setTaskParam],
  );

  const handleTaskViewDrawerChange = useCallback(
    (open) => {
      if (!open) {
        setTaskParam(null);
      }
    },
    [setTaskParam],
  );

  const handleTaskViewNavigate = useCallback(
    (nextTaskId) => {
      if (nextTaskId) {
        setTaskParam(nextTaskId);
      }
    },
    [setTaskParam],
  );

  const notifyFavoriteTaskStatusChange = useCallback(
    (taskId, statusId) => {
      if (!taskId || !onFavoriteTasksChange) {
        return;
      }

      const nextStatus = String(statusId ?? '').trim();
      if (!nextStatus) {
        return;
      }

      const option =
        findBoardStatusOption(statusGroups, nextStatus) ??
        findBoardStatusOption(allStatusGroups, nextStatus);
      const category = option?.category ?? '';

      onFavoriteTasksChange({
        taskId,
        status: nextStatus,
        statusColor: option?.color ?? '',
        statusCategory: category,
        statusTitle: option?.label ?? '',
        isClosed: resolveIsClosedFromStatusOption(option),
      });
    },
    [allStatusGroups, onFavoriteTasksChange, statusGroups],
  );

  const handleTaskViewUpdated = useCallback(
    (updatedListTask) => {
      if (!updatedListTask?.id) {
        return;
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === updatedListTask.id ? { ...item, ...updatedListTask } : item,
        ),
      );

      if (updatedListTask.status) {
        notifyFavoriteTaskStatusChange(updatedListTask.id, updatedListTask.status);
      }
    },
    [notifyFavoriteTaskStatusChange],
  );

  const handleAddColumn = () => {
    setOpenTaskMenuId(null);
    setIsCustomFieldsDrawerOpen(true);
  };

  const handleCustomFieldCreate = useCallback(
    async (form) => {
      if (!form?.type) {
        return;
      }

      const fieldDefinition = buildCustomFieldDefinition(form);
      const nextColumn = createCustomColumnFromField(fieldDefinition);

      setCustomColumns((previous) => {
        const nextColumns = [...previous, nextColumn];
        const nextOrder = [...columnOrderRef.current, nextColumn.key];

        cacheColumnSettings({ customColumns: nextColumns, columnOrder: nextOrder });
        columnOrderRef.current = nextOrder;
        persistColumnSettings(settingsScopeId, {
          customColumns: nextColumns,
          columnOrder: nextOrder,
        });

        setColumnOrder(nextOrder);
        return nextColumns;
      });

      const defaultValue = getDefaultValueForFieldType(
        fieldDefinition.type,
        fieldDefinition.config?.defaultValue,
      );
      const hasDefaultValue =
        defaultValue !== '' &&
        defaultValue !== false &&
        !(Array.isArray(defaultValue) && defaultValue.length === 0);

      if (hasDefaultValue && tasks.length > 0) {
        const updates = tasks.map(async (task) => {
          const previousCustomFields = task.customFields ?? {};

          if (
            previousCustomFields[fieldDefinition.id] != null &&
            previousCustomFields[fieldDefinition.id] !== ''
          ) {
            return null;
          }

          const nextCustomFields = {
            ...previousCustomFields,
            [fieldDefinition.id]: defaultValue,
          };

          const result = await updateBoardTask({
            taskId: task.id,
            data: buildCustomFieldsUpdatePayload(nextCustomFields),
          });

          if (result.error) {
            return { error: result.error, taskId: task.id };
          }

          return { taskId: task.id, customFields: nextCustomFields };
        });

        const results = await Promise.all(updates);
        const successes = results.filter((result) => result?.taskId && result?.customFields);
        const failures = results.filter((result) => result?.error != null);

        if (successes.length > 0) {
          const successByTaskId = new Map(
            successes.map((item) => [item.taskId, item.customFields]),
          );
          setTasks((previous) =>
            previous.map((task) => {
              const nextCustomFields = successByTaskId.get(task.id);
              if (!nextCustomFields) {
                return task;
              }
              return { ...task, customFields: nextCustomFields };
            }),
          );
        }

        if (failures.length > 0) {
          // Partial success is expected — we still apply the successful backfills above.
          showErrorToast(failures[0].error);
        }
      }

      setIsCustomFieldsDrawerOpen(false);
    },
    [list?.id, tasks, persistColumnSettings],
  );

  const handleStandardFieldToggle = useCallback(
    (fieldId) => {
      setStandardColumnVisibility((previous) => {
        const currentField = createStandardFieldsState(previous).find(
          (field) => field.id === fieldId,
        );

        if (!currentField) {
          return previous;
        }

        const next = { ...previous, [fieldId]: !currentField.visible };
        cacheColumnSettings({ standardVisibility: next });
        persistColumnSettings(settingsScopeId, { standardVisibility: next });
        return next;
      });
    },
    [list?.id, persistColumnSettings],
  );

  const handleStandardHideAll = useCallback(() => {
    setStandardColumnVisibility((previous) => {
      const next = createStandardFieldsState(previous).reduce(
        (accumulator, field) => {
          accumulator[field.id] = false;
          return accumulator;
        },
        { ...previous },
      );
      cacheColumnSettings({ standardVisibility: next });
      persistColumnSettings(settingsScopeId, { standardVisibility: next });
      return next;
    });
  }, [list?.id, persistColumnSettings]);

  const handleCustomFieldToggle = useCallback(
    (fieldId) => {
      setCustomColumns((previous) => {
        const next = previous.map((column) => {
          if ((column.fieldId ?? column.key) !== fieldId) {
            return column;
          }

          const isVisible = column.visible !== false;
          return { ...column, visible: !isVisible };
        });

        cacheColumnSettings({ customColumns: next });
        persistColumnSettings(settingsScopeId, { customColumns: next });
        return next;
      });
    },
    [list?.id, persistColumnSettings],
  );

  const handleCustomHideAll = useCallback(() => {
    setCustomColumns((previous) => {
      const next = previous.map((column) =>
        isErpColumn(column) ? column : { ...column, visible: false },
      );
      cacheColumnSettings({ customColumns: next });
      persistColumnSettings(settingsScopeId, { customColumns: next });
      return next;
    });
  }, [list?.id, persistColumnSettings]);

  const resolveErpFieldLabel = useCallback(async (moduleId, fieldId) => {
    const result = await getSystemListPrimaryColumns(moduleId);
    const apiLabel = (result.data ?? []).find((column) => column.id === fieldId)?.label;
    if (apiLabel) {
      return apiLabel;
    }

    return (
      getSystemListFallbackColumns(moduleId).find((column) => column.value === fieldId)?.label ||
      fieldId
    );
  }, []);

  const handleErpFieldToggle = useCallback(
    async (moduleId, fieldId, label) => {
      if (!moduleId || !fieldId) {
        return;
      }

      const columnKey = getErpColumnKey(moduleId, fieldId);
      const existing = customColumnsRef.current.find((column) => column.key === columnKey);

      if (existing) {
        setCustomColumns((previous) => {
          const next = previous.map((column) => {
            if (column.key !== columnKey) {
              return column;
            }

            return { ...column, visible: column.visible === false };
          });

          cacheColumnSettings({ customColumns: next });
          persistColumnSettings(settingsScopeId, { customColumns: next });
          return next;
        });
        return;
      }

      const resolvedLabel = label || (await resolveErpFieldLabel(moduleId, fieldId));
      const nextColumn = createErpColumn({
        moduleId,
        moduleLabel: getErpModuleLabel(moduleId),
        fieldId,
        label: resolvedLabel,
      });

      setCustomColumns((previous) => {
        const nextColumns = [...previous, nextColumn];
        const nextOrder = [...columnOrderRef.current, nextColumn.key];

        cacheColumnSettings({ customColumns: nextColumns, columnOrder: nextOrder });
        columnOrderRef.current = nextOrder;
        persistColumnSettings(settingsScopeId, {
          customColumns: nextColumns,
          columnOrder: nextOrder,
        });
        setColumnOrder(nextOrder);
        return nextColumns;
      });
    },
    [list?.id, persistColumnSettings, resolveErpFieldLabel],
  );

  const handleErpHideAll = useCallback(
    (moduleId) => {
      if (!moduleId) {
        return;
      }

      setCustomColumns((previous) => {
        const next = previous.map((column) =>
          isErpColumn(column) && column.moduleId === moduleId
            ? { ...column, visible: false }
            : column,
        );
        cacheColumnSettings({ customColumns: next });
        persistColumnSettings(settingsScopeId, { customColumns: next });
        return next;
      });
    },
    [list?.id, persistColumnSettings],
  );

  const handleColumnMenuHide = useCallback(() => {
    if (!openColumnMenuColumn) {
      return;
    }

    if (isErpColumn(openColumnMenuColumn)) {
      handleErpFieldToggle(openColumnMenuColumn.moduleId, openColumnMenuColumn.fieldId);
      return;
    }

    if (openColumnMenuColumn.custom) {
      handleCustomFieldToggle(openColumnMenuColumn.fieldId ?? openColumnMenuColumn.key);
      return;
    }

    if (openColumnMenuColumn.standardFieldId) {
      handleStandardFieldToggle(openColumnMenuColumn.standardFieldId);
    }
  }, [
    handleCustomFieldToggle,
    handleErpFieldToggle,
    handleStandardFieldToggle,
    openColumnMenuColumn,
  ]);

  const handleTaskCreated = useCallback(
    (rawTask) => {
      if (!list?.id) {
        return;
      }

      if (!rawTask || typeof rawTask !== 'object') {
        loadTasks(list.id);
        return;
      }

      const normalized = normalizeListTask(rawTask);
      if (!normalized.id) {
        loadTasks(list.id);
        return;
      }

      if (normalized.listId && normalized.listId !== list.id) {
        loadTasks(list.id);
        return;
      }

      let addedNew = false;
      setTasks((previous) => {
        const exists = previous.some((task) => task.id === normalized.id);
        if (exists) {
          return previous.map((task) =>
            task.id === normalized.id ? { ...task, ...normalized } : task,
          );
        }

        addedNew = true;
        return [...previous, normalized];
      });

      if (addedNew) {
        setTaskPagination((pagination) => ({
          ...pagination,
          totalCount: (pagination.totalCount ?? 0) + 1,
        }));

        if (groupColumn) {
          const createdGroupKey = getTaskGroupKey(normalized, groupColumn);
          setGroupSummaries((previous) => {
            const exists = previous.some((entry) => entry.key === createdGroupKey);
            const next = exists
              ? previous.map((entry) =>
                  entry.key === createdGroupKey
                    ? { ...entry, count: (Number(entry.count) || 0) + 1 }
                    : entry,
                )
              : [...previous, { key: createdGroupKey, count: 1 }];
            groupSummariesRef.current = next;
            return next;
          });
        }
      }
    },
    [groupColumn, list?.id, loadTasks],
  );

  const handleTaskMoved = () => {
    setOpenTaskMenuId(null);
    loadTasks(list?.id);
  };

  const handleTaskAdded = () => {
    setOpenTaskMenuId(null);
    loadTasks(list?.id);
  };

  const handleDuplicateTask = useCallback(
    async (taskId) => {
      if (!list?.id) {
        showErrorToast('List is required.');
        return;
      }

      setOpenTaskMenuId(null);

      const result = await duplicateBoardTask({
        taskId,
        listId: list.id,
      });

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast('Task duplicated');
      handleTaskCreated(result.data);
    },
    [handleTaskCreated, list?.id],
  );

  const handleArchiveTask = useCallback(
    async (taskId) => {
      setOpenTaskMenuId(null);

      const task = tasks.find((item) => item.id === taskId);
      const result = await archiveBoardTask({ taskId });

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, isArchived: true } : item)),
      );

      if (task?.isFavorite) {
        onFavoriteTasksChange?.();
      }
    },
    [onFavoriteTasksChange, tasks],
  );

  const handleFavoriteTask = useCallback(
    async (taskId) => {
      setOpenTaskMenuId(null);

      const task = tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      const nextFavorite = !task.isFavorite;
      const result = await updateTaskFavorite({ taskId, isFavorite: nextFavorite });

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, isFavorite: nextFavorite } : item)),
      );
      showSuccessToast(nextFavorite ? 'Task added to favorites' : 'Task removed from favorites');
      onFavoriteTasksChange?.();
    },
    [onFavoriteTasksChange, tasks],
  );

  const handleUnfollowTask = useCallback(async (taskId) => {
    setOpenTaskMenuId(null);
    if (!taskId) return;

    const result = await unfollowBoardTask(taskId);
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast('Unfollowed task');
  }, []);

  const handleRemindInbox = useCallback(async (taskId, remindAt) => {
    setOpenTaskMenuId(null);
    if (!taskId || !remindAt) return;

    const result = await createInboxReminder(taskId, remindAt);
    if (result.error) {
      showErrorToast(result.error);
      return;
    }
    showSuccessToast('Reminder set');
  }, []);

  const handleRequestDeleteTask = useCallback(
    (taskId) => {
      setOpenTaskMenuId(null);
      const task = tasks.find((item) => item.id === taskId);
      setTaskPendingDelete(task ?? { id: taskId, title: 'Untitled' });
    },
    [tasks],
  );

  const handleConfirmDeleteTask = useCallback(async () => {
    const taskId = taskPendingDelete?.id;

    if (!taskId || isDeletingTask) {
      return;
    }

    setIsDeletingTask(true);

    const result = await deleteBoardTask({ taskId });

    setIsDeletingTask(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    setTaskPendingDelete(null);
    setTasks((previous) => previous.filter((item) => item.id !== taskId));
    showSuccessToast('Task deleted');

    if (taskPendingDelete?.isFavorite) {
      onFavoriteTasksChange?.();
    }
  }, [isDeletingTask, onFavoriteTasksChange, taskPendingDelete]);

  const handleStartRename = useCallback((taskId) => {
    setOpenTaskMenuId(null);
    setEditingTaskId(taskId);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  const handleSaveTaskTitle = useCallback(
    async (taskId, title) => {
      const task = tasks.find((item) => item.id === taskId);
      const originalTitle = (task?.title || '').trim();
      const nextTitle = String(title ?? '').trim();

      if (!nextTitle || nextTitle === originalTitle) {
        setEditingTaskId(null);
        return;
      }

      setSavingCell({ taskId, fieldKey: 'title' });

      const result = await updateBoardTask({
        taskId,
        data: buildTaskFieldUpdatePayload('title', nextTitle),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        setEditingTaskId(null);
        return;
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, title: nextTitle } : item)),
      );
      setEditingTaskId(null);
    },
    [tasks],
  );

  const handleSaveTaskAssignees = useCallback(
    async (taskId, assigneeIds) => {
      const task = tasks.find((item) => item.id === taskId);
      const previousIds = (task?.assignees ?? []).map(String).filter(Boolean).sort().join(',');
      const nextIds = (assigneeIds ?? []).map(String).filter(Boolean).sort().join(',');

      if (previousIds === nextIds) {
        return;
      }

      setSavingCell({ taskId, fieldKey: 'assignee' });

      const result = await updateBoardTask({
        taskId,
        data: buildAssigneeUpdatePayload(assigneeIds),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === taskId
            ? {
                ...item,
                assignees: assigneeIds,
                assignee: assigneeIds[0] ?? '',
              }
            : item,
        ),
      );
    },
    [tasks],
  );

  const handleSaveTaskDueDate = useCallback(
    async (taskId, dueDate) => {
      const task = tasks.find((item) => item.id === taskId);
      const previousDueDate = (task?.dueDate ?? '').trim();
      const nextDueDate = (dueDate ?? '').trim();

      if (previousDueDate === nextDueDate) {
        return;
      }

      setSavingCell({ taskId, fieldKey: 'dueDate' });

      const result = await updateBoardTask({
        taskId,
        data: buildDueDateUpdatePayload(nextDueDate),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, dueDate: nextDueDate } : item)),
      );
    },
    [tasks],
  );

  const handleCalendarTaskDrop = useCallback(
    async (task, update) => {
      if (!task?.id || !update?.fieldKey || !update?.payload) {
        return;
      }

      const taskId = task.id;
      const { fieldKey, value, payload } = update;
      const previousValue = String(
        task?.[fieldKey] ?? (fieldKey === 'dueDate' ? task?.due_date : task?.start_date) ?? '',
      ).trim();
      const nextValue = String(value ?? '').trim();

      if (previousValue === nextValue) {
        return;
      }

      if (calendarDateField === BOARD_CALENDAR_DATE_FIELDS.CREATION && fieldKey === 'dueDate') {
        setCalendarDateField(BOARD_CALENDAR_DATE_FIELDS.DUE_DATE);
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, [fieldKey]: value } : item)),
      );

      const result = await updateBoardTask({ taskId, data: payload });

      if (result.error) {
        showErrorToast(result.error);
        setTasks((previous) =>
          previous.map((item) =>
            item.id === taskId ? { ...item, [fieldKey]: previousValue } : item,
          ),
        );
      }
    },
    [calendarDateField],
  );

  const handleSaveTaskStatus = useCallback(
    async (taskId, status) => {
      const task = tasks.find((item) => item.id === taskId);
      const previousStatus = (task?.status ?? '').trim();
      const nextStatus = String(status ?? '').trim();

      if (!nextStatus || previousStatus === nextStatus) {
        return;
      }

      const isClosed = resolveTaskIsClosedFromStatus(nextStatus, statusGroups, allStatusGroups);

      setSavingCell({ taskId, fieldKey: 'status' });

      const result = await updateBoardTask({
        taskId,
        data: buildStatusUpdatePayload(nextStatus, { isClosed }),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === taskId ? { ...item, status: nextStatus, isClosed } : item,
        ),
      );
      notifyFavoriteTaskStatusChange(taskId, nextStatus);
    },
    [allStatusGroups, notifyFavoriteTaskStatusChange, statusGroups, tasks],
  );

  const handleSaveTaskPriority = useCallback(
    async (taskId, priority) => {
      const task = tasks.find((item) => item.id === taskId);
      const previousPriority = (task?.priority ?? '').trim();
      const nextPriority = String(priority ?? '').trim();

      if (previousPriority === nextPriority) {
        return;
      }

      setSavingCell({ taskId, fieldKey: 'priority' });

      const result = await updateBoardTask({
        taskId,
        data: buildTaskFieldUpdatePayload('priority', nextPriority),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) => (item.id === taskId ? { ...item, priority: nextPriority } : item)),
      );
    },
    [tasks],
  );

  const handleSaveCustomField = useCallback(
    async (taskId, fieldKey, value) => {
      const task = tasks.find((item) => item.id === taskId);
      const column = listColumns.find((item) => item.key === fieldKey);
      const validationError = validateCustomFieldValue(column?.fieldType, value, column);

      if (validationError) {
        showErrorToast(validationError);
        return;
      }

      const normalizedValue = normalizeCustomFieldValue(column?.fieldType, value);
      const previousCustomFields = task?.customFields ?? {};
      const nextCustomFields = {
        ...previousCustomFields,
        [fieldKey]: normalizedValue,
      };

      if (JSON.stringify(previousCustomFields[fieldKey]) === JSON.stringify(normalizedValue)) {
        return;
      }

      setSavingCell({ taskId, fieldKey });

      const result = await updateBoardTask({
        taskId,
        data: buildCustomFieldsUpdatePayload(nextCustomFields),
      });

      setSavingCell(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === taskId ? { ...item, customFields: nextCustomFields } : item,
        ),
      );
    },
    [listColumns, tasks],
  );

  const handleSaveErpLink = useCallback(
    async (taskId, { moduleId, docname, fieldId }) => {
      const task = tasks.find((item) => item.id === taskId);
      const columnKey = getErpColumnKey(moduleId, fieldId);

      setSavingCell({ taskId, fieldKey: columnKey });

      try {
        const result = docname
          ? await linkTaskToModule({
              taskId,
              moduleId,
              docname,
              primaryColumnId: fieldId,
            })
          : await unlinkTaskModule(taskId);

        if (result.error) {
          showErrorToast(result.error);
          return;
        }

        const systemLink = result.data?.system_link;
        const previousCustomFields = task?.customFields ?? {};
        const nextCustomFields = { ...previousCustomFields };

        if (systemLink) {
          nextCustomFields._systemLink = systemLink;
        } else {
          delete nextCustomFields._systemLink;
        }

        setTasks((previous) =>
          previous.map((item) =>
            item.id === taskId
              ? { ...item, customFields: nextCustomFields, _erpFieldValues: undefined }
              : item,
          ),
        );
      } finally {
        setSavingCell(null);
      }
    },
    [tasks],
  );

  const clearSelection = useCallback(() => setSelectedTaskIds([]), []);

  const runBulkUpdate = useCallback(
    async (buildData, applyLocal) => {
      const ids = [...selectedTaskIds];
      if (ids.length === 0) {
        return;
      }

      const updatedIds = new Set();
      let firstError = null;

      for (const taskId of ids) {
        const task = tasks.find((item) => item.id === taskId);
        const data = buildData(task);
        if (!data) {
          continue;
        }
        // Run sequentially to avoid DB deadlocks when several tasks touch the
        // same child tables (e.g. assignees) within concurrent transactions.
         
        const result = await updateBoardTask({ taskId, data });
        if (result.error) {
          firstError = firstError ?? result.error;
        } else {
          updatedIds.add(taskId);
        }
      }

      if (firstError) {
        showErrorToast(firstError);
      }

      if (updatedIds.size > 0) {
        setTasks((previous) =>
          previous.map((item) => (updatedIds.has(item.id) ? applyLocal(item) : item)),
        );
      }

      return updatedIds;
    },
    [selectedTaskIds, tasks],
  );

  const handleBulkStatus = useCallback(
    async (status) => {
      const nextStatus = String(status ?? '').trim();
      if (!nextStatus) {
        return;
      }

      const isClosed = resolveTaskIsClosedFromStatus(nextStatus, statusGroups, allStatusGroups);

      const updatedIds = await runBulkUpdate(
        () => buildStatusUpdatePayload(nextStatus, { isClosed }),
        (item) => ({ ...item, status: nextStatus, isClosed }),
      );

      updatedIds?.forEach((taskId) => {
        notifyFavoriteTaskStatusChange(taskId, nextStatus);
      });
    },
    [allStatusGroups, notifyFavoriteTaskStatusChange, runBulkUpdate, statusGroups],
  );

  const handleBulkAssignees = useCallback(
    (assigneeIds) =>
      runBulkUpdate(
        () => buildAssigneeUpdatePayload(assigneeIds),
        (item) => ({ ...item, assignees: assigneeIds, assignee: assigneeIds[0] ?? '' }),
      ),
    [runBulkUpdate],
  );

  const handleBulkDueDate = useCallback(
    (dueDate) =>
      runBulkUpdate(
        () => buildDueDateUpdatePayload(dueDate),
        (item) => ({ ...item, dueDate }),
      ),
    [runBulkUpdate],
  );

  const handleBulkPriority = useCallback(
    (priority) => {
      const nextPriority = String(priority ?? '').trim();

      return runBulkUpdate(
        () => buildTaskFieldUpdatePayload('priority', nextPriority),
        (item) => ({ ...item, priority: nextPriority }),
      );
    },
    [runBulkUpdate],
  );

  const handleBulkCustomField = useCallback(
    (fieldKey, value) =>
      runBulkUpdate(
        (task) => buildCustomFieldsUpdatePayload({ ...task?.customFields, [fieldKey]: value }),
        (item) => ({
          ...item,
          customFields: { ...item.customFields, [fieldKey]: value },
        }),
      ),
    [runBulkUpdate],
  );

  const handleBulkAddTags = useCallback(
    (newTags) => {
      const additions = (Array.isArray(newTags) ? newTags : []).filter(Boolean);
      if (additions.length === 0) {
        return undefined;
      }

      const mergeTags = (existing) => {
        const merged = [...(existing ?? [])];
        const seen = new Set(merged.map((tag) => String(tag).toLowerCase()));
        additions.forEach((tag) => {
          if (!seen.has(String(tag).toLowerCase())) {
            seen.add(String(tag).toLowerCase());
            merged.push(tag);
          }
        });
        return merged;
      };

      return runBulkUpdate(
        (task) => buildTagsUpdatePayload(mergeTags(task?.tags)),
        (item) => ({ ...item, tags: mergeTags(item.tags) }),
      );
    },
    [runBulkUpdate],
  );

  const handleBulkMove = useCallback(
    async (targetListId, status, statusByTaskId = null) => {
      const ids = [...selectedTaskIds];
      if (ids.length === 0 || !targetListId) {
        return;
      }

      let firstError = null;
      const movedIds = new Set();
      const failedIds = [];
      for (const taskId of ids) {
        const resolvedStatus = statusByTaskId?.[taskId] ?? status;
         
        const result = await moveBoardTask({
          taskId,
          listId: targetListId,
          status: resolvedStatus,
        });
        if (result.error) {
          firstError = firstError ?? result.error;
          failedIds.push(taskId);
        } else {
          movedIds.add(taskId);
        }
      }

      if (movedIds.size > 0) {
        showSuccessToast(`Moved ${movedIds.size} ${movedIds.size === 1 ? 'task' : 'tasks'}`);
      }
      loadTasks(list?.id);
      if (failedIds.length > 0) {
        showErrorToast(firstError);
        setSelectedTaskIds(failedIds);
        return;
      }
      clearSelection();
    },
    [selectedTaskIds, clearSelection, loadTasks, list?.id],
  );

  const handleBulkAddToList = useCallback(
    async (targetListId, status, statusByTaskId = null) => {
      const ids = [...selectedTaskIds];
      if (ids.length === 0 || !targetListId) {
        return;
      }

      let firstError = null;
      const addedIds = new Set();
      const failedIds = [];
      for (const taskId of ids) {
        const resolvedStatus = statusByTaskId?.[taskId] ?? status;
         
        const result = await duplicateBoardTask({
          taskId,
          listId: targetListId,
          status: resolvedStatus,
        });
        if (result.error) {
          firstError = firstError ?? result.error;
          failedIds.push(taskId);
        } else {
          addedIds.add(taskId);
        }
      }

      if (addedIds.size > 0) {
        showSuccessToast(`Added ${addedIds.size} ${addedIds.size === 1 ? 'task' : 'tasks'}`);
      }
      loadTasks(list?.id);
      if (failedIds.length > 0) {
        showErrorToast(firstError);
        setSelectedTaskIds(failedIds);
        return;
      }
      clearSelection();
    },
    [selectedTaskIds, clearSelection, loadTasks, list?.id],
  );

  const handleBulkDuplicate = useCallback(async () => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0 || !list?.id) {
      return;
    }

    let firstError = null;
    for (const taskId of ids) {
       
      const result = await duplicateBoardTask({ taskId, listId: list.id });
      firstError = firstError ?? result.error;
    }

    if (firstError) {
      showErrorToast(firstError);
    } else {
      showSuccessToast(`Duplicated ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`);
    }

    clearSelection();
    loadTasks(list.id);
  }, [selectedTaskIds, clearSelection, loadTasks, list?.id]);

  const handleBulkCopy = useCallback(() => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) {
      return;
    }

    setTaskClipboard(ids, list?.id);
    showSuccessToast(
      `Copied ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} \u2014 paste with Ctrl/Cmd+V`,
    );
  }, [selectedTaskIds, list?.id]);

  const handlePasteTasks = useCallback(async () => {
    if (!list?.id) {
      return;
    }

    const clipboard = getTaskClipboard();
    const ids = clipboard?.taskIds ?? [];
    if (ids.length === 0) {
      return;
    }

    // Copied tasks can only be pasted back into the list they were copied from.
    if (clipboard.sourceListId !== list.id) {
      return;
    }

    let firstError = null;
    for (const taskId of ids) {
       
      const result = await duplicateBoardTask({ taskId, listId: list.id });
      firstError = firstError ?? result.error;
    }

    if (firstError) {
      showErrorToast(firstError);
    } else {
      showSuccessToast(`Pasted ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`);
    }

    loadTasks(list.id);
  }, [list?.id, loadTasks]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const key = event.key?.toLowerCase();
      if (key !== 'c' && key !== 'v') {
        return;
      }

      const target = event.target;
      const tagName = target?.tagName;
      const isEditable =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target?.isContentEditable;
      if (isEditable) {
        return;
      }

      if (key === 'c' && selectedTaskIds.length > 0) {
        event.preventDefault();
        handleBulkCopy();
        return;
      }

      if (key === 'v') {
        const clipboard = getTaskClipboard();
        if (clipboard?.taskIds?.length && clipboard.sourceListId === list?.id) {
          event.preventDefault();
          handlePasteTasks();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskIds, handleBulkCopy, handlePasteTasks, list?.id]);

  const handleBulkArchive = useCallback(async () => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) {
      return;
    }

    let firstError = null;
    const archivedIds = new Set();
    const failedIds = [];
    for (const taskId of ids) {
       
      const result = await archiveBoardTask({ taskId });
      firstError = firstError ?? result.error;
      if (result.error) {
        failedIds.push(taskId);
      } else {
        archivedIds.add(taskId);
      }
    }

    if (archivedIds.size > 0) {
      setTasks((previous) =>
        previous.map((item) => (archivedIds.has(item.id) ? { ...item, isArchived: true } : item)),
      );
    }

    if (failedIds.length === 0) {
      showSuccessToast(`Archived ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`);
      clearSelection();
      return;
    }

    if (archivedIds.size > 0) {
      showSuccessToast(`Archived ${archivedIds.size} ${archivedIds.size === 1 ? 'task' : 'tasks'}`);
    }
    if (firstError) {
      showErrorToast(firstError);
    }

    // Keep failed tasks selected so the user can retry.
    setSelectedTaskIds(failedIds);
  }, [selectedTaskIds, clearSelection]);

  const handleConfirmBulkDelete = useCallback(async () => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0 || isBulkDeleting) {
      return;
    }

    setIsBulkDeleting(true);
    let firstError = null;
    const deletedIds = new Set();
    const failedIds = [];
    for (const taskId of ids) {
       
      const result = await deleteBoardTask({ taskId });
      if (result.error) {
        firstError = firstError ?? result.error;
        failedIds.push(taskId);
      } else {
        deletedIds.add(taskId);
      }
    }
    setIsBulkDeleting(false);

    if (deletedIds.size > 0) {
      setTasks((previous) => previous.filter((item) => !deletedIds.has(item.id)));
    }

    setIsBulkDeleteOpen(false);

    if (failedIds.length > 0) {
      showErrorToast(firstError);
      setSelectedTaskIds(failedIds);
      if (deletedIds.size > 0) {
        showSuccessToast(`Deleted ${deletedIds.size} ${deletedIds.size === 1 ? 'task' : 'tasks'}`);
      }
      return;
    }

    clearSelection();
    showSuccessToast(`Deleted ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`);
  }, [selectedTaskIds, isBulkDeleting, clearSelection]);

  const handleToggleGroupCollapsed = useCallback(
    (groupKey) => {
      const willExpand = Boolean(collapsedGroups[groupKey]);
      setCollapsedGroups((previous) => ({
        ...previous,
        [groupKey]: !previous[groupKey],
      }));

      if (!willExpand || !list?.id || !groupColumn) {
        return;
      }

      const loadedCount = tasksRef.current.filter(
        (task) => getTaskGroupKey(task, groupColumn) === groupKey,
      ).length;
      const summary = groupSummariesRef.current.find((entry) => entry.key === groupKey);
      const totalCount = Number(summary?.count ?? 0);
      if (loadedCount === 0 && totalCount > 0) {
        loadTasks(list.id, { append: true, groupKey });
      }
    },
    [collapsedGroups, groupColumn, list?.id, loadTasks],
  );

  const calendarTaskMenuProps = useMemo(
    () => ({
      currentListId: list?.id,
      sidebarTree,
      onTaskMoved: handleTaskMoved,
      onTaskAdded: handleTaskAdded,
      onAddColumn: handleAddColumn,
      onStartRename: canEditTasks ? handleStartRename : undefined,
      onArchive: canEditTasks ? handleArchiveTask : undefined,
      onFavorite: handleFavoriteTask,
      onUnfollow: handleUnfollowTask,
      onRemindInbox: handleRemindInbox,
      onDuplicate: canCreateTasks ? handleDuplicateTask : undefined,
      onDelete: canDeleteTasks ? handleRequestDeleteTask : undefined,
    }),
    [
      handleAddColumn,
      handleArchiveTask,
      handleDuplicateTask,
      handleFavoriteTask,
      handleUnfollowTask,
      handleRemindInbox,
      handleRequestDeleteTask,
      handleStartRename,
      handleTaskAdded,
      handleTaskMoved,
      canCreateTasks,
      canDeleteTasks,
      canEditTasks,
      list?.id,
      sidebarTree,
    ],
  );

  const renderTaskRow = (task, rowIndex) => (
    <TaskRow
      key={task.id}
      task={task}
      rowIndex={rowIndex}
      columns={listColumns}
      isTableLayout={isTableLayout}
      isEditingTitle={editingTaskId === task.id}
      savingCell={savingCell}
      isSelected={selectedTaskIdSet.has(task.id)}
      onToggleSelect={handleToggleTaskSelection}
      onRowClick={handleOpenTaskView}
      onCancelRename={handleCancelRename}
      onTitleUpdate={canEditTasks ? handleSaveTaskTitle : undefined}
      onAssigneeUpdate={canEditTasks ? handleSaveTaskAssignees : undefined}
      onDueDateUpdate={canEditTasks ? handleSaveTaskDueDate : undefined}
      onStatusUpdate={canEditTasks ? handleSaveTaskStatus : undefined}
      onPriorityUpdate={canEditTasks ? handleSaveTaskPriority : undefined}
      onCustomFieldUpdate={canEditTasks ? handleSaveCustomField : undefined}
      onErpLinkUpdate={canEditTasks ? handleSaveErpLink : undefined}
      statusGroups={statusGroups}
      allStatusGroups={allStatusGroups}
      isStatusLoading={isStatusLoading}
      canEditTasks={canEditTasks}
      erpValuesByLink={erpValuesByLink}
      actionsSlot={
        <TaskRowActions
          task={task}
          currentListId={list?.id}
          sidebarTree={sidebarTree}
          statusGroups={statusGroups}
          isTableLayout={isTableLayout}
          isMenuOpen={openTaskMenuId === task.id}
          onMenuOpen={() => setOpenTaskMenuId(task.id)}
          onMenuClose={() => setOpenTaskMenuId(null)}
          onAddColumn={handleAddColumn}
          onTaskMoved={handleTaskMoved}
          onTaskAdded={handleTaskAdded}
          onStartRename={canEditTasks ? handleStartRename : undefined}
          onArchive={canEditTasks ? handleArchiveTask : undefined}
          onFavorite={handleFavoriteTask}
          onUnfollow={handleUnfollowTask}
          onRemindInbox={handleRemindInbox}
          onDuplicate={canCreateTasks ? handleDuplicateTask : undefined}
          onDelete={canDeleteTasks ? handleRequestDeleteTask : undefined}
        />
      }
    />
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ListToolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        showClosedOnly={showClosedOnly}
        onShowClosedOnlyChange={setShowClosedOnly}
        showAssignedToMeOnly={showAssignedToMeOnly}
        onShowAssignedToMeOnlyChange={setShowAssignedToMeOnly}
        onCreateTask={canCreateTasks ? handleOpenCreateTask : undefined}
        onCreateCustomList={canCreateTasks ? handleOpenCreateTask : undefined}
        onCreateSystemList={canCreateTasks ? handleOpenSystemListModal : undefined}
        canCreateTasks={canCreateTasks}
        tasks={tasks}
        columns={listColumns}
        statusOptions={statusOptions}
        fieldFilters={fieldFilters}
        onFieldFiltersChange={setFieldFilters}
        listName={list?.label || list?.title || 'tasks'}
        onOpenColumnsDrawer={handleAddColumn}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupByOptions={groupByOptions}
        saveViewSlot={
          <SaveViewMenu
            isDirty={isViewDirty}
            hasPersonalView={hasPersonalView}
            canSaveViewForAll={canSaveViewForAll}
            isAutosaveEnabled={isAutosaveEnabled}
            isSaving={isSavingView}
            onSaveForMe={() => handleSaveView({ scope: VIEW_SAVE_SCOPES.ME })}
            onSaveForAll={() => handleSaveView({ scope: VIEW_SAVE_SCOPES.ALL })}
            onResetToDefault={handleResetToDefault}
            onToggleAutosave={handleToggleAutosave}
            onSaveAsNewView={handleSaveAsNewView}
            onRevertChanges={handleRevertView}
          />
        }
      />

      <BoardTaskCreateDrawer
        open={isCreateTaskDrawerOpen}
        onOpenChange={setIsCreateTaskDrawerOpen}
        listId={list?.id}
        onSuccess={handleTaskCreated}
        statusTemplateVersion={statusTemplateVersion}
      />

      <SystemListModal
        open={isSystemListModalOpen}
        onOpenChange={setIsSystemListModalOpen}
        listId={list?.id}
        onSuccess={() => loadTasks(list?.id)}
      />

      <BoardTaskViewDrawer
        open={isTaskViewDrawerOpen}
        onOpenChange={handleTaskViewDrawerChange}
        taskId={selectedTaskId}
        tasks={visibleTasks}
        onTaskChange={handleTaskViewNavigate}
        customColumns={customColumns}
        statusGroups={statusGroups}
        allStatusGroups={allStatusGroups}
        isStatusLoading={isStatusLoading}
        onTaskUpdated={handleTaskViewUpdated}
        sidebarTree={sidebarTree}
        currentListId={list?.id ?? null}
      />

      <ListCustomFieldsDrawer
        open={isCustomFieldsDrawerOpen}
        onOpenChange={setIsCustomFieldsDrawerOpen}
        onFieldCreate={handleCustomFieldCreate}
        existingColumns={customColumns}
        standardFields={standardFields}
        onStandardFieldToggle={handleStandardFieldToggle}
        onStandardHideAll={handleStandardHideAll}
        onCustomFieldToggle={handleCustomFieldToggle}
        onCustomHideAll={handleCustomHideAll}
        onErpFieldToggle={handleErpFieldToggle}
        onErpHideAll={handleErpHideAll}
      />

      <DeleteConfirmModal
        isOpen={Boolean(taskPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingTask) {
            setTaskPendingDelete(null);
          }
        }}
        title='Delete task?'
        description={
          taskPendingDelete?.title
            ? `Are you sure you want to delete "${taskPendingDelete.title}"? This action cannot be undone.`
            : 'Are you sure you want to delete this task? This action cannot be undone.'
        }
        onConfirm={handleConfirmDeleteTask}
        isLoading={isDeletingTask}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />

      <DeleteConfirmModal
        isOpen={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) {
            setIsBulkDeleteOpen(false);
          }
        }}
        title='Delete tasks?'
        description={`Are you sure you want to delete ${selectedTaskIds.length} ${
          selectedTaskIds.length === 1 ? 'task' : 'tasks'
        }? This action cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        isLoading={isBulkDeleting}
        confirmLabel='Delete'
        loadingLabel='Deleting...'
      />

      {openColumnMenuKey && openColumnMenuColumn && columnMenuAnchorRef.current ? (
        <ColumnHeaderMenu
          anchorRef={columnMenuAnchorRef}
          column={openColumnMenuColumn}
          onClose={handleCloseColumnMenu}
          onSort={handleColumnMenuSort}
          onGroup={handleColumnMenuGroup}
          onCalculate={handleColumnMenuCalculate}
          onMoveLeft={() => handleColumnMenuMove('left')}
          onMoveRight={() => handleColumnMenuMove('right')}
          onHideColumn={handleColumnMenuHide}
          canSort={isColumnSortable(openColumnMenuColumn)}
          canGroup={isColumnGroupable(openColumnMenuColumn)}
          canCalculate={isColumnCalculable(openColumnMenuColumn)}
          isGroupedByColumn={groupBy?.columnKey === openColumnMenuColumn.key}
          canMoveLeft={columnMenuMoveState.canMoveLeft}
          canMoveRight={columnMenuMoveState.canMoveRight}
        />
      ) : null}

      {openCalculateColumnKey && openCalculateColumn && calculateMenuAnchorRef.current ? (
        <ListColumnCalculateMenu
          anchorRef={calculateMenuAnchorRef}
          column={openCalculateColumn}
          initialCalculation={columnCalculations[openCalculateColumnKey] ?? null}
          onCalculate={handleApplyColumnCalculation}
          onClose={handleCloseCalculateMenu}
        />
      ) : null}

      <div
        ref={!isTableLayout && !isCalendarLayout && !isGrouped ? listScrollRef : null}
        className={cn(
          'flex-1 overflow-hidden',
          isTableLayout || isCalendarLayout || isGrouped ? 'flex flex-col' : 'overflow-auto p-6',
          isCalendarLayout && 'p-6',
          isGrouped && !isTableLayout && !isCalendarLayout && 'p-6',
        )}
      >
        {isCalendarLayout ? (
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0'>
            <div className='border-b border-stroke-soft-200 px-4 py-3'>
              <BoardCalendarToolbar
                anchorDate={calendarAnchorDate}
                onAnchorDateChange={setCalendarAnchorDate}
                layoutMode={calendarLayoutMode}
                onLayoutModeChange={handleCalendarLayoutModeChange}
                dateField={calendarDateField}
                onDateFieldChange={handleCalendarDateFieldChange}
              />
            </div>
            <div
              ref={calendarScrollRef}
              className={cn(
                'relative min-h-0 flex-1',
                calendarLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.DAY ||
                  calendarLayoutMode === BOARD_CALENDAR_LAYOUT_MODES.WEEK
                  ? 'flex flex-col overflow-hidden'
                  : 'overflow-auto',
              )}
            >
              <BoardCalendarGrid
                anchorDate={calendarAnchorDate}
                layoutMode={calendarLayoutMode}
                dateField={calendarDateField}
                positionBoundaryRef={calendarScrollRef}
                tasks={visibleTasks}
                statusGroups={statusGroups}
                allStatusGroups={allStatusGroups}
                isLoading={showTaskLoadingState}
                error={error}
                onRetry={() => loadTasks(list?.id)}
                onTaskClick={(task) => handleOpenTaskView(task.id)}
                onTaskCreated={handleTaskCreated}
                openTaskMenuId={openTaskMenuId}
                onTaskMenuOpen={setOpenTaskMenuId}
                onTaskMenuClose={() => setOpenTaskMenuId(null)}
                taskMenuProps={calendarTaskMenuProps}
                onTaskDateDrop={canEditTasks ? handleCalendarTaskDrop : undefined}
                renderCreateTask={({
                  date,
                  dateKey,
                  defaultStartDate = '',
                  onClose,
                  onCreated,
                  onNavigateDay,
                }) => {
                  const slotDate = defaultStartDate || format(date, 'yyyy-MM-dd');
                  const resolvedCalendarField = normalizeBoardCalendarDateField(calendarDateField);

                  return (
                    <InlineTaskCreateRow
                      key={slotDate || dateKey}
                      variant='calendar-popover'
                      listId={list?.id}
                      calendarAnchorDate={format(date, 'yyyy-MM-dd')}
                      calendarDateField={calendarDateField}
                      defaultStartDate={
                        resolvedCalendarField === BOARD_CALENDAR_DATE_FIELDS.DUE_DATE
                          ? ''
                          : slotDate
                      }
                      defaultDueDate={
                        resolvedCalendarField === BOARD_CALENDAR_DATE_FIELDS.START_DATE
                          ? ''
                          : slotDate
                      }
                      onCreated={onCreated}
                      onClose={onClose}
                      closeOnOutsideClickWhenEmpty
                      autoFocus
                      onNavigateDay={onNavigateDay}
                      statusGroups={statusGroups}
                      defaultStatusId={defaultStatusId}
                      isStatusLoading={isStatusLoading}
                    />
                  );
                }}
              />
              {!showTaskLoadingState && !error ? renderTaskPaginationFooter() : null}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              isTableLayout
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden border-t border-stroke-soft-200 bg-bg-white-0'
                : cn(
                    'rounded-xl border border-stroke-soft-200 bg-bg-white-0',
                    isGrouped ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'overflow-hidden',
                  ),
            )}
          >
            {isGrouped ? (
              isTableLayout ? (
                <div
                  ref={groupedScrollRef}
                  className='flex min-h-0 flex-1 basis-0 flex-col overflow-auto [container-type:inline-size]'
                >
                  {showTaskLoadingState
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className='border-b border-stroke-soft-200 px-4 py-4 last:border-b-0'
                        >
                          <div className='mb-2 h-6 w-40 animate-pulse rounded bg-bg-weak-50' />
                          <div className='h-8 animate-pulse rounded bg-bg-weak-50' />
                        </div>
                      ))
                    : null}

                  {!showTaskLoadingState && error ? (
                    <div className='flex flex-col items-center gap-3 px-6 py-10 text-center'>
                      <p className='text-sm text-error-base'>{error}</p>
                      <button
                        type='button'
                        onClick={() => loadTasks(list?.id)}
                        className='text-sm font-medium text-primary-base hover:underline'
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!showTaskLoadingState && !error
                    ? (taskGroups ?? []).map((group) => {
                        const groupCreateDefaults = getGroupCreateDefaults(group, groupColumn);
                        const isGroupCreateOpen = openTableCreateGroupKey === group.key;
                        const isGroupCollapsed = Boolean(collapsedGroups[group.key]);

                        return (
                          <TableTaskGroupSection
                            key={group.key}
                            group={group}
                            groupColumn={groupColumn}
                            columns={listColumns}
                            collapsed={isGroupCollapsed}
                            onToggleCollapsed={() => handleToggleGroupCollapsed(group.key)}
                            tableGridStyle={tableGridStyle}
                            header={
                              <DndContext
                                sensors={columnDndSensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleColumnDragStart}
                                onDragOver={handleColumnDragOver}
                                onDragEnd={handleColumnDragEnd}
                                onDragCancel={handleColumnDragCancel}
                              >
                                {renderTableSheetHeader({
                                  scopeTasks: group.tasks,
                                  onToggleSelectAll: () => handleToggleGroupSelectAll(group.tasks),
                                })}
                                <DragOverlay dropAnimation={null}>
                                  {activeColumn ? (
                                    <div
                                      className={cn(
                                        'flex h-10 min-w-[140px] items-center gap-2 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]',
                                        activeColumn.key === 'title' &&
                                          'border-r border-stroke-soft-200',
                                      )}
                                    >
                                      <ColumnHeaderCellContent
                                        column={activeColumn}
                                        showDragHandle
                                        forceShowActions
                                      />
                                    </div>
                                  ) : null}
                                </DragOverlay>
                              </DndContext>
                            }
                            footer={
                              list?.id ? (
                                isGroupCreateOpen ? (
                                  <InlineTaskCreateRow
                                    key={`group-table-create-${group.key}`}
                                    isTableLayout={isTableLayout}
                                    stickToScrollport
                                    listId={list.id}
                                    onCreated={(rawTask) => {
                                      setOpenTableCreateGroupKey(null);
                                      handleTaskCreated(rawTask);
                                    }}
                                    onClose={() => setOpenTableCreateGroupKey(null)}
                                    closeOnOutsideClickWhenEmpty
                                    autoFocus
                                    statusGroups={statusGroups}
                                    defaultStatusId={defaultStatusId}
                                    isStatusLoading={isStatusLoading}
                                    {...groupCreateDefaults}
                                  />
                                ) : (
                                  <TableAddTaskTriggerRow
                                    columns={listColumns}
                                    onActivate={() => setOpenTableCreateGroupKey(group.key)}
                                  />
                                )
                              ) : null
                            }
                          >
                            <DndContext
                              sensors={taskDndSensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleTaskDragEnd}
                            >
                              <SortableContext
                                items={group.tasks.map((task) => task.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {group.tasks.map((task, index) => renderTaskRow(task, index + 1))}
                              </SortableContext>
                            </DndContext>
                          </TableTaskGroupSection>
                        );
                      })
                    : null}

                  {!showTaskLoadingState && !error && hasColumnCalculations ? (
                    <div className='overflow-x-auto border-t border-stroke-soft-200'>
                      <div style={tableGridStyle}>
                        <ListTableCalculateRow
                          columns={listColumns}
                          calculations={columnCalculationResults}
                          isTableLayout
                        />
                      </div>
                    </div>
                  ) : null}

                  {!showTaskLoadingState && !error && groupBy?.columnKey === 'status' && allGroupsRevealed ? (
                    <button
                      type='button'
                      className='flex h-10 items-center gap-1.5 px-4 text-sm font-medium text-text-soft-400 transition hover:bg-bg-weak-50 hover:text-text-sub-600'
                    >
                      <RiAddLine size={16} />
                      New status
                    </button>
                  ) : null}

                  {!showTaskLoadingState && !error ? renderTaskPaginationFooter() : null}
                </div>
              ) : (
                <div
                  ref={groupedScrollRef}
                  className='min-h-0 flex-1 basis-0 overflow-auto [container-type:inline-size]'
                >
                  {showTaskLoadingState
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className='border-b border-stroke-soft-200 px-4 py-6 last:border-b-0'
                        >
                          <div className='mb-3 h-6 w-40 animate-pulse rounded bg-bg-weak-50' />
                          <div className='h-11 animate-pulse rounded bg-bg-weak-50' />
                        </div>
                      ))
                    : null}

                  {!showTaskLoadingState && error ? (
                    <div className='flex flex-col items-center gap-3 px-6 py-10 text-center'>
                      <p className='text-sm text-error-base'>{error}</p>
                      <button
                        type='button'
                        onClick={() => loadTasks(list?.id)}
                        className='text-sm font-medium text-primary-base hover:underline'
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!showTaskLoadingState &&
                  !error &&
                  tasks.length > 0 &&
                  visibleTasks.length === 0 ? (
                    <div className='flex items-center justify-center px-6 py-10'>
                      <p className='text-sm text-text-soft-400'>{emptyTasksMessage}</p>
                    </div>
                  ) : null}

                  {!showTaskLoadingState && !error
                    ? (taskGroups ?? []).map((group) => (
                        <ListTaskGroupSection
                          key={group.key}
                          group={group}
                          groupColumn={groupColumn}
                          columns={listColumns}
                          columnSort={columnSort}
                          collapsed={Boolean(collapsedGroups[group.key])}
                          onToggleCollapsed={() => handleToggleGroupCollapsed(group.key)}
                          onSortClick={handleColumnSortClick}
                          footer={
                            list?.id ? (
                              <InlineTaskCreateRow
                                key={`group-create-${group.key}`}
                                listId={list.id}
                                onCreated={handleTaskCreated}
                                statusGroups={statusGroups}
                                defaultStatusId={defaultStatusId}
                                isStatusLoading={isStatusLoading}
                                {...getGroupCreateDefaults(group, groupColumn)}
                              />
                            ) : null
                          }
                        >
                          {group.tasks.map((task, index) => renderTaskRow(task, index + 1))}
                        </ListTaskGroupSection>
                      ))
                    : null}

                  {!showTaskLoadingState && !error && hasColumnCalculations ? (
                    <div className='overflow-x-auto border-t border-stroke-soft-200'>
                      <div style={tableGridStyle}>
                        <ListTableCalculateRow
                          columns={listColumns}
                          calculations={columnCalculationResults}
                        />
                      </div>
                    </div>
                  ) : null}

                  {!showTaskLoadingState && !error && groupBy?.columnKey === 'status' && allGroupsRevealed ? (
                    <button
                      type='button'
                      className='flex h-10 items-center gap-1.5 px-4 text-sm font-medium text-text-soft-400 transition hover:bg-bg-weak-50 hover:text-text-sub-600'
                    >
                      <RiAddLine size={16} />
                      New status
                    </button>
                  ) : null}

                  {!showTaskLoadingState && !error ? renderTaskPaginationFooter() : null}
                </div>
              )
            ) : (
              <>
                <div
                  ref={useFlatTableBody ? tableScrollRef : null}
                  className={cn(
                    useFlatTableBody
                      ? 'min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-bg-white-0'
                      : 'overflow-x-auto',
                  )}
                >
                  <div style={tableGridStyle}>
                    <DndContext
                      sensors={columnDndSensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleColumnDragStart}
                      onDragOver={handleColumnDragOver}
                      onDragEnd={handleColumnDragEnd}
                      onDragCancel={handleColumnDragCancel}
                    >
                      {isTableLayout ? (
                        renderTableSheetHeader({ sticky: useFlatTableBody })
                      ) : (
                        <div
                          className='grid border-b border-stroke-soft-200 bg-bg-weak-100'
                          style={getListTableRowStyle()}
                        >
                          <SortableContext
                            items={sortableColumnKeys}
                            strategy={horizontalListSortingStrategy}
                          >
                            {listColumns.map((column) => {
                              const { direction: sortDirection, priority: sortPriority } =
                                getColumnSortState(columnSort, column.key);

                              const headerProps = {
                                column,
                                isTableLayout,
                                showSelectAll: column.key === PINNED_FIRST_COLUMN_KEY,
                                allVisibleSelected,
                                someVisibleSelected,
                                visibleTasksCount: visibleTasks.length,
                                onToggleSelectAll: handleToggleSelectAll,
                                sortDirection,
                                sortPriority,
                                onSortClick: handleColumnSortClick(column.key),
                                onOpenMenu:
                                  column.key === PINNED_FIRST_COLUMN_KEY
                                    ? null
                                    : (event) => handleOpenColumnMenu(column.key, event),
                              };

                              if (column.key === PINNED_FIRST_COLUMN_KEY) {
                                return <PinnedColumnHeader key={column.key} {...headerProps} />;
                              }

                              return <SortableColumnHeader key={column.key} {...headerProps} />;
                            })}
                          </SortableContext>

                          <div className={LIST_TABLE_ACTIONS_HEADER_CLASS}>
                            <button
                              type='button'
                              aria-label='Add custom field'
                              onClick={() => setIsCustomFieldsDrawerOpen(true)}
                              className='flex h-5 w-5 items-center justify-center rounded-full border border-stroke-soft-200 bg-white transition hover:bg-bg-weak-50'
                            >
                              <RiAddLine size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      <DragOverlay dropAnimation={null}>
                        {activeColumn ? (
                          <div
                            className={cn(
                              'flex h-10 min-w-[140px] items-center gap-2 overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]',
                              activeColumn.key === 'title' && 'border-r border-stroke-soft-200',
                            )}
                          >
                            <ColumnHeaderCellContent
                              column={activeColumn}
                              showDragHandle
                              forceShowActions
                            />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>

                    {showTaskLoadingState
                      ? Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className='grid border-b border-stroke-soft-200 last:border-b-0'
                            style={getListTableRowStyle()}
                          >
                            {isTableLayout ? (
                              <div
                                className={cn(
                                  TABLE_INDEX_CELL_CLASS,
                                  'animate-pulse bg-bg-weak-50',
                                )}
                              />
                            ) : null}
                            {listColumns.map((column) => (
                              <div
                                key={column.key}
                                className={cn(
                                  isTableLayout
                                    ? 'h-8 animate-pulse bg-bg-weak-50'
                                    : 'h-11 animate-pulse bg-bg-weak-50',
                                  !isTableLayout && getTableCellBorderClass(isTableLayout),
                                  !isTableLayout &&
                                    column.key === 'title' &&
                                    LIST_TABLE_TITLE_CELL_CLASS,
                                  isTableLayout && getTableDataCellClass(column),
                                  isTableLayout &&
                                    column.key === 'title' &&
                                    getTableStickyColumnClass(column, { isTableLayout: true }),
                                )}
                              />
                            ))}
                            {isTableLayout ? (
                              <div
                                className={cn(
                                  TABLE_FILLER_CELL_CLASS,
                                  'animate-pulse bg-bg-weak-50',
                                )}
                              />
                            ) : null}
                            <div
                              className={cn(
                                isTableLayout
                                  ? getTableActionsCellClass(false)
                                  : LIST_TABLE_ACTIONS_CELL_CLASS,
                                'bg-bg-weak-50',
                              )}
                            />
                          </div>
                        ))
                      : null}

                    {!showTaskLoadingState && error ? (
                      <div className='col-span-full flex flex-col items-center gap-3 border-b border-stroke-soft-200 px-6 py-10 text-center'>
                        <p className='text-sm text-error-base'>{error}</p>
                        <button
                          type='button'
                          onClick={() => loadTasks(list?.id)}
                          className='text-sm font-medium text-primary-base hover:underline'
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}

                    {!showTaskLoadingState &&
                    !error &&
                    tasks.length > 0 &&
                    visibleTasks.length === 0 &&
                    !isTableLayout ? (
                      <div className='col-span-full flex items-center justify-center border-b border-stroke-soft-200 px-6 py-10'>
                        <p className='text-sm text-text-soft-400'>{emptyTasksMessage}</p>
                      </div>
                    ) : null}

                    {!showTaskLoadingState && !error ? (
                      useFlatTableBody && visibleTasks.length > 50 ? (
                        <VirtualizedTableBody
                          tasks={visibleTasks}
                          scrollElementRef={tableScrollRef}
                          gridTemplateColumns={gridTemplateColumns}
                          renderRow={(task, rowIndex) => renderTaskRow(task, rowIndex)}
                        />
                      ) : (
                        <DndContext
                          sensors={taskDndSensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleTaskDragEnd}
                        >
                          <SortableContext
                            items={visibleTaskIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {visibleTasks.map((task, index) => renderTaskRow(task, index + 1))}
                          </SortableContext>
                        </DndContext>
                      )
                    ) : null}

                    {!showTaskLoadingState && !error && hasColumnCalculations ? (
                      <ListTableCalculateRow
                        columns={listColumns}
                        calculations={columnCalculationResults}
                        isTableLayout={isTableLayout}
                      />
                    ) : null}

                    {!showTaskLoadingState &&
                    !error &&
                    isTableLayout &&
                    list?.id &&
                    canCreateTasks ? (
                      isTableInlineCreateOpen ? (
                        <InlineTaskCreateRow
                          isTableLayout={isTableLayout}
                          listId={list.id}
                          onCreated={handleTaskCreated}
                          statusGroups={statusGroups}
                          defaultStatusId={defaultStatusId}
                          isStatusLoading={isStatusLoading}
                          autoFocus
                          closeOnOutsideClickWhenEmpty
                          onClose={() => setIsTableInlineCreateOpen(false)}
                        />
                      ) : (
                        <TableAddTaskTriggerRow
                          columns={listColumns}
                          onActivate={() => setIsTableInlineCreateOpen(true)}
                        />
                      )
                    ) : null}

                    {!showTaskLoadingState && !error ? renderTaskPaginationFooter() : null}
                  </div>
                </div>

                {!showTaskLoadingState && !error && list?.id && !isTableLayout && canCreateTasks ? (
                  <InlineTaskCreateRow
                    listId={list.id}
                    onCreated={handleTaskCreated}
                    statusGroups={statusGroups}
                    defaultStatusId={defaultStatusId}
                    isStatusLoading={isStatusLoading}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      <BulkActionsBar
        selectedCount={selectedTaskIds.length}
        selectedTasks={tasks.filter((task) => selectedTaskIds.includes(task.id))}
        statusGroups={statusGroups}
        customColumns={customColumns}
        listColumns={listColumns}
        sidebarTree={sidebarTree}
        currentListId={list?.id}
        onClear={clearSelection}
        onApplyStatus={handleBulkStatus}
        onApplyAssignees={handleBulkAssignees}
        onApplyDueDate={handleBulkDueDate}
        onApplyPriority={handleBulkPriority}
        onApplyCustomField={handleBulkCustomField}
        onAddTags={handleBulkAddTags}
        onMove={handleBulkMove}
        onAdd={handleBulkAddToList}
        onCopy={handleBulkCopy}
        onDuplicate={handleBulkDuplicate}
        onDelete={canDeleteTasks ? () => setIsBulkDeleteOpen(true) : undefined}
        onArchive={canEditTasks ? handleBulkArchive : undefined}
        canEdit={canEditTasks}
        canDelete={canDeleteTasks}
      />
    </div>
  );
}
