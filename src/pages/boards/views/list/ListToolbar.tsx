import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiDownloadLine,
  RiFilter3Line,
  RiLayoutColumnLine,
  RiSearchLine,
  RiStackLine,
} from 'react-icons/ri';
import * as Avatar from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { toAbsoluteAttachmentUrl } from '@/lib/utils';
import { cn } from '@/utils/cn';
import CreateTaskMenu from './CreateTaskMenu';
import ListFilterMenu from './ListFilterMenu';
import ListGroupByConfigMenu from './menus/ListGroupByConfigMenu';
import ListGroupByFieldMenu from './menus/ListGroupByFieldMenu';
import { downloadListTasksSheet } from './export-list-tasks';

const toolbarButtonClassName =
  'flex items-center justify-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 text-icon-sub-500 shadow-[0px_1px_2px_0px_rgba(82,88,102,0.06)] transition hover:bg-bg-weak-50';

const IconButton = forwardRef(({ children, className, ...props }, ref) => (
  <button
    ref={ref}
    type='button'
    className={cn(toolbarButtonClassName, 'size-9 p-2', className)}
    {...props}
  >
    {children}
  </button>
));

IconButton.displayName = 'IconButton';

function getProfileInitials(fullName = '') {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return '?';
  }

  const firstInitial = nameParts[0]?.[0]?.toUpperCase() ?? '';
  const lastInitial =
    nameParts.length > 1 ? (nameParts[nameParts.length - 1]?.[0]?.toUpperCase() ?? '') : '';

  return `${firstInitial}${lastInitial}`;
}

function UserAvatarButton({ user, active = false, onClick, onClear }) {
  const profileImage = toAbsoluteAttachmentUrl(user?.user_image || user?.profile_image || '');
  const hasProfileImage = Boolean(profileImage.trim());
  const initials = useMemo(
    () => getProfileInitials(user?.full_name || user?.email || ''),
    [user?.email, user?.full_name],
  );

  return (
    <button
      type='button'
      aria-label={active ? 'Clear assigned to me filter' : 'Show tasks assigned to me'}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 items-center justify-center gap-1.5 rounded-lg border transition',
        active
          ? 'border-primary-base bg-primary-lighter px-2 ring-1 ring-primary-base'
          : cn(toolbarButtonClassName, 'p-1.5'),
      )}
    >
      {hasProfileImage ? (
        <Avatar.Root size={24} className='overflow-hidden'>
          <Avatar.Image src={profileImage} alt={user?.full_name || 'User avatar'} />
        </Avatar.Root>
      ) : (
        <span className='flex size-6 items-center justify-center rounded-full bg-blue-light text-xs font-medium leading-4 text-blue-darker'>
          {initials}
        </span>
      )}
      {active ? (
        <span
          role='button'
          tabIndex={0}
          aria-label='Remove assigned to me filter'
          onClick={(event) => {
            event.stopPropagation();
            onClear?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onClear?.();
            }
          }}
          className='flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-primary-dark hover:bg-primary-light'
        >
          <RiCloseLine size={16} />
        </span>
      ) : null}
    </button>
  );
}

