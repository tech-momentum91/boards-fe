import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  RiArchiveLine,
  RiCalendarLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFileCopy2Line,
  RiFileCopyLine,
  RiFocus3Line,
  RiFolderTransferLine,
  RiListSettingsLine,
  RiMoreLine,
  RiPriceTag3Line,
  RiUserLine,
} from 'react-icons/ri';
import * as Badge from '@/components/ui/badge';
import * as Popover from '@/components/ui/popover';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import { Calendar } from '@/components/ui/calendar';
import { resolveBadgeColor } from '@/components/ui/circular-progress';
import { getPriorityColor, TASK_PRIORITY_OPTIONS } from '@/components/clients-management/constants';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import TaskCustomFieldCell from '../cells/TaskCustomFieldCell';
import BulkMoveAddMenu from './BulkMoveAddMenu';

const BarButton = forwardRef(({ icon: Icon, label, danger = false, className, ...rest }, ref) => {
  return (
    <button
      ref={ref}
      type='button'
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition',
        danger
          ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={16} className='shrink-0' /> : null}
      {label ? <span className='whitespace-nowrap'>{label}</span> : null}
    </button>
  );
});

BarButton.displayName = 'BarButton';

function BarDivider() {
  return <span className='mx-1 h-5 w-px shrink-0 bg-white/15' />;
}

