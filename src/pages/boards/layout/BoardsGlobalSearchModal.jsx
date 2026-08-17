import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiArrowDownLine, RiArrowUpLine, RiCornerDownLeftLine, RiSearchLine } from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import CircularProgress from '@/components/ui/circular-progress';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/utils/cn';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';
import { useBoardsGlobalSearch } from '@/pages/boards/hooks/useBoardsGlobalSearch';
import {
  buildBoardTaskSearchPath,
  formatBoardSearchRelativeTime,
  getBoardSearchLocationLabel,
  getBoardSearchStatusColor,
  getBoardSearchStatusProgress,
} from '@/pages/boards/utils/boards-global-search-utils';

function SearchTaskStatusIcon({ task }) {
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

function SearchAssigneeAvatar({ assignee }) {
  const displayName = getAssigneeDisplayName(assignee);
  const image = assignee?.user_image || assignee?.image || assignee?.profile_image;

  if (image) {
    return (
      <Avatar.Root size={20} className='overflow-hidden ring-2 ring-bg-white-0'>
        <Avatar.Image src={image} alt={displayName || 'Assignee'} />
      </Avatar.Root>
    );
  }

  return (
    <span className='flex size-5 items-center justify-center rounded-full bg-blue-light text-[10px] font-medium text-blue-darker ring-2 ring-bg-white-0'>
      {getAssigneeFirstNameInitial(assignee)}
    </span>
  );
}

function BoardSearchResultRow({ task, isSelected, onMouseEnter, onSelect }) {
  const locationLabel = getBoardSearchLocationLabel(task);
  const relativeTime = formatBoardSearchRelativeTime(task.modified);
  const assigneeDetails = task.assigneeDetails?.length
    ? task.assigneeDetails
    : (task.assignees ?? []).map((user, index) => ({
        user,
        full_name: task.assigneeNames?.[index] ?? user,
      }));

  return (
    <button
      type='button'
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
        isSelected ? 'bg-bg-weak-50' : 'hover:bg-bg-weak-50',
      )}
    >
      <SearchTaskStatusIcon task={task} />

      <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap'>
        <span className='truncate text-paragraph-sm font-medium text-text-main-900'>
          {task.title || 'Untitled task'}
        </span>

        <span className='flex shrink-0 items-center gap-1.5 text-paragraph-xs text-text-soft-400'>
          <span>in {locationLabel}</span>
          {relativeTime ? (
            <>
              <span aria-hidden='true'>·</span>
              <span>{relativeTime}</span>
            </>
          ) : null}
        </span>
      </div>

      {assigneeDetails.length > 0 ? (
        <div className='flex shrink-0 -space-x-1.5'>
          {assigneeDetails.slice(0, 2).map((assignee, index) => (
            <SearchAssigneeAvatar
              key={`${assignee.user ?? assignee.full_name ?? index}`}
              assignee={assignee}
            />
          ))}
        </div>
      ) : null}

      {isSelected ? (
        <RiCornerDownLeftLine
          size={16}
          className='shrink-0 text-text-soft-400'
          aria-hidden='true'
        />
      ) : null}
    </button>
  );
}

export default function BoardsGlobalSearchModal({ open, onOpenChange, sidebarTree = [] }) {
  const navigate = useNavigate();
  const inputReference = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    query,
    setQuery,
    results,
    isLoading,
    canSearch,
    error,
    recent,
    addRecentSearch,
    resetSearch,
  } = useBoardsGlobalSearch({ enabled: open });

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputReference.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results.length]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      resetSearch();
      setSelectedIndex(0);
    }

    onOpenChange?.(nextOpen);
  };

  const handleSelectTask = (task) => {
    if (!task?.id) {
      return;
    }

    addRecentSearch(query);
    handleOpenChange(false);
    navigate(buildBoardTaskSearchPath(task, sidebarTree));
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleOpenChange(false);
      return;
    }

    if (!canSearch || results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSelectTask(results[selectedIndex] || results[0]);
    }
  };

  const showResults = query.trim().length > 0;

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[760px] overflow-hidden p-0' showClose={false}>
        <div className='border-b border-stroke-soft-200 px-4 pt-4 pb-3'>
          <Input.Root>
            <Input.Wrapper className='h-11'>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                ref={inputReference}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder='Search tasks by title, status, assignee, tags, and more...'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='max-h-[460px] overflow-auto'>
          {!showResults ? (
            <div className='p-4'>
              <div className='mb-2 text-label-xs text-text-sub-600'>Recent searches</div>
              {recent.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {recent.map((item) => (
                    <button
                      key={item}
                      type='button'
                      className='rounded-md border border-stroke-soft-200 px-2 py-1 text-paragraph-xs text-text-sub-600 hover:bg-bg-weak-50'
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <div className='text-paragraph-sm text-text-soft-400'>
                  Search across all your board tasks. Press Ctrl/Cmd + K anytime.
                </div>
              )}
            </div>
          ) : !canSearch ? (
            <div className='px-4 py-6 text-center text-paragraph-sm text-text-soft-400'>
              Type at least 2 characters to search tasks.
            </div>
          ) : isLoading ? (
            <div className='px-4 py-6 text-paragraph-sm text-text-sub-600'>Searching tasks...</div>
          ) : error ? (
            <div className='px-4 py-6 text-paragraph-sm text-error-base'>{error}</div>
          ) : results.length === 0 ? (
            <div className='px-4 py-6 text-center text-paragraph-sm text-text-sub-600'>
              No tasks found for &quot;{query.trim()}&quot;
            </div>
          ) : (
            <>
              <div className='px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-soft-400'>
                Results
              </div>
              {results.map((task, index) => (
                <BoardSearchResultRow
                  key={task.id}
                  task={task}
                  isSelected={selectedIndex === index}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onSelect={() => handleSelectTask(task)}
                />
              ))}
            </>
          )}
        </div>

        <div className='flex items-center justify-between border-t border-stroke-soft-200 px-4 py-2.5 text-paragraph-xs text-text-soft-400'>
          <div className='flex items-center gap-3'>
            <span className='inline-flex items-center gap-1'>
              <RiArrowUpLine size={14} />
              <RiArrowDownLine size={14} />
              navigate
            </span>
            <span className='inline-flex items-center gap-1'>
              <RiCornerDownLeftLine size={14} />
              open
            </span>
          </div>
          <span>Esc to close</span>
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
