// AlignUI-style assignee filter: trigger + popover content (see filter.jsx)

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiCloseLine, RiGroupLine, RiSearchLine } from 'react-icons/ri';

import { cn } from '@/utils/cn';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import * as Input from '@/components/ui/input';
import * as Checkbox from '@/components/ui/checkbox';
import * as Button from '@/components/ui/button';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import { searchUsers, selectUserSearch } from '@/redux/userSlice';
import { useDebounce } from '@/hooks/use-debounce';
import { getAssigneeFirstNameInitial } from '@/utils/task-utils';

const TRIGGER_VISUAL_NAME = 'AssigneeFilterTriggerVisual';
const TRIGGER_BUTTON_NAME = 'AssigneeFilterTriggerButton';
const CONTENT_NAME = 'AssigneeFilterContent';
const TOOLBAR_NAME = 'AssigneeFilterToolbar';

function normalizeAssigneeFilterList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return [String(raw)];
}

function getIsMeAssigneeMode(selectedAssignees, currentUser) {
  const email = currentUser?.email;
  if (!email || selectedAssignees.length !== 1) return false;
  return selectedAssignees[0] === email;
}

/** Inner trigger button (avatars / group icon). Use inside AssigneeFilter.TriggerButton. */
const AssigneeFilterTriggerVisual = React.forwardRef(
  (
    {
      selectedAssignees = [],
      isMeMode = false,
      maxVisibleAvatars = 3,
      groupIconSize = 15,
      ariaLabel = 'Filter by assignee',
      className,
      iconWrapperClassName,
      overflowBadgeClassName,
      ...rest
    },
    ref,
  ) => {
    const list = React.useMemo(() => {
      const raw = selectedAssignees;
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      return [raw];
    }, [selectedAssignees]);

    const showAvatarStack = list.length > 0 && !isMeMode;

    return (
      <button
        ref={ref}
        type='button'
        className={cn('flex items-center justify-center', className)}
        aria-label={ariaLabel}
        {...rest}
      >
        {showAvatarStack ? (
          <div className='flex items-center'>
            {list.slice(0, maxVisibleAvatars).map((email, i) => (
              <div
                key={email}
                className={i > 0 ? '-ml-2' : ''}
                style={{ zIndex: maxVisibleAvatars - i }}
              >
                <CrmAccountAvatar
                  name={email}
                  index={email.charCodeAt(0)}
                  className='rounded-full'
                />
              </div>
            ))}
            {list.length > maxVisibleAvatars && (
              <span
                className={cn(
                  'ml-1 text-[10px] font-semibold text-text-sub-600',
                  overflowBadgeClassName,
                )}
              >
                +{list.length - maxVisibleAvatars}
              </span>
            )}
          </div>
        ) : (
          <span
            className={cn(
              'flex size-[25px] items-center justify-center rounded-full border',
              isMeMode ? 'border-transparent' : 'border-stroke-soft-200',
              iconWrapperClassName,
            )}
          >
            <RiGroupLine size={groupIconSize} className='text-text-sub-600' aria-hidden />
          </span>
        )}
      </button>
    );
  },
);
AssigneeFilterTriggerVisual.displayName = TRIGGER_VISUAL_NAME;

/**
 * Tooltip + Popover trigger for assignee filter. Place inside `Popover.Root` (same pattern as Filter.TriggerButton).
 */
const AssigneeFilterTriggerButton = ({
  triggerTooltip = 'Filter by assignee',
  tooltipContent,
  ...visualProps
}) => {
  const tip = tooltipContent ?? triggerTooltip;
  return (
    <Tooltip.Root>
      <Popover.Trigger asChild>
        <Tooltip.Trigger asChild>
          <AssigneeFilterTriggerVisual {...visualProps} />
        </Tooltip.Trigger>
      </Popover.Trigger>
      <Tooltip.Content>{tip}</Tooltip.Content>
    </Tooltip.Root>
  );
};
AssigneeFilterTriggerButton.displayName = TRIGGER_BUTTON_NAME;

