import React from 'react';
import { RiAddLine, RiDeleteBinLine, RiDraggable } from 'react-icons/ri';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as CompactButton from '@/components/ui/compact-button';
import * as Popover from '@/components/ui/popover';
import { STATUS_CONFIG_PICKER_HEXES } from '@/constants/STATUS_CONSTANTS';
import {
  normalizeStatusConfigurationStorageColor,
  pickerSwatchToStorageHex,
  storageColorToPickerSwatch,
} from '@/components/ui/status-color-pill';
import { cn } from '@/utils/cn';
import {
  STATUS_LIFECYCLE_CATEGORIES,
  getDefaultColorForStatusCategory,
  normalizeStatusLifecycleCategory,
} from '@/components/customize-status/status-lifecycle-constants';

const DEFAULT_STATUS_CATEGORY = 'Active';
const CATEGORY_DROPPABLE_PREFIX = 'category:';

function normalizeStatusCategory(category) {
  return normalizeStatusLifecycleCategory(category, { fallback: DEFAULT_STATUS_CATEGORY });
}

function withNormalizedCategories(statuses = []) {
  return (Array.isArray(statuses) ? statuses : []).map((status) => ({
    ...status,
    category: normalizeStatusCategory(status?.category),
  }));
}

function groupStatusesByCategory(statuses = []) {
  const groups = Object.fromEntries(STATUS_LIFECYCLE_CATEGORIES.map((category) => [category, []]));
  withNormalizedCategories(statuses).forEach((status) => {
    groups[status.category].push(status);
  });
  return groups;
}

function flattenCategoryGroups(groups) {
  return STATUS_LIFECYCLE_CATEGORIES.flatMap((category) =>
    (groups[category] || []).map((status) => ({ ...status, category })),
  );
}

function categoryDroppableId(category) {
  return `${CATEGORY_DROPPABLE_PREFIX}${category}`;
}

function parseCategoryDroppableId(id) {
  const raw = String(id || '');
  if (!raw.startsWith(CATEGORY_DROPPABLE_PREFIX)) return null;
  const category = raw.slice(CATEGORY_DROPPABLE_PREFIX.length);
  return STATUS_LIFECYCLE_CATEGORIES.includes(category) ? category : null;
}

function findCategoryForId(id, statuses) {
  const dropCategory = parseCategoryDroppableId(id);
  if (dropCategory) return dropCategory;
  const match = statuses.find((s) => s.id === id);
  return match ? normalizeStatusCategory(match.category) : null;
}

function moveStatusToCategory(statuses, activeId, overId) {
  const normalized = withNormalizedCategories(statuses);
  const active = normalized.find((s) => s.id === activeId);
  if (!active) return statuses;

  const targetCategory = findCategoryForId(overId, normalized);
  if (!targetCategory || active.category === targetCategory) return statuses;

  const withoutActive = normalized.filter((s) => s.id !== activeId);
  const groups = groupStatusesByCategory(withoutActive);
  const overIndex = groups[targetCategory].findIndex((s) => s.id === overId);
  const moved = {
    ...active,
    category: targetCategory,
    color: normalizeStatusConfigurationStorageColor(
      getDefaultColorForStatusCategory(targetCategory),
    ),
  };

  if (overIndex < 0 || parseCategoryDroppableId(overId)) {
    groups[targetCategory] = [...groups[targetCategory], moved];
  } else {
    groups[targetCategory] = [
      ...groups[targetCategory].slice(0, overIndex),
      moved,
      ...groups[targetCategory].slice(overIndex),
    ];
  }

  return flattenCategoryGroups(groups);
}

function StatusColorPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const displaySwatch = storageColorToPickerSwatch(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='grid size-5 shrink-0 place-items-center rounded-md bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200'
          aria-label='Change status color'
          onClick={(e) => e.stopPropagation()}
        >
          <span className='size-2.5 rounded-sm' style={{ backgroundColor: displaySwatch }} />
        </button>
      </Popover.Trigger>
      <Popover.Content
        className='p-2'
        align='start'
        side='bottom'
        sideOffset={8}
        showArrow
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='flex items-center gap-2'>
          {STATUS_CONFIG_PICKER_HEXES.map((c) => (
            <button
              key={c}
              type='button'
              className='size-5 rounded-md ring-1 ring-inset ring-stroke-soft-200'
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
              onClick={() => {
                onChange?.(pickerSwatchToStorageHex(c));
                setOpen(false);
              }}
            />
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function SortableDefaultItem({ status, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children({ attributes, listeners })}
    </div>
  );
}

function CategorySection({ category, children, isOver = false }) {
  const { setNodeRef } = useDroppable({
    id: categoryDroppableId(category),
    data: { type: 'category', category },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 rounded-xl p-1 transition-colors',
        isOver && 'bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200',
      )}
    >
      <p className='label-small text-text-strong-950 px-1'>{category}</p>
      {children}
    </div>
  );
}

function DefaultStatusRow({
  status,
  dragHandleProps,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditCommit,
  onColorChange,
}) {
  return (
    <div className='group flex items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 py-2 pl-[3px] pr-2'>
      <div
        className='shrink-0 cursor-grab text-text-soft-400 active:cursor-grabbing'
        aria-hidden
        {...dragHandleProps}
      >
        <RiDraggable className='size-4' />
      </div>
      <StatusColorPicker value={status.color} onChange={onColorChange} />
      {isEditing ? (
        <input
          type='text'
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onEditCommit?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditCommit?.();
            if (e.key === 'Escape') onEditCommit?.(true);
          }}
          className='min-w-0 flex-1 bg-transparent text-paragraph-xs text-text-strong-950 outline-none'
          autoFocus
        />
      ) : (
        <button
          type='button'
          className='min-w-0 flex-1 truncate text-left label-small text-text-strong-950'
          onClick={onEditStart}
        >
          {status.label}
        </button>
      )}
      <span className='label-xs text-text-soft-400 pr-1 shrink-0'>Default</span>
    </div>
  );
}

function NewDefaultStatusRow({
  status,
  inputRef,
  onLabelChange,
  onBlurCommit,
  onDelete,
  onColorChange,
  dragHandleProps,
}) {
  return (
    <div className='flex items-center gap-2 rounded-lg border-2 border-text-strong-950 bg-bg-white-0 px-2 py-2'>
      <div
        className='shrink-0 cursor-grab text-text-soft-400 active:cursor-grabbing'
        {...dragHandleProps}
      >
        <RiDraggable className='size-4' />
      </div>
      <StatusColorPicker value={status.color} onChange={onColorChange} />
      <input
        ref={inputRef}
        type='text'
        value={status.label}
        onChange={(e) => onLabelChange(e.target.value)}
        onBlur={onBlurCommit}
        placeholder='Enter status name'
        className='min-w-0 flex-1 bg-transparent text-paragraph-xs outline-none placeholder:text-text-soft-400'
      />
      <CompactButton.Root
        type='button'
        variant='neutral'
        mode='ghost'
        size='xxsmall'
        onClick={onDelete}
      >
        <CompactButton.Icon as={RiDeleteBinLine} className='text-text-sub-600' />
      </CompactButton.Root>
    </div>
  );
}

