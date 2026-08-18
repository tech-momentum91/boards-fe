import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';
import { RiInformationFill } from 'react-icons/ri';
import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import * as Popover from '@/components/ui/popover';
import * as Switch from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import {
  deleteStatusForScope,
  fetchTaskStatusTemplate,
  getStatusUsageForScope,
  listStatusTemplates,
  saveTaskStatusTemplate,
  toggleStatusForScope,
} from '@/services/status-template-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import {
  TASK_STATUS_CATEGORY_KEYS,
  TASK_STATUS_CATEGORY_LABELS,
  createDefaultStatusTemplate,
  createStatusItem,
} from '../constants/task-statuses-constants';
import {
  isClosedStatusCategory,
  normalizeStatusTemplate,
  serializeStatusesForBulkSave,
} from '../utils/task-statuses-utils';
import {
  BoardColorPickerContent,
  BOARD_ICON_COLORS,
  normalizeBoardColor,
} from '../sidebar/IconColorPicker';

function isStatusColorPickerTarget(target) {
  return Boolean(target?.closest?.('[data-status-color-picker]'));
}

function handleModalInteractOutside(event) {
  if (isStatusColorPickerTarget(event.target)) {
    event.preventDefault();
  }
}

const categoryContainerId = (categoryKey) => `category:${categoryKey}`;

const isCategoryContainerId = (id) => String(id).startsWith('category:');

const getCategoryFromContainerId = (id) => String(id).slice('category:'.length);

function findStatusCategory(categories, statusId) {
  for (const categoryKey of TASK_STATUS_CATEGORY_KEYS) {
    if ((categories[categoryKey] ?? []).some((status) => status.id === statusId)) {
      return categoryKey;
    }
  }

  return null;
}

function cloneCategories(categories) {
  return TASK_STATUS_CATEGORY_KEYS.reduce((accumulator, key) => {
    accumulator[key] = [...(categories[key] ?? [])];
    return accumulator;
  }, {});
}

function applyStatusMove(categories, active, over) {
  if (!over || active.id === over.id) {
    return categories;
  }

  const activeCategory = findStatusCategory(categories, active.id);
  if (!activeCategory) {
    return categories;
  }

  const overCategory = isCategoryContainerId(over.id)
    ? getCategoryFromContainerId(over.id)
    : findStatusCategory(categories, over.id);

  if (!overCategory) {
    return categories;
  }

  const next = cloneCategories(categories);

  if (activeCategory === overCategory) {
    if (isCategoryContainerId(over.id)) {
      return categories;
    }

    const items = next[activeCategory];
    const oldIndex = items.findIndex((status) => status.id === active.id);
    const newIndex = items.findIndex((status) => status.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return categories;
    }

    next[activeCategory] = arrayMove(items, oldIndex, newIndex);
    return next;
  }

  const sourceItems = next[activeCategory];
  const activeIndex = sourceItems.findIndex((status) => status.id === active.id);
  if (activeIndex === -1) {
    return categories;
  }

  const [movedStatus] = sourceItems.splice(activeIndex, 1);
  const destinationItems = next[overCategory];
  let insertIndex = destinationItems.length;

  if (!isCategoryContainerId(over.id)) {
    const overIndex = destinationItems.findIndex((status) => status.id === over.id);
    if (overIndex >= 0) {
      insertIndex = overIndex;
    }
  }

  destinationItems.splice(insertIndex, 0, {
    ...movedStatus,
    category: overCategory,
    isClosed: isClosedStatusCategory(overCategory),
  });

  next[activeCategory] = sourceItems;
  next[overCategory] = destinationItems;
  return next;
}

