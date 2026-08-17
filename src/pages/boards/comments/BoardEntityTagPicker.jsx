import { useEffect, useMemo, useState } from 'react';
import {
  RiArrowDownSFill,
  RiCheckboxBlankCircleLine,
  RiFolderLine,
  RiLayoutGridLine,
  RiListCheck3,
  RiLoader4Line,
  RiSearchLine,
} from 'react-icons/ri';
import { cn } from '@/utils/cn';
import {
  DestinationSectionLabel,
  getDefaultExpandedIds,
  getDestinationItemIcon,
  prepareDestinationBoardItems,
} from '@/pages/boards/views/list/utils/task-destination-menu-utils';
import {
  addEntityTagRecent,
  collectTreeItemsByType,
  ENTITY_TYPES,
  fetchListTasksForPicker,
  getEntityTagRecents,
  normalizeEntityTagSelection,
  searchTasksForPicker,
} from './board-comment-utils';

function getEntityIcon(type) {
  if (type === ENTITY_TYPES.FOLDER) return RiFolderLine;
  if (type === ENTITY_TYPES.LIST) return RiListCheck3;
  if (type === ENTITY_TYPES.TASK) return RiCheckboxBlankCircleLine;
  return RiLayoutGridLine;
}

function EntityFlatRow({ item, subtitle, onSelect }) {
  const Icon = getEntityIcon(item.type);

  return (
    <button
      type='button'
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
      className='relative flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-text-sub-500 transition-colors hover:bg-bg-weak-50'
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-medium leading-5 text-text-main-900'>
          {item.label}
        </span>
        {subtitle ? (
          <span className='block truncate text-[11px] text-text-soft-400'>{subtitle}</span>
        ) : null}
      </span>
      <span className='shrink-0 text-[10px] font-medium uppercase tracking-wide text-text-soft-400'>
        {item.type}
      </span>
    </button>
  );
}

function EntityTreeWithTasks({
  items,
  expandedIds,
  onToggleExpand,
  onSelect,
  listTasksById,
  loadingListIds,
}) {
  return items.map((item) => {
    const hasTreeChildren = Boolean(item.children?.length);
    const isList = item.type === ENTITY_TYPES.LIST;
    const tasks = isList ? listTasksById[item.id] : null;
    const hasTasks = Array.isArray(tasks) && tasks.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const isLoadingTasks = isList && loadingListIds.has(item.id);
    const hasChildren = hasTreeChildren || isList;
    const Icon = getDestinationItemIcon(item);

    return (
      <div key={item.id} className='flex w-full flex-col'>
        <div className='group relative flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-text-sub-500 transition-colors hover:bg-bg-weak-50'>
          <button
            type='button'
            className='relative flex size-5 shrink-0 items-center justify-center text-icon-sub-500'
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) {
                onToggleExpand(item.id);
              }
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            disabled={!hasChildren}
          >
            <Icon size={20} className={cn(hasChildren && 'group-hover:hidden')} />
            {hasChildren ? (
              <RiArrowDownSFill
                size={20}
                className={cn('absolute hidden group-hover:block', !isExpanded && '-rotate-90')}
              />
            ) : null}
          </button>

          <button
            type='button'
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
            className='min-w-0 flex-1 truncate text-left text-sm font-medium leading-5 text-text-main-900'
          >
            {item.label}
          </button>
        </div>

        {isExpanded && hasChildren ? (
          <div className='relative flex flex-col gap-1 pl-6'>
            <span
              aria-hidden='true'
              className='absolute bottom-2 left-[11px] top-0 w-px bg-stroke-soft-200'
            />
            {hasTreeChildren ? (
              <EntityTreeWithTasks
                items={item.children}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                listTasksById={listTasksById}
                loadingListIds={loadingListIds}
              />
            ) : null}
            {isList
              ? (() => {
                  if (isLoadingTasks) {
                    return (
                      <div className='flex items-center gap-2 px-1.5 py-1.5 text-xs text-text-soft-400'>
                        <RiLoader4Line size={14} className='animate-spin' />
                        Loading tasks…
                      </div>
                    );
                  }
                  if (hasTasks) {
                    return tasks.map((task) => (
                      <EntityFlatRow key={task.id} item={task} onSelect={onSelect} />
                    ));
                  }
                  return <div className='px-1.5 py-1.5 text-xs text-text-soft-400'>No tasks</div>;
                })()
              : null}
          </div>
        ) : null}
      </div>
    );
  });
}

