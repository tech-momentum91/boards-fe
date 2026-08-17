// column-manager-dropdown.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { RiDraggable, RiSearchLine, RiCloseLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import * as Dropdown from '@/components/ui/dropdown';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Switch from '@/components/ui/switch';
import * as Tooltip from '@/components/ui/tooltip';
import { FIRST_COLUMN_NAME } from '@/constants/constants';

/**
 * Sortable Column Item
 */
const SortableColumnItem = ({ column, onToggle, showDragHandle, pinned = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: !showDragHandle || pinned,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isVisible = column.visible;
  const canHide = column.enableHiding !== false && !pinned;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg transition-all',
        isVisible ? 'bg-bg-weak-100 p-1.5' : 'p-1.5 pl-2',
        isDragging && 'z-50 shadow-lg',
      )}
    >
      {/* Drag Handle */}
      {showDragHandle && isVisible && !pinned && (
        <div
          {...attributes}
          {...listeners}
          className='shrink-0 text-text-soft-400 cursor-grab active:cursor-grabbing'
        >
          <RiDraggable className='size-5' />
        </div>
      )}
      {/* Spacer for pinned column to maintain alignment */}
      {showDragHandle && isVisible && pinned && <div className='shrink-0 w-5' />}

      {/* Label */}
      <div className='flex-1 text-left'>
        <span className='text-paragraph-sm text-text-main-900'>{column.label || column.id}</span>
      </div>

      {/* Toggle */}
      <Switch.Root
        checked={isVisible}
        disabled={!canHide}
        onCheckedChange={() => canHide && onToggle(column.id)}
        className={cn('h-5 w-8', !canHide && 'opacity-50 cursor-not-allowed')}
      />
    </div>
  );
};

/**
 * Column Manager Dropdown
 *
 * Accepts either:
 * - config object (from useColumnConfig hook) - simpler API
 * - individual props (columns, onReorder, etc.) - legacy API
 */
