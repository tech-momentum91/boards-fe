import { useEffect, useRef, useState } from 'react';
import { RiExpandDiagonalLine } from 'react-icons/ri';
import { cn } from '@/utils/cn';
import BoardTaskStatusDropdown from '../components/BoardTaskStatusDropdown';
import TaskSystemLink from '../components/TaskSystemLink';

export default function TaskTitleCell({
  taskId,
  title = '',
  systemLink = null,
  status = '',
  statusGroups = [],
  allStatusGroups = [],
  isStatusLoading = false,
  onStatusUpdate,
  showStatusIcon = false,
  onUpdate,
  disabled = false,
  forceEditing = false,
  onCancelForceEditing,
  isTableLayout = false,
  onExpand,
}) {
  const inputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    setIsEditing(forceEditing);
  }, [forceEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isEditing]);

  const stopEditing = () => {
    setIsEditing(false);
    onCancelForceEditing?.();
  };

  const saveTitle = () => {
    const trimmedTitle = draftTitle.trim();
    const originalTitle = (title || '').trim();

    if (!trimmedTitle || trimmedTitle === originalTitle) {
      setDraftTitle(title || '');
      stopEditing();
      return;
    }

    onUpdate?.(taskId, trimmedTitle);
    stopEditing();
  };

  const handleBlur = () => {
    if (disabled) {
      return;
    }

    saveTitle();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      inputRef.current?.blur();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setDraftTitle(title || '');
      stopEditing();
    }
  };

  const handleTitleClick = () => {
    if (disabled || isEditing) {
      return;
    }

    onExpand?.(taskId);
  };

  const statusDropdown = showStatusIcon ? (
    <div className='shrink-0' data-prevent-row-click onClick={(event) => event.stopPropagation()}>
      <BoardTaskStatusDropdown
        value={status || ''}
        onValueChange={(value) => {
          if (!value || value === status) {
            return;
          }

          onStatusUpdate?.(taskId, value);
        }}
        groups={statusGroups}
        allGroups={allStatusGroups}
        isLoading={isStatusLoading}
        disabled={disabled}
        showLabel={false}
        iconOnly
        selectedIconOnly
        className='shrink-0'
      />
    </div>
  ) : null;

  if (isEditing) {
    return (
      <div className='flex h-full w-full items-center gap-1 px-2' data-prevent-row-click>
        {statusDropdown}
        <input
          ref={inputRef}
          type='text'
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-text-main-900 outline-none placeholder:text-text-soft-400 disabled:opacity-60',
            'text-xs leading-8',
            !isTableLayout &&
              'rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 py-1 ring-primary-base focus:border-primary-base focus:ring-1',
          )}
        />
        {isTableLayout && onExpand ? (
          <button
            type='button'
            data-prevent-row-click
            aria-label='Open task details'
            onClick={(event) => {
              event.stopPropagation();
              onExpand(taskId);
            }}
            className='flex h-6 w-6 shrink-0 items-center justify-center rounded text-icon-soft-400 transition hover:bg-bg-weak-100 hover:text-icon-sub-600 group-hover/row:opacity-100'
          >
            <RiExpandDiagonalLine size={14} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className='flex h-full w-full items-center gap-1 px-2'>
      {statusDropdown}
      <button
        type='button'
        data-prevent-row-click
        disabled={disabled}
        onClick={handleTitleClick}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-text-main-900 outline-none transition hover:text-text-sub-600',
          'cursor-pointer text-xs leading-8',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {title || 'Untitled'}
      </button>

      {systemLink ? <TaskSystemLink systemLink={systemLink} variant='compact' /> : null}

      {isTableLayout && onExpand ? (
        <button
          type='button'
          data-prevent-row-click
          aria-label='Open task details'
          onClick={(event) => {
            event.stopPropagation();
            onExpand(taskId);
          }}
          className='flex h-6 w-6 shrink-0 items-center justify-center rounded text-icon-soft-400 opacity-0 transition hover:bg-bg-weak-100 hover:text-icon-sub-600 group-hover/row:opacity-100'
        >
          <RiExpandDiagonalLine size={14} />
        </button>
      ) : null}
    </div>
  );
}
