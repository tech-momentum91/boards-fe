import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  RiAddLine,
  RiArrowDownSFill,
  RiFolderLine,
  RiLayoutGridLine,
  RiListCheck3,
  RiMoreFill,
  RiStarLine,
  RiEyeOffLine,
  RiArchiveFill,
  RiCheckboxBlankLine,
  RiDraggable,
} from 'react-icons/ri';
import { useAuth } from '@/contexts/auth-context';
import { logoutSuccess } from '@/redux/authSlice';
import { logOutService } from '@/services/auth-service';
import SidebarUserProfile from './SidebarUserProfile';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import * as CompactButton from '@/components/ui/compact-button';
import CircularProgress from '@/components/ui/circular-progress';
import {
  collectExpandableIds,
  getSidebarTree,
  getNextBoardSortOrder,
  applySidebarTreeSorting,
  sortItemsByLabel,
  findListTargetAfterCreate,
  moveFolder,
  moveList,
  reorderSiblings,
  getFolderCreateContext,
  getListCreateContext,
  archiveBoard,
  hideBoard,
  deleteBoard,
  deleteFolder,
  deleteList,
  favoriteBoard,
  unfavoriteBoard,
  favoriteFolder,
  unfavoriteFolder,
  favoriteList,
  unfavoriteList,
  hideFolder,
  unhideFolder,
  archiveFolder,
  unarchiveFolder,
  hideList,
  unhideList,
  archiveList,
  unarchiveList,
  unarchiveBoard,
  unhideBoard,
  updateBoardAppearance,
  updateFolderAppearance,
  updateListAppearance,
  duplicateBoard,
  duplicateFolder,
  duplicateList,
} from '@/services/boards-service';
import { getFavoriteTasks } from '@/services/tasks-service';
import {
  collectFavoriteFoldersAndLists,
  dedupeSidebarItemsById,
  filterSidebarTreeByVisibility,
  prepareBoardsSectionTree,
  prepareSidebarItemForFavoritesSection,
  updateSidebarTreeNode,
} from '../utils/sidebar-tree-utils';
import {
  flattenVisibleTree,
  computeDropPlacement,
  isContainerType,
  canBeChildOf,
} from '../utils/sidebar-dnd-utils';
import {
  buildBoardTaskSearchPath,
  getBoardSearchStatusColor,
  getBoardSearchStatusProgress,
} from '../utils/boards-global-search-utils';
import { cn } from '@/utils/cn';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import CreateBoardModal from '../modals/CreateBoardModal';
import DeleteBoardModal, {
  setSkipDeleteBoardConfirm,
  shouldSkipDeleteBoardConfirm,
} from '../modals/DeleteBoardModal';
import TaskStatusesModal from '../modals/TaskStatusesModal';
import BoardShareModal from '../modals/BoardShareModal';
import { canPerformBoardAction } from '../constants/board-share-constants';
import BoardOptionsMenu from './BoardOptionsMenu';
import CreateItemMenu from './CreateItemMenu';
import BoardsMenu from './BoardsMenu';
import { normalizeBoardColor } from './IconColorPicker';

function FavoriteTaskStatusIcon({ task }) {
  const color = getBoardSearchStatusColor(task);
  const percentage = getBoardSearchStatusProgress(task);

  return (
    <CircularProgress
      percentage={percentage}
      color={color}
      size={16}
      variant='sector'
      aria-label={task.statusTitle || task.status || 'Task status'}
      className='shrink-0'
    />
  );
}

const SectionHeader = ({
  children,
  showActions = false,
  onAdd,
  onMore,
  moreButtonRef,
  actionsVisible = false,
}) => (
  <div className='group flex items-center justify-between px-1 py-1'>
    <p className='text-subheading-2xs uppercase tracking-[0.48px] text-text-soft-400'>{children}</p>

    {showActions && (
      <div
        className={cn(
          'flex items-center gap-1',
          actionsVisible ? 'visible' : 'invisible group-hover:visible',
        )}
      >
        <CompactButton.Root ref={moreButtonRef} variant='ghost' size='medium' onClick={onMore}>
          <CompactButton.Icon as={RiMoreFill} />
        </CompactButton.Root>

        <CompactButton.Root variant='ghost' size='medium' onClick={onAdd}>
          <CompactButton.Icon as={RiAddLine} />
        </CompactButton.Root>
      </div>
    )}
  </div>
);

const SidebarItemActions = ({
  moreButtonRef,
  onMoreClick,
  plusButtonRef,
  onAddClick,
  showAddButton = true,
}) => (
  <div className='flex shrink-0 items-center gap-1' onClick={(event) => event.stopPropagation()}>
    <CompactButton.Root
      ref={moreButtonRef}
      variant='ghost'
      size='medium'
      aria-label='More options'
      onClick={onMoreClick}
    >
      <CompactButton.Icon as={RiMoreFill} />
    </CompactButton.Root>
    {showAddButton ? (
      <CompactButton.Root
        ref={plusButtonRef}
        variant='ghost'
        size='medium'
        aria-label='Add item'
        onClick={onAddClick}
      >
        <CompactButton.Icon as={RiAddLine} />
      </CompactButton.Root>
    ) : null}
  </div>
);

const getItemIcon = (item) => {
  if (item.type === 'task') return RiCheckboxBlankLine;
  if (item.type === 'folder') return RiFolderLine;
  if (item.type === 'list') return RiListCheck3;
  return RiLayoutGridLine; // space / no type
};