export default function ListToolbar({
  search = '',
  onSearchChange,
  showClosedOnly = false,
  onShowClosedOnlyChange,
  showAssignedToMeOnly = false,
  onShowAssignedToMeOnlyChange,
  onCreateTask,
  onCreateCustomList,
  onCreateSystemList,
  tasks = [],
  columns = [],
  statusOptions = [],
  fieldFilters = [],
  onFieldFiltersChange,
  listName = 'tasks',
  onOpenColumnsDrawer,
  groupBy = null,
  onGroupByChange,
  groupByOptions = [],
  saveViewSlot = null,
  canCreateTasks = true,
}) {
  const { user } = useAuth();
  const createMenuAnchorRef = useRef(null);
  const filterMenuAnchorRef = useRef(null);
  const groupMenuAnchorRef = useRef(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isGroupFieldMenuOpen, setIsGroupFieldMenuOpen] = useState(false);
  const [isGroupConfigMenuOpen, setIsGroupConfigMenuOpen] = useState(false);
  const activeFieldFilterCount = fieldFilters.length;
  const isGroupActive = Boolean(groupBy?.columnKey);

  const handleGroupButtonClick = () => {
    if (isGroupActive) {
      setIsGroupFieldMenuOpen(false);
      setIsGroupConfigMenuOpen((open) => !open);
      return;
    }

    setIsGroupConfigMenuOpen(false);
    setIsGroupFieldMenuOpen((open) => !open);
  };

  const handleGroupFieldSelect = (columnKey) => {
    onGroupByChange?.({ columnKey, direction: 'asc' });
    setIsGroupFieldMenuOpen(false);
    setIsGroupConfigMenuOpen(true);
  };

  const handleClearGroupBy = () => {
    onGroupByChange?.(null);
    setIsGroupConfigMenuOpen(false);
  };

  return (
    <div className='flex items-center justify-between gap-4 border-b border-stroke-soft-200 bg-bg-white-0 px-6 py-3'>
      <div className='relative w-full max-w-[372px]'>
        <RiSearchLine
          size={20}
          className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-icon-sub-500'
        />

        <input
          value={search}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder='Search by title'
          className='h-9 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-10 pr-2 text-sm leading-5 tracking-[-0.084px] text-text-main-900 outline-none shadow-[0px_1px_2px_0px_rgba(228,229,231,0.24)] placeholder:text-text-soft-400 focus:border-stroke-soft-200'
        />
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        {saveViewSlot}

        <div className='relative'>
          <IconButton
            ref={groupMenuAnchorRef}
            aria-label={isGroupActive ? 'Edit grouping' : 'Group tasks'}
            aria-expanded={isGroupFieldMenuOpen || isGroupConfigMenuOpen}
            aria-pressed={isGroupActive}
            onClick={handleGroupButtonClick}
            className={cn(
              isGroupActive &&
                'border-primary-base bg-primary-lighter text-primary-dark ring-1 ring-primary-base',
            )}
          >
            <RiStackLine size={20} />
          </IconButton>

          {isGroupFieldMenuOpen ? (
            <ListGroupByFieldMenu
              anchorRef={groupMenuAnchorRef}
              options={groupByOptions}
              onSelect={handleGroupFieldSelect}
              onClose={() => setIsGroupFieldMenuOpen(false)}
            />
          ) : null}

          {isGroupConfigMenuOpen && isGroupActive ? (
            <ListGroupByConfigMenu
              anchorRef={groupMenuAnchorRef}
              options={groupByOptions}
              groupBy={groupBy}
              onGroupByChange={onGroupByChange}
              onClear={handleClearGroupBy}
              onClose={() => setIsGroupConfigMenuOpen(false)}
            />
          ) : null}
        </div>

        <button
          type='button'
          aria-label={showClosedOnly ? 'Clear closed tasks filter' : 'Show closed tasks'}
          aria-pressed={showClosedOnly}
          onClick={() => onShowClosedOnlyChange?.(!showClosedOnly)}
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-lg border transition',
            showClosedOnly
              ? 'border-primary-base bg-primary-lighter px-2 text-primary-dark ring-1 ring-primary-base'
              : cn(toolbarButtonClassName, 'size-9 p-2'),
          )}
        >
          <RiCheckboxCircleLine size={20} className='shrink-0' />
          {showClosedOnly ? (
            <>
              <span className='text-sm font-medium leading-5 tracking-[-0.084px]'>Closed</span>
              <span
                role='button'
                tabIndex={0}
                aria-label='Remove closed tasks filter'
                onClick={(event) => {
                  event.stopPropagation();
                  onShowClosedOnlyChange?.(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onShowClosedOnlyChange?.(false);
                  }
                }}
                className='flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-primary-dark hover:bg-primary-light'
              >
                <RiCloseLine size={16} />
              </span>
            </>
          ) : null}
        </button>

        <UserAvatarButton
          user={user}
          active={showAssignedToMeOnly}
          onClick={() => onShowAssignedToMeOnlyChange?.(!showAssignedToMeOnly)}
          onClear={() => onShowAssignedToMeOnlyChange?.(false)}
        />

        <IconButton
          aria-label='Download tasks'
          onClick={() => downloadListTasksSheet(tasks, listName)}
        >
          <RiDownloadLine size={20} />
        </IconButton>

        <div className='relative'>
          <IconButton
            ref={filterMenuAnchorRef}
            aria-label={activeFieldFilterCount ? 'Edit filters' : 'Filter tasks'}
            aria-expanded={isFilterMenuOpen}
            aria-pressed={activeFieldFilterCount > 0}
            onClick={() => setIsFilterMenuOpen((open) => !open)}
            className={cn(
              activeFieldFilterCount > 0 &&
                'border-primary-base bg-primary-lighter text-primary-dark ring-1 ring-primary-base',
            )}
          >
            <RiFilter3Line size={20} />
          </IconButton>

          {activeFieldFilterCount > 0 ? (
            <span className='pointer-events-none absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary-base text-[10px] font-medium text-text-white-0'>
              {activeFieldFilterCount}
            </span>
          ) : null}

          {isFilterMenuOpen ? (
            <ListFilterMenu
              anchorRef={filterMenuAnchorRef}
              columns={columns}
              tasks={tasks}
              statusOptions={statusOptions}
              filters={fieldFilters}
              onFiltersChange={onFieldFiltersChange}
              onClose={() => setIsFilterMenuOpen(false)}
            />
          ) : null}
        </div>

        <IconButton aria-label='Columns' onClick={onOpenColumnsDrawer}>
          <RiLayoutColumnLine size={20} />
        </IconButton>

        {canCreateTasks ? (
          <div className='relative flex overflow-hidden rounded-lg shadow-[0px_1px_2px_0px_rgba(55,93,251,0.08)]'>
            <button
              type='button'
              onClick={onCreateTask}
              className='flex h-9 items-center gap-1 border-r border-white/40 bg-primary-base px-2 py-2 text-sm font-medium leading-5 tracking-[-0.084px] text-text-white-0 transition hover:bg-primary-darker'
            >
              <RiAddLine size={20} />
              Task
            </button>

            <button
              ref={createMenuAnchorRef}
              type='button'
              aria-expanded={isCreateMenuOpen}
              aria-haspopup='menu'
              aria-label='Task options'
              onClick={() => setIsCreateMenuOpen((open) => !open)}
              className='flex h-9 items-center justify-center bg-primary-base px-1 py-2 text-text-white-0 transition hover:bg-primary-darker'
            >
              <RiArrowDownSLine size={20} />
            </button>

            {isCreateMenuOpen ? (
              <CreateTaskMenu
                anchorRef={createMenuAnchorRef}
                onClose={() => setIsCreateMenuOpen(false)}
                onCreateCustomList={onCreateCustomList}
                onCreateSystemList={onCreateSystemList}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
