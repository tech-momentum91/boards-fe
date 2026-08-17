import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiPushpin2Fill } from 'react-icons/ri';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Dropdown from '@/components/ui/dropdown';
import CrmLeadTabOptionsMenu from '@/components/crm-leads/crm-lead-tab-options-menu';
import { canHideTab } from '@/pages/crm/leads-view/crm-lead-tab-preferences';
import { cn } from '@/utils/cn';

function restrictToHorizontalAxis({ transform }) {
  return { ...transform, y: 0 };
}

function CountTabBody({
  tab,
  count,
  active,
  isPinned,
  isLocked,
  titleRef,
  onSelect,
  onOpenMenu,
  onTitleClick,
  onTabClick,
  onContextMenu,
  dragHandleProps = {},
  isDragging = false,
}) {
  return (
    <div
      role='tab'
      tabIndex={0}
      aria-selected={active}
      onClick={onTabClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!active) onSelect?.(tab.value);
        }
      }}
      className={cn(
        'group/tab relative flex h-12 shrink-0 cursor-pointer items-center gap-1.5',
        dragHandleProps.listeners && 'cursor-grab active:cursor-grabbing',
        active ? 'text-text-strong-950' : 'text-text-sub-600 hover:text-text-strong-950',
        isDragging && 'opacity-60',
      )}
      {...(dragHandleProps.attributes ?? {})}
      {...(dragHandleProps.listeners ?? {})}
    >
      <span
        ref={titleRef}
        data-view-title
        role={active && !isLocked ? 'button' : undefined}
        tabIndex={active && !isLocked ? 0 : -1}
        onClick={onTitleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onTitleClick(event);
          }
        }}
        className={cn(
          'whitespace-nowrap text-label-sm font-medium leading-5',
          active && !isLocked && 'cursor-pointer',
        )}
      >
        {tab.label}
      </span>

      {isPinned ? (
        <RiPushpin2Fill
          size={12}
          className='shrink-0 text-primary-base'
          aria-label='Pinned'
          title='Pinned'
        />
      ) : null}

      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-label-xs',
          active ? 'bg-primary-base text-static-white' : 'bg-bg-weak-100 text-text-sub-600',
        )}
      >
        {count}
      </span>

      {active ? <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-base' /> : null}
    </div>
  );
}

function useTabInteractionHandlers({ tab, active, isLocked, onSelect, onOpenMenu }) {
  const titleRef = useRef(null);

  const handleTitleClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isLocked) {
        if (!active) onSelect?.(tab.value);
        return;
      }

      if (active) {
        onOpenMenu?.(tab, titleRef);
        return;
      }

      onSelect?.(tab.value);
    },
    [active, isLocked, onOpenMenu, onSelect, tab],
  );

  const handleTabClick = useCallback(
    (event) => {
      if (event.target.closest('[data-view-title]')) return;
      if (active) {
        if (!isLocked) onOpenMenu?.(tab, titleRef);
        return;
      }
      onSelect?.(tab.value);
    },
    [active, isLocked, onOpenMenu, onSelect, tab],
  );

  const handleContextMenu = useCallback(
    (event) => {
      if (isLocked) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenMenu?.(tab, titleRef);
    },
    [isLocked, onOpenMenu, tab],
  );

  return { titleRef, handleTitleClick, handleTabClick, handleContextMenu };
}

function StaticCountTab({ tab, count, active, isPinned, isLocked, onSelect, onOpenMenu }) {
  const { titleRef, handleTitleClick, handleTabClick, handleContextMenu } =
    useTabInteractionHandlers({
      tab,
      active,
      isLocked,
      onSelect,
      onOpenMenu,
    });

  return (
    <CountTabBody
      tab={tab}
      count={count}
      active={active}
      isPinned={isPinned}
      isLocked={isLocked}
      titleRef={titleRef}
      onSelect={onSelect}
      onOpenMenu={onOpenMenu}
      onTitleClick={handleTitleClick}
      onTabClick={handleTabClick}
      onContextMenu={handleContextMenu}
    />
  );
}

