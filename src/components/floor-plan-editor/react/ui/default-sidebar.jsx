import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  closestCenter,
  DndContext,
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
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Checkbox from '@/components/ui/checkbox';
import { cn } from '@/utils/cn';
import { showErrorToast } from '@/utils/error-utils';

import { annotationGroup, deriveInventoryGroups } from '../../core/inventory-group.js';

import { GlassPanel } from './glass-panel.jsx';
import { LayoutAnalyzeModal } from './layout-analyze-modal.jsx';
import { RiSparkling2Fill } from 'react-icons/ri';

// Single sortable row ─────────────────────────────────────────────────────────
function SortableAnnotationRow(props) {
  const { ann } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ann.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className='group/row'>
      <AnnotationRowContent {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </li>
  );
}

function AnnotationRowContent({
  ann,
  isSelected,
  onSelectRow,
  onHoverRow,
  onUnhoverRow,
  onToggleVisibility,
  onToggleLock,
  onDeleteRow,
  onRenameAnnotation,
  dragHandleProps,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const spaceName = ann.space?.inventory_name || null;
  const displayLabel = ann.label || ann.type;

  const startEditing = (e) => {
    e.stopPropagation();
    setEditValue(displayLabel);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayLabel) {
      onRenameAnnotation?.(ann.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1 rounded-lg border px-1.5 py-1.5 text-left text-paragraph-xs transition-colors cursor-pointer select-none',
        isSelected
          ? 'border-primary-base bg-primary-base/10'
          : 'border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50',
        ann.visible === false && 'opacity-50',
      )}
      onClick={(e) => !editing && onSelectRow(ann.id, e)}
      onMouseEnter={() => onHoverRow?.(ann.id)}
      onMouseLeave={() => onUnhoverRow?.()}
    >
      {/* Drag handle */}
      <span
        {...dragHandleProps}
        className='shrink-0 cursor-grab touch-none text-text-sub-400 active:cursor-grabbing'
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className='size-3' />
      </span>

      {/* Label / input — fixed height so width never shifts */}
      <div
        className='min-w-0 flex-1 overflow-hidden'
        onDoubleClick={editing ? undefined : startEditing}
      >
        {editing ? (
          <input
            ref={inputRef}
            className='h-[18px] w-full rounded border border-primary-base bg-bg-white-0 px-1 text-[11px] text-text-strong-950 outline-none'
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className='truncate text-[11px] font-medium leading-[18px] text-text-strong-950'>
              {displayLabel}
            </div>
            {spaceName ? (
              <div className='truncate text-[10px] leading-[14px] text-text-sub-500'>
                {spaceName}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Action buttons — collapsed during rename so row width stays stable */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0',
          editing && 'invisible w-0 overflow-hidden',
        )}
      >
        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='ghost'
          className='px-1'
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(ann.id);
          }}
          aria-label={ann.visible === false ? 'Show' : 'Hide'}
        >
          {ann.visible === false ? (
            <EyeOff className='size-3.5 opacity-60' />
          ) : (
            <Eye className='size-3.5' />
          )}
        </Button.Root>

        <Button.Root
          type='button'
          size='xsmall'
          variant='neutral'
          mode='ghost'
          className='px-1'
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(ann.id);
          }}
          aria-label={ann.locked ? 'Unlock' : 'Lock'}
        >
          {ann.locked ? <Lock className='size-3.5' /> : <Unlock className='size-3.5 opacity-50' />}
        </Button.Root>

        <Button.Root
          type='button'
          size='xsmall'
          variant='error'
          mode='ghost'
          className='px-1 opacity-0 transition-opacity group-hover/row:opacity-100'
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRow?.(ann.id);
          }}
          aria-label='Delete'
        >
          <Trash2 className='size-3.5' />
        </Button.Root>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {object[]} props.annotations
 * @param {string[]} props.selectedIds
 * @param {(id: string, event: import('react').MouseEvent) => void} props.onSelectRow
 * @param {(id: string) => void} props.onToggleVisibility
 * @param {(id: string) => void} props.onToggleLock
 * @param {(ids: string[], nextVisible: boolean) => void} [props.onToggleGroupVisibility]
 * @param {Record<string, { available: boolean, occupied: boolean }>} [props.groupAvailabilityFilter] per-type canvas filter (both default true)
 * @param {(groupKey: string, field: 'available' | 'occupied', checked: boolean) => void} [props.onGroupAvailabilityChange]
 * @param {(orderedIds: string[]) => void} [props.onReorderAnnotations]
 * @param {(id: string) => void} [props.onDeleteRow]
 * @param {(id: string, label: string) => void} [props.onRenameAnnotation]
 * @param {(id: string) => void} [props.onHoverRow]
 * @param {() => void} [props.onUnhoverRow]
 * @param {string} [props.layoutId] saved Layout document name for AI analyse API
 */