export default function BoardEntityTagPicker({
  sidebarTree = [],
  currentListId = null,
  query: controlledQuery,
  onQueryChange,
  onSelect,
  className,
}) {
  const [internalQuery, setInternalQuery] = useState('');
  const searchQuery = controlledQuery ?? internalQuery;
  const setSearchQuery = onQueryChange ?? setInternalQuery;

  const boardItems = useMemo(() => prepareDestinationBoardItems(sidebarTree), [sidebarTree]);
  const [expandedIds, setExpandedIds] = useState(() =>
    getDefaultExpandedIds(prepareDestinationBoardItems(sidebarTree), currentListId),
  );
  const [listTasksById, setListTasksById] = useState({});
  const [loadingListIds, setLoadingListIds] = useState(() => new Set());
  const [searchedTasks, setSearchedTasks] = useState([]);
  const [isSearchingTasks, setIsSearchingTasks] = useState(false);
  const [recents, setRecents] = useState(getEntityTagRecents);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingTreeItems = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return collectTreeItemsByType(boardItems, [
      ENTITY_TYPES.SPACE,
      ENTITY_TYPES.FOLDER,
      ENTITY_TYPES.LIST,
    ]).filter((item) => item.label?.toLowerCase().includes(normalizedQuery));
  }, [boardItems, normalizedQuery]);

  useEffect(() => {
    if (!normalizedQuery) {
      setSearchedTasks([]);
      setIsSearchingTasks(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearchingTasks(true);
    const timer = setTimeout(async () => {
      const tasks = await searchTasksForPicker(searchQuery.trim(), 20);
      if (!cancelled) {
        setSearchedTasks(tasks);
        setIsSearchingTasks(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedQuery, searchQuery]);

  const handleToggleExpand = async (itemId) => {
    const willExpand = !expandedIds.has(itemId);

    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    if (!willExpand) {
      return;
    }

    const node = collectTreeItemsByType(boardItems, [ENTITY_TYPES.LIST]).find(
      (item) => item.id === itemId,
    );
    if (!node || listTasksById[itemId] || loadingListIds.has(itemId)) {
      return;
    }

    setLoadingListIds((previous) => new Set(previous).add(itemId));
    const tasks = await fetchListTasksForPicker(itemId);
    setListTasksById((previous) => ({ ...previous, [itemId]: tasks }));
    setLoadingListIds((previous) => {
      const next = new Set(previous);
      next.delete(itemId);
      return next;
    });
  };

  const handleSelect = (rawItem) => {
    const entity = normalizeEntityTagSelection(rawItem, sidebarTree);
    if (!entity) {
      return;
    }

    addEntityTagRecent(entity);
    setRecents(getEntityTagRecents());
    onSelect?.(entity);
  };

  return (
    <div
      className={cn(
        'flex w-[320px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-md ring-1 ring-stroke-soft-200',
        className,
      )}
    >
      <div className='border-b border-stroke-soft-200 p-2'>
        <div className='flex items-center gap-2 rounded-lg bg-bg-weak-50 px-2.5 py-1.5'>
          <RiSearchLine size={16} className='shrink-0 text-icon-sub-500' />
          <input
            type='text'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search boards, folders, lists, tasks…'
            className='min-w-0 flex-1 bg-transparent text-sm text-text-main-900 outline-none placeholder:text-text-soft-400'
            autoFocus={controlledQuery === undefined}
            readOnly={controlledQuery !== undefined && !onQueryChange}
          />
        </div>
      </div>

      <div className='max-h-[320px] overflow-y-auto p-1.5'>
        {normalizedQuery ? (
          <div className='flex flex-col gap-1'>
            {matchingTreeItems.map((item) => (
              <EntityFlatRow
                key={`${item.type}-${item.id}`}
                item={item}
                subtitle={normalizeEntityTagSelection(item, sidebarTree)?.breadcrumb}
                onSelect={handleSelect}
              />
            ))}
            {isSearchingTasks ? (
              <div className='flex items-center gap-2 px-2 py-2 text-xs text-text-soft-400'>
                <RiLoader4Line size={14} className='animate-spin' />
                Searching tasks…
              </div>
            ) : (
              searchedTasks.map((task) => (
                <EntityFlatRow
                  key={`task-${task.id}`}
                  item={task}
                  subtitle={normalizeEntityTagSelection(task, sidebarTree)?.breadcrumb}
                  onSelect={handleSelect}
                />
              ))
            )}
            {!isSearchingTasks && matchingTreeItems.length === 0 && searchedTasks.length === 0 ? (
              <div className='px-3 py-4 text-center text-sm text-text-soft-400'>No results</div>
            ) : null}
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            {recents.length > 0 ? (
              <div className='flex flex-col gap-1'>
                <DestinationSectionLabel>Recents</DestinationSectionLabel>
                {recents.map((item) => (
                  <EntityFlatRow
                    key={`recent-${item.type}-${item.id}`}
                    item={item}
                    subtitle={item.breadcrumb}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : null}

            <div className='flex flex-col gap-1'>
              <DestinationSectionLabel>Boards</DestinationSectionLabel>
              {boardItems.length === 0 ? (
                <div className='px-3 py-4 text-center text-sm text-text-soft-400'>
                  No boards available
                </div>
              ) : (
                <EntityTreeWithTasks
                  items={boardItems}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onSelect={handleSelect}
                  listTasksById={listTasksById}
                  loadingListIds={loadingListIds}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
