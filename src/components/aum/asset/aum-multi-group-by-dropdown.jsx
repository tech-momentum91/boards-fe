import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDraggable,
  RiStackLine,
} from 'react-icons/ri';

import {
  AUM_DEFAULT_GROUP_BY_RULES,
  AUM_MULTI_GROUP_BY_FIELD_IDS,
  AUM_MULTI_GROUP_BY_OPTIONS,
  AUM_TOOLBAR_COPY,
} from '@/components/aum/constants';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
import * as Popover from '@/components/ui/popover';
import * as Select from '@/components/ui/select';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

let nextGroupRuleId = 1;

function createGroupRule(field = '', order = 'asc') {
  nextGroupRuleId += 1;
  return {
    id: `group-${nextGroupRuleId}`,
    field,
    order,
  };
}

function normalizeGroupRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return [];
  return rules
    .filter((rule) => rule?.field)
    .map((rule) => ({
      id: rule.id || createGroupRule().id,
      field: rule.field,
      order: rule.order === 'desc' ? 'desc' : 'asc',
    }));
}

function getAvailableOptions(rules, currentField, fieldOptions) {
  const usedFields = new Set(rules.map((rule) => rule.field).filter(Boolean));
  return fieldOptions.filter(
    (option) => option.value === currentField || !usedFields.has(option.value),
  );
}

function createStarterRules(starterField) {
  return [createGroupRule(starterField, 'asc')];
}

const controlShadow =
  'shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] hover:shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]';

function isSelectOverlayTarget(target) {
  return (
    target instanceof Element &&
    (target.closest('[data-radix-select-content]') ||
      target.closest('[role="listbox"]') ||
      target.closest('[data-radix-popper-content-wrapper]'))
  );
}

const SortableGroupByRule = memo(
  ({ rule, options, onFieldChange, onToggleOrder, onRemove, onSelectOpenChange, canRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: rule.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isAscending = rule.order !== 'desc';

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex min-w-0 items-center gap-1.5 px-2 pt-1.5',
          isDragging && 'relative z-50 rounded-lg bg-bg-white-0 shadow-lg',
        )}
      >
        <button
          type='button'
          className='flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-transparent text-text-soft-400 active:cursor-grabbing'
          aria-label='Drag to reorder group level'
          {...attributes}
          {...listeners}
        >
          <RiDraggable className='size-4' aria-hidden />
        </button>

        <Select.Root
          value={rule.field || ''}
          onValueChange={(value) => onFieldChange(rule.id, value)}
          onOpenChange={onSelectOpenChange}
          size='small'
        >
          <Select.Trigger
            className={cn(
              'h-8 min-w-0 flex-1 rounded-lg border-stroke-soft-200 px-2 py-1 text-label-xs',
              controlShadow,
            )}
          >
            <Select.Value placeholder='Select field' />
          </Select.Trigger>
          <Select.Content
            className='z-[10000]'
            position='popper'
            side='bottom'
            sideOffset={4}
            align='start'
          >
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        <button
          type='button'
          className={cn(
            'flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-1 py-1',
            controlShadow,
          )}
          onClick={() => onToggleOrder(rule.id)}
          aria-label={isAscending ? 'Ascending order' : 'Descending order'}
        >
          {isAscending ? (
            <RiArrowUpLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
          ) : (
            <RiArrowDownLine className='size-4 shrink-0 text-text-sub-500' aria-hidden />
          )}
          <span className='whitespace-nowrap px-0.5 text-label-xs font-medium text-text-sub-500'>
            {isAscending ? 'Ascending' : 'Descending'}
          </span>
        </button>

        {canRemove ? (
          <button
            type='button'
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1',
              controlShadow,
            )}
            onClick={() => onRemove(rule.id)}
            aria-label='Remove group level'
          >
            <RiDeleteBin6Line className='size-4 text-text-sub-500' aria-hidden />
          </button>
        ) : (
          <div className='size-8 shrink-0' aria-hidden />
        )}
      </div>
    );
  },
);

SortableGroupByRule.displayName = 'SortableGroupByRule';

