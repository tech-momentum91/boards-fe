import { useCallback, useMemo, useRef, useState } from 'react';
import { RiCloseLine, RiUserAddLine } from 'react-icons/ri';
import AssigneeMultiSelect from '@/pages/boards/components/assignee-multi-select';
import { CrmAccountAvatar } from '@/components/crm-accounts/crm-account-avatar';
import * as Popover from '@/components/ui/popover';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { getAssigneeDisplayName, getAssigneeFirstNameInitial } from '@/utils/task-utils';

const MAX_VISIBLE_AVATARS = 3;

function resolveAssigneeMeta(id, assigneeDetails = []) {
  const match = assigneeDetails.find((entry) => {
    if (typeof entry === 'string') {
      return String(entry) === String(id);
    }

    return [entry?.user, entry?.email, entry?.value, entry?.assignee, entry?.name].some(
      (value) => value != null && String(value) === String(id),
    );
  });

  if (match && typeof match === 'object') {
    return match;
  }

  return { value: id, email: id };
}

function joinAssigneeIds(ids = []) {
  return [...ids].map(String).filter(Boolean).sort().join(',');
}

export default function TaskAssigneeCell({
  taskId,
  assignees = [],
  assigneeDetails = [],
  onUpdate,
  disabled = false,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftAssignees, setDraftAssignees] = useState(assignees);
  const openedWithRef = useRef([]);

  const visibleAssignees = useMemo(
    () => assignees.map((id) => ({ id, meta: resolveAssigneeMeta(id, assigneeDetails) })),
    [assigneeDetails, assignees],
  );

  const handleOpenChange = useCallback(
    (open) => {
      if (disabled) {
        return;
      }

      if (open) {
        openedWithRef.current = [...assignees];
        setDraftAssignees([...assignees]);
      } else {
        const previous = joinAssigneeIds(openedWithRef.current);
        const next = joinAssigneeIds(draftAssignees);

        if (previous !== next) {
          onUpdate?.(taskId, draftAssignees);
        }
      }

      setIsOpen(open);
    },
    [assignees, disabled, draftAssignees, onUpdate, taskId],
  );

  const handleRemoveAssignee = useCallback(
    (assigneeId, event) => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) {
        return;
      }

      const nextAssignees = assignees.filter((id) => String(id) !== String(assigneeId));
      onUpdate?.(taskId, nextAssignees);
    },
    [assignees, disabled, onUpdate, taskId],
  );

  const handleRemoveMouseDown = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type='button'
          disabled={disabled}
          aria-label='Edit assignees'
          className={cn(
            'flex h-full w-full items-center text-left transition-colors',
            compact ? 'justify-center px-1' : 'min-h-11 px-3',
            'hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-inset',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {visibleAssignees.length === 0 ? (
            compact ? null : (
              <RiUserAddLine size={18} className='text-icon-soft-400' />
            )
          ) : (
            <div className='flex items-center'>
              {visibleAssignees.slice(0, MAX_VISIBLE_AVATARS).map(({ id, meta }, index) => {
                const displayName = getAssigneeDisplayName(meta);

                return (
                  <Tooltip.Root size='xsmall' key={id}>
                    <Tooltip.Trigger asChild>
                      <span
                        className='relative inline-block rounded-full ring-2 ring-white group/avatar'
                        style={{ marginLeft: index === 0 ? 0 : -8, zIndex: index }}
                      >
                        <CrmAccountAvatar
                          name={displayName}
                          initials={getAssigneeFirstNameInitial(meta)}
                          image={meta.image || meta.user_image}
                          index={index}
                          size={compact ? 20 : 24}
                          showNativeTitle={false}
                        />
                        {!disabled ? (
                          <span
                            role='button'
                            tabIndex={0}
                            aria-label={`Remove ${displayName}`}
                            onClick={(event) => handleRemoveAssignee(id, event)}
                            onMouseDown={handleRemoveMouseDown}
                            onPointerDown={handleRemoveMouseDown}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRemoveAssignee(id, event);
                              }
                            }}
                            className={cn(
                              'absolute -top-1 -right-1 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full bg-error-base text-white',
                              'opacity-0 transition-opacity duration-200 group-hover/avatar:opacity-100',
                              'hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-base focus:ring-offset-1',
                            )}
                          >
                            <RiCloseLine className='size-2.5' />
                          </span>
                        ) : null}
                      </span>
                    </Tooltip.Trigger>
                    {displayName ? (
                      <Tooltip.Content size='xsmall' side='bottom'>
                        {displayName}
                      </Tooltip.Content>
                    ) : null}
                  </Tooltip.Root>
                );
              })}
              {visibleAssignees.length > MAX_VISIBLE_AVATARS ? (
                <span
                  className='inline-flex size-6 items-center justify-center rounded-full bg-bg-weak-100 text-label-xs text-text-sub-500 ring-2 ring-white'
                  style={{ marginLeft: -8, zIndex: MAX_VISIBLE_AVATARS }}
                >
                  +{visibleAssignees.length - MAX_VISIBLE_AVATARS}
                </span>
              ) : null}
            </div>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        showArrow={false}
        className='w-auto p-0'
        data-prevent-row-click
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {isOpen ? (
          <AssigneeMultiSelect
            listOnly
            value={draftAssignees}
            onChange={setDraftAssignees}
            disabled={disabled}
          />
        ) : null}
      </Popover.Content>
    </Popover.Root>
  );
}
