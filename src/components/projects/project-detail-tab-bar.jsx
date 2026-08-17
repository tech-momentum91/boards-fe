import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RiArrowDownSLine, RiPushpin2Fill, RiPushpin2Line } from 'react-icons/ri';
import * as Dropdown from '@/components/ui/dropdown';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import { PROJECT_TAB_TRIGGER_CLASS } from '@/components/projects/constants';
import { cn } from '@/utils/cn';

const TAB_GAP = 24;
const MORE_BUTTON_WIDTH = 76;

/** Keep tab reordering on the X axis only — vertical drag was creating page scroll / empty space. */
function restrictToHorizontalAxis({ transform }) {
  return {
    ...transform,
    y: 0,
  };
}

function SortableTabTrigger({ tab, tabIconMap, isPinned, onTogglePin }) {
  const Icon = tabIconMap[tab.icon] ?? tabIconMap['task-line'];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const lockedTransform = transform ? { ...transform, y: 0 } : null;
  const style = {
    transform: CSS.Transform.toString(lockedTransform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='group/tab-pill flex shrink-0 items-center gap-0.5 touch-none'
    >
      <TabMenuHorizontal.Trigger
        value={tab.id}
        className={cn(
          PROJECT_TAB_TRIGGER_CLASS,
          'cursor-grab gap-1.5 active:cursor-grabbing',
          isDragging && 'cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
      >
        <TabMenuHorizontal.Icon as={Icon} />
        {tab.label}
      </TabMenuHorizontal.Trigger>
      <button
        type='button'
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onTogglePin(tab.id);
        }}
        className={cn(
          'rounded p-0.5 transition hover:bg-bg-weak-50',
          isPinned
            ? 'text-primary-base opacity-100'
            : 'text-text-soft-400 opacity-0 group-hover/tab-pill:opacity-100',
        )}
        aria-label={isPinned ? `Unpin ${tab.label}` : `Pin ${tab.label}`}
        title={isPinned ? 'Unpin section' : 'Pin section'}
      >
        {isPinned ? (
          <RiPushpin2Fill className='size-3.5' />
        ) : (
          <RiPushpin2Line className='size-3.5' />
        )}
      </button>
    </div>
  );
}

function useTabOverflow({ tabs, pinnedIds, activeTab, containerRef, measureRef }) {
  const [split, setSplit] = useState({ visible: tabs, overflow: [], showMore: false });

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || tabs.length === 0) {
      setSplit({ visible: tabs, overflow: [], showMore: false });
      return;
    }

    const tabElements = measure.querySelectorAll('[data-tab-measure]');
    const widthById = new Map();
    tabs.forEach((tab, index) => {
      const element = tabElements[index];
      widthById.set(tab.id, element?.getBoundingClientRect().width ?? 0);
    });

    const pinnedSet = new Set(pinnedIds);

    const sumWidths = (tabList, includeGaps = true) =>
      tabList.reduce((total, tab, index) => {
        const width = widthById.get(tab.id) ?? 0;
        if (index === 0) return total + width;
        return total + width + (includeGaps ? TAB_GAP : 0);
      }, 0);

    const containerWidth = container.clientWidth;
    const totalWidth = sumWidths(tabs);

    if (totalWidth <= containerWidth) {
      setSplit({ visible: tabs, overflow: [], showMore: false });
      return;
    }

    const visible = [];
    const overflow = [];
    let used = 0;

    tabs.forEach((tab) => {
      const isPinned = pinnedSet.has(tab.id);
      const width = widthById.get(tab.id) ?? 0;
      const gap = visible.length > 0 ? TAB_GAP : 0;

      if (isPinned) {
        visible.push(tab);
        used += gap + width;
        return;
      }

      const tabIndex = tabs.findIndex((entry) => entry.id === tab.id);
      const remainingUnpinned = tabs.slice(tabIndex).filter((entry) => !pinnedSet.has(entry.id));
      const moreReserve = remainingUnpinned.length > 0 ? MORE_BUTTON_WIDTH : 0;

      if (used + gap + width + moreReserve <= containerWidth) {
        visible.push(tab);
        used += gap + width;
      } else {
        overflow.push(tab);
      }
    });

    let finalVisible = visible;
    let finalOverflow = overflow;

    const activeInOverflow = finalOverflow.find((tab) => tab.id === activeTab);
    if (activeInOverflow) {
      let lastVisibleUnpinnedIndex = -1;
      for (let index = finalVisible.length - 1; index >= 0; index -= 1) {
        if (!pinnedSet.has(finalVisible[index].id)) {
          lastVisibleUnpinnedIndex = index;
          break;
        }
      }

      if (lastVisibleUnpinnedIndex >= 0) {
        const bumped = finalVisible[lastVisibleUnpinnedIndex];
        finalVisible = finalVisible.map((tab, index) =>
          index === lastVisibleUnpinnedIndex ? activeInOverflow : tab,
        );
        finalOverflow = finalOverflow
          .map((tab) => (tab.id === activeInOverflow.id ? bumped : tab))
          .filter(Boolean);
      } else {
        finalVisible = [...finalVisible, activeInOverflow];
        finalOverflow = finalOverflow.filter((tab) => tab.id !== activeInOverflow.id);
      }
    }

    const visibleIdSet = new Set(finalVisible.map((tab) => tab.id));
    const visibleInUserOrder = tabs.filter((tab) => visibleIdSet.has(tab.id));

    setSplit({
      visible: visibleInUserOrder,
      overflow: finalOverflow,
      showMore: finalOverflow.length > 0,
    });
  }, [activeTab, containerRef, measureRef, pinnedIds, tabs]);

  useLayoutEffect(() => {
    recompute();
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, recompute]);

  return split;
}