const FavoriteTaskSidebarItem = ({ task, activeId, sidebarTree }) => {
  const navigate = useNavigate();
  const isActive = activeId === task.listId;

  const handleClick = () => {
    if (!task.id || !task.listId) {
      return;
    }

    navigate(buildBoardTaskSearchPath(task, sidebarTree));
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition duration-200 ease-out',
        isActive
          ? 'bg-bg-white-0 text-text-sub-500 shadow-regular-sm'
          : 'text-text-sub-500 hover:bg-bg-weak-50',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center'>
        <FavoriteTaskStatusIcon task={task} />
      </span>
      <span className='min-w-0 flex-1 truncate text-label-sm'>{task.label || 'Untitled'}</span>
    </button>
  );
};

const SidebarRowContent = ({
  item,
  depth = 0,
  activeId,
  expandedIds,
  onSelect,
  onToggleExpand,
  showArchived,
  showAllBoards,
  openOptionsMenuId,
  onOptionsMenuToggle,
  onBoardAction,
  onUpdateBoardIconColor,
  onSortBoardAlphabetically,
  onRenameBoard,
  onCreateFolder,
  onCreateList,
  onTaskStatuses,
  onSharingPermission,
  sidebarTree = [],
  onMoveNode,
  sortSection = null,
  // Drag-and-drop integration (only used in the Boards section).
  dndMode = false,
  dragListeners = null,
  dragAttributes = null,
  isDragging = false,
  dropIndicator = null,
}) => {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isExpanded = Boolean(expandedIds?.has?.(item.id));
  const isActive = activeId === item.id;
  const Icon = getItemIcon(item);
  const boardIconColor = item.color ? normalizeBoardColor(item.color) : null;

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const plusButtonRef = useRef(null);
  const rowRef = useRef(null);
  const isMenuOpen = openOptionsMenuId === item.id;

  const moreButtonRef = useRef(null);
  const keepActionsVisible = isMenuOpen || showCreateMenu;
  const canCreateChild =
    (item.type === 'board' || item.type === 'space' || item.type === 'folder') &&
    canPerformBoardAction(item.permissions, 'create');

  const handleClick = () => {
    onSelect(item);
  };

  const handleCaretClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleExpand(item.id);
  };

  // Stop pointer events from initiating a drag when interacting with the caret
  // or row action buttons.
  const stopDndPointer = dndMode ? (event) => event.stopPropagation() : undefined;

  return (
    <>
      {dropIndicator === 'before' ? (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute -top-px left-1 right-1 z-10 h-0.5 rounded-full bg-primary-base'
        />
      ) : null}
      {dropIndicator === 'after' ? (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute -bottom-px left-1 right-1 z-10 h-0.5 rounded-full bg-primary-base'
        />
      ) : null}

      <button
        ref={rowRef}
        type='button'
        onClick={handleClick}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg py-1.5 text-left transition duration-200 ease-out',
          depth === 0 ? 'px-1.5' : 'pl-1.5 pr-1',
          isActive
            ? 'bg-bg-white-0 text-text-sub-500 shadow-regular-sm'
            : 'text-text-sub-500 hover:bg-bg-weak-50',
          isDragging && 'opacity-40',
          dropIndicator === 'inside' && 'bg-bg-weak-50 ring-2 ring-inset ring-primary-base',
        )}
      >
        {dndMode && dragListeners ? (
          <span
            {...dragListeners}
            {...(dragAttributes || {})}
            onClick={(event) => event.stopPropagation()}
            aria-label='Drag to reorder'
            title='Drag to reorder'
            className='-ml-1.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-text-soft-400 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 active:cursor-grabbing'
          >
            <RiDraggable size={16} />
          </span>
        ) : null}

        <span
          className='relative flex size-5 shrink-0 items-center justify-center text-text-sub-500'
          onClick={hasChildren ? handleCaretClick : undefined}
          onPointerDown={
            hasChildren
              ? (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }
              : undefined
          }
        >
          {/* type icon: visible by default, hidden on hover if expandable */}
          <Icon
            size={20}
            className={cn(hasChildren && 'group-hover:hidden')}
            style={boardIconColor ? { color: boardIconColor } : undefined}
          />

          {/* caret: hidden by default, shown on hover if expandable */}
          {hasChildren ? (
            <RiArrowDownSFill
              size={20}
              className={cn('absolute hidden group-hover:block', !isExpanded && '-rotate-90')}
            />
          ) : null}
        </span>

        <div className='min-w-0 flex-1 flex items-center gap-1'>
          <span className='truncate text-label-sm'>{item.label}</span>

          {showArchived && Boolean(item.isArchived) ? (
            <RiArchiveFill size={14} className='shrink-0 text-text-soft-400' title='Archived' />
          ) : null}

          {showAllBoards && Boolean(item.isHidden) ? (
            <RiEyeOffLine size={14} className='shrink-0 text-text-soft-400' title='Hidden' />
          ) : null}
        </div>
        {/* actions: hidden by default, shown on hover */}
        <span
          className={cn(
            'shrink-0 items-center gap-1',
            keepActionsVisible ? 'flex' : 'hidden group-hover:flex',
          )}
          onPointerDown={stopDndPointer}
        >
          <SidebarItemActions
            moreButtonRef={moreButtonRef}
            plusButtonRef={plusButtonRef}
            showAddButton={canCreateChild}
            onMoreClick={(event) => {
              event.stopPropagation();
              onOptionsMenuToggle?.(item.id);
            }}
            onAddClick={(event) => {
              event.stopPropagation();
              setShowCreateMenu((value) => !value);
            }}
          />
        </span>
      </button>

      {isMenuOpen ? (
        <BoardOptionsMenu
          anchorRef={moreButtonRef}
          fallbackAnchorRef={rowRef}
          isHidden={Boolean(item.isHidden)}
          isArchived={Boolean(item.isArchived)}
          isFavorite={Boolean(item.isFavorite)}
          boardColor={item.color}
          onClose={() => onOptionsMenuToggle?.(null)}
          onCreateFolder={() => onCreateFolder?.(item)}
          onCreateList={() => onCreateList?.(item)}
          onFavorite={() => onBoardAction?.(item.isFavorite ? 'unfavorite' : 'favorite', item)}
          onRename={() => onRenameBoard?.(item)}
          onUpdateIconColor={(color) => onUpdateBoardIconColor?.(item, color)}
          onSortAZ={() => onSortBoardAlphabetically?.(item, sortSection)}
          onTaskStatuses={() => onTaskStatuses?.(item)}
          onHideBoard={() => onBoardAction?.(item.isHidden ? 'unhide' : 'hide', item)}
          onDuplicate={() => onBoardAction?.('duplicate', item)}
          onDelete={() => onBoardAction?.('delete', item)}
          onArchive={() => onBoardAction?.(item.isArchived ? 'unarchive' : 'archive', item)}
          itemType={item.type}
          sidebarTree={sidebarTree}
          movingNode={item}
          onMoveToParent={(target) => onMoveNode?.(item, target)}
          onSharingPermission={() => {
            onOptionsMenuToggle?.(null);
            onSharingPermission?.(item);
          }}
          canManageSharing={Boolean(item.canManageSharing)}
          permissions={item.permissions}
        />
      ) : null}

      {showCreateMenu && canCreateChild ? (
        <CreateItemMenu
          anchorRef={plusButtonRef}
          fallbackAnchorRef={rowRef}
          onClose={() => setShowCreateMenu(false)}
          onCreateFolder={() => {
            setShowCreateMenu(false);
            onCreateFolder?.(item);
          }}
          onCreateList={() => {
            setShowCreateMenu(false);
            onCreateList?.(item);
          }}
        />
      ) : null}
    </>
  );
};

