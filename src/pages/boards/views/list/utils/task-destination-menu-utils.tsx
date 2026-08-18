import {
  RiArrowDownSFill,
  RiCheckLine,
  RiFolderLine,
  RiLayoutGridLine,
  RiListCheck3,
} from 'react-icons/ri';
import { applySidebarTreeSorting } from '@/services/boards-service';
import { cn } from '@/utils/cn';

export function getDestinationItemIcon(item) {
  if (item.type === 'folder') return RiFolderLine;
  if (item.type === 'list') return RiListCheck3;
  return RiLayoutGridLine;
}

function isDestinationItemVisible(item) {
  return !item?.isHidden && !item?.isArchived;
}

export function filterHiddenAndArchivedItems(items = []) {
  return items.filter(isDestinationItemVisible).map((item) => {
    if (!item.children?.length) {
      return item;
    }

    return {
      ...item,
      children: filterHiddenAndArchivedItems(item.children),
    };
  });
}

export function prepareDestinationBoardItems(sidebarTree = []) {
  return filterHiddenAndArchivedItems(applySidebarTreeSorting(sidebarTree));
}

export function getDefaultExpandedIds(boardItems, currentListId) {
  const ids = new Set();

  if (!currentListId) {
    return ids;
  }

  const ancestors = collectExpandableAncestorIds(boardItems, currentListId);
  ancestors?.forEach((id) => ids.add(id));

  return ids;
}

