import { useEffect, useMemo, useRef, useState } from 'react';
import { RiSearchLine, RiUserAddLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import { duplicateBoardTask } from '@/services/tasks-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { useAnchoredSubmenuPosition } from '../../../hooks/useAnchoredMenuPosition';
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

const RECENTS_STORAGE_KEY = 'devx-boards-add-to-recent-lists';
const MAX_RECENTS = 4;

function getRecentListIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENTS_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function addRecentList(listId) {
  const recents = getRecentListIds().filter((id) => id !== listId);
  recents.unshift(listId);
  localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export default function TaskAddToMenu({
  anchorRef,
  parentMenuRef,
  panelRef = null,
  panelHoverHandlers = {},
  onClose,
  taskId,
  currentListId,
  sidebarTree = [],
  onAddSuccess,
}) {
  const menuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentListIds, setRecentListIds] = useState(getRecentListIds);
  const { top, left } = useAnchoredSubmenuPosition(anchorRef, menuRef, parentMenuRef);

  const boardItems = useMemo(() => prepareDestinationBoardItems(sidebarTree), [sidebarTree]);

  const allLists = useMemo(() => collectListItems(boardItems), [boardItems]);

  const personalList = useMemo(() => findPersonalList(boardItems), [boardItems]);

  const [expandedIds, setExpandedIds] = useState(() =>
    getDefaultExpandedIds(prepareDestinationBoardItems(sidebarTree), currentListId),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredLists = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allLists.filter((item) => item.label?.toLowerCase().includes(normalizedQuery));
  }, [allLists, normalizedQuery]);

  const recentItems = useMemo(
    () =>
      recentListIds
        .map((id) => findSidebarItem(boardItems, id))
        .filter((item) => item?.type === 'list'),
    [boardItems, recentListIds],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        anchorRef?.current?.contains(event.target) ||
        parentMenuRef?.current?.contains(event.target)
      ) {
        return;
      }

      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, onClose, parentMenuRef]);

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

    setIsSubmitting(true);

    const result = await duplicateBoardTask({
      taskId,
      listId: listItem.id,
    });

    setIsSubmitting(false);

    if (result.error) {
      showErrorToast(result.error);
      return;
    }

    addRecentList(listItem.id);
    setRecentListIds(getRecentListIds());
    showSuccessToast(`Task added to ${listItem.label}`);
    onAddSuccess?.();
    onClose?.();
  };

  const handlePersonalListClick = () => {
    if (!personalList) {
      showErrorToast('Personal List is not available.');
      return;
    }

    handleSelectList(personalList);
  };

  return (
    <div
      ref={(node) => {
        menuRef.current = node;
        if (panelRef) {
          panelRef.current = node;
        }
      }}
      {...panelHoverHandlers}
      className='fixed z-[60] flex w-64 flex-col overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
      style={{ top, left }}
    >
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

      {personalList ? (
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
                  currentListId={currentListId}
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
                      currentListId={currentListId}
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
                  currentListId={currentListId}
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
  );
}
