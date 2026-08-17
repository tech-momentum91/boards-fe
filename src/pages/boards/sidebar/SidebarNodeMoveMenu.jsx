import { useEffect, useMemo, useRef, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { useAnchoredSubmenuPosition } from '../hooks/useAnchoredMenuPosition';
import { canBeChildOf, collectDescendantIds, findNodeWithParent } from '../utils/sidebar-dnd-utils';
import {
  collectContainerItems,
  DestinationListItem,
  DestinationSectionLabel,
  DestinationTreeItems,
  findSidebarItem,
  getDefaultExpandedIdsForContainer,
  prepareDestinationBoardItems,
} from '../views/list/utils/task-destination-menu-utils';

const RECENTS_STORAGE_KEY = 'devx-boards-move-recent-containers';
const MAX_RECENTS = 4;

function getRecentContainerIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENTS_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function addRecentContainer(containerId) {
  const recents = getRecentContainerIds().filter((id) => id !== containerId);
  recents.unshift(containerId);
  localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export default function SidebarNodeMoveMenu({
  anchorRef,
  parentMenuRef,
  panelRef = null,
  panelHoverHandlers = {},
  onClose,
  sidebarTree = [],
  movingNode,
  onMove,
}) {
  const menuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [recentContainerIds, setRecentContainerIds] = useState(getRecentContainerIds);
  const { top, left } = useAnchoredSubmenuPosition(anchorRef, menuRef, parentMenuRef);

  const boardItems = useMemo(() => prepareDestinationBoardItems(sidebarTree), [sidebarTree]);

  const allContainers = useMemo(() => collectContainerItems(boardItems), [boardItems]);

  const currentParentId = useMemo(() => {
    if (!movingNode) {
      return null;
    }
    return movingNode.parentFolderId || movingNode.spaceId || null;
  }, [movingNode]);

  const disabledIds = useMemo(() => {
    const ids = new Set();
    if (movingNode?.type === 'folder') {
      ids.add(movingNode.id);
      const entry = findNodeWithParent(boardItems, movingNode.id);
      if (entry?.node) {
        collectDescendantIds(entry.node, ids);
      }
    }
    if (currentParentId) {
      ids.add(currentParentId);
    }
    return ids;
  }, [boardItems, currentParentId, movingNode]);

  const [expandedIds, setExpandedIds] = useState(() =>
    getDefaultExpandedIdsForContainer(boardItems, currentParentId),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredContainers = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return allContainers.filter((item) => item.label?.toLowerCase().includes(normalizedQuery));
  }, [allContainers, normalizedQuery]);

  const recentItems = useMemo(
    () =>
      recentContainerIds
        .map((id) => findSidebarItem(boardItems, id))
        .filter((item) => item?.type === 'space' || item?.type === 'folder'),
    [boardItems, recentContainerIds],
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

  const handleSelectContainer = async (container) => {
    if (!container?.id || isMoving || disabledIds.has(container.id)) {
      return;
    }

    if (!canBeChildOf(movingNode?.type, container.type)) {
      return;
    }

    const target =
      container.type === 'space'
        ? { space: container.id, parent: null }
        : { space: null, parent: container.id };

    setIsMoving(true);
    const success = await onMove?.(target);
    setIsMoving(false);

    if (!success) {
      return;
    }

    addRecentContainer(container.id);
    setRecentContainerIds(getRecentContainerIds());
    onClose?.();
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

      <div className='flex max-h-[360px] flex-col overflow-y-auto pt-2'>
        {normalizedQuery ? (
          <div className='flex flex-col gap-1 px-2 pb-2'>
            {filteredContainers.length > 0 ? (
              filteredContainers.map((item) => (
                <DestinationListItem
                  key={item.id}
                  item={item}
                  selectedId={currentParentId}
                  isDisabled={disabledIds.has(item.id)}
                  isSubmitting={isMoving}
                  selectionMode='container'
                  onSelect={handleSelectContainer}
                />
              ))
            ) : (
              <p className='px-2 py-3 text-sm text-text-soft-400'>No destinations found</p>
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
                      selectedId={currentParentId}
                      isDisabled={disabledIds.has(item.id)}
                      isSubmitting={isMoving}
                      selectionMode='container'
                      onSelect={handleSelectContainer}
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
                  selectedId={currentParentId}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onSelect={handleSelectContainer}
                  isSubmitting={isMoving}
                  selectionMode='container'
                  disabledIds={disabledIds}
                />
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
