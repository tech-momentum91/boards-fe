import { useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { RiMoreFill } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import TaskOptionsMenu from '../list/menus/TaskOptionsMenu';
import { getBoardCalendarTaskChipStyle } from './board-calendar-utils';
import { canDragCalendarTask, getBoardCalendarTaskDragId } from './board-calendar-dnd-utils';
import type { BoardStatusGroup, BoardTask } from '../shared/types';

interface CalendarTaskMenuProps {
  currentListId?: string;
  sidebarTree?: unknown[];
  onTaskMoved?: (task: BoardTask) => void;
  onTaskAdded?: (task: BoardTask) => void;
  onAddColumn?: () => void;
  onStartRename?: (taskId: string | undefined) => void;
  onArchive?: (taskId: string | undefined) => void;
  onFavorite?: (taskId: string | undefined) => void;
  onToggleWatch?: (taskId: string | undefined) => void;
  onRemindInbox?: (taskId: string | undefined, remindAt: string) => void;
  onDuplicate?: (taskId: string | undefined) => void;
  onDelete?: (taskId: string | undefined) => void;
}

interface BoardCalendarTaskRowProps {
  task: BoardTask;
  statusGroups?: BoardStatusGroup[];
  allStatusGroups?: BoardStatusGroup[];
  onTaskClick?: (task: BoardTask) => void;
  isMenuOpen?: boolean;
  onMenuOpen?: (taskId: string | undefined) => void;
  onMenuClose?: () => void;
  taskMenuProps?: CalendarTaskMenuProps | null;
  className?: string;
  compact?: boolean;
  dragDisabled?: boolean;
  isDragOverlay?: boolean;
}

export default function BoardCalendarTaskRow({
  task,
  statusGroups,
  allStatusGroups,
  onTaskClick,
  isMenuOpen = false,
  onMenuOpen,
  onMenuClose,
  taskMenuProps = null,
  className,
  compact = false,
  dragDisabled = false,
  isDragOverlay = false,
}: BoardCalendarTaskRowProps) {
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const chipStyle = getBoardCalendarTaskChipStyle(task, statusGroups, allStatusGroups);
  const taskId = task?.id ?? task?.name;
  const isDraggable = !dragDisabled && !isDragOverlay && canDragCalendarTask(task);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: getBoardCalendarTaskDragId(taskId),
    data: { task, type: 'calendar-task' },
    disabled: !isDraggable,
  });

  const handleTitleClick = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    if (isDragging) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    onTaskClick?.(task);
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTitleClick(event);
    }
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      className={cn(
        'group/task flex w-full min-w-0 items-center gap-0.5 rounded bg-bg-weak-50 transition hover:bg-bg-soft-200',
        isDragging && 'opacity-40',
        isDragOverlay && 'cursor-grabbing shadow-md ring-1 ring-stroke-soft-200',
        className,
      )}
    >
      <div
        role='button'
        tabIndex={0}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none',
          isDraggable && 'cursor-grab touch-none active:cursor-grabbing',
          compact ? 'px-1 py-0.5' : 'px-1.5 py-1',
        )}
        onClick={handleTitleClick}
        onKeyDown={handleTitleKeyDown}
        {...(isDraggable ? listeners : {})}
        {...(isDraggable ? attributes : {})}
      >
        <span
          className='w-0.5 shrink-0 self-stretch rounded-full'
          style={{ backgroundColor: chipStyle.accentColor }}
          aria-hidden
        />
        <span className='min-w-0 flex-1 truncate text-xs text-text-sub-600'>{task.title}</span>
      </div>

      {!isDragOverlay ? (
        <button
          ref={menuAnchorRef}
          type='button'
          aria-label='Task options'
          aria-expanded={isMenuOpen}
          className={cn(
            'mr-0.5 flex size-5 shrink-0 items-center justify-center rounded text-icon-soft-400 transition',
            'hover:bg-bg-white-0 hover:text-icon-sub-600',
            isMenuOpen
              ? 'bg-bg-white-0 text-icon-sub-600 opacity-100'
              : 'opacity-0 group-hover/task:opacity-100',
          )}
          onClick={(event) => {
            event.stopPropagation();

            if (isMenuOpen) {
              onMenuClose?.();
            } else {
              onMenuOpen?.(task.id);
            }
          }}
        >
          <RiMoreFill size={14} />
        </button>
      ) : null}

      {isMenuOpen && taskMenuProps && !isDragOverlay ? (
        <TaskOptionsMenu
          anchorRef={menuAnchorRef}
          onClose={onMenuClose}
          task={task}
          currentListId={taskMenuProps.currentListId}
          sidebarTree={taskMenuProps.sidebarTree ?? []}
          onTaskMoved={taskMenuProps.onTaskMoved}
          onTaskAdded={taskMenuProps.onTaskAdded}
          onAddColumn={taskMenuProps.onAddColumn}
          onRename={() => taskMenuProps.onStartRename?.(task.id)}
          onArchive={() => taskMenuProps.onArchive?.(task.id)}
          onFavorite={() => taskMenuProps.onFavorite?.(task.id)}
          onToggleWatch={() => taskMenuProps.onToggleWatch?.(task.id)}
          onRemindInbox={(remindAt) => taskMenuProps.onRemindInbox?.(task.id, remindAt)}
          onDuplicate={() => taskMenuProps.onDuplicate?.(task.id)}
          onDelete={() => taskMenuProps.onDelete?.(task.id)}
        />
      ) : null}
    </div>
  );
}