const SidebarTreeItem = (props) => {
  const { item, depth = 0, expandedIds } = props;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isExpanded = Boolean(expandedIds?.has?.(item.id));

  return (
    <div className={cn('relative flex w-full flex-col', depth > 0 && 'gap-1')}>
      <SidebarRowContent {...props} />

      {hasChildren && isExpanded ? (
        <div className='relative flex flex-col gap-1 pl-6'>
          <span
            aria-hidden='true'
            className='absolute bottom-2 left-[11px] top-0 w-px bg-stroke-soft-200'
          />
          {item.children.map((child) => (
            <SidebarTreeItem
              {...props}
              key={child.id}
              item={child}
              depth={depth + 1}
              sortSection={null}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DRAGGABLE_NODE_TYPES = new Set(['space', 'folder', 'list']);

const DndSidebarRow = ({ row, dropIndicator, rowProps }) => {
  const { node, depth } = row;
  const draggable = DRAGGABLE_NODE_TYPES.has(node.type);

  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: node.id, data: { node, depth }, disabled: !draggable });

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { node, depth },
  });

  const setRefs = useCallback(
    (element) => {
      setDragRef(element);
      setDropRef(element);
    },
    [setDragRef, setDropRef],
  );

  return (
    <div
      ref={setRefs}
      className='relative'
      style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}
    >
      <SidebarRowContent
        {...rowProps}
        item={node}
        depth={depth}
        dndMode
        dragListeners={draggable ? listeners : null}
        dragAttributes={draggable ? attributes : null}
        isDragging={isDragging}
        dropIndicator={dropIndicator}
      />
    </div>
  );
};

const BoardsDndTree = ({ items, sourceTreeRef, expandedIds, onApplyDrop, rowProps }) => {
  const [activeNode, setActiveNode] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const rows = useMemo(() => flattenVisibleTree(items, expandedIds), [items, expandedIds]);

  const rowPropsWithExpanded = useMemo(
    () => ({ ...rowProps, expandedIds }),
    [rowProps, expandedIds],
  );

  const handleDragStart = (event) => {
    setActiveNode(event.active.data.current?.node ?? null);
    setDropTarget(null);
  };

  const handleDragMove = (event) => {
    const { active, over } = event;

    if (!over || over.id === active.id) {
      setDropTarget(null);
      return;
    }

    const overNode = over.data.current?.node;
    const activeData = active.data.current?.node;

    if (!overNode || !activeData) {
      setDropTarget(null);
      return;
    }

    const overRect = over.rect;
    const translated = active.rect.current?.translated;
    const draggedCenterY = translated ? translated.top + translated.height / 2 : overRect.top;
    let relative = (draggedCenterY - overRect.top) / (overRect.height || 1);
    relative = Math.max(0, Math.min(1, relative));

    let intent;
    if (
      isContainerType(overNode.type) &&
      canBeChildOf(activeData.type, overNode.type) &&
      relative > 0.3 &&
      relative < 0.7
    ) {
      intent = 'inside';
    } else {
      intent = relative < 0.5 ? 'before' : 'after';
    }

    const placement = computeDropPlacement({
      tree: sourceTreeRef.current,
      activeId: active.id,
      overId: over.id,
      intent,
      allowNoop: true,
    });

    setDropTarget({ overId: over.id, intent, valid: Boolean(placement) });
  };

  const handleDragEnd = (event) => {
    const target = dropTarget;
    setActiveNode(null);
    setDropTarget(null);

    const { active, over } = event;
    if (!over || !target || !target.valid) {
      return;
    }

    const placement = computeDropPlacement({
      tree: sourceTreeRef.current,
      activeId: active.id,
      overId: over.id,
      intent: target.intent,
    });

    if (placement) {
      onApplyDrop(placement);
    }
  };

  const handleDragCancel = () => {
    setActiveNode(null);
    setDropTarget(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <nav className='flex w-full flex-col gap-1'>
        {rows.map((row) => (
          <DndSidebarRow
            key={row.id}
            row={row}
            dropIndicator={
              dropTarget && dropTarget.valid && dropTarget.overId === row.id
                ? dropTarget.intent
                : null
            }
            rowProps={rowPropsWithExpanded}
          />
        ))}
      </nav>

      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className='flex items-center gap-2 rounded-lg bg-bg-white-0 px-2 py-1.5 shadow-regular-md ring-1 ring-stroke-soft-200'>
            <span className='flex size-5 shrink-0 items-center justify-center text-text-sub-500'>
              {React.createElement(getItemIcon(activeNode), {
                size: 18,
                style: activeNode.color
                  ? { color: normalizeBoardColor(activeNode.color) }
                  : undefined,
              })}
            </span>
            <span className='truncate text-label-sm text-text-sub-500'>{activeNode.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const Sidebar = ({
  activeId = null,
  expandedIds: controlledExpandedIds,
  onExpandedIdsChange,
  onSelectItem,
  onTreeLoaded,
  favoritesVersion = 0,
  favoriteTaskPatch = null,
  onStatusTemplateChanged,
}) => {
  const [boardItems, setBoardItems] = useState([]);
  const [favoriteTasks, setFavoriteTasks] = useState([]);
  const [internalExpandedIds, setInternalExpandedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState(null);
  const [createItemRequest, setCreateItemRequest] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [taskStatusesItem, setTaskStatusesItem] = useState(null);
  const [boardToShare, setBoardToShare] = useState(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);

  const [isBoardsMenuOpen, setIsBoardsMenuOpen] = useState(false);
  const [isFavoritesMenuOpen, setIsFavoritesMenuOpen] = useState(false);
  const [openOptionsMenuId, setOpenOptionsMenuId] = useState(null);
  const [showAllBoards, setShowAllBoards] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [alphabeticalSortBoardIds, setAlphabeticalSortBoardIds] = useState([]);
  const [sortFavoritesAlphabetically, setSortFavoritesAlphabetically] = useState(false);
  const [sortBoardsAlphabetically, setSortBoardsAlphabetically] = useState(false);
  const boardsMoreRef = useRef(null);
  const favoritesMoreRef = useRef(null);
  const hasAutoExpandedRef = useRef(false);
  const loadSidebarTreeRef = useRef(null);
  // Mirror the raw (unfiltered) tree so drag-and-drop can resolve true sibling
  // ordering and parent relationships, including favorited/hidden siblings.
  const sourceTreeRef = useRef([]);
  sourceTreeRef.current = boardItems;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser, logout: authLogout } = useAuth();
  const { profileData } = useSelector((state) => state.profile);

  const sidebarUser = useMemo(() => {
    const profile = (profileData ?? {}) as {
      full_name?: string;
      email?: string;
      profile_image?: string;
      user_image?: string;
    };
    const auth = authUser ?? {};

    return {
      full_name: profile.full_name || auth.full_name || '',
      email: profile.email || auth.email || '',
      profile_image: profile.profile_image || auth.user_image || '',
      user_image: profile.user_image || auth.user_image || '',
    };
  }, [authUser, profileData]);

  const handleLogout = useCallback(async () => {
    try {
      await logOutService();
    } catch {
      // Always clear local session even if the logout API fails.
    }

    authLogout();
    dispatch(logoutSuccess());
    navigate('/login');
  }, [authLogout, dispatch, navigate]);

  const expandedIdsRef = useRef(new Set());
  const isExpandedControlled = typeof onExpandedIdsChange === 'function';

  const expandedIds = useMemo(() => {
    if (isExpandedControlled) {
      return new Set(controlledExpandedIds ?? []);
    }

    return internalExpandedIds;
  }, [controlledExpandedIds, internalExpandedIds, isExpandedControlled]);

  expandedIdsRef.current = expandedIds;

  const setExpandedIds = useCallback(
    (updater) => {
      const previous = expandedIdsRef.current;
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const nextIds = [...next];

      if (isExpandedControlled) {
        onExpandedIdsChange(nextIds);
        return;
      }

      setInternalExpandedIds(new Set(nextIds));
    },
    [isExpandedControlled, onExpandedIdsChange],
  );

  const sortedBoardItems = React.useMemo(
    () => applySidebarTreeSorting(boardItems, new Set(alphabeticalSortBoardIds)),
    [boardItems, alphabeticalSortBoardIds],
  );

  const nextBoardSortOrder = React.useMemo(() => getNextBoardSortOrder(boardItems), [boardItems]);

  const sidebarVisibilityOptions = useMemo(
    () => ({ showArchived, showAllBoards }),
    [showArchived, showAllBoards],
  );

  const visibleBoardTree = React.useMemo(
    () => filterSidebarTreeByVisibility(sortedBoardItems, sidebarVisibilityOptions),
    [sidebarVisibilityOptions, sortedBoardItems],
  );

  const favoriteBoards = React.useMemo(() => {
    let boards = visibleBoardTree.filter((board) => board.isFavorite);

    if (sortFavoritesAlphabetically) {
      boards = sortItemsByLabel(boards);
    }

    return boards;
  }, [visibleBoardTree, sortFavoritesAlphabetically]);

  const favoriteFoldersAndLists = React.useMemo(() => {
    return dedupeSidebarItemsById(
      collectFavoriteFoldersAndLists(sortedBoardItems, sidebarVisibilityOptions),
    );
  }, [sidebarVisibilityOptions, sortedBoardItems]);

  const favoriteSidebarItems = React.useMemo(() => {
    const combined = [
      ...favoriteBoards.map((board) => ({
        kind: 'board',
        item: prepareSidebarItemForFavoritesSection(board),
        label: board.label,
      })),
      ...favoriteFoldersAndLists.map((item) => ({
        kind: item.type,
        item: prepareSidebarItemForFavoritesSection(item),
        label: item.label,
      })),
      ...favoriteTasks.map((task) => ({ kind: 'task', item: task, label: task.label })),
    ];

    const sorted = sortFavoritesAlphabetically ? sortItemsByLabel(combined) : combined;
    return sorted.map(({ kind, item }) => ({ kind, item }));
  }, [favoriteBoards, favoriteFoldersAndLists, favoriteTasks, sortFavoritesAlphabetically]);

  const regularBoards = React.useMemo(() => {
    let boards = visibleBoardTree.filter((board) => !board.isFavorite);

    if (sortBoardsAlphabetically) {
      boards = sortItemsByLabel(boards);
    }

    return boards;
  }, [visibleBoardTree, sortBoardsAlphabetically]);

  const boardsForSidebar = React.useMemo(
    () => prepareBoardsSectionTree(regularBoards),
    [regularBoards],
  );

  const loadFavoriteTasks = useCallback(async () => {
    const result = await getFavoriteTasks();

    if (result.error) {
      setFavoriteTasks([]);
      return;
    }

    setFavoriteTasks(result.data ?? []);
  }, []);

  useEffect(() => {
    loadFavoriteTasks();
  }, [favoritesVersion, loadFavoriteTasks]);

  useEffect(() => {
    const taskId = favoriteTaskPatch?.taskId;
    if (!taskId) {
      return;
    }

    setFavoriteTasks((previous) => {
      const hasTask = previous.some((task) => task.id === taskId);
      if (!hasTask) {
        return previous;
      }

      return previous.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          status: favoriteTaskPatch.status ?? task.status,
          statusColor: favoriteTaskPatch.statusColor ?? task.statusColor,
          statusCategory: favoriteTaskPatch.statusCategory ?? task.statusCategory,
          statusTitle: favoriteTaskPatch.statusTitle ?? task.statusTitle,
          isClosed:
            typeof favoriteTaskPatch.isClosed === 'boolean'
              ? favoriteTaskPatch.isClosed
              : task.isClosed,
        };
      });
    });
  }, [favoriteTaskPatch]);

  const loadSidebarTree = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      const result = await getSidebarTree({
        includeArchived: true,
        includeHidden: true,
      });

      if (result.error) {
        setError(result.error);
        if (!silent) {
          setBoardItems([]);
        }
        setIsLoading(false);
        return result;
      }

      const items = result.data ?? [];
      setBoardItems(items);
      onTreeLoaded?.(items);
      if (!silent && !hasAutoExpandedRef.current && !onExpandedIdsChange) {
        setExpandedIds(new Set(collectExpandableIds(items)));
        hasAutoExpandedRef.current = true;
      }
      setIsLoading(false);
      return result;
    },
    [onExpandedIdsChange, onTreeLoaded, setExpandedIds],
  );

  loadSidebarTreeRef.current = loadSidebarTree;

  useEffect(() => {
    loadSidebarTreeRef.current?.();
  }, []);

  const handleSelect = useCallback(
    (item) => {
      onSelectItem?.(item);
    },
    [onSelectItem],
  );

  const handleToggleExpand = useCallback(
    (id) => {
      setExpandedIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [setExpandedIds],
  );

  const handleOptionsMenuToggle = useCallback((itemId) => {
    if (itemId == null) {
      setOpenOptionsMenuId(null);
      return;
    }

    setOpenOptionsMenuId((previous) => (previous === itemId ? null : itemId));
  }, []);

  const refreshSidebarTree = useCallback(async () => {
    const result = await loadSidebarTree({ silent: true });
    if (result?.error) {
      showErrorToast(result.error);
    }
    return result;
  }, [loadSidebarTree]);

  const navigateToCreatedItem = useCallback(
    async (createdDoc) => {
      const treeResult = await refreshSidebarTree();

      if (treeResult?.error) {
        return;
      }

      const targetList = findListTargetAfterCreate(treeResult.data ?? [], createdDoc);

      if (targetList) {
        onSelectItem?.(targetList);
      }
    },
    [onSelectItem, refreshSidebarTree],
  );

  const handleApplyDrop = useCallback(
    async (placement) => {
      if (!placement) {
        return;
      }

      if (placement.move) {
        const { kind, nodeId, payload } = placement.move;
        const moveResult =
          kind === 'folder'
            ? await moveFolder(nodeId, {
                space: payload.space,
                parentFolder: payload.parentFolder,
              })
            : await moveList(nodeId, {
                space: payload.space,
                folder: payload.folder,
              });

        if (moveResult.error) {
          showErrorToast(moveResult.error);
          await refreshSidebarTree();
          return;
        }
      }

      const reorderResult = await reorderSiblings(placement.orderedSiblings);
      if (reorderResult.error) {
        showErrorToast(reorderResult.error);
      }

      if (placement.expandId) {
        setExpandedIds((previous) => {
          const next = new Set(previous);
          next.add(placement.expandId);
          return next;
        });
      }

      await refreshSidebarTree();
    },
    [refreshSidebarTree, setExpandedIds],
  );

  const handleMoveNode = useCallback(
    async (item, target) => {
      if (!item?.id || !target) {
        return false;
      }

      const result =
        item.type === 'folder'
          ? await moveFolder(item.id, {
              space: target.space ?? null,
              parentFolder: target.parent ?? null,
            })
          : await moveList(item.id, {
              space: target.space ?? null,
              folder: target.parent ?? null,
            });

      if (result.error) {
        showErrorToast(result.error);
        return false;
      }

      setOpenOptionsMenuId(null);

      if (target.parent) {
        setExpandedIds((previous) => {
          const next = new Set(previous);
          next.add(target.parent);
          return next;
        });
      }

      await refreshSidebarTree();
      showSuccessToast('Moved successfully');
      return true;
    },
    [refreshSidebarTree, setExpandedIds],
  );

  const performDeleteBoard = useCallback(
    async (item, dontShowAgain = false) => {
      if (!item?.id) return;

      setIsDeletingBoard(true);
      setOpenOptionsMenuId(null);

      if (dontShowAgain) {
        setSkipDeleteBoardConfirm(true);
      }

      const result =
        item.type === 'folder'
          ? await deleteFolder(item.id)
          : item.type === 'list'
            ? await deleteList(item.id)
            : await deleteBoard(item.id);

      setIsDeletingBoard(false);

      if (result.error) {
        showErrorToast(result.error);
        return;
      }

      setBoardToDelete(null);
      await refreshSidebarTree();
    },
    [refreshSidebarTree],
  );

  const handleDeleteBoardRequest = useCallback(
    (board) => {
      setOpenOptionsMenuId(null);

      if (shouldSkipDeleteBoardConfirm()) {
        performDeleteBoard(board);
        return;
      }

      setBoardToDelete(board);
    },
    [performDeleteBoard],
  );

  const handleUpdateBoardIconColor = useCallback(
    async (item, color) => {
      const result =
        item.type === 'folder'
          ? await updateFolderAppearance(item.id, color)
          : item.type === 'list'
            ? await updateListAppearance(item.id, color)
            : await updateBoardAppearance(item.id, color);

      if (result.error) {
        showErrorToast(result.error);
        return false;
      }

      setOpenOptionsMenuId(null);
      await refreshSidebarTree();
      return true;
    },
    [refreshSidebarTree],
  );

  const handleRenameBoardRequest = useCallback((item) => {
    setOpenOptionsMenuId(null);
    setBoardToEdit({
      id: item.id,
      type: item.type,
      label: item.label,
      description: item.description ?? '',
      isPrivate: Boolean(item.isPrivate),
    });
  }, []);

  const handleTaskStatusesRequest = useCallback((item) => {
    setOpenOptionsMenuId(null);
    setTaskStatusesItem(item);
  }, []);

  const handleSharingPermissionRequest = useCallback((item) => {
    setOpenOptionsMenuId(null);
    setBoardToShare(item);
  }, []);

  const handleCreateFolder = useCallback(
    (item) => {
      const context = getFolderCreateContext(item, boardItems);

      if (!context) {
        showErrorToast('Unable to create folder here.');
        return;
      }

      setCreateItemRequest({ type: 'folder', context });
    },
    [boardItems],
  );

  const handleCreateList = useCallback(
    (item) => {
      const context = getListCreateContext(item, boardItems);

      if (!context) {
        showErrorToast('Unable to create list here.');
        return;
      }

      setCreateItemRequest({ type: 'list', context });
    },
    [boardItems],
  );

  const handleSortBoardAlphabetically = useCallback((item, section) => {
    setAlphabeticalSortBoardIds((previous) =>
      previous.includes(item.id) ? previous : [...previous, item.id],
    );

    if (section === 'favorites') {
      setSortFavoritesAlphabetically(true);
    }

    if (section === 'boards') {
      setSortBoardsAlphabetically(true);
    }

    setOpenOptionsMenuId(null);
  }, []);

  const applySidebarNodeFlagUpdate = useCallback(
    (item, action) => {
      const patchByAction = {
        archive: { isArchived: true },
        unarchive: { isArchived: false },
        hide: { isHidden: true },
        unhide: { isHidden: false },
        favorite: { isFavorite: true },
        unfavorite: { isFavorite: false },
      };
      const patch = patchByAction[action];

      if (!patch || !item?.id) {
        return false;
      }

      setBoardItems((previous) => {
        const next = updateSidebarTreeNode(previous, item.id, (node) => ({
          ...node,
          ...patch,
        }));
        onTreeLoaded?.(next);
        return next;
      });

      return true;
    },
    [onTreeLoaded],
  );

  const handleBoardAction = useCallback(
    async (action, item) => {
      setOpenOptionsMenuId(null);

      if (action === 'delete') {
        handleDeleteBoardRequest(item);
        return;
      }

      if (action === 'duplicate') {
        let duplicateResult;
        if (item.type === 'folder') {
          duplicateResult = await duplicateFolder(item.id);
        } else if (item.type === 'list') {
          duplicateResult = await duplicateList(item.id);
        } else {
          duplicateResult = await duplicateBoard(item.id);
        }

        if (duplicateResult?.error) {
          showErrorToast(duplicateResult.error);
          return;
        }

        showSuccessToast('Duplicated successfully');
        await refreshSidebarTree();
        return;
      }

      let result;

      switch (action) {
        case 'favorite':
          if (item.type === 'folder') {
            result = await favoriteFolder(item.id);
          } else if (item.type === 'list') {
            result = await favoriteList(item.id);
          } else {
            result = await favoriteBoard(item.id);
          }
          break;
        case 'unfavorite':
          if (item.type === 'folder') {
            result = await unfavoriteFolder(item.id);
          } else if (item.type === 'list') {
            result = await unfavoriteList(item.id);
          } else {
            result = await unfavoriteBoard(item.id);
          }
          break;
        case 'hide':
          if (item.type === 'folder') {
            result = await hideFolder(item.id);
          } else if (item.type === 'list') {
            result = await hideList(item.id);
          } else {
            result = await hideBoard(item.id);
          }
          break;
        case 'unhide':
          if (item.type === 'folder') {
            result = await unhideFolder(item.id);
          } else if (item.type === 'list') {
            result = await unhideList(item.id);
          } else {
            result = await unhideBoard(item.id);
          }
          break;
        case 'archive':
          if (item.type === 'folder') {
            result = await archiveFolder(item.id);
          } else if (item.type === 'list') {
            result = await archiveList(item.id);
          } else {
            result = await archiveBoard(item.id);
          }
          break;
        case 'unarchive':
          if (item.type === 'folder') {
            result = await unarchiveFolder(item.id);
          } else if (item.type === 'list') {
            result = await unarchiveList(item.id);
          } else {
            result = await unarchiveBoard(item.id);
          }
          break;
        default:
          return;
      }

      if (result?.error) {
        showErrorToast(result.error);
        return;
      }

      if (applySidebarNodeFlagUpdate(item, action)) {
        return;
      }

      await refreshSidebarTree();
    },
    [applySidebarNodeFlagUpdate, handleDeleteBoardRequest, refreshSidebarTree],
  );

  return (
    <aside className='flex h-full min-h-0 w-[15rem] shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-weak-100'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-5'>
        <section className='flex w-full flex-col gap-1.5'>
          <SectionHeader
            showActions
            moreButtonRef={favoritesMoreRef}
            actionsVisible={isFavoritesMenuOpen}
            onMore={() => {
              setIsBoardsMenuOpen(false);
              setIsFavoritesMenuOpen((v) => !v);
            }}
            onAdd={() => setIsCreateBoardOpen(true)}
          >
            Favorites
          </SectionHeader>

          {isFavoritesMenuOpen && (
            <BoardsMenu
              anchorRef={favoritesMoreRef}
              onClose={() => setIsFavoritesMenuOpen(false)}
              onCreateBoard={() => setIsCreateBoardOpen(true)}
              showAllBoards={showAllBoards}
              onToggleShowAllBoards={() => setShowAllBoards((v) => !v)}
              showArchived={showArchived}
              onToggleShowArchived={() => setShowArchived((v) => !v)}
            />
          )}

          {favoriteSidebarItems.length === 0 ? (
            <button
              type='button'
              className='flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left text-text-soft-400 transition duration-200 ease-out hover:bg-bg-weak-50'
            >
              <RiStarLine size={20} className='shrink-0' />
              <span className='truncate text-label-sm'>Add to favorites</span>
            </button>
          ) : (
            <nav className='flex w-full flex-col gap-1'>
              {favoriteSidebarItems.map((entry) =>
                entry.kind === 'task' ? (
                  <FavoriteTaskSidebarItem
                    key={`favorite-task-${entry.item.id}`}
                    task={entry.item}
                    activeId={activeId}
                    sidebarTree={boardItems}
                  />
                ) : (
                  <SidebarTreeItem
                    key={`favorite-${entry.kind}-${entry.item.id}`}
                    item={entry.item}
                    activeId={activeId}
                    expandedIds={expandedIds}
                    onSelect={handleSelect}
                    onToggleExpand={handleToggleExpand}
                    showArchived={showArchived}
                    showAllBoards={showAllBoards}
                    openOptionsMenuId={openOptionsMenuId}
                    onOptionsMenuToggle={handleOptionsMenuToggle}
                    onBoardAction={handleBoardAction}
                    onUpdateBoardIconColor={handleUpdateBoardIconColor}
                    onSortBoardAlphabetically={handleSortBoardAlphabetically}
                    onRenameBoard={handleRenameBoardRequest}
                    onCreateFolder={handleCreateFolder}
                    onCreateList={handleCreateList}
                    onTaskStatuses={handleTaskStatusesRequest}
                    onSharingPermission={handleSharingPermissionRequest}
                    sidebarTree={boardItems}
                    onMoveNode={handleMoveNode}
                    sortSection='favorites'
                  />
                ),
              )}
            </nav>
          )}
        </section>

        <section className='flex w-full flex-col gap-1.5'>
          <SectionHeader
            showActions
            moreButtonRef={boardsMoreRef}
            actionsVisible={isBoardsMenuOpen}
            onMore={() => {
              setIsFavoritesMenuOpen(false);
              setIsBoardsMenuOpen((v) => !v);
            }}
            onAdd={() => setIsCreateBoardOpen(true)}
          >
            Boards
          </SectionHeader>

          {isBoardsMenuOpen && (
            <BoardsMenu
              anchorRef={boardsMoreRef}
              onClose={() => setIsBoardsMenuOpen(false)}
              onCreateBoard={() => setIsCreateBoardOpen(true)}
              showAllBoards={showAllBoards}
              onToggleShowAllBoards={() => setShowAllBoards((v) => !v)}
              showArchived={showArchived}
              onToggleShowArchived={() => setShowArchived((v) => !v)}
            />
          )}

          {isLoading ? (
            <div className='flex flex-col gap-2 px-1.5 py-2'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className='h-8 animate-pulse rounded-lg bg-bg-weak-50' />
              ))}
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className='flex flex-col gap-2 px-1.5 py-2'>
              <p className='text-paragraph-sm text-error-base'>{error}</p>
              <button
                type='button'
                onClick={loadSidebarTree}
                className='w-fit text-label-sm text-primary-base hover:underline'
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !error ? (
            <>
              <BoardsDndTree
                items={boardsForSidebar}
                sourceTreeRef={sourceTreeRef}
                expandedIds={expandedIds}
                onApplyDrop={handleApplyDrop}
                rowProps={{
                  activeId,
                  onSelect: handleSelect,
                  onToggleExpand: handleToggleExpand,
                  showArchived,
                  showAllBoards,
                  openOptionsMenuId,
                  onOptionsMenuToggle: handleOptionsMenuToggle,
                  onBoardAction: handleBoardAction,
                  onUpdateBoardIconColor: handleUpdateBoardIconColor,
                  onSortBoardAlphabetically: handleSortBoardAlphabetically,
                  onRenameBoard: handleRenameBoardRequest,
                  onCreateFolder: handleCreateFolder,
                  onCreateList: handleCreateList,
                  onTaskStatuses: handleTaskStatusesRequest,
                  onSharingPermission: handleSharingPermissionRequest,
                  sidebarTree: boardItems,
                  onMoveNode: handleMoveNode,
                  sortSection: 'boards',
                }}
              />

              {boardsForSidebar.length === 0 ? (
                <button
                  type='button'
                  onClick={() => setIsCreateBoardOpen(true)}
                  className='self-stretch h-8 flex flex-col justify-center items-start gap-1'
                >
                  <div className='self-stretch px-1.5 py-2 rounded-lg inline-flex justify-start items-center gap-2 hover:bg-bg-weak-50'>
                    <span className='size-5 flex items-center justify-center text-icon-soft-400'>
                      <RiAddLine size={18} />
                    </span>
                    <span className='flex-1 text-left text-text-soft-400 text-sm font-medium leading-5'>
                      New Board
                    </span>
                  </div>
                </button>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      {/* ADD THIS — Modal renders outside the scrollable/overflow container */}
      {isCreateBoardOpen || boardToEdit || createItemRequest ? (
        <CreateBoardModal
          board={boardToEdit}
          createItem={createItemRequest}
          nextSortOrder={nextBoardSortOrder}
          onClose={() => {
            setIsCreateBoardOpen(false);
            setBoardToEdit(null);
            setCreateItemRequest(null);
          }}
          onCreated={async (data) => {
            const expandIds = createItemRequest?.context?.expandIds ?? [];
            const wasCreate = !boardToEdit?.id;
            setIsCreateBoardOpen(false);
            setBoardToEdit(null);
            setCreateItemRequest(null);

            if (expandIds.length > 0) {
              setExpandedIds((previous) => {
                const next = new Set(previous);
                expandIds.forEach((id) => next.add(id));
                return next;
              });
            }

            if (wasCreate) {
              await navigateToCreatedItem(data);
              return;
            }

            await loadSidebarTree({ silent: true });
          }}
        />
      ) : null}

      <DeleteBoardModal
        isOpen={Boolean(boardToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingBoard) {
            setBoardToDelete(null);
          }
        }}
        board={boardToDelete}
        isLoading={isDeletingBoard}
        onConfirm={({ board, dontShowAgain }) => {
          performDeleteBoard(board, dontShowAgain);
        }}
      />

      {taskStatusesItem ? (
        <TaskStatusesModal
          item={taskStatusesItem}
          boardItems={boardItems}
          onClose={() => setTaskStatusesItem(null)}
          onSaved={() => loadSidebarTree({ silent: true })}
          onTemplateChanged={onStatusTemplateChanged}
        />
      ) : null}

      {boardToShare ? (
        <BoardShareModal
          board={boardToShare}
          onClose={() => setBoardToShare(null)}
          onUpdated={() => loadSidebarTree({ silent: true })}
        />
      ) : null}

      <div className='shrink-0 border-t border-stroke-soft-200 px-5 pb-5 pt-3'>
        <SidebarUserProfile user={sidebarUser} onLogout={handleLogout} />
      </div>
    </aside>
  );
};

export default Sidebar;