function SortableCountTab({ tab, count, active, isPinned, isLocked, onSelect, onOpenMenu }) {
  const { titleRef, handleTitleClick, handleTabClick, handleContextMenu } =
    useTabInteractionHandlers({
      tab,
      active,
      isLocked,
      onSelect,
      onOpenMenu,
    });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.value,
  });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, y: 0 } : null),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex h-12 items-center', isDragging && 'z-10')}
    >
      <CountTabBody
        tab={tab}
        count={count}
        active={active}
        isPinned={isPinned}
        isLocked={isLocked}
        titleRef={titleRef}
        onSelect={onSelect}
        onOpenMenu={onOpenMenu}
        onTitleClick={handleTitleClick}
        onTabClick={handleTabClick}
        onContextMenu={handleContextMenu}
        dragHandleProps={{ attributes, listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

/**
 * Configurable CRM tab strip with reorder / pin / hide / More.
 *
 * Pinned tabs stay left (after locked tabs) and remain draggable among themselves.
 * Unpinned tabs stay to the right and are independently reorderable.
 */
export default function CrmConfigurableTabBar({
  visibleTabs = [],
  hiddenTabs = [],
  value = '',
  counts = {},
  prefs,
  lockedValues = [],
  requireOneVisible = false,
  onValueChange,
  onReorder,
  onTogglePin,
  onHide,
  onUnhide,
  isMutating = false,
}) {
  const [menuTab, setMenuTab] = useState(null);
  const [menuAnchorRef, setMenuAnchorRef] = useState(null);
  const lockedSet = useMemo(() => new Set(lockedValues), [lockedValues]);
  const pinnedSet = useMemo(() => new Set(prefs?.pinned ?? []), [prefs?.pinned]);

  const { lockedTabs, pinnedTabs, unpinnedTabs } = useMemo(() => {
    const locked = [];
    const pinned = [];
    const unpinned = [];

    visibleTabs.forEach((tab) => {
      if (lockedSet.has(tab.value)) {
        locked.push(tab);
        return;
      }
      if (pinnedSet.has(tab.value)) {
        pinned.push(tab);
        return;
      }
      unpinned.push(tab);
    });

    return { lockedTabs: locked, pinnedTabs: pinned, unpinnedTabs: unpinned };
  }, [lockedSet, pinnedSet, visibleTabs]);

  const pinnedIds = useMemo(() => pinnedTabs.map((tab) => tab.value), [pinnedTabs]);
  const unpinnedIds = useMemo(() => unpinnedTabs.map((tab) => tab.value), [unpinnedTabs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleOpenMenu = useCallback(
    (tab, anchorRef) => {
      if (lockedSet.has(tab.value)) return;
      if (menuTab?.value === tab.value) {
        setMenuTab(null);
        setMenuAnchorRef(null);
        return;
      }
      setMenuTab(tab);
      setMenuAnchorRef(anchorRef);
    },
    [lockedSet, menuTab?.value],
  );

  const handleCloseMenu = useCallback(() => {
    setMenuTab(null);
    setMenuAnchorRef(null);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return;
      if (lockedSet.has(active.id) || lockedSet.has(over.id)) return;

      const activePinned = pinnedSet.has(active.id);
      const overPinned = pinnedSet.has(over.id);
      // Only reorder within the same pin group so pinned stay left.
      if (activePinned !== overPinned) return;

      onReorder?.(active.id, over.id);
    },
    [lockedSet, onReorder, pinnedSet],
  );

  const menuCanHide = menuTab
    ? canHideTab(menuTab.value, {
        prefs,
        lockedIds: lockedValues,
        requireOneVisible,
      })
    : false;

  if (visibleTabs.length === 0 && hiddenTabs.length === 0) return null;

  const renderSortableTab = (tab) => (
    <SortableCountTab
      key={tab.value}
      tab={tab}
      count={counts[tab.value] ?? 0}
      active={value === tab.value}
      isPinned={pinnedSet.has(tab.value)}
      isLocked={lockedSet.has(tab.value)}
      onSelect={onValueChange}
      onOpenMenu={handleOpenMenu}
    />
  );

  return (
    <>
      <div className='flex h-12 w-full min-w-0 items-stretch border-b border-stroke-soft-200'>
        <div className='min-w-0 flex-1 overflow-x-auto'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
          >
            <div className='flex h-12 min-w-max items-center gap-6 pr-2'>
              {lockedTabs.map((tab) => (
                <StaticCountTab
                  key={tab.value}
                  tab={tab}
                  count={counts[tab.value] ?? 0}
                  active={value === tab.value}
                  isPinned={false}
                  isLocked
                  onSelect={onValueChange}
                  onOpenMenu={handleOpenMenu}
                />
              ))}

              {pinnedTabs.length > 0 ? (
                <SortableContext items={pinnedIds} strategy={horizontalListSortingStrategy}>
                  <div className='flex h-12 items-center gap-6'>
                    {pinnedTabs.map((tab) => renderSortableTab(tab))}
                  </div>
                </SortableContext>
              ) : null}

              {pinnedTabs.length > 0 && unpinnedTabs.length > 0 ? (
                <span
                  aria-hidden='true'
                  className='mx-1 h-4 w-px shrink-0 self-center bg-stroke-soft-200'
                />
              ) : null}

              {unpinnedTabs.length > 0 ? (
                <SortableContext items={unpinnedIds} strategy={horizontalListSortingStrategy}>
                  <div className='flex h-12 items-center gap-6'>
                    {unpinnedTabs.map((tab) => renderSortableTab(tab))}
                  </div>
                </SortableContext>
              ) : null}
            </div>
          </DndContext>
        </div>

        {hiddenTabs.length > 0 ? (
          <div className='flex shrink-0 items-center border-l border-stroke-soft-200 bg-bg-white-0 pl-3'>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='inline-flex h-12 shrink-0 items-center gap-1 px-1 text-label-sm font-medium text-text-sub-600 transition hover:text-text-strong-950'
                >
                  More
                  <RiArrowDownSLine className='size-4' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' sideOffset={8} className='w-[240px] p-2'>
                {hiddenTabs.map((tab) => (
                  <Dropdown.Item
                    key={tab.value}
                    className='flex items-center justify-between gap-2'
                    onSelect={() => onUnhide?.(tab.value)}
                  >
                    <span className='truncate'>{tab.label}</span>
                    <span className='text-label-xs text-text-sub-500'>
                      {counts[tab.value] ?? 0}
                    </span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Root>
          </div>
        ) : null}
      </div>

      {menuTab && menuAnchorRef ? (
        <CrmLeadTabOptionsMenu
          anchorRef={menuAnchorRef}
          tab={menuTab}
          isPinned={pinnedSet.has(menuTab.value)}
          canHide={menuCanHide}
          onClose={handleCloseMenu}
          onTogglePin={() => onTogglePin?.(menuTab.value)}
          onHide={() => onHide?.(menuTab.value)}
          isMutating={isMutating}
        />
      ) : null}
    </>
  );
}