function ModeRadio({ checked, label, onClick }) {
  return (
    <div
      role='radio'
      aria-checked={checked}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className='flex w-full items-center gap-2 text-left'
    >
      <span
        className={cn(
          'relative flex size-5 shrink-0 items-center justify-center rounded-full',
          checked
            ? 'bg-primary-base shadow-[inset_0px_2px_2px_0px_rgba(22,38,100,0.32)]'
            : 'bg-bg-soft-200',
        )}
      >
        {checked ? (
          <span className='size-2 rounded-full bg-bg-white-0 shadow-[0px_2px_2px_0px_rgba(27,28,29,0.12),inset_0px_-2px_3px_0px_#cfd1d3]' />
        ) : (
          <span className='absolute inset-[17.5%] rounded-full bg-bg-white-0 shadow-[0px_2px_2px_0px_rgba(27,28,29,0.12)]' />
        )}
      </span>
      <span
        className={cn(
          'text-sm leading-5 tracking-[-0.084px] text-text-main-900',
          checked ? 'font-medium' : 'font-normal',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StatusColorPicker({ color, disabled, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          className='flex shrink-0 items-center rounded border border-stroke-sub-300 bg-bg-white-0 p-[3px] disabled:opacity-60'
          aria-label='Change status color'
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span
            className='size-2.5 rounded-[2px] shadow-regular-md'
            style={{ backgroundColor: normalizeBoardColor(color) || BOARD_ICON_COLORS[0] }}
          />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        side='bottom'
        sideOffset={8}
        showArrow={false}
        data-status-color-picker=''
        data-board-color-picker=''
        className='z-[300] w-auto overflow-visible border-stroke-soft-200 p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (isStatusColorPickerTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isStatusColorPickerTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <BoardColorPickerContent
          selectedColor={color}
          onSelect={(nextColor) => {
            onSelect?.(normalizeBoardColor(nextColor) || nextColor);
          }}
          onClose={() => setOpen(false)}
          isSubmitting={disabled}
        />
      </Popover.Content>
    </Popover.Root>
  );
}

function SortableStatusRow({ status, disabled, onChange, onRemove, onDelete, isDeleting }) {
  const inputRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(
    () => Boolean(status.isDraft) || !String(status.name ?? '').trim(),
  );
  const isDraft = Boolean(status.isDraft) || !String(status.name ?? '').trim();
  const displayColor = normalizeBoardColor(status.color) || BOARD_ICON_COLORS[0];
  const showNameInput = isEditingName || isDraft;

  useEffect(() => {
    if (!showNameInput) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [showNameInput]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
    disabled: disabled || isDraft || isDeleting,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const commitName = (rawValue) => {
    const trimmed = String(rawValue ?? '').trim();
    if (!trimmed) {
      if (isDraft) {
        onRemove?.();
      } else {
        setIsEditingName(false);
      }
      return;
    }

    onChange?.({
      ...status,
      name: trimmed,
      isDraft: false,
    });
    setIsEditingName(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex h-9 w-full items-center gap-1.5 rounded-md border border-stroke-soft-200 bg-bg-white-0 py-3 pl-[3px] pr-2 shadow-regular-xs',
        isDragging && 'z-10 shadow-regular-md',
      )}
    >
      <button
        type='button'
        disabled={disabled || isDraft || isDeleting}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center text-icon-soft-400',
          disabled || isDraft || isDeleting
            ? 'cursor-not-allowed opacity-40'
            : 'cursor-grab active:cursor-grabbing',
        )}
        aria-label='Drag to reorder status'
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={1.75} />
      </button>

      <div className='relative flex min-w-0 flex-1 items-center gap-1.5'>
        <StatusColorPicker
          color={displayColor}
          disabled={disabled || isDeleting}
          onSelect={(color) => onChange?.({ ...status, color })}
        />

        {showNameInput ? (
          <input
            ref={inputRef}
            type='text'
            value={status.name ?? ''}
            disabled={disabled || isDeleting}
            placeholder='Enter status name'
            autoFocus={isDraft && !String(status.name ?? '').trim()}
            onChange={(event) =>
              onChange?.({
                ...status,
                name: event.target.value,
                isDraft: isDraft || !event.target.value.trim(),
              })
            }
            onBlur={(event) => commitName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitName(event.currentTarget.value);
                event.currentTarget.blur();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                if (isDraft && !String(status.name ?? '').trim()) {
                  onRemove?.();
                  return;
                }
                setIsEditingName(false);
              }
            }}
            className='min-w-0 flex-1 bg-transparent text-sm text-text-main-900 outline-none placeholder:text-text-soft-400 disabled:opacity-60'
          />
        ) : (
          <button
            type='button'
            disabled={disabled || isDeleting}
            onClick={() => setIsEditingName(true)}
            className='min-w-0 flex-1 truncate text-left text-xs font-medium uppercase tracking-[0.48px] text-text-main-900 disabled:opacity-60'
            title='Click to edit status name'
          >
            {status.name}
          </button>
        )}
      </div>

      <Switch.Root
        checked={Boolean(status.isEnabled)}
        disabled={disabled || isDeleting}
        onCheckedChange={(isEnabled) => onChange?.({ ...status, isEnabled })}
      />

      <button
        type='button'
        disabled={disabled || isDeleting}
        onClick={() => onDelete?.(status)}
        className='flex size-6 shrink-0 items-center justify-center rounded-md text-icon-soft-400 transition hover:bg-error-lighter hover:text-error-base disabled:opacity-40'
        aria-label={`Delete status ${status.name || ''}`.trim()}
        title='Delete status'
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function StatusRow({ status, disabled, onChange, onRemove, onDelete, isDeleting }) {
  return (
    <SortableStatusRow
      status={status}
      disabled={disabled}
      onChange={onChange}
      onRemove={onRemove}
      onDelete={onDelete}
      isDeleting={isDeleting}
    />
  );
}

function CategoryDropZone({ categoryKey, isEmpty, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: categoryContainerId(categoryKey),
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[44px] rounded-lg transition-colors',
        isOver && 'bg-primary-lighter/50 ring-1 ring-inset ring-primary-base/30',
        isEmpty && 'border border-dashed border-stroke-soft-200 px-2 py-3',
      )}
    >
      {isEmpty ? <p className='text-center text-xs text-text-soft-400'>Drop status here</p> : null}
      {children}
    </div>
  );
}

function StatusSection({
  categoryKey,
  statuses,
  disabled,
  deletingStatusId,
  onAdd,
  onChangeStatus,
  onRemoveStatus,
  onDeleteStatus,
}) {
  return (
    <section className='flex w-full flex-col gap-2'>
      <div className='flex items-center justify-between py-1'>
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-medium uppercase tracking-[0.48px] text-text-soft-400'>
            {TASK_STATUS_CATEGORY_LABELS[categoryKey]}
          </span>
          <RiInformationFill size={16} className='text-text-soft-400 opacity-60' />
        </div>

        <button
          type='button'
          disabled={disabled}
          onClick={() => onAdd?.(categoryKey)}
          className='flex size-6 items-center justify-center rounded-md text-icon-sub-500 transition hover:bg-bg-weak-50 disabled:opacity-60'
          aria-label={`Add status to ${TASK_STATUS_CATEGORY_LABELS[categoryKey]}`}
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
      </div>

      <CategoryDropZone categoryKey={categoryKey} isEmpty={statuses.length === 0}>
        <SortableContext
          items={statuses.map((status) => status.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='flex flex-col gap-2'>
            {statuses.map((status) => (
              <StatusRow
                key={status.id}
                status={status}
                disabled={disabled}
                isDeleting={deletingStatusId === status.id}
                onChange={(nextStatus) => onChangeStatus?.(categoryKey, status.id, nextStatus)}
                onRemove={() => onRemoveStatus?.(categoryKey, status.id)}
                onDelete={() => onDeleteStatus?.(categoryKey, status)}
              />
            ))}
          </div>
        </SortableContext>
      </CategoryDropZone>
    </section>
  );
}

function StatusCategoriesPanel({
  categories,
  disabled,
  deletingStatusId,
  onAdd,
  onChangeStatus,
  onRemoveStatus,
  onDeleteStatus,
  onCategoriesChange,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeCategory = findStatusCategory(categories, active.id);
    const overCategory = isCategoryContainerId(over.id)
      ? getCategoryFromContainerId(over.id)
      : findStatusCategory(categories, over.id);

    if (!activeCategory || !overCategory || activeCategory === overCategory) {
      return;
    }

    onCategoriesChange((previous) => applyStatusMove(previous, active, over));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    onCategoriesChange((previous) => applyStatusMove(previous, active, over));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {TASK_STATUS_CATEGORY_KEYS.map((categoryKey) => (
        <StatusSection
          key={categoryKey}
          categoryKey={categoryKey}
          statuses={categories[categoryKey] ?? []}
          disabled={disabled}
          deletingStatusId={deletingStatusId}
          onAdd={onAdd}
          onChangeStatus={onChangeStatus}
          onRemoveStatus={onRemoveStatus}
          onDeleteStatus={onDeleteStatus}
        />
      ))}
    </DndContext>
  );
}

function OtherBoardsPanel({ boards, selectedId, onSelect, disabled }) {
  if (boards.length === 0) {
    return (
      <div className='flex min-h-[280px] flex-1 items-center justify-center px-6 text-center text-sm text-text-soft-400'>
        No other boards available to copy statuses from.
      </div>
    );
  }

  return (
    <div className='flex min-h-[280px] flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5 pt-3'>
      {boards.map((board) => (
        <div
          key={board.id}
          role='button'
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && onSelect?.(board.id)}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect?.(board.id);
            }
          }}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition',
            selectedId === board.id
              ? 'border-primary-base bg-primary-lighter'
              : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <ModeRadio checked={selectedId === board.id} label={board.label} />
        </div>
      ))}
    </div>
  );
}