export default function CustomDefaultStatusesPanel({
  statuses = [],
  onChange,
  isLoading = false,
  embedded = false,
  className,
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [activeDropCategory, setActiveDropCategory] = React.useState(null);
  const newStatusInputRef = React.useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const normalizedStatuses = React.useMemo(() => withNormalizedCategories(statuses), [statuses]);

  const statusesByCategory = React.useMemo(
    () => groupStatusesByCategory(normalizedStatuses),
    [normalizedStatuses],
  );

  const emitChange = React.useCallback(
    (next) => {
      onChange?.(withNormalizedCategories(next));
    },
    [onChange],
  );

  const handleAddStatus = React.useCallback(
    (category = DEFAULT_STATUS_CATEGORY) => {
      const nextCategory = normalizeStatusCategory(category);
      const nextId = `custom_${Date.now()}`;
      const groups = groupStatusesByCategory(normalizedStatuses);
      groups[nextCategory] = [
        ...(groups[nextCategory] || []),
        {
          id: nextId,
          label: '',
          color: normalizeStatusConfigurationStorageColor(
            getDefaultColorForStatusCategory(nextCategory),
          ),
          category: nextCategory,
          enabled: true,
          isDefault: true,
          isNew: true,
        },
      ];
      emitChange(flattenCategoryGroups(groups));
      requestAnimationFrame(() => newStatusInputRef.current?.focus());
    },
    [emitChange, normalizedStatuses],
  );

  const commitRename = React.useCallback(
    (cancel = false) => {
      const id = editingId;
      if (!id) return;

      const current = normalizedStatuses.find((s) => s.id === id);
      setEditingId(null);
      setEditingValue('');
      if (!current || cancel) return;

      const nextLabel = (editingValue || '').trim();
      if (!nextLabel) return;

      const dup = normalizedStatuses.some(
        (s) =>
          s.id !== id &&
          String(s.label || '')
            .trim()
            .toLowerCase() === nextLabel.toLowerCase(),
      );
      if (dup) return;

      emitChange(normalizedStatuses.map((s) => (s.id === id ? { ...s, label: nextLabel } : s)));
    },
    [editingId, editingValue, emitChange, normalizedStatuses],
  );

  const handleDragOver = React.useCallback(
    ({ active, over }) => {
      if (!over) {
        setActiveDropCategory(null);
        return;
      }

      const overCategoryFromData = over.data?.current?.category;
      const overCategory =
        parseCategoryDroppableId(over.id) ||
        (STATUS_LIFECYCLE_CATEGORIES.includes(overCategoryFromData) ? overCategoryFromData : null);
      if (overCategory) setActiveDropCategory(overCategory);

      const activeCategory = findCategoryForId(active.id, normalizedStatuses);
      const resolvedOver = findCategoryForId(over.id, normalizedStatuses);
      if (!activeCategory || !resolvedOver || activeCategory === resolvedOver) return;

      emitChange(moveStatusToCategory(normalizedStatuses, active.id, over.id));
    },
    [emitChange, normalizedStatuses],
  );

  const handleDragEnd = React.useCallback(
    ({ active, over }) => {
      setActiveDropCategory(null);
      if (!over || active.id === over.id) return;

      const activeCategory = findCategoryForId(active.id, normalizedStatuses);
      const overCategory = findCategoryForId(over.id, normalizedStatuses);
      if (!activeCategory || !overCategory) return;

      if (activeCategory !== overCategory) {
        emitChange(moveStatusToCategory(normalizedStatuses, active.id, over.id));
        return;
      }

      const groups = groupStatusesByCategory(normalizedStatuses);
      const list = [...(groups[activeCategory] || [])];
      const oldIndex = list.findIndex((row) => row.id === active.id);
      const newIndex = parseCategoryDroppableId(over.id)
        ? list.length - 1
        : list.findIndex((row) => row.id === over.id);

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      groups[activeCategory] = arrayMove(list, oldIndex, newIndex);
      emitChange(flattenCategoryGroups(groups));
    },
    [emitChange, normalizedStatuses],
  );

  const commitNewStatusIfNamed = React.useCallback(
    (id) => {
      emitChange(
        normalizedStatuses.map((s) => {
          if (s.id !== id || !s.isNew) return s;
          const trimmed = (s.label || '').trim();
          if (!trimmed) return s;
          return { ...s, label: trimmed, isNew: false };
        }),
      );
    },
    [emitChange, normalizedStatuses],
  );

  const updateStatus = React.useCallback(
    (id, patch) => {
      emitChange(normalizedStatuses.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [emitChange, normalizedStatuses],
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 min-w-0',
        !embedded && 'rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3',
        className,
      )}
    >
      {isLoading ? (
        <p className='text-paragraph-xs text-text-sub-600 py-2 text-center'>Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDropCategory(null)}
        >
          <div className='flex flex-col gap-5 max-h-[28rem] overflow-y-auto'>
            {STATUS_LIFECYCLE_CATEGORIES.map((category) => {
              const rows = statusesByCategory[category] || [];
              const newestInCategory = [...rows].reverse().find((s) => s.isNew);
              return (
                <CategorySection
                  key={category}
                  category={category}
                  isOver={activeDropCategory === category}
                >
                  <SortableContext
                    items={rows.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className='flex flex-col gap-1.5 min-h-[8px]'>
                      {rows.map((status) => (
                        <SortableDefaultItem key={status.id} status={status}>
                          {({ attributes, listeners }) =>
                            status.isNew ? (
                              <NewDefaultStatusRow
                                status={status}
                                inputRef={
                                  newestInCategory?.id === status.id ? newStatusInputRef : undefined
                                }
                                dragHandleProps={{ ...attributes, ...listeners }}
                                onLabelChange={(value) => updateStatus(status.id, { label: value })}
                                onBlurCommit={() => commitNewStatusIfNamed(status.id)}
                                onDelete={() =>
                                  emitChange(normalizedStatuses.filter((s) => s.id !== status.id))
                                }
                                onColorChange={(color) => updateStatus(status.id, { color })}
                              />
                            ) : (
                              <DefaultStatusRow
                                status={status}
                                dragHandleProps={{ ...attributes, ...listeners }}
                                isEditing={editingId === status.id}
                                editValue={editingId === status.id ? editingValue : ''}
                                onEditStart={() => {
                                  setEditingId(status.id);
                                  setEditingValue(status.label || '');
                                }}
                                onEditChange={setEditingValue}
                                onEditCommit={commitRename}
                                onColorChange={(color) => updateStatus(status.id, { color })}
                              />
                            )
                          }
                        </SortableDefaultItem>
                      ))}
                    </div>
                  </SortableContext>

                  <button
                    type='button'
                    onClick={() => handleAddStatus(category)}
                    disabled={isLoading}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stroke-soft-200 py-2',
                      'text-label-xs text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950',
                    )}
                  >
                    <RiAddLine className='size-4' />
                    Add Status
                  </button>
                </CategorySection>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