const AumMultiGroupByDropdown = memo(
  ({
    rules = AUM_DEFAULT_GROUP_BY_RULES,
    onChange,
    fieldOptions = AUM_MULTI_GROUP_BY_OPTIONS,
    starterField = AUM_MULTI_GROUP_BY_FIELD_IDS.PRODUCT_GROUP,
    addMoreLabel = AUM_TOOLBAR_COPY.addMoreGroupLabel,
    menuLabel = AUM_TOOLBAR_COPY.groupByMenuLabel,
    clearLabel = AUM_TOOLBAR_COPY.groupByClear,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [draftRules, setDraftRules] = useState(() => normalizeGroupRules(rules));
    const openSelectCountRef = useRef(0);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const activeRules = useMemo(() => normalizeGroupRules(rules), [rules]);
    const hasActiveRules = activeRules.length > 0;

    useEffect(() => {
      if (isOpen) {
        setDraftRules(activeRules.length > 0 ? activeRules : createStarterRules(starterField));
      }
    }, [isOpen, activeRules, starterField]);

    const fieldsChipLabel = useMemo(() => {
      const count = activeRules.length;
      if (count === 0) return 'Group by';
      if (count === 1) {
        const fieldLabel = fieldOptions.find(
          (option) => option.value === activeRules[0]?.field,
        )?.label;
        return fieldLabel ?? '1 field';
      }
      return `${count} fields`;
    }, [activeRules, fieldOptions]);

    const commitRules = useCallback(
      (nextRules) => {
        onChange?.(normalizeGroupRules(nextRules));
      },
      [onChange],
    );

    const handleOpenChange = useCallback(
      (open) => {
        if (!open && openSelectCountRef.current > 0) {
          return;
        }
        if (!open && isOpen) {
          openSelectCountRef.current = 0;
          commitRules(draftRules);
        }
        setIsOpen(open);
      },
      [commitRules, draftRules, isOpen],
    );

    const handleSelectOpenChange = useCallback((open) => {
      openSelectCountRef.current = Math.max(0, openSelectCountRef.current + (open ? 1 : -1));
    }, []);

    const handlePopoverInteractOutside = useCallback((event) => {
      if (isSelectOverlayTarget(event.target)) {
        event.preventDefault();
      }
    }, []);

    const handleClear = useCallback(() => {
      commitRules([]);
      setDraftRules(createStarterRules(starterField));
      setIsOpen(false);
    }, [commitRules, starterField]);

    const handleAddRule = useCallback(() => {
      setDraftRules((current) => {
        const usedFields = new Set(current.map((rule) => rule.field));
        const nextField = fieldOptions.find((option) => !usedFields.has(option.value))?.value || '';
        if (!nextField) return current;
        return [...current, createGroupRule(nextField, 'asc')];
      });
    }, [fieldOptions]);

    const handleRemoveRule = useCallback((ruleId) => {
      setDraftRules((current) => current.filter((rule) => rule.id !== ruleId));
    }, []);

    const handleFieldChange = useCallback((ruleId, field) => {
      setDraftRules((current) =>
        current.map((rule) => (rule.id === ruleId ? { ...rule, field } : rule)),
      );
    }, []);

    const toggleRuleOrder = useCallback((ruleId) => {
      setDraftRules((current) =>
        current.map((rule) =>
          rule.id === ruleId ? { ...rule, order: rule.order === 'asc' ? 'desc' : 'asc' } : rule,
        ),
      );
    }, []);

    const handleDragEnd = useCallback((event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setDraftRules((current) => {
        const oldIndex = current.findIndex((rule) => rule.id === active.id);
        const newIndex = current.findIndex((rule) => rule.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return current;
        return arrayMove(current, oldIndex, newIndex);
      });
    }, []);

    const canAddMore = draftRules.length < fieldOptions.length;
    const sortableIds = useMemo(() => draftRules.map((rule) => rule.id), [draftRules]);

    return (
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange} modal={false}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              {hasActiveRules ? (
                <button
                  type='button'
                  className='flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-primary-light bg-primary-lighter px-1.5 py-1.5'
                  aria-label='Group by fields'
                >
                  <RiStackLine className='size-5 shrink-0 text-primary-base' aria-hidden />
                  <span className='px-1 text-label-sm font-medium text-primary-base'>
                    {fieldsChipLabel}
                  </span>
                  <span
                    role='button'
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClear();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleClear();
                      }
                    }}
                    className='flex size-[18px] items-center justify-center rounded-md bg-primary-light text-primary-base opacity-60 hover:opacity-100'
                    aria-label='Clear grouping'
                  >
                    <RiCloseLine className='size-4' />
                  </span>
                </button>
              ) : (
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='small'
                  className='h-8 shrink-0 gap-1.5 px-2.5'
                  aria-label='Group by fields'
                >
                  <Button.Icon as={RiStackLine} />
                  <span className='text-paragraph-sm'>Group by</span>
                </Button.Root>
              )}
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <span className='paragraph-xsmall'>Group by</span>
          </Tooltip.Content>
        </Tooltip.Root>

        <Popover.Content
          align='end'
          showArrow={false}
          className='w-[348px] overflow-hidden p-2'
          onInteractOutside={handlePopoverInteractOutside}
          onPointerDownOutside={handlePopoverInteractOutside}
        >
          <div className='flex w-full flex-col gap-1'>
            <div className='flex items-center justify-between px-2 pt-3'>
              <span className='text-subheading-2xs uppercase text-text-soft-400'>{menuLabel}</span>
              <LinkButton.Root variant='primary' size='small' onClick={handleClear}>
                {clearLabel}
              </LinkButton.Root>
            </div>

            <div className='flex flex-col gap-1 pb-2'>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {draftRules.map((rule) => (
                    <SortableGroupByRule
                      key={rule.id}
                      rule={rule}
                      options={getAvailableOptions(draftRules, rule.field, fieldOptions)}
                      onFieldChange={handleFieldChange}
                      onToggleOrder={toggleRuleOrder}
                      onRemove={handleRemoveRule}
                      onSelectOpenChange={handleSelectOpenChange}
                      canRemove={draftRules.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              <div className='p-2'>
                <button
                  type='button'
                  disabled={!canAddMore}
                  onClick={handleAddRule}
                  className={cn(
                    'flex h-8 w-full items-center justify-center gap-0.5 rounded-lg bg-bg-weak-100 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)]',
                    canAddMore
                      ? 'text-text-main-900 hover:bg-bg-weak-100/80'
                      : 'cursor-not-allowed opacity-50',
                  )}
                >
                  <RiAddLine className='size-4 shrink-0' aria-hidden />
                  <span className='px-1 text-label-xs font-medium'>{addMoreLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    );
  },
);

AumMultiGroupByDropdown.displayName = 'AumMultiGroupByDropdown';

export default AumMultiGroupByDropdown;

export { createGroupRule, normalizeGroupRules };