/** Popover panel: search internal users and toggle assignees. Place inside `Popover.Root` after TriggerButton. */
const AssigneeFilterContent = React.forwardRef(
  (
    {
      className,
      selectedAssignees = [],
      onAssigneeToggle,
      onClearAll,
      title = 'Assignees',
      searchPlaceholder = 'Search by user',
      clearLabel = 'Clear',
      align = 'start',
      /** Pass parent popover `open` so search resets when the panel opens */
      open = false,
      ...rest
    },
    forwardedRef,
  ) => {
    const dispatch = useDispatch();
    const userSearch = useSelector(selectUserSearch);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const hasMounted = useRef(false);

    useEffect(() => {
      if (open) {
        setSearchQuery('');
        dispatch(searchUsers({ searchQuery: '', internal_only: true }));
      }
    }, [open, dispatch]);

    useEffect(() => {
      if (!hasMounted.current) {
        hasMounted.current = true;
        return;
      }
      dispatch(searchUsers({ searchQuery: debouncedQuery, internal_only: true }));
    }, [debouncedQuery, dispatch]);

    const users = userSearch.data || [];
    const isLoading = userSearch.status === 'loading';

    const handleToggle = useCallback(
      (email) => {
        onAssigneeToggle?.(email);
      },
      [onAssigneeToggle],
    );

    return (
      <Popover.Content
        ref={forwardedRef}
        align={align}
        showArrow={false}
        className={cn(
          'flex w-[280px] flex-col overflow-hidden rounded-2xl p-0 shadow-regular-md',
          className,
        )}
        {...rest}
      >
        <div className='flex items-center justify-between px-2 py-1'>
          <p className='text-subheading-2xs text-text-soft-400 uppercase'>{title}</p>
          <Button.Root
            type='button'
            variant='primary'
            mode='ghost'
            size='xsmall'
            className='px-2 text-xs text-primary-base'
            onClick={() => onClearAll?.()}
          >
            {clearLabel}
          </Button.Root>
        </div>

        <div className='shrink-0 px-3 pb-2'>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon>
                <RiSearchLine />
              </Input.Icon>
              <Input.Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                aria-label='Search assignees'
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto p-2 divide-y-2 divide-white'>
          {isLoading && users.length === 0 ? (
            <div className='px-4 py-3 text-paragraph-sm text-text-sub-600'>Loading...</div>
          ) : users.length === 0 ? (
            <div className='px-4 py-3 text-paragraph-sm text-text-sub-600'>No users found</div>
          ) : (
            users.map((user) => {
              const email = user.email || user.value;
              const isChecked = selectedAssignees.includes(email);
              return (
                <button
                  key={email}
                  type='button'
                  onClick={() => handleToggle(email)}
                  className={cn(
                    'flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-bg-weak-50 rounded-lg',
                    isChecked && 'bg-primary-alpha-10',
                  )}
                  aria-label={`${user.full_name || user.label || email}${isChecked ? ', selected' : ''}`}
                  aria-pressed={isChecked}
                >
                  <CrmAccountAvatar
                    name={user.full_name || user.label}
                    image={user.image || user.avatar}
                    size={28}
                    index={email.charCodeAt(0)}
                  />
                  <span className='flex-1 truncate text-paragraph-sm text-text-strong-950'>
                    {user.full_name || user.label || email}
                  </span>
                  <Checkbox.Root checked={isChecked} tabIndex={-1} />
                </button>
              );
            })
          )}
        </div>
      </Popover.Content>
    );
  },
);
AssigneeFilterContent.displayName = CONTENT_NAME;

/**
 * Full toolbar pill: assignee popover + optional clear control + Me mode.
 * Parent only supplies selected ids/emails and `onAssigneesChange(nextList)` (e.g. map into your filter shape).
 */