function StatusPopover({ statusGroups, onApply }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiFocus3Line} label='Status' />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-56 p-1'>
        <div className='max-h-72 overflow-y-auto'>
          {statusGroups.length > 0 ? (
            statusGroups.map((group) => (
              <div key={group.key}>
                <div className='px-2 py-1.5 text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => {
                      onApply(option.value);
                      setOpen(false);
                    }}
                    className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-bg-weak-50'
                  >
                    <span
                      className='size-2.5 shrink-0 rounded-full'
                      style={{
                        backgroundColor:
                          resolveBadgeColor(option.color) || option.color || '#525866',
                      }}
                    />
                    <span className='truncate text-xs font-medium uppercase tracking-[0.48px] text-text-main-900'>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            ))
          ) : (
            <div className='px-2 py-2 text-sm text-text-soft-400'>No statuses available.</div>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function AssigneesPopover({ onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft([]);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <BarButton icon={RiUserLine} label='Assignees' />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-auto p-0'>
        {open ? (
          <div className='flex flex-col'>
            <AssigneeMultiSelect listOnly value={draft} onChange={setDraft} />
            <div className='flex justify-end border-t border-stroke-soft-200 p-2'>
              <button
                type='button'
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
                className='rounded-lg bg-primary-base px-3 py-1.5 text-sm font-medium text-text-white-0 transition hover:bg-primary-darker'
              >
                Apply to selected
              </button>
            </div>
          </div>
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}

function DatesPopover({ onApply }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiCalendarLine} label='Dates' />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-auto p-2'>
        <Calendar
          mode='single'
          onSelect={(date) => {
            onApply(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
          initialFocus
        />
        <div className='flex justify-end border-t border-stroke-soft-200 pt-2'>
          <button
            type='button'
            onClick={() => {
              onApply('');
              setOpen(false);
            }}
            className='rounded-lg px-3 py-1.5 text-sm font-medium text-text-sub-500 transition hover:bg-bg-weak-50'
          >
            Clear date
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function CustomFieldsPopover({ customColumns, onApply }) {
  const [open, setOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const closeTimerRef = useRef(null);

  const editableColumns = customColumns.filter((column) => column.fieldType);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCloseTimer(), []);

  const openColumnPanel = (column) => {
    clearCloseTimer();
    setActiveColumn(column);
  };

  const scheduleCloseColumnPanel = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setActiveColumn(null);
    }, 150);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          clearCloseTimer();
          setActiveColumn(null);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <BarButton icon={RiListSettingsLine} label='Custom Fields' />
      </Popover.Trigger>
      <Popover.Content
        side='top'
        align='start'
        showArrow={false}
        className='w-64 p-1'
        onMouseLeave={scheduleCloseColumnPanel}
      >
        {editableColumns.length === 0 ? (
          <div className='px-2 py-2 text-sm text-text-soft-400'>No custom fields yet.</div>
        ) : activeColumn ? (
          <div
            className='flex flex-col gap-1 p-1'
            onMouseEnter={() => openColumnPanel(activeColumn)}
          >
            <div className='px-1 text-xs font-medium text-text-soft-400'>{activeColumn.label}</div>
            <div className='rounded-lg border border-stroke-soft-200'>
              <TaskCustomFieldCell
                column={activeColumn}
                value={undefined}
                onUpdate={(value) => {
                  onApply(activeColumn.key, value);
                  clearCloseTimer();
                  setActiveColumn(null);
                  setOpen(false);
                }}
              />
            </div>
            <button
              type='button'
              onMouseEnter={scheduleCloseColumnPanel}
              className='self-start px-1 py-1 text-xs font-medium text-text-sub-500 hover:text-text-main-900'
            >
              Back
            </button>
          </div>
        ) : (
          <div className='max-h-72 overflow-y-auto'>
            {editableColumns.map((column) => (
              <button
                key={column.key}
                type='button'
                onMouseEnter={() => openColumnPanel(column)}
                className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
              >
                <span className='truncate'>{column.label}</span>
              </button>
            ))}
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function TagsPopover({ onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const [input, setInput] = useState('');

  const addDraftTag = () => {
    const value = input.trim();
    if (!value) return;
    if (!draft.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft((previous) => [...previous, value]);
    }
    setInput('');
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft([]);
          setInput('');
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <BarButton icon={RiPriceTag3Line} label='Tags' />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='w-64 p-2'>
        <div className='flex flex-col gap-2'>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addDraftTag();
              }
            }}
            placeholder='Type a tag and press Enter'
            className='h-9 w-full rounded-lg border border-stroke-soft-200 px-2 text-sm outline-none focus:border-primary-base'
          />
          {draft.length > 0 ? (
            <div className='flex flex-wrap gap-1'>
              {draft.map((tag) => (
                <span
                  key={tag}
                  className='inline-flex items-center gap-1 rounded-md bg-bg-weak-100 px-2 py-0.5 text-xs text-text-sub-500'
                >
                  {tag}
                  <button
                    type='button'
                    onClick={() => setDraft((previous) => previous.filter((item) => item !== tag))}
                    className='text-icon-soft-400 hover:text-text-main-900'
                  >
                    <RiCloseLine size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <button
            type='button'
            disabled={draft.length === 0}
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
            className='rounded-lg bg-primary-base px-3 py-1.5 text-sm font-medium text-text-white-0 transition hover:bg-primary-darker disabled:opacity-50'
          >
            Add to selected
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function MovePopover({ sidebarTree, currentListId, onMove, onAdd }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton icon={RiFolderTransferLine} label='Move/Add' />
      </Popover.Trigger>
      <Popover.Content side='top' align='start' showArrow={false} className='p-0'>
        <BulkMoveAddMenu
          sidebarTree={sidebarTree}
          currentListId={currentListId}
          onMove={onMove}
          onAdd={onAdd}
          onClose={() => setOpen(false)}
        />
      </Popover.Content>
    </Popover.Root>
  );
}

const PRIMARY_BULK_COLUMN_KEYS = new Set(['status', 'assignee', 'dueDate', 'tags']);
const READ_ONLY_BULK_COLUMN_KEYS = new Set([
  'title',
  'comments',
  'latestComment',
  'createdBy',
  'dateCreated',
  'dateUpdated',
  'dateClosed',
  'dateDone',
  'timeEstimation',
  'timeTracked',
]);
const UNSUPPORTED_BULK_FIELD_TYPES = new Set(['image', 'file-upload']);

function isPriorityColumn(column = {}) {
  return column.key === 'priority' || column.fieldType === 'priority';
}

function getMoreEditColumns(listColumns = []) {
  return (Array.isArray(listColumns) ? listColumns : []).filter((column) => {
    if (!column?.key) {
      return false;
    }

    if (PRIMARY_BULK_COLUMN_KEYS.has(column.key) || READ_ONLY_BULK_COLUMN_KEYS.has(column.key)) {
      return false;
    }

    if (UNSUPPORTED_BULK_FIELD_TYPES.has(column.fieldType)) {
      return false;
    }

    if (isPriorityColumn(column)) {
      return true;
    }

    // User-added custom columns (not primary-bar fields / read-only standards).
    return Boolean(column.custom || column.fieldId);
  });
}

function PriorityBulkEditor({ onApply, onDone }) {
  return (
    <div className='flex flex-col gap-0.5 p-1'>
      {TASK_PRIORITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type='button'
          onClick={() => {
            onApply?.(option.value);
            onDone?.();
          }}
          className='flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-weak-50'
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
      <button
        type='button'
        onClick={() => {
          onApply?.('');
          onDone?.();
        }}
        className='w-full rounded-lg px-2 py-2 text-left text-xs text-text-sub-500 transition-colors hover:bg-bg-weak-50'
      >
        Clear
      </button>
    </div>
  );
}

function MorePopover({
  listColumns = [],
  onApplyPriority,
  onApplyCustomField,
  onDuplicate,
  onArchive,
}) {
  const [open, setOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const editColumns = getMoreEditColumns(listColumns);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setActiveColumn(null);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <BarButton icon={RiMoreLine} label='More' />
      </Popover.Trigger>
      <Popover.Content side='top' align='end' showArrow={false} className='w-56 p-1'>
        {activeColumn ? (
          <div className='flex flex-col gap-1'>
            <button
              type='button'
              onClick={() => setActiveColumn(null)}
              className='self-start px-1 py-1 text-xs font-medium text-text-sub-500 hover:text-text-main-900'
            >
              Back
            </button>
            <div className='px-1 text-xs font-medium text-text-soft-400'>{activeColumn.label}</div>
            {isPriorityColumn(activeColumn) ? (
              <PriorityBulkEditor
                onApply={onApplyPriority}
                onDone={() => {
                  setActiveColumn(null);
                  setOpen(false);
                }}
              />
            ) : (
              <div className='rounded-lg border border-stroke-soft-200'>
                <TaskCustomFieldCell
                  column={activeColumn}
                  value={undefined}
                  onUpdate={(value) => {
                    onApplyCustomField?.(activeColumn.key, value);
                    setActiveColumn(null);
                    setOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className='flex flex-col gap-0.5'>
            {editColumns.length > 0 ? (
              <>
                <div className='px-2 py-1.5 text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
                  Update columns
                </div>
                <div className='max-h-56 overflow-y-auto'>
                  {editColumns.map((column) => (
                    <button
                      key={column.key}
                      type='button'
                      onClick={() => setActiveColumn(column)}
                      className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
                    >
                      <span className='truncate'>{column.label}</span>
                    </button>
                  ))}
                </div>
                <div className='my-1 h-px bg-stroke-soft-200' />
              </>
            ) : null}

            <button
              type='button'
              onClick={() => {
                onDuplicate?.();
                setOpen(false);
              }}
              className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
            >
              <RiFileCopy2Line size={16} className='text-icon-sub-500' />
              Duplicate
            </button>
            {onArchive ? (
              <button
                type='button'
                onClick={() => {
                  onArchive();
                  setOpen(false);
                }}
                className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-main-900 transition hover:bg-bg-weak-50'
              >
                <RiArchiveLine size={16} className='text-icon-sub-500' />
                Archive
              </button>
            ) : null}
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

export default function BulkActionsBar({
  selectedCount,
  statusGroups = [],
  customColumns = [],
  listColumns = [],
  sidebarTree = [],
  currentListId,
  onClear,
  onApplyStatus,
  onApplyAssignees,
  onApplyDueDate,
  onApplyPriority,
  onApplyCustomField,
  onAddTags,
  onMove,
  onAdd,
  onCopy,
  onDuplicate,
  onDelete,
  onArchive,
  canEdit = true,
  canDelete = true,
}) {
  if (!selectedCount) {
    return null;
  }

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4'>
      <div className='pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-bg-strong-950 px-2 py-2 text-text-white-0 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] ring-1 ring-white/10'>
        <div className='flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm font-medium'>
          <span className='whitespace-nowrap'>
            {selectedCount} {selectedCount === 1 ? 'Task' : 'Tasks'} selected
          </span>
          <button
            type='button'
            onClick={onClear}
            aria-label='Clear selection'
            className='text-white/60 transition hover:text-white'
          >
            <RiCloseLine size={16} />
          </button>
        </div>

        {canEdit ? (
          <>
            <StatusPopover statusGroups={statusGroups} onApply={onApplyStatus} />
            <AssigneesPopover onApply={onApplyAssignees} />
            <DatesPopover onApply={onApplyDueDate} />
            <CustomFieldsPopover customColumns={customColumns} onApply={onApplyCustomField} />
            <TagsPopover onApply={onAddTags} />

            <BarDivider />

            <MovePopover
              sidebarTree={sidebarTree}
              currentListId={currentListId}
              onMove={onMove}
              onAdd={onAdd}
            />
          </>
        ) : null}
        <BarButton icon={RiFileCopyLine} label='Copy' onClick={onCopy} />
        {canDelete ? <BarButton icon={RiDeleteBinLine} danger onClick={onDelete} /> : null}

        {canEdit ? (
          <>
            <BarDivider />

            <MorePopover
              listColumns={listColumns}
              onApplyPriority={onApplyPriority}
              onApplyCustomField={onApplyCustomField}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
