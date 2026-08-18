import { useMemo, useState } from 'react';
import { RiSearchLine, RiUserAddLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import DestinationStatusModal from '@/pages/boards/modals/DestinationStatusModal';
import { resolveBulkDestinationStatusMatches } from '@/pages/boards/utils/resolve-destination-status';
import { showErrorToast } from '@/utils/error-utils';
import {
  collectListItems,
  DestinationListItem,
  DestinationSectionLabel,
  DestinationTreeItems,
  findPersonalList,
  findSidebarItem,
  getDefaultExpandedIds,
  prepareDestinationBoardItems,
} from '../utils/task-destination-menu-utils';

const MOVE_RECENTS_KEY = 'devx-boards-move-recent-lists';
const ADD_RECENTS_KEY = 'devx-boards-add-to-recent-lists';
const MAX_RECENTS = 4;

function getRecentListIds(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function addRecentList(storageKey, listId) {
  const recents = getRecentListIds(storageKey).filter((id) => id !== listId);
  recents.unshift(listId);
  localStorage.setItem(storageKey, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

const TABS = [
  { id: 'move', label: 'Move' },
  { id: 'add', label: 'Add' },
];

export default function BulkMoveAddMenu({
  sidebarTree = [],
  currentListId,
  onMove,
  onAdd,
  onClose,
  taskCount = 1,
  selectedTasks = [],
  statusGroups = [],
}) {
  const [activeTab, setActiveTab] = useState('move');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destination, setDestination] = useState(null);
  const [recents, setRecents] = useState(() => ({
    move: getRecentListIds(MOVE_RECENTS_KEY),
    add: getRecentListIds(ADD_RECENTS_KEY),
  }));

  const boardItems = useMemo(() => prepareDestinationBoardItems(sidebarTree), [sidebarTree]);

  const allLists = useMemo(() => collectListItems(boardItems), [boardItems]);

  const personalList = useMemo(() => findPersonalList(boardItems), [boardItems]);

  const [expandedIds, setExpandedIds] = useState(() =>
    getDefaultExpandedIds(boardItems, currentListId),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredLists = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allLists.filter((item) => item.label?.toLowerCase().includes(normalizedQuery));
  }, [allLists, normalizedQuery]);

  const recentItems = useMemo(() => {
    const ids = recents[activeTab] ?? [];
    return ids.map((id) => findSidebarItem(boardItems, id)).filter((item) => item?.type === 'list');
  }, [activeTab, boardItems, recents]);

  const handleToggleExpand = (itemId) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectList = async (listItem) => {
    if (!listItem?.id || isSubmitting) {
      return;
    }

    if (activeTab === 'move' && listItem.id === currentListId) {
      return;
    }

    setIsSubmitting(true);
    const matchResult = await resolveBulkDestinationStatusMatches({
      listId: listItem.id,
      tasks: selectedTasks,
      sourceStatusGroups: statusGroups,
    });
    setIsSubmitting(false);

    if (matchResult.error) {
      showErrorToast(matchResult.error);
      return;
    }

    if (matchResult.matched) {
      setIsSubmitting(true);
      try {
        if (activeTab === 'move') {
          await onMove?.(listItem.id, null, matchResult.statusByTaskId);
          addRecentList(MOVE_RECENTS_KEY, listItem.id);
          setRecents((previous) => ({ ...previous, move: getRecentListIds(MOVE_RECENTS_KEY) }));
        } else {
          await onAdd?.(listItem.id, null, matchResult.statusByTaskId);
          addRecentList(ADD_RECENTS_KEY, listItem.id);
          setRecents((previous) => ({ ...previous, add: getRecentListIds(ADD_RECENTS_KEY) }));
        }
      } finally {
        setIsSubmitting(false);
      }
      onClose?.();
      return;
    }

    setDestination({ list: listItem, action: activeTab });
  };

  const handleConfirmStatus = async (status) => {
    if (!destination || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (destination.action === 'move') {
        await onMove?.(destination.list.id, status);
        addRecentList(MOVE_RECENTS_KEY, destination.list.id);
        setRecents((previous) => ({ ...previous, move: getRecentListIds(MOVE_RECENTS_KEY) }));
      } else {
        await onAdd?.(destination.list.id, status);
        addRecentList(ADD_RECENTS_KEY, destination.list.id);
        setRecents((previous) => ({ ...previous, add: getRecentListIds(ADD_RECENTS_KEY) }));
      }
    } finally {
      setIsSubmitting(false);
    }

    setDestination(null);
    onClose?.();
  };

  const handlePersonalListClick = () => {
    if (!personalList) {
      return;
    }
    handleSelectList(personalList);
  };

  return (
    <>
    <div className='flex w-64 flex-col overflow-hidden'>
      <div className='flex items-center gap-1 border-b border-stroke-soft-200 p-1'>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-bg-weak-100 text-text-main-900'
                : 'text-text-sub-500 hover:bg-bg-weak-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='border-b border-stroke-soft-200 p-2'>
        <div className='flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-2 pr-1.5 shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)]'>
          <RiSearchLine size={18} className='shrink-0 text-icon-sub-500' />
          <input
            type='text'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search...'
            className='min-w-0 flex-1 bg-transparent text-sm leading-5 tracking-[-0.084px] text-text-main-900 outline-none placeholder:text-text-soft-400'
          />
        </div>
      </div>

      {activeTab === 'add' && personalList ? (
        <div className='border-b border-stroke-soft-200 p-2'>
          <button
            type='button'
            disabled={isSubmitting}
            onClick={handlePersonalListClick}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors',
              'text-text-sub-500 hover:bg-bg-weak-50',
              isSubmitting && 'pointer-events-none opacity-60',
            )}
          >
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <RiUserAddLine size={18} />
            </span>
            <span className='text-sm font-medium leading-5 tracking-[-0.084px]'>
              {personalList.label || 'Personal List'}
            </span>
          </button>
        </div>
      ) : null}

      <div className='flex max-h-[360px] flex-col overflow-y-auto pt-2'>
        {normalizedQuery ? (
          <div className='flex flex-col gap-1 px-2 pb-2'>
            {filteredLists.length > 0 ? (
              filteredLists.map((item) => (
                <DestinationListItem
                  key={item.id}
                  item={item}
                  currentListId={activeTab === 'move' ? currentListId : undefined}
                  isSubmitting={isSubmitting}
                  onSelect={handleSelectList}
                />
              ))
            ) : (
              <p className='px-2 py-3 text-sm text-text-soft-400'>No lists found</p>
            )}
          </div>
        ) : (
          <>
            {recentItems.length > 0 ? (
              <div className='flex flex-col gap-1.5 pb-2'>
                <DestinationSectionLabel>Recents</DestinationSectionLabel>
                <div className='flex flex-col gap-1 px-2 pb-2'>
                  {recentItems.map((item) => (
                    <DestinationListItem
                      key={item.id}
                      item={item}
                      currentListId={activeTab === 'move' ? currentListId : undefined}
                      isSubmitting={isSubmitting}
                      onSelect={handleSelectList}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className='flex flex-col gap-1.5 pb-2'>
              <DestinationSectionLabel>Boards</DestinationSectionLabel>
              <nav className='flex flex-col gap-1 px-2 pb-2'>
                <DestinationTreeItems
                  items={boardItems}
                  currentListId={activeTab === 'move' ? currentListId : undefined}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onSelect={handleSelectList}
                  isSubmitting={isSubmitting}
                />
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
      <DestinationStatusModal
        open={Boolean(destination)}
        destinationList={destination?.list ?? null}
        action={destination?.action ?? activeTab}
        taskCount={taskCount}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setDestination(null);
          }
        }}
        onConfirm={handleConfirmStatus}
      />
    </>
  );
}