export function findSidebarItem(items = [], id) {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.children?.length) {
      const found = findSidebarItem(item.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function collectListItems(items = [], results = []) {
  items.forEach((item) => {
    if (item.type === 'list') {
      results.push(item);
    }

    if (item.children?.length) {
      collectListItems(item.children, results);
    }
  });

  return results;
}

export function collectContainerItems(items = [], results = []) {
  items.forEach((item) => {
    if (item.type === 'space' || item.type === 'folder') {
      results.push(item);
    }

    if (item.children?.length) {
      collectContainerItems(item.children, results);
    }
  });

  return results;
}

export function getDefaultExpandedIdsForContainer(boardItems, containerId) {
  const ids = new Set();

  if (!containerId) {
    return ids;
  }

  const ancestors = collectExpandableAncestorIds(boardItems, containerId);
  ancestors?.forEach((id) => ids.add(id));
  ids.add(containerId);

  return ids;
}

export function collectExpandableAncestorIds(items = [], targetId, path = []) {
  for (const item of items) {
    if (item.id === targetId) {
      return path;
    }

    if (item.children?.length) {
      const nested = collectExpandableAncestorIds(item.children, targetId, [...path, item.id]);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function findListByLabel(items = [], label) {
  const normalizedLabel = String(label ?? '')
    .trim()
    .toLowerCase();

  if (!normalizedLabel) {
    return null;
  }

  for (const item of collectListItems(items)) {
    if (item.label?.trim().toLowerCase() === normalizedLabel) {
      return item;
    }
  }

  return null;
}

const PERSONAL_LIST_LABELS = new Set(['personal list', 'personal', 'my list']);

/**
 * Resolve the user's personal list from the sidebar tree.
 * Prefers explicit personal flags, then common label aliases.
 */
export function findPersonalList(items = []) {
  const lists = collectListItems(items);

  const byFlag = lists.find(
    (item) => item?.isPersonal || item?.is_personal || item?.isPersonalList,
  );
  if (byFlag) {
    return byFlag;
  }

  return (
    lists.find((item) =>
      PERSONAL_LIST_LABELS.has(
        String(item?.label ?? '')
          .trim()
          .toLowerCase(),
      ),
    ) ?? null
  );
}

export const DestinationSectionLabel = ({ children }) => (
  <div className='flex items-center justify-center px-4'>
    <span className='text-[11px] font-medium uppercase tracking-[0.22px] text-text-soft-400'>
      {children}
    </span>
  </div>
);

export function DestinationTreeItem({
  item,
  isSelected,
  isDisabled = false,
  isSubmitting,
  onSelect,
  onToggleExpand,
  isExpanded,
  hasChildren,
  selectionMode = 'list',
}) {
  const Icon = getDestinationItemIcon(item);
  const isList = item.type === 'list';
  const isContainer = item.type === 'space' || item.type === 'folder';
  const isSelectable =
    selectionMode === 'any'
      ? isList || isContainer
      : selectionMode === 'list'
        ? isList
        : isContainer && !isDisabled;

  const handleCaretClick = (event) => {
    event.stopPropagation();
    onToggleExpand(item.id);
  };

  const handleRowClick = () => {
    if (isSelectable) {
      onSelect(item);
      return;
    }

    if (hasChildren) {
      onToggleExpand(item.id);
    }
  };

  return (
    <button
      type='button'
      disabled={isSubmitting || isDisabled || (!isSelectable && !hasChildren)}
      onClick={handleRowClick}
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors',
        isSelected ? 'bg-bg-weak-100 text-text-main-900' : 'text-text-sub-500 hover:bg-bg-weak-50',
        (isSubmitting || isDisabled) && 'pointer-events-none opacity-60',
        !isSelectable && !hasChildren && 'cursor-default',
      )}
    >
      {isSelected ? (
        <span className='absolute left-[-12px] top-2 h-5 w-1 rounded-br rounded-tr bg-primary-base' />
      ) : null}

      <span
        className='relative flex size-5 shrink-0 items-center justify-center text-icon-sub-500'
        onClick={hasChildren ? handleCaretClick : undefined}
      >
        <Icon size={20} className={cn(hasChildren && 'group-hover:hidden')} />

        {hasChildren ? (
          <RiArrowDownSFill
            size={20}
            className={cn('absolute hidden group-hover:block', !isExpanded && '-rotate-90')}
          />
        ) : null}
      </span>

      <span className='min-w-0 flex-1 truncate text-sm font-medium leading-5 tracking-[-0.084px]'>
        {item.label}
      </span>

      {isSelected ? <RiCheckLine size={18} className='shrink-0 text-icon-sub-500' /> : null}
    </button>
  );
}

export function DestinationTreeItems({
  items,
  currentListId,
  selectedId = null,
  expandedIds,
  onToggleExpand,
  onSelect,
  isSubmitting,
  selectionMode = 'list',
  disabledIds = null,
}) {
  return items.map((item) => {
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedIds.has(item.id);
    const isSelected =
      selectionMode === 'list'
        ? item.type === 'list' && item.id === currentListId
        : item.id === selectedId;
    const isDisabled = disabledIds?.has?.(item.id) ?? false;

    return (
      <div key={item.id} className='flex w-full flex-col'>
        <DestinationTreeItem
          item={item}
          isSelected={isSelected}
          isDisabled={isDisabled}
          isSubmitting={isSubmitting}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          selectionMode={selectionMode}
        />

        {hasChildren && isExpanded ? (
          <div className='relative flex flex-col gap-1 pl-6'>
            <span
              aria-hidden='true'
              className='absolute bottom-2 left-[11px] top-0 w-px bg-stroke-soft-200'
            />
            <DestinationTreeItems
              items={item.children}
              currentListId={currentListId}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              isSubmitting={isSubmitting}
              selectionMode={selectionMode}
              disabledIds={disabledIds}
            />
          </div>
        ) : null}
      </div>
    );
  });
}

export function DestinationListItem({
  item,
  currentListId,
  selectedId = null,
  isSubmitting,
  isDisabled = false,
  onSelect,
  selectionMode = 'list',
}) {
  const Icon = getDestinationItemIcon(item);
  const isSelected = selectionMode === 'list' ? item.id === currentListId : item.id === selectedId;

  return (
    <button
      type='button'
      disabled={isSubmitting || isDisabled}
      onClick={() => onSelect(item)}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors',
        isSelected ? 'bg-bg-weak-100 text-text-main-900' : 'text-text-sub-500 hover:bg-bg-weak-50',
        (isSubmitting || isDisabled) && 'pointer-events-none opacity-60',
      )}
    >
      {isSelected ? (
        <span className='absolute left-[-12px] top-2 h-5 w-1 rounded-br rounded-tr bg-primary-base' />
      ) : null}

      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>

      <span className='min-w-0 flex-1 truncate text-sm font-medium leading-5 tracking-[-0.084px]'>
        {item.label}
      </span>

      {isSelected ? <RiCheckLine size={18} className='shrink-0 text-icon-sub-500' /> : null}
    </button>
  );
}
