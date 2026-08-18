import {
  Plus,
  Star,
  StarOff,
  Pencil,
  Palette,
  ArrowDownAZ,
  ListChecks,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Archive,
  ArchiveRestore,
  Share2,
  ChevronRight,
  FolderInput,
} from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { canPerformBoardAction } from '../constants/board-share-constants';
import useAnchoredMenuPosition from '../hooks/useAnchoredMenuPosition';
import useHoverSubmenuController from '../hooks/useHoverSubmenuController';
import CreateItemMenu from './CreateItemMenu';
import IconColorPicker from './IconColorPicker';
import SidebarNodeMoveMenu from './SidebarNodeMoveMenu';

const MenuItem = forwardRef(
  ({ icon: Icon, label, sublabel, onClick, active = false, hoverHandlers = {} }, ref) => (
    <button
      ref={ref}
      type='button'
      onClick={onClick}
      {...hoverHandlers}
      className={cn(
        'flex w-full gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50',
        sublabel ? 'items-start' : 'items-center',
        active && 'bg-bg-weak-50',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='text-sm leading-5 tracking-[-0.084px] text-text-main-900'>{label}</span>
        {sublabel ? <span className='text-xs leading-4 text-text-soft-400'>{sublabel}</span> : null}
      </span>
    </button>
  ),
);

MenuItem.displayName = 'MenuItem';

const Divider = () => <div className='h-px w-full bg-stroke-soft-200' />;

export default function BoardOptionsMenu({
  anchorRef,
  fallbackAnchorRef = null,
  onClose,
  isHidden = false,
  isArchived = false,
  isFavorite = false,
  boardColor,
  onUpdateIconColor,
  onCreateFolder,
  onCreateList,
  onFavorite,
  onRename,
  onSortAZ,
  onTaskStatuses,
  onHideBoard,
  onDuplicate,
  onDelete,
  onArchive,
  onSharingPermission,
  canManageSharing = false,
  permissions = null,
  itemType = 'space',
  sidebarTree = [],
  movingNode = null,
  onMoveToParent,
}) {
  const menuRef = useRef(null);
  const createNewRef = useRef(null);
  const iconColorRef = useRef(null);
  const moveRef = useRef(null);
  const createSubmenuRef = useRef(null);
  const colorSubmenuRef = useRef(null);
  const moveSubmenuRef = useRef(null);
  const { closeSubmenu, getItemHandlers, getPanelHandlers, isOpen } = useHoverSubmenuController();
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef, fallbackAnchorRef);

  const showCreateItemMenu = isOpen('create');
  const showIconColorPicker = isOpen('color');
  const showMoveMenu = isOpen('move');

  const canMove = itemType === 'folder' || itemType === 'list';
  const canCreate = canPerformBoardAction(permissions, 'create');
  const canEdit = canPerformBoardAction(permissions, 'edit');
  const canDelete = canPerformBoardAction(permissions, 'delete');
  const showCreateNew = itemType === 'space' || itemType === 'folder' ? canCreate : false;

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      if (
        menuRef.current?.contains(target) ||
        anchorRef?.current?.contains(target) ||
        createSubmenuRef.current?.contains(target) ||
        colorSubmenuRef.current?.contains(target) ||
        moveSubmenuRef.current?.contains(target)
      ) {
        return;
      }

      closeSubmenu();
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorRef, closeSubmenu, onClose]);

  const handleColorSelect = async (color) => {
    setIsUpdatingColor(true);
    const success = await onUpdateIconColor?.(color);
    setIsUpdatingColor(false);

    if (success) {
      closeSubmenu();
    }
  };

  const handleCreateFolder = () => {
    closeSubmenu();
    onClose?.();
    onCreateFolder?.();
  };

  const handleCreateList = () => {
    closeSubmenu();
    onClose?.();
    onCreateList?.();
  };

  return createPortal(
    <>
      <div
        ref={menuRef}
        className='fixed z-[200] flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
        style={{
          top,
          left,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
      >
        {showCreateNew ? (
          <button
            ref={createNewRef}
            type='button'
            {...getItemHandlers('create')}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50',
              showCreateItemMenu && 'bg-bg-weak-50',
            )}
          >
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <Plus size={16} strokeWidth={1.75} />
            </span>
            <span className='flex-1 text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
              Create New
            </span>
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <ChevronRight size={16} strokeWidth={1.75} />
            </span>
          </button>
        ) : null}

        <MenuItem
          icon={isFavorite ? StarOff : Star}
          label={isFavorite ? 'Unfavorite' : 'Favorite'}
          onClick={onFavorite}
        />
        {canEdit ? (
          <MenuItem
            icon={Pencil}
            label='Rename'
            onClick={() => {
              onClose?.();
              onRename?.();
            }}
          />
        ) : null}

        <Divider />

        {canEdit ? (
          <>
            <MenuItem
              ref={iconColorRef}
              icon={Palette}
              label='Icon Color'
              active={showIconColorPicker}
              hoverHandlers={getItemHandlers('color')}
            />
            <MenuItem icon={ArrowDownAZ} label='Short Item A TO Z' onClick={onSortAZ} />
            <MenuItem
              icon={ListChecks}
              label='Task Statuses'
              onClick={() => {
                onClose?.();
                onTaskStatuses?.();
              }}
            />
          </>
        ) : null}

        <Divider />

        <MenuItem
          icon={isHidden ? Eye : EyeOff}
          label={isHidden ? 'Unhide Board' : 'Hide Board'}
          sublabel={
            isHidden
              ? 'Show this board in your sidebar again'
              : "You'll retain access to this board, but it won't be shown in your sidebar"
          }
          onClick={onHideBoard}
        />

        <Divider />

        {canMove && canEdit ? (
          <button
            ref={moveRef}
            type='button'
            {...getItemHandlers('move')}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50',
              showMoveMenu && 'bg-bg-weak-50',
            )}
          >
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <FolderInput size={16} strokeWidth={1.75} />
            </span>
            <span className='flex-1 text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
              Move
            </span>
            <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
              <ChevronRight size={16} strokeWidth={1.75} />
            </span>
          </button>
        ) : null}

        {canEdit ? <MenuItem icon={Copy} label='Duplicate' onClick={onDuplicate} /> : null}
        {canDelete ? <MenuItem icon={Trash2} label='Delete' onClick={onDelete} /> : null}
        {canEdit ? (
          <MenuItem
            icon={isArchived ? ArchiveRestore : Archive}
            label={isArchived ? 'Unarchive' : 'Archive'}
            onClick={onArchive}
          />
        ) : null}

        {canManageSharing ? (
          <div className='flex w-full items-center p-2'>
            <button
              type='button'
              onClick={() => {
                onClose?.();
                onSharingPermission?.();
              }}
              className='flex flex-1 items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1.5 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition-colors hover:bg-bg-weak-50'
            >
              <Share2 size={16} strokeWidth={1.75} className='shrink-0 text-icon-sub-500' />
              <span className='px-1 text-sm font-medium leading-5 tracking-[-0.084px] text-text-sub-500'>
                Sharing &amp; Permission
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {showCreateItemMenu && showCreateNew ? (
        <CreateItemMenu
          anchorRef={createNewRef}
          parentMenuRef={menuRef}
          panelRef={createSubmenuRef}
          panelHoverHandlers={getPanelHandlers('create')}
          onClose={closeSubmenu}
          onCreateFolder={handleCreateFolder}
          onCreateList={handleCreateList}
        />
      ) : null}

      {showIconColorPicker ? (
        <IconColorPicker
          anchorRef={iconColorRef}
          menuRef={menuRef}
          panelRef={colorSubmenuRef}
          panelHoverHandlers={getPanelHandlers('color')}
          selectedColor={boardColor}
          isSubmitting={isUpdatingColor}
          onClose={closeSubmenu}
          onSelect={handleColorSelect}
        />
      ) : null}

      {showMoveMenu && canMove ? (
        <SidebarNodeMoveMenu
          anchorRef={moveRef}
          parentMenuRef={menuRef}
          panelRef={moveSubmenuRef}
          panelHoverHandlers={getPanelHandlers('move')}
          sidebarTree={sidebarTree}
          movingNode={movingNode}
          onClose={closeSubmenu}
          onMove={async (target) => {
            const success = await onMoveToParent?.(target);
            if (success) {
              closeSubmenu();
              onClose?.();
            }
            return success;
          }}
        />
      ) : null}
    </>,
    document.body,
  );
}
