import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RiArchiveLine,
  RiArrowRightSLine,
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiInbox2Line,
  RiLayoutColumnLine,
  RiLogoutBoxRLine,
  RiNotificationOffLine,
  RiPencilLine,
  RiPlayListAddLine,
  RiStarFill,
  RiStarLine,
} from 'react-icons/ri';
import { cn } from '@/utils/cn';
import InboxSnoozePopover from '@/pages/boards/inbox/InboxSnoozePopover';
import useAnchoredMenuPosition from '../../../hooks/useAnchoredMenuPosition';
import useHoverSubmenuController from '../../../hooks/useHoverSubmenuController';
import TaskAddToMenu from './TaskAddToMenu';
import TaskMoveToMenu from './TaskMoveToMenu';

const MenuItem = forwardRef(
  ({ icon: Icon, label, onClick, hasSubmenu = false, active = false, hoverHandlers = {} }, ref) => (
    <button
      ref={ref}
      type='button'
      onClick={onClick}
      {...hoverHandlers}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-bg-weak-50',
        active && 'bg-bg-weak-50',
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center text-icon-sub-500'>
        <Icon size={18} />
      </span>
      <span className='flex-1 text-sm leading-5 tracking-[-0.084px] text-text-main-900'>
        {label}
      </span>
      {hasSubmenu ? <RiArrowRightSLine size={18} className='shrink-0 text-icon-sub-500' /> : null}
    </button>
  ),
);

MenuItem.displayName = 'MenuItem';

const Divider = () => <div className='h-px w-full bg-stroke-soft-200' />;

export default function TaskOptionsMenu({
  anchorRef,
  onClose,
  task,
  currentListId,
  sidebarTree = [],
  statusGroups = [],
  onTaskMoved,
  onTaskAdded,
  onRename,
  onAddColumn,
  onFavorite,
  onUnfollow,
  onRemindInbox,
  onDuplicate,
  onDelete,
  onArchive,
}) {
  const menuRef = useRef(null);
  const moveToRef = useRef(null);
  const addToRef = useRef(null);
  const moveSubmenuRef = useRef(null);
  const addSubmenuRef = useRef(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const { closeSubmenu, getItemHandlers, getPanelHandlers, isOpen } = useHoverSubmenuController();
  const { top, left, maxHeight } = useAnchoredMenuPosition(anchorRef, menuRef);

  const showMoveToMenu = isOpen('move');
  const showAddToMenu = isOpen('add');

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      if (
        menuRef.current?.contains(target) ||
        anchorRef?.current?.contains(target) ||
        moveSubmenuRef.current?.contains(target) ||
        addSubmenuRef.current?.contains(target)
      ) {
        return;
      }

      closeSubmenu();
      onClose?.();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorRef, closeSubmenu, onClose]);

  const handleAction = (callback) => {
    onClose?.();
    callback?.();
  };

  const handleMoveToClose = () => {
    closeSubmenu();
  };

  const handleMoveSuccess = () => {
    closeSubmenu();
    onClose?.();
    onTaskMoved?.();
  };

  const handleAddToClose = () => {
    closeSubmenu();
  };

  const handleAddSuccess = () => {
    closeSubmenu();
    onClose?.();
    onTaskAdded?.();
  };

  const handleRemindSelect = (remindAt) => {
    setRemindOpen(false);
    onClose?.();
    onRemindInbox?.(remindAt);
  };

  return createPortal(
    <>
      <div
        ref={menuRef}
        className='fixed z-50 flex w-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-2 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'
        style={{
          top,
          left,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
      >
        <MenuItem icon={RiPencilLine} label='Rename' onClick={() => handleAction(onRename)} />
        <MenuItem
          icon={RiLayoutColumnLine}
          label='Add a Column'
          onClick={() => handleAction(onAddColumn)}
        />
        <MenuItem
          icon={task?.isFavorite ? RiStarFill : RiStarLine}
          label={task?.isFavorite ? 'Unfavorite' : 'Favorite'}
          onClick={() => handleAction(onFavorite)}
        />
        <MenuItem
          icon={RiNotificationOffLine}
          label='Unfollow Task'
          onClick={() => handleAction(onUnfollow)}
        />
        <InboxSnoozePopover
          open={remindOpen}
          onOpenChange={setRemindOpen}
          onSelect={handleRemindSelect}
        >
          <div>
            <MenuItem
              icon={RiInbox2Line}
              label='Remind Me Inbox'
              hasSubmenu
              onClick={() => setRemindOpen(true)}
            />
          </div>
        </InboxSnoozePopover>

        <Divider />

        <MenuItem
          ref={moveToRef}
          icon={RiLogoutBoxRLine}
          label='Move to'
          hasSubmenu
          active={showMoveToMenu}
          hoverHandlers={getItemHandlers('move')}
        />
        <MenuItem
          ref={addToRef}
          icon={RiPlayListAddLine}
          label='Add to'
          hasSubmenu
          active={showAddToMenu}
          hoverHandlers={getItemHandlers('add')}
        />

        <Divider />

        <MenuItem
          icon={RiFileCopyLine}
          label='Duplicate'
          onClick={() => handleAction(onDuplicate)}
        />
        <MenuItem icon={RiDeleteBin6Line} label='Delete' onClick={() => handleAction(onDelete)} />
        <MenuItem icon={RiArchiveLine} label='Archive' onClick={() => handleAction(onArchive)} />
      </div>

      {showMoveToMenu ? (
        <TaskMoveToMenu
          anchorRef={moveToRef}
          parentMenuRef={menuRef}
          panelRef={moveSubmenuRef}
          panelHoverHandlers={getPanelHandlers('move')}
          onClose={handleMoveToClose}
          taskId={task?.id}
          sourceStatus={task?.status}
          statusGroups={statusGroups}
          currentListId={currentListId}
          sidebarTree={sidebarTree}
          onMoveSuccess={handleMoveSuccess}
        />
      ) : null}

      {showAddToMenu ? (
        <TaskAddToMenu
          anchorRef={addToRef}
          parentMenuRef={menuRef}
          panelRef={addSubmenuRef}
          panelHoverHandlers={getPanelHandlers('add')}
          onClose={handleAddToClose}
          taskId={task?.id}
          sourceStatus={task?.status}
          statusGroups={statusGroups}
          currentListId={currentListId}
          sidebarTree={sidebarTree}
          onAddSuccess={handleAddSuccess}
        />
      ) : null}
    </>,
    document.body,
  );
}