const ColumnManagerDropdown = ({
  open,
  onOpenChange,
  // New simplified API: pass config object from useColumnConfig
  config,
  // Legacy API: individual props
  columns: columnsProperty,
  onReorder,
  onToggleVisibility,
  onShowAll,
  onHideAll,
  trigger,
  tooltipContent,
  /**
   * Optional explicit column id to pin as the sticky/first column. Overrides the
   * `FIRST_COLUMN_NAME` heuristic, which can pick the wrong column when a table
   * contains more than one candidate (e.g. both `product` and `name`).
   */
  pinnedColumnId: pinnedColumnIdProp,
  /** Optional footer content (e.g. resize toggle + reset) rendered at bottom center */
  footer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Use config object if provided, otherwise use individual props
  const columns = config?.columns ?? columnsProperty ?? [];
  const handleReorder = config?.reorderColumns ?? onReorder;
  const handleToggle = config?.toggleColumnVisibility ?? onToggleVisibility;
  const handleShowAll = config?.showAllColumns ?? onShowAll;
  const handleHideAll = config?.hideAllColumns ?? onHideAll;

  const [localColumns, setLocalColumns] = useState(columns);

  // Sync local state whenever the external columns reference changes.
  // We intentionally only depend on `columns` here so that local interactions
  // (dragging/toggling) are not overwritten by stale props coming from refs
  // in the legacy API. Newer usages that feed updated config from parent state
  // will still cause `columns` to change and re-sync correctly.
  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  // Determine which single column should be pinned. An explicit `pinnedColumnId`
  // prop wins when present in the column set; otherwise fall back to the first
  // match from FIRST_COLUMN_NAME.
  const pinnedColumnId = useMemo(() => {
    if (pinnedColumnIdProp && localColumns.some((c) => c.id === pinnedColumnIdProp)) {
      return pinnedColumnIdProp;
    }
    for (const key of FIRST_COLUMN_NAME ?? []) {
      if (localColumns.some((c) => c.id === key)) return key;
    }
    return null;
  }, [localColumns, pinnedColumnIdProp]);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Filter by search and exclude actions column
  const filteredColumns = useMemo(() => {
    // First exclude the actions column
    const columnsWithoutActions = localColumns.filter(
      (col) => col.id !== 'actions' && !col.hideFromManager,
    );

    if (!searchQuery) return columnsWithoutActions;

    const query = searchQuery.toLowerCase();
    return columnsWithoutActions.filter((col) => {
      const label = (col.label || col.id || '').toLowerCase();
      return label.includes(query);
    });
  }, [localColumns, searchQuery]);

  // Resolve pinned column (if present in filtered list)
  const pinnedColumn = useMemo(
    () => (pinnedColumnId ? filteredColumns.find((c) => c.id === pinnedColumnId) : null),
    [filteredColumns, pinnedColumnId],
  );

  // Split into shown and hidden (excluding pinned)
  const shownColumns = useMemo(
    () => filteredColumns.filter((col) => col.visible && col.id !== pinnedColumnId),
    [filteredColumns, pinnedColumnId],
  );

  const hiddenColumns = useMemo(
    () => filteredColumns.filter((col) => !col.visible && col.id !== pinnedColumnId),
    [filteredColumns, pinnedColumnId],
  );

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localColumns.findIndex((col) => col.id === active.id);
    const newIndex = localColumns.findIndex((col) => col.id === over.id);

    const reordered = arrayMove(localColumns, oldIndex, newIndex);
    setLocalColumns(reordered);

    handleReorder?.(oldIndex, newIndex);
  };

  // Handle toggle
  const handleToggleColumn = (columnId) => {
    if (columnId === pinnedColumnId) return; // Prevent toggling pinned column

    setLocalColumns((previous) =>
      previous.map((col) => (col.id === columnId ? { ...col, visible: !col.visible } : col)),
    );
    handleToggle?.(columnId);
  };

  // Handle show/hide all
  const handleShowAllColumns = () => {
    setLocalColumns((previous) =>
      previous.map((col) =>
        col.id === pinnedColumnId || col.enableHiding === false ? col : { ...col, visible: true },
      ),
    );
    handleShowAll?.();
  };

  const handleHideAllColumns = () => {
    setLocalColumns((previous) =>
      previous.map((col) =>
        col.id === pinnedColumnId || col.enableHiding === false ? col : { ...col, visible: false },
      ),
    );
    handleHideAll?.();
  };

  // Ensure pinned column stays visible
  useEffect(() => {
    if (!pinnedColumnId) return;
    setLocalColumns((previous) =>
      previous.map((col) => (col.id === pinnedColumnId ? { ...col, visible: true } : col)),
    );
  }, [pinnedColumnId]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  return (
    <Dropdown.Root open={open} onOpenChange={onOpenChange}>
      {trigger &&
        (tooltipContent ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
            </Tooltip.Trigger>
            <Tooltip.Content>{tooltipContent}</Tooltip.Content>
          </Tooltip.Root>
        ) : (
          <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
        ))}

      <Dropdown.Content
        align='end'
        collisionPadding={8}
        avoidCollisions={true}
        className='w-[340px] p-0 gap-0 flex flex-col overflow-hidden'
      >
        {/* Search */}
        <div className='p-2 shrink-0'>
          <Input.Root size='small' className='w-full'>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine className='size-5 text-text-soft-400' />
              </Input.Icon>
              <Input.Input
                type='text'
                placeholder='Search...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='ghost'
                  size='xxsmall'
                  className='h-auto min-h-0 p-1 text-text-sub-400 hover:text-text-strong-950'
                  onClick={() => setSearchQuery('')}
                >
                  <RiCloseLine className='size-4' />
                </Button.Root>
              )}
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='h-px bg-stroke-soft-200 shrink-0' />

        {/* Column List — flex-1 so footer stays visible at bottom */}
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {filteredColumns.length === 0 ? (
            <div className='py-8 text-center text-sm text-text-soft-400'>No columns found</div>
          ) : (
            <div className='flex flex-col gap-1 p-2'>
              {/* Shown Section */}
              <div className='flex flex-col gap-1'>
                <div className='flex items-center justify-between px-2 py-0 h-6'>
                  <p className='text-subheading-2xs text-text-soft-400 uppercase'>Shown</p>
                  {shownColumns.length > 0 && (
                    <Button.Root
                      type='button'
                      variant='primary'
                      mode='ghost'
                      size='xsmall'
                      className='px-2 text-xs text-primary-base'
                      onClick={handleHideAllColumns}
                    >
                      Hide All
                    </Button.Root>
                  )}
                </div>

                {!pinnedColumn && shownColumns.length === 0 ? (
                  <div className='px-2 py-2 text-sm text-text-soft-400 text-center'>
                    No columns shown
                  </div>
                ) : (
                  <div className='flex flex-col gap-1 pb-2'>
                    {/* Pinned Column (non-draggable, always visible) */}
                    {pinnedColumn && (
                      <SortableColumnItem
                        key={pinnedColumn.id}
                        column={{ ...pinnedColumn, visible: true, enableHiding: false }}
                        onToggle={handleToggleColumn}
                        showDragHandle={true}
                        pinned={true}
                      />
                    )}

                    {/* Other Shown Columns (draggable) */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={shownColumns.map((col) => col.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {shownColumns.map((column) => (
                          <SortableColumnItem
                            key={column.id}
                            column={column}
                            onToggle={handleToggleColumn}
                            showDragHandle={true}
                            pinned={false}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>

              {/* Hidden Section */}
              {hiddenColumns.length > 0 && (
                <div className='flex flex-col gap-1 pt-1'>
                  <div className='flex items-center justify-between px-2 py-1'>
                    <p className='text-subheading-2xs text-text-soft-400 uppercase'>Hidden</p>
                    <Button.Root
                      type='button'
                      variant='primary'
                      mode='ghost'
                      size='xsmall'
                      className='px-2 text-xs text-primary-base'
                      onClick={handleShowAllColumns}
                    >
                      Show All
                    </Button.Root>
                  </div>

                  <div className='flex flex-col gap-1'>
                    {hiddenColumns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        onToggle={handleToggleColumn}
                        showDragHandle={false}
                        pinned={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (resize toggle + reset) — fixed at bottom, always visible */}
        {footer != null && (
          <>
            <div className='h-px bg-stroke-soft-200 shrink-0' />
            <div className='p-2 flex flex-col items-stretch gap-2 shrink-0 bg-bg-white-0'>
              {footer}
            </div>
          </>
        )}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default ColumnManagerDropdown;
