import React, { useCallback, useMemo, useRef, useState } from 'react';
import { flexRender } from '@tanstack/react-table';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RiDraggable } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import * as Table from '@/components/ui/table';
import ColumnHeaderMenu from '@/components/ui/column-header-menu';
import { getFrozenTanStackColumnProp, getFrozenHeaderTableProps } from '@/lib/frozen-table-columns';
import { LEAD_COLUMN_MIN_WIDTH, LEAD_COLUMN_MAX_WIDTH } from '@/components/crm-leads/constants';

const PINNED_COLUMN_ID = 'name';
const ACTIONS_COLUMN_ID = 'actions';

function isHeaderSortable(columnId) {
  return columnId !== PINNED_COLUMN_ID && columnId !== ACTIONS_COLUMN_ID;
}

function getLeadHeaderColumnWidth(colId, width) {
  if (colId === ACTIONS_COLUMN_ID) return 60;
  return width;
}

function getLeadHeaderColumnMinWidth(colId) {
  if (colId === ACTIONS_COLUMN_ID) return 60;
  return LEAD_COLUMN_MIN_WIDTH;
}

function LeadTableHeadCell({
  header,
  width,
  canResize,
  onResizeStart,
  freezeColumns,
  setNodeRef,
  styleExtras,
  classNameExtras,
  dragHandle = null,
  onOpenColumnMenu = null,
}) {
  const colId = header.column.id;
  const canOpenMenu = Boolean(onOpenColumnMenu) && isHeaderSortable(colId);

  const handleOpenMenu = (event) => {
    if (!canOpenMenu) return;
    if (event.target.closest('button, [role="separator"]')) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenColumnMenu(colId, event);
  };

  return (
    <Table.Head
      ref={setNodeRef}
      {...getFrozenTanStackColumnProp(freezeColumns, header.column)}
      className={cn(
        'px-4 relative font-medium label-small text-text-sub-600 overflow-hidden',
        header.column.columnDef.meta?.headClassName,
        canOpenMenu && 'cursor-pointer',
        classNameExtras,
      )}
      style={{
        width: getLeadHeaderColumnWidth(colId, width),
        minWidth: getLeadHeaderColumnMinWidth(colId),
        maxWidth: LEAD_COLUMN_MAX_WIDTH,
        paddingRight: canResize && colId !== ACTIONS_COLUMN_ID ? '2rem' : undefined,
        ...styleExtras,
      }}
      onClick={canOpenMenu ? handleOpenMenu : undefined}
      onContextMenu={canOpenMenu ? handleOpenMenu : undefined}
    >
      <div className='flex items-center gap-0.5 min-w-0'>
        {dragHandle}
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </div>
      {canResize && colId !== ACTIONS_COLUMN_ID && onResizeStart ? (
        <div
          role='separator'
          aria-orientation='vertical'
          aria-label={`Resize ${colId} column`}
          className='absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-stroke-sub-300 shrink-0'
          onMouseDown={(event) => {
            event.preventDefault();
            onResizeStart(colId, event.clientX);
          }}
        />
      ) : null}
    </Table.Head>
  );
}

function StaticLeadTableHead({
  header,
  width,
  canResize,
  onResizeStart,
  freezeColumns,
  onOpenColumnMenu,
}) {
  return (
    <LeadTableHeadCell
      header={header}
      width={width}
      canResize={canResize}
      onResizeStart={onResizeStart}
      freezeColumns={freezeColumns}
      onOpenColumnMenu={onOpenColumnMenu}
    />
  );
}

function SortableLeadTableHead({
  header,
  width,
  canResize,
  onResizeStart,
  freezeColumns,
  onOpenColumnMenu,
}) {
  const colId = header.column.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: colId,
  });

  return (
    <LeadTableHeadCell
      header={header}
      width={width}
      canResize={canResize}
      onResizeStart={onResizeStart}
      freezeColumns={freezeColumns}
      setNodeRef={setNodeRef}
      classNameExtras={isDragging ? 'opacity-40 z-20' : undefined}
      styleExtras={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onOpenColumnMenu={onOpenColumnMenu}
      dragHandle={
        <button
          type='button'
          ref={setActivatorNodeRef}
          className='shrink-0 text-text-soft-400 cursor-grab active:cursor-grabbing touch-none'
          aria-label={`Reorder ${colId} column`}
          {...attributes}
          {...listeners}
        >
          <RiDraggable size={14} />
        </button>
      }
    />
  );
}

/**
 * Header row(s) with boards-style drag reorder + column options menu.
 * Pinned (`name`) and `actions` stay outside SortableContext.
 */