function AssigneeFilterToolbar({
  selectedAssignees: selectedAssigneesProp,
  currentUser = null,
  onAssigneesChange,
  popoverOpen: popoverOpenControlled,
  onPopoverOpenChange,
  showMeModeButton = true,
  className,
  triggerTooltip,
  clearAssigneesTooltip = 'Turn off Assignees mode',
  meModeActiveTooltip = 'Remove "Me" filter',
  meModeInactiveTooltip = 'Filter for your tasks',
}) {
  const selectedAssignees = React.useMemo(
    () => normalizeAssigneeFilterList(selectedAssigneesProp),
    [selectedAssigneesProp],
  );

  const isMeMode = getIsMeAssigneeMode(selectedAssignees, currentUser);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isPopoverControlled = popoverOpenControlled !== undefined;
  const popoverOpen = isPopoverControlled ? popoverOpenControlled : uncontrolledOpen;
  const setPopoverOpen = useCallback(
    (next) => {
      if (isPopoverControlled) {
        onPopoverOpenChange?.(next);
      } else {
        setUncontrolledOpen(next);
      }
    },
    [isPopoverControlled, onPopoverOpenChange],
  );

  const handleAssigneeToggle = useCallback(
    (email) => {
      const next = selectedAssignees.includes(email)
        ? selectedAssignees.filter((e) => e !== email)
        : [...selectedAssignees, email];
      onAssigneesChange?.(next);
    },
    [selectedAssignees, onAssigneesChange],
  );

  const handleClearAssignees = useCallback(() => {
    onAssigneesChange?.([]);
  }, [onAssigneesChange]);

  const handleMeModeToggle = useCallback(() => {
    if (isMeMode) {
      onAssigneesChange?.([]);
    } else if (currentUser?.email) {
      onAssigneesChange?.([currentUser.email]);
    }
  }, [isMeMode, currentUser, onAssigneesChange]);

  const pillActive = isMeMode || selectedAssignees.length > 0;

  return (
    <Button.Root
      variant='stroke'
      className={cn(
        'relative flex h-auto items-center gap-1 rounded-large border !px-1 !py-1 transition-colors group',
        pillActive ? 'border-primary-base bg-primary-alpha-10' : 'border-stroke-soft-200',
        className,
      )}
    >
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <AssigneeFilterTriggerButton
          selectedAssignees={selectedAssignees}
          isMeMode={isMeMode}
          triggerTooltip={triggerTooltip}
        />
        <AssigneeFilterContent
          open={popoverOpen}
          selectedAssignees={selectedAssignees}
          onAssigneeToggle={handleAssigneeToggle}
          onClearAll={handleClearAssignees}
        />
      </Popover.Root>

      {selectedAssignees.length > 0 && !isMeMode && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                handleClearAssignees();
              }}
              aria-label='Turn off Assignees mode'
              className='absolute right-1 top-1 z-10 hidden size-[25px] items-center justify-center rounded-full bg-white text-text-sub-600 hover:text-text-strong-950 group-hover:flex'
            >
              <RiCloseLine size={13} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{clearAssigneesTooltip}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      )}

      {showMeModeButton && currentUser && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={handleMeModeToggle}
              aria-label={meModeInactiveTooltip}
              aria-pressed={isMeMode}
              className={cn(
                'flex size-[25px] items-center justify-center rounded-full text-xs font-semibold transition-colors',
                isMeMode
                  ? 'bg-primary-base text-white'
                  : 'border border-dashed border-stroke-soft-200 text-text-sub-600 hover:border-stroke-strong-950',
              )}
            >
              {currentUser.user_image ? (
                <img
                  src={currentUser.user_image}
                  className='size-full rounded-full object-cover'
                  alt=''
                />
              ) : (
                getAssigneeFirstNameInitial({
                  full_name: currentUser.full_name,
                  email: currentUser.email,
                })
              )}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{isMeMode ? meModeActiveTooltip : meModeInactiveTooltip}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </Button.Root>
  );
}
AssigneeFilterToolbar.displayName = TOOLBAR_NAME;

export {
  AssigneeFilterTriggerVisual as TriggerVisual,
  AssigneeFilterTriggerButton as TriggerButton,
  AssigneeFilterContent as Content,
  AssigneeFilterToolbar as Toolbar,
};