export function DefaultFloorPlanSidebar({
  annotations,
  image,
  selectedIds,
  onSelectRow,
  onToggleVisibility,
  onToggleLock,
  onToggleGroupVisibility,
  groupAvailabilityFilter = {},
  onGroupAvailabilityChange,
  onReorderAnnotations,
  onDeleteRow,
  onRenameAnnotation,
  onHoverRow,
  onUnhoverRow,
  searchPlaceholder = 'Search layers…',
  layoutId = '',
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [analyzeModalOpen, setAnalyzeModalOpen] = useState(false);
  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAnalyzeFloorPlan = () => {
    const id = String(layoutId || '').trim();
    if (!id) {
      showErrorToast(new Error('Save the layout first to run AI analysis.'));
      return;
    }
    setAnalyzeModalOpen(true);
  };

  // Display list: reversed so top z-order annotation appears at top of sidebar (Photoshop style)
  const displayList = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...annotations].reverse().filter((a) => !a.hideFromLayers);
    if (q) {
      list = list.filter((a) => {
        const label = (a.label || a.type || '').toLowerCase();
        const spaceName = (a.space?.inventory_name || a.space_ref || '').toLowerCase();
        const subHint = String(
          a.sub_space_id ??
            a.sub_space_meta?.sub_space_name ??
            a.sub_space_meta?.sub_space_id ??
            '',
        ).toLowerCase();
        return label.includes(q) || spaceName.includes(q) || subHint.includes(q);
      });
    }
    return list;
  }, [annotations, query]);

  const groups = useMemo(() => deriveInventoryGroups(annotations), [annotations]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = displayList.findIndex((a) => a.id === active.id);
    const newIndex = displayList.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Reorder in display order (top=first), then reverse back to z-order (bottom=first)
    const reorderedDisplay = arrayMove(displayList, oldIndex, newIndex);
    onReorderAnnotations?.([...reorderedDisplay].reverse().map((a) => a.id));
  };

  if (collapsed) {
    return (
      <GlassPanel className='flex w-10 shrink-0 flex-col items-center gap-3 py-3'>
        <button
          type='button'
          className='flex size-6 items-center justify-center rounded text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950'
          onClick={() => setCollapsed(false)}
          aria-label='Expand layers panel'
        >
          <ChevronRight className='size-4 rotate-180' />
        </button>
        <Layers className='size-4 text-text-sub-400' aria-hidden />
        <span
          className='text-[10px] font-medium text-text-sub-400'
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Layers
        </span>
      </GlassPanel>
    );
  }

  return (
    <>
      <LayoutAnalyzeModal
        open={analyzeModalOpen}
        onOpenChange={setAnalyzeModalOpen}
        layoutId={layoutId}
      />
      <GlassPanel className='flex max-h-[min(70vh,560px)] w-[240px] shrink-0 flex-col gap-5 p-3'>
        {/* Header */}

        <Button.Root
          size='small'
          variant='primary'
          mode='filled'
          className='w-full gap-2'
          onClick={handleAnalyzeFloorPlan}
        >
          <Button.Icon as={RiSparkling2Fill} />
          Analyse Floor Plan
        </Button.Root>
        <div className='flex items-center gap-2 text-label-sm font-medium text-text-strong-950'>
          <Layers className='size-4 text-text-sub-600' aria-hidden />
          Layers
          <span className='ml-auto text-paragraph-xs font-normal text-text-sub-500'>
            {annotations.length}
          </span>
          <button
            type='button'
            className='flex size-5 items-center justify-center rounded text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950'
            onClick={() => setCollapsed(true)}
            aria-label='Collapse layers panel'
          >
            <ChevronRight className='size-3.5' />
          </button>
        </div>

        {/* Group visibility chips */}
        {groups.length > 0 && (
          <div className='flex w-full min-w-0 flex-col gap-3'>
            {groups.map(({ key, count }, groupIndex) => {
              const ids = annotations.filter((a) => annotationGroup(a) === key).map((a) => a.id);
              const allVisible = annotations
                .filter((a) => annotationGroup(a) === key)
                .every((a) => a.visible !== false);
              const filter = groupAvailabilityFilter[key] ?? {
                available: true,
                occupied: true,
              };
              const availId = `floor-plan-layer-${groupIndex}-available`;
              const occId = `floor-plan-layer-${groupIndex}-occupied`;
              return (
                <div key={key} className='flex w-full min-w-0 flex-row items-start gap-2'>
                  <Button.Root
                    type='button'
                    size='xsmall'
                    variant='neutral'
                    mode='ghost'
                    className='size-7 shrink-0 p-0'
                    title={allVisible ? 'Hide this type on canvas' : 'Show this type on canvas'}
                    aria-label={allVisible ? 'Hide group' : 'Show group'}
                    aria-pressed={allVisible}
                    onClick={() => onToggleGroupVisibility?.(ids, !allVisible)}
                  >
                    {allVisible ? (
                      <Eye className='size-3.5' />
                    ) : (
                      <EyeOff className='size-3.5 opacity-60' />
                    )}
                  </Button.Root>

                  <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                    <Badge.Root asChild variant='light' mode='stroke' color='purple' size='small'>
                      <span className='w-fit min-w-0 max-w-full self-start truncate' title={key}>
                        {key}
                        <span
                          className={cn(
                            'ml-0.5 font-normal tabular-nums bg-white rounded-full items-center px-1 flex text-text-main-900',
                          )}
                        >
                          {count}
                        </span>
                      </span>
                    </Badge.Root>

                    <div
                      className='flex min-w-0 flex-col gap-1.5'
                      role='group'
                      aria-label={`${key} canvas availability`}
                    >
                      <div className='flex items-center gap-2'>
                        <Checkbox.Root
                          id={availId}
                          size='small'
                          checked={filter.available}
                          onCheckedChange={(checked) =>
                            onGroupAvailabilityChange?.(key, 'available', checked === true)
                          }
                        />
                        <label
                          htmlFor={availId}
                          className='cursor-pointer select-none text-paragraph-xs text-text-strong-950'
                        >
                          Available
                        </label>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Checkbox.Root
                          id={occId}
                          size='small'
                          checked={filter.occupied}
                          onCheckedChange={(checked) =>
                            onGroupAvailabilityChange?.(key, 'occupied', checked === true)
                          }
                        />
                        <label
                          htmlFor={occId}
                          className='cursor-pointer select-none text-paragraph-xs text-text-strong-950'
                        >
                          Occupied
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <input
          type='search'
          className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 text-paragraph-xs outline-none focus:border-primary-base'
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label='Search layers'
        />

        {/* Sortable flat list */}
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5'>
          {displayList.length === 0 ? (
            <p className='text-paragraph-xs text-text-sub-500'>No layers match.</p>
          ) : (
            // <DndContext
            //   sensors={sensors}
            //   collisionDetection={closestCenter}
            //   onDragEnd={handleDragEnd}
            // >
            <SortableContext
              items={displayList.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className='flex flex-col gap-1'>
                {displayList.map((ann) => (
                  <SortableAnnotationRow
                    key={ann.id}
                    ann={ann}
                    isSelected={selectionSet.has(ann.id)}
                    onSelectRow={onSelectRow}
                    onHoverRow={onHoverRow}
                    onUnhoverRow={onUnhoverRow}
                    onToggleVisibility={onToggleVisibility}
                    onToggleLock={onToggleLock}
                    onDeleteRow={onDeleteRow}
                    onRenameAnnotation={onRenameAnnotation}
                  />
                ))}
              </ul>
            </SortableContext>
            // </DndContext>
          )}
        </div>
      </GlassPanel>
    </>
  );
}