export default function TaskStatusesModal({
  item,
  boardItems = [],
  onClose,
  onSaved,
  onTemplateChanged,
}) {
  const [template, setTemplate] = useState(() => createDefaultStatusTemplate());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingStatusId, setDeletingStatusId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  const otherBoardOptions = useMemo(() => {
    if (availableTemplates.length > 0) {
      return availableTemplates
        .filter((entry) => entry.space !== template.spaceId)
        .map((entry) => ({
          id: entry.space || entry.name,
          templateId: entry.name,
          label: entry.name1 || entry.name,
        }));
    }

    return boardItems
      .filter(
        (board) =>
          board.id !== item?.id &&
          (board.type === 'space' || board.type === 'board' || !board.type),
      )
      .map((board) => ({ id: board.id, templateId: null, label: board.label }));
  }, [availableTemplates, boardItems, item?.id, template.spaceId]);

  const loadTemplate = useCallback(async () => {
    if (!item?.id) {
      setTemplate(createDefaultStatusTemplate());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const result = await fetchTaskStatusTemplate(item);

    if (result.error) {
      setTemplate(createDefaultStatusTemplate());
      setLoadError(result.error);
      setIsLoading(false);
      return;
    }

    setTemplate(normalizeStatusTemplate(result.data));
    setIsLoading(false);
  }, [item]);

  const loadAvailableTemplates = useCallback(async () => {
    const result = await listStatusTemplates();

    if (result.error) {
      setAvailableTemplates([]);
      return;
    }

    setAvailableTemplates(Array.isArray(result.data) ? result.data : []);
  }, []);

  useEffect(() => {
    loadTemplate();
    loadAvailableTemplates();
  }, [loadTemplate, loadAvailableTemplates]);

  const handleModeChange = (mode) => {
    setTemplate((previous) => ({
      ...previous,
      mode,
      otherSourceId:
        mode === 'other' ? (previous.otherSourceId ?? otherBoardOptions[0]?.id ?? null) : null,
    }));
  };

  const handleAddStatus = (categoryKey) => {
    setTemplate((previous) => ({
      ...previous,
      categories: {
        ...previous.categories,
        [categoryKey]: [
          ...(previous.categories[categoryKey] ?? []),
          createStatusItem({ isDraft: true }),
        ],
      },
    }));
  };

  const handleRemoveStatus = (categoryKey, statusId) => {
    setTemplate((previous) => ({
      ...previous,
      categories: {
        ...previous.categories,
        [categoryKey]: (previous.categories[categoryKey] ?? []).filter(
          (status) => status.id !== statusId,
        ),
      },
    }));
  };

  const handleDeleteStatus = useCallback(
    async (categoryKey, status) => {
      if (!status?.id || deletingStatusId) {
        return;
      }

      const isUnsaved =
        Boolean(status.isDraft) ||
        !status.name1 ||
        String(status.id).startsWith('status-') ||
        !template.templateId;

      if (isUnsaved) {
        handleRemoveStatus(categoryKey, status.id);
        return;
      }

      if (!item?.id) {
        showErrorToast('Status template is not available.');
        return;
      }

      const label = status.name?.trim() || 'this status';
      if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
        return;
      }

      setDeletingStatusId(status.id);

      const usageResult = await getStatusUsageForScope(item, status.id);
      if (usageResult.error) {
        setDeletingStatusId(null);
        showErrorToast(usageResult.error);
        return;
      }

      if (usageResult.data?.in_use) {
        setDeletingStatusId(null);
        const count = Number(usageResult.data.task_count) || 0;
        showErrorToast(
          `"${label}" is used by ${count} task${count === 1 ? '' : 's'} and cannot be deleted.`,
        );
        return;
      }

      const result = await deleteStatusForScope(item, status.id);
      setDeletingStatusId(null);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      if (result.data) {
        setTemplate(normalizeStatusTemplate(result.data));
      } else {
        handleRemoveStatus(categoryKey, status.id);
      }

      showSuccessToast(`"${label}" deleted.`);
      onTemplateChanged?.();
    },
    [deletingStatusId, item, onTemplateChanged, template.templateId],
  );

  const handleCategoriesChange = useCallback((updater) => {
    setTemplate((previous) => ({
      ...previous,
      categories: typeof updater === 'function' ? updater(previous.categories) : updater,
    }));
  }, []);

  const handleChangeStatus = useCallback(
    async (categoryKey, statusId, nextStatus) => {
      let previousStatus = null;
      let templateId = null;
      let shouldToggle = false;

      setTemplate((previous) => {
        previousStatus = previous.categories[categoryKey]?.find((status) => status.id === statusId);
        templateId = previous.templateId;
        shouldToggle =
          Boolean(previousStatus) &&
          Boolean(previousStatus.isEnabled) !== Boolean(nextStatus.isEnabled) &&
          Boolean(templateId) &&
          !nextStatus.isDraft &&
          !String(statusId).startsWith('status-');

        return {
          ...previous,
          categories: {
            ...previous.categories,
            [categoryKey]: (previous.categories[categoryKey] ?? []).map((status) =>
              status.id === statusId ? nextStatus : status,
            ),
          },
        };
      });

      if (!shouldToggle) {
        return;
      }

      const result = await toggleStatusForScope(item, statusId);

      if (result.error) {
        showErrorToast(result.error);
        setTemplate((previous) => ({
          ...previous,
          categories: {
            ...previous.categories,
            [categoryKey]: (previous.categories[categoryKey] ?? []).map((status) =>
              status.id === statusId ? previousStatus : status,
            ),
          },
        }));
        return;
      }

      if (result.data?.template) {
        setTemplate(normalizeStatusTemplate(result.data.template));
      }

      onTemplateChanged?.();
    },
    [item, onTemplateChanged],
  );

  const handleSave = async () => {
    if (!item?.id) {
      showErrorToast('Status template is not available.');
      return;
    }

    setIsSaving(true);

    const statusesPayload = serializeStatusesForBulkSave(template);
    const result = await saveTaskStatusTemplate(item, template, statusesPayload);

    setIsSaving(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    if (result.data) {
      setTemplate(normalizeStatusTemplate(result.data));
    }

    showSuccessToast('Task statuses saved successfully.');
    onTemplateChanged?.();
    onSaved?.();
    onClose?.();
  };

  const handleOpenChange = (open) => {
    if (!open && !isSaving) {
      onClose?.();
    }
  };

  const modalTitle = item?.label ? `Edit ${item.label} Statuses` : 'Edit Task Statuses';

  return (
    <Modal.Root open onOpenChange={handleOpenChange}>
      <Modal.Content
        className='flex max-h-[90vh] max-w-[720px] flex-col overflow-hidden p-0'
        showClose
        onPointerDownOutside={handleModalInteractOutside}
        onInteractOutside={handleModalInteractOutside}
        onFocusOutside={handleModalInteractOutside}
      >
        <Modal.Header className='gap-4 border-b border-stroke-soft-200 px-8 py-5 before:hidden'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0'>
            <Settings2 size={24} strokeWidth={1.75} className='text-icon-sub-500' />
          </div>
          <div className='min-w-0 flex-1 space-y-1 pr-8'>
            <Modal.Title className='text-lg font-medium leading-6 tracking-[-0.27px] text-text-main-900'>
              {modalTitle}
            </Modal.Title>
            <Modal.Description className='text-sm leading-5 tracking-[-0.084px] text-text-sub-500'>
              Add custom statuses or select from other boards.
            </Modal.Description>
          </div>
        </Modal.Header>

        <div className='flex min-h-0 flex-1 overflow-hidden'>
          <aside className='flex w-[240px] shrink-0 flex-col gap-5 border-r border-stroke-soft-200 bg-bg-weak-100 p-5'>
            <ModeRadio
              checked={template.mode === 'custom'}
              label='Custom'
              onClick={() => handleModeChange('custom')}
            />
            <ModeRadio
              checked={template.mode === 'other'}
              label='Other'
              onClick={() => handleModeChange('other')}
            />
          </aside>

          {template.mode === 'custom' ? (
            <div className='flex min-h-[360px] flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-3'>
              {isLoading ? (
                <div className='flex flex-1 flex-col gap-3 py-4'>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className='h-16 animate-pulse rounded-lg bg-bg-weak-50' />
                  ))}
                </div>
              ) : (
                <StatusCategoriesPanel
                  categories={template.categories}
                  disabled={isSaving || Boolean(deletingStatusId)}
                  deletingStatusId={deletingStatusId}
                  onAdd={handleAddStatus}
                  onChangeStatus={handleChangeStatus}
                  onRemoveStatus={handleRemoveStatus}
                  onDeleteStatus={handleDeleteStatus}
                  onCategoriesChange={handleCategoriesChange}
                />
              )}

              {loadError ? <p className='text-sm text-error-base'>{loadError}</p> : null}
            </div>
          ) : (
            <OtherBoardsPanel
              boards={otherBoardOptions}
              selectedId={template.otherSourceId}
              disabled={isSaving}
              onSelect={(boardId) =>
                setTemplate((previous) => ({ ...previous, otherSourceId: boardId }))
              }
            />
          )}
        </div>

        <Modal.Footer className='justify-end gap-3 border-t border-stroke-soft-200 px-8 py-6'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button.Root>

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