export function CrmLeadsSortableHeader({
  table,
  getWidth,
  canResize = false,
  onResizeStart,
  freezeColumns = false,
  onReorderColumnsByIds,
  columnConfig = [],
  groupBy = '',
  groupableColumnIds = [],
  onSortColumn,
  onGroupColumn,
  onHideColumn,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const [openColumnId, setOpenColumnId] = useState(null);
  const columnMenuAnchorRef = useRef(null);

  const headerGroups = table.getHeaderGroups();
  const sortableIds = useMemo(() => {
    const headers = headerGroups[0]?.headers ?? [];
    return headers.map((header) => header.column.id).filter(isHeaderSortable);
  }, [headerGroups]);

  const reorderableIds = useMemo(() => {
    const ids = (Array.isArray(columnConfig) ? columnConfig : [])
      .map((col) => col?.id)
      .filter((id) => id && isHeaderSortable(id));
    return ids.length > 0 ? ids : sortableIds;
  }, [columnConfig, sortableIds]);

  const openColumnMeta = useMemo(() => {
    if (!openColumnId) return null;
    const fromConfig = (Array.isArray(columnConfig) ? columnConfig : []).find(
      (col) => col.id === openColumnId,
    );
    const header = headerGroups[0]?.headers?.find((h) => h.column.id === openColumnId);
    const label = fromConfig?.label || openColumnId;
    const canSort = header?.column?.getCanSort?.() !== false;
    const canHide = fromConfig?.enableHiding !== false;
    const canGroup = groupableColumnIds.includes(openColumnId);
    const index = reorderableIds.indexOf(openColumnId);
    return {
      id: openColumnId,
      label,
      canSort,
      canHide,
      canGroup,
      canMoveLeft: index > 0,
      canMoveRight: index >= 0 && index < reorderableIds.length - 1,
      isGroupedByColumn: groupBy === openColumnId,
    };
  }, [columnConfig, groupBy, groupableColumnIds, headerGroups, openColumnId, reorderableIds]);

  const handleOpenColumnMenu = useCallback((columnId, event) => {
    if (!isHeaderSortable(columnId)) return;
    columnMenuAnchorRef.current = event.currentTarget;
    setOpenColumnId(columnId);
  }, []);

  const handleCloseColumnMenu = useCallback(() => {
    setOpenColumnId(null);
    columnMenuAnchorRef.current = null;
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      if (!isHeaderSortable(String(active.id)) || !isHeaderSortable(String(over.id))) {
        return;
      }
      onReorderColumnsByIds?.(String(active.id), String(over.id));
    },
    [onReorderColumnsByIds],
  );

  const handleMove = useCallback(
    (direction) => {
      if (!openColumnId) return;
      const index = reorderableIds.indexOf(openColumnId);
      if (index < 0) return;
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      const overId = reorderableIds[targetIndex];
      if (!overId) return;
      onReorderColumnsByIds?.(openColumnId, overId);
    },
    [onReorderColumnsByIds, openColumnId, reorderableIds],
  );

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table.Header {...getFrozenHeaderTableProps(freezeColumns)}>
          {headerGroups.map((headerGroup) => {
            const headers = headerGroup.headers;
            const leadingFixed = [];
            const sortableHeaders = [];
            const trailingFixed = [];
            headers.forEach((header) => {
              const id = header.column.id;
              if (id === PINNED_COLUMN_ID) {
                leadingFixed.push(header);
              } else if (id === ACTIONS_COLUMN_ID) {
                trailingFixed.push(header);
              } else if (isHeaderSortable(id)) {
                sortableHeaders.push(header);
              } else {
                leadingFixed.push(header);
              }
            });

            const renderStatic = (header) => (
              <StaticLeadTableHead
                key={header.id}
                header={header}
                width={getWidth(header.column.id)}
                canResize={canResize}
                onResizeStart={onResizeStart}
                freezeColumns={freezeColumns}
                onOpenColumnMenu={handleOpenColumnMenu}
              />
            );

            return (
              <Table.Row key={headerGroup.id} className='group/header bg-bg-weak-50'>
                {leadingFixed.map(renderStatic)}
                <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                  {sortableHeaders.map((header) => (
                    <SortableLeadTableHead
                      key={header.id}
                      header={header}
                      width={getWidth(header.column.id)}
                      canResize={canResize}
                      onResizeStart={onResizeStart}
                      freezeColumns={freezeColumns}
                      onOpenColumnMenu={handleOpenColumnMenu}
                    />
                  ))}
                </SortableContext>
                {trailingFixed.map(renderStatic)}
              </Table.Row>
            );
          })}
        </Table.Header>
      </DndContext>

      {openColumnId && openColumnMeta && columnMenuAnchorRef.current ? (
        <ColumnHeaderMenu
          anchorRef={columnMenuAnchorRef}
          column={openColumnMeta}
          onClose={handleCloseColumnMenu}
          onSort={() => onSortColumn?.(openColumnId)}
          onGroup={() => onGroupColumn?.(openColumnId)}
          onMoveLeft={() => handleMove('left')}
          onMoveRight={() => handleMove('right')}
          onHideColumn={() => onHideColumn?.(openColumnId)}
          canSort={openColumnMeta.canSort}
          canGroup={openColumnMeta.canGroup}
          isGroupedByColumn={openColumnMeta.isGroupedByColumn}
          canMoveLeft={openColumnMeta.canMoveLeft}
          canMoveRight={openColumnMeta.canMoveRight}
          canHide={openColumnMeta.canHide}
        />
      ) : null}
    </>
  );
}