export default function ProjectDetailTabBar({
  tabs,
  activeTab,
  onTabChange,
  tabIconMap,
  pinnedIds,
  onReorderTabs,
  onTogglePinTab,
}) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const { visible, overflow, showMore } = useTabOverflow({
    tabs,
    pinnedIds,
    activeTab,
    containerRef,
    measureRef,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleTabDragStart = () => {
    setIsDraggingTab(true);
  };

  const handleTabDragEnd = (event) => {
    setIsDraggingTab(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
    const newIndex = tabs.findIndex((tab) => tab.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderTabs(
      arrayMove(
        tabs.map((tab) => tab.id),
        oldIndex,
        newIndex,
      ),
    );
  };

  const handleTabDragCancel = () => {
    setIsDraggingTab(false);
  };

  const renderTabMeasureElement = (tab) => {
    const Icon = tabIconMap[tab.icon] ?? tabIconMap['task-line'];
    const isPinned = pinnedSet.has(tab.id);

    return (
      <div
        key={tab.id}
        data-tab-measure=''
        className='pointer-events-none flex h-12 shrink-0 items-center gap-0.5'
      >
        <div
          className={cn(
            PROJECT_TAB_TRIGGER_CLASS,
            'flex h-12 items-center justify-center gap-1.5 py-3.5 text-label-sm text-text-sub-500',
          )}
        >
          <Icon className='size-5 text-text-soft-400' />
          {tab.label}
        </div>
        <RiPushpin2Fill
          className={cn('size-3.5', isPinned ? 'text-primary-base' : 'text-transparent')}
          aria-hidden='true'
        />
      </div>
    );
  };

  const overflowHasActive = overflow.some((tab) => tab.id === activeTab);

  return (
    <TabMenuHorizontal.Root value={activeTab} onValueChange={onTabChange}>
      <div
        ref={containerRef}
        className='relative w-full shrink-0 overflow-hidden border-b border-stroke-soft-200 px-3.5'
      >
        <TabMenuHorizontal.List
          wrapperClassName={cn('w-full', isDraggingTab && 'overflow-x-hidden overflow-y-hidden')}
          className='border-none px-2 gap-3'
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            autoScroll={false}
            onDragStart={handleTabDragStart}
            onDragEnd={handleTabDragEnd}
            onDragCancel={handleTabDragCancel}
          >
            <SortableContext
              items={visible.map((tab) => tab.id)}
              strategy={horizontalListSortingStrategy}
            >
              {visible.map((tab) => (
                <SortableTabTrigger
                  key={tab.id}
                  tab={tab}
                  tabIconMap={tabIconMap}
                  isPinned={pinnedSet.has(tab.id)}
                  onTogglePin={onTogglePinTab}
                />
              ))}
            </SortableContext>
          </DndContext>

          {showMore ? (
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className={cn(
                    'relative ml-auto inline-flex h-12 shrink-0 items-center gap-1 px-3 text-label-sm font-medium transition',
                    overflowHasActive
                      ? 'text-text-strong-950 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary-base after:content-[""]'
                      : 'text-text-sub-600 hover:text-text-strong-950',
                  )}
                >
                  More
                  <RiArrowDownSLine className='size-4' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' sideOffset={8} className='w-[240px] p-2'>
                {overflow.map((tab) => (
                  <Dropdown.Item
                    key={tab.id}
                    className={cn(
                      'flex items-center justify-between gap-2',
                      activeTab === tab.id && 'bg-bg-weak-50 text-text-strong-950',
                    )}
                    onSelect={() => onTabChange(tab.id)}
                  >
                    <span className='truncate'>{tab.label}</span>
                    <span
                      role='button'
                      tabIndex={0}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onTogglePinTab(tab.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        onTogglePinTab(tab.id);
                      }}
                      className={cn(
                        'shrink-0 rounded p-1 transition hover:bg-bg-weak-100',
                        pinnedSet.has(tab.id) ? 'text-primary-base' : 'text-text-soft-400',
                      )}
                      aria-label={pinnedSet.has(tab.id) ? `Unpin ${tab.label}` : `Pin ${tab.label}`}
                    >
                      {pinnedSet.has(tab.id) ? (
                        <RiPushpin2Fill className='size-4' />
                      ) : (
                        <RiPushpin2Line className='size-4' />
                      )}
                    </span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Root>
          ) : null}
        </TabMenuHorizontal.List>

        <div
          ref={measureRef}
          aria-hidden='true'
          className='pointer-events-none absolute -left-[9999px] top-0 flex h-12 items-center gap-6 whitespace-nowrap opacity-0'
        >
          {tabs.map((tab) => renderTabMeasureElement(tab))}
        </div>
      </div>
    </TabMenuHorizontal.Root>
  );
}
